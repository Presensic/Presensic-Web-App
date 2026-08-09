import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { getSupabase } from "../lib/supabase";
import { LeaveRequest } from "../types";
import { calculateTrialStatus } from "../utils/trial";
import { formatDDMMYYYY } from "../utils/formatters";
import { isCheckInLog, isCheckOutLog } from "../utils/attendance";
import { 
  Building2, 
  Users, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  ClipboardCheck,
  AlertTriangle, 
  UserPlus,
  Settings, 
  Eye,
  Sliders,
  Sparkles,
  Copy,
  RefreshCw,
  CreditCard,
  Phone,
  Lock,
  Wifi,
  MoreVertical,
  Activity,
  Shield,
  AlertCircle,
  Calendar,
  MessageSquare,
  Mail,
  Bell,
  Download,
  Upload,
  FileSpreadsheet,
  Send,
  Pencil,
  Check,
  Target,
  ChevronRight,
  ChevronLeft,
  X,
  Ticket,
  Trash,
  Loader2,
  UserCheck,
  ExternalLink,
  MapPinOff,
  KeyRound,
  Camera
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import ManageOfficeLocations from "./ManageOfficeLocations";
import SupportTicketModal from "./SupportTicketModal";
import { useSystemSettings, useAutoLogout, parseEmployeeShiftSettings, stringifyEmployeeShiftSettings, extractDepartmentName, EmployeeShiftSettings } from "../hooks/useSystemSettings";

interface EmployerDashboardProps {
  onLogOut: () => void;
  user?: any;
  employees?: any[];
  setEmployees?: React.Dispatch<React.SetStateAction<any[]>>;
  logs?: any[];
  setLogs?: React.Dispatch<React.SetStateAction<any[]>>;
  leaves?: any[];
  setLeaves?: React.Dispatch<React.SetStateAction<any[]>>;
  companies?: any[];
  setCompanies?: React.Dispatch<React.SetStateAction<any[]>>;
  tickets?: any[];
  setTickets?: React.Dispatch<React.SetStateAction<any[]>>;
}

// Initial Mock Team Database
const initialEmployees = [];

const DEFAULT_DEPARTMENTS = [
  // General/Corporate
  "Human Resources",
  "Finance & Accounts",
  "Sales & Business Development",
  "Marketing",
  "IT & Systems",
  "Administration",
  "Customer Support",
  // Operations/Field
  "Operations",
  "Logistics & Delivery",
  "Field Services",
  "Site Supervision",
  // Factory/Manufacturing
  "Production Floor",
  "Quality Assurance / QC",
  "Maintenance & Engineering",
  "Packaging",
  "Assembly Line",
  // Warehouse
  "Warehousing & Inventory",
  "Fulfillment & Dispatch",
  "Loading/Unloading Crew",
  // Healthcare
  "Nursing Staff",
  "Clinical Support",
  "Facility Maintenance (Healthcare)",
  // Retail
  "Store Operations",
  "Retail Sales Floor",
  "Cashier & Billing",
  // Other
  "Security",
  "Housekeeping",
  "Others / Unassigned"
];

const generateNextEmployeeId = (currentEmployees: any[]) => {
  try {
    if (!Array.isArray(currentEmployees) || currentEmployees.length === 0) return "EMP-001";
    
    const ids = currentEmployees
      .filter(e => e && e.id && typeof e.id === 'string')
      .map(e => e.id)
      .filter(id => id.startsWith("EMP-"))
      .map(id => parseInt(id.split("-")[1] || "0", 10))
      .filter(id => !isNaN(id));
      
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `EMP-${(maxId + 1).toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("Error generating employee ID:", error);
    return "EMP-001";
  }
};

const generatePin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Initial Mock Geofenced Zones
const initialZones = [];

// Initial Attendance Logs list
const initialLogs = [];
const initialLeaves = [];

const formatTimeString = (timeStr: any) => {
  const tStr = String(timeStr);
  if (!tStr || tStr === '-' || tStr === '—') return '-';
  
  // Handle ISO strings or raw HH:mm:ss strings
  let dateObj = new Date(tStr);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Fallback for raw "HH:mm" or "HH:mm:ss" strings (e.g. "20:14:01")
  const parts = tStr.trim().split(' ')[0].split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    let minutes = parts[1].padStart(2, '0');
    if (isNaN(hours)) return tStr;
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12, 13-23 to 1-11
    return `${hours}:${minutes} ${ampm}`;
  }

  return tStr;
};

const formatTimeSafe = (timeVal: any) => {
  return formatTimeString(timeVal);
};

const mapEmployeeFromDB = (dbEmp: any) => {
  if (!dbEmp) return null;
  const assignedLocation = dbEmp.zone || dbEmp.tracking_geofence || dbEmp.trackingGeofence || dbEmp.geofence || null;
  return {
    id: dbEmp.id,
    name: dbEmp.name,
    role: dbEmp.role,
    department: dbEmp.department,
    email: dbEmp.email,
    phone: dbEmp.phone,
    whatsapp: dbEmp.whatsapp,
    pin: dbEmp.pin,
    zone: assignedLocation,
    status: dbEmp.status || "Absent",
    checkInTime: dbEmp.check_in_time || "—",
    checkOutTime: dbEmp.check_out_time || "—",
    lastPunch: dbEmp.last_punch || "—",
    avatar: dbEmp.avatar,
    companyId: dbEmp.company_id,
    trackingGeofence: assignedLocation
  };
};

const mapLogFromDB = (dbLog: any, employeesList: any[]) => {
  if (!dbLog) return null;
  const emp = employeesList.find(e => e.id === dbLog.employee_id || e.id === Number(dbLog.employee_id) || String(e.id) === String(dbLog.employee_id));
  const lat = dbLog.gps_latitude ?? dbLog.latitude ?? dbLog.gpsLatitude;
  const lng = dbLog.gps_longitude ?? dbLog.longitude ?? dbLog.gpsLongitude;
  const zoneName = dbLog.zone || emp?.zone || "";
  const coords = dbLog.coordinates && dbLog.coordinates !== "—" ? dbLog.coordinates : (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng)) && Number(lat) !== 0 && Number(lng) !== 0 ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}${zoneName ? `|${zoneName}` : ""}` : (zoneName || "—"));
  return {
    id: `LOG-${dbLog.id}`,
    employee_id: dbLog.employee_id,
    company_id: dbLog.company_id,
    employee: emp ? emp.name : (dbLog.employee_name || "Team Member"),
    role: emp ? emp.role : (dbLog.role || "Staff"),
    zone: zoneName || "Unassigned",
    time: dbLog.time || dbLog.check_in_time || "—",
    created_at: dbLog.created_at,
    location_timestamp: dbLog.location_timestamp,
    timestamp: dbLog.timestamp,
    fullTimestamp: dbLog.created_at || dbLog.location_timestamp || dbLog.timestamp || dbLog.time || new Date().toISOString(),
    status: (dbLog.status === "failed" || dbLog.face_verified === false || dbLog.gps_verified === false) ? "failed" as const : (dbLog.status === "warning" ? "warning" as const : "verified" as const),
    gpsAccuracy: dbLog.gps_accuracy || dbLog.gpsAccuracy || (dbLog.accuracy ? `±${dbLog.accuracy}m` : "±8m"),
    gps_latitude: lat,
    gps_longitude: lng,
    coordinates: coords,
    distance: dbLog.distance_from_office_meters != null ? 
              (dbLog.distance_from_office_meters >= 1000 ? `${(dbLog.distance_from_office_meters / 1000).toFixed(1)} km from office` : `${Math.round(dbLog.distance_from_office_meters)} m from office`) 
              : (dbLog.distance_from_anchor ? `${dbLog.distance_from_anchor}m` : "Location Verified"),
    faceVerification: dbLog.face_verified === false ? "Failed" : (dbLog.face_verified === true ? "Verified" : "—"),
    gpsVerification: dbLog.gps_verified === false ? "Failed" : (dbLog.gps_verified === true ? "Verified" : "—"),
    face_verified: dbLog.face_verified,
    gps_verified: dbLog.gps_verified,
    is_test: dbLog.is_test || false,
    method: dbLog.method || dbLog.attendance_type || "Biometric Check-In",
    attendance_type: dbLog.attendance_type || dbLog.method || "Check In",
    verificationSource: dbLog.verification_source || dbLog.attendance_source || "employee_self",
    verifiedByEmployer: dbLog.verified_by_employer_name || null,
    avatar: dbLog.avatar || dbLog.captured_selfie_url || (emp ? emp.avatar : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face")
  };
};

const mapEmployeeToDB = (uiEmp: any, companyId: any) => {
  const zoneVal = uiEmp.zone || uiEmp.trackingGeofence || null;
  return {
    id: uiEmp.id,
    company_id: companyId,
    name: uiEmp.name,
    role: uiEmp.role,
    department: uiEmp.department || "Staff",
    email: uiEmp.email,
    phone: uiEmp.phone,
    whatsapp: uiEmp.whatsapp,
    pin: uiEmp.pin,
    tracking_geofence: zoneVal,
    zone: zoneVal,
    status: uiEmp.status || "Absent",
    check_in_time: uiEmp.checkInTime || "—",
    check_out_time: uiEmp.checkOutTime || "—",
    last_punch: uiEmp.lastPunch || "—",
    avatar: uiEmp.avatar
  };
};

export default function EmployerDashboard({ 
  onLogOut,
  user,
  employees: propEmployees,
  setEmployees: propSetEmployees,
  logs: propLogs,
  setLogs: propSetLogs,
  leaves: propLeaves,
  setLeaves: propSetLeaves,
  companies = [],
  setCompanies = () => {},
  tickets = [],
  setTickets = () => {}
}: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "team" | "zones" | "settings" | "approvals">("feed");

  // Session check in Employer dashboard
  useEffect(() => {
    try {
      const savedEmployer = localStorage.getItem("presensic_employer_user");
      const savedUser = localStorage.getItem("presensic_user");
      const saved = savedEmployer || savedUser;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setEmployerUser((prev: any) => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) {
      console.warn("Session check error in EmployerDashboard:", e);
    }
  }, []);
  
  const [employerUser, setEmployerUser] = useState<any>(() => {
    if (user) return user;
    try {
      const savedEmployer = localStorage.getItem("presensic_employer_user");
      if (savedEmployer) {
        const parsed = JSON.parse(savedEmployer);
        if (parsed && typeof parsed === "object") return parsed;
      }
      const savedUser = localStorage.getItem("presensic_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {
      console.warn("Error parsing employerUser in EmployerDashboard:", e);
    }
    return {
      name: "Employer",
      email: "",
      whatsApp: "",
      orgName: "New Company",
      orgType: "Private Ltd"
    };
  });

  // Find the company in global state to get authoritative status
  const safeCompanies = Array.isArray(companies) ? companies : [];
  const currentCompany = safeCompanies.find(c => c && (c.email === employerUser?.email || c.whatsapp === employerUser?.whatsApp || c.orgName === employerUser?.orgName || c.org_name === employerUser?.orgName)) || {
    status: "Trial Active",
    plan: "Starter"
  };

  const isExpired = currentCompany.status === "Trial Expired";

  // Subscription / Billing States
  const [billingPlan, setBillingPlan] = useState<string>(() => {
    return currentCompany.plan || "Starter";
  });
  
  const [billingStatus, setBillingStatus] = useState<"trial" | "active" | "expired">(() => {
    if (currentCompany.status === "Trial Expired") return "expired";
    if (currentCompany.status === "Trial Active") return "trial";
    return "active";
  });

  const [billingStartDate, setBillingStartDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("presensic_billing_start_date");
      if (saved) return saved;
    } catch (e) {}
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    return oneDayAgo;
  });
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [tempRazorpayKey, setTempRazorpayKey] = useState<string>(() => {
    try {
      return localStorage.getItem("temp_razorpay_key_id") || "";
    } catch (e) {
      return "";
    }
  });
  const [razorpayKeyError, setRazorpayKeyError] = useState("");
  const [paymentToast, setPaymentToast] = useState<{ show: boolean; message: string; type: "success" | "error" } | null>(null);
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<any | null>(null);

  useEffect(() => {
    if (deletingEmployee) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [deletingEmployee]);

  useEffect(() => {
    if (isResetConfirmModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isResetConfirmModalOpen]);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(() => {
    try {
      return (localStorage.getItem("presensic_billing_period") as any) || "monthly";
    } catch (e) {
      return "monthly";
    }
  });

  useEffect(() => {
    if (isRenewalModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isRenewalModalOpen]);

  useEffect(() => {
    setBillingPlan(currentCompany.plan || "Starter");
    setBillingStatus(currentCompany.status === "Trial Expired" ? "expired" : currentCompany.status === "Trial Active" ? "trial" : "active");
  }, [currentCompany.status, currentCompany.plan]);

  const fetchEmployeesFromDB = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      let comp: any = null;
      const normInputPhone = (employerUser?.whatsApp || "").replace(/\D/g, "");
      const phoneSuffix = normInputPhone.length >= 10 ? normInputPhone.slice(-10) : normInputPhone;

      if (employerUser?.whatsApp) {
        // 1. Query company by exact whatsapp
        const { data: compDirect, error: compErr } = await supabase
          .from('companies')
          .select('*')
          .eq('whatsapp', employerUser.whatsApp)
          .maybeSingle();

        if (compErr && (compErr.message?.includes('API key') || compErr.message?.includes('JWT'))) {
          window.dispatchEvent(new Event('presensic_config_error'));
          return;
        }

        if (compDirect) {
          comp = compDirect;
        }
      }

      if (!comp && employerUser?.email) {
        const { data: compByEmail } = await supabase
          .from('companies')
          .select('*')
          .eq('email', employerUser.email)
          .maybeSingle();
        if (compByEmail) {
          comp = compByEmail;
        }
      }

      if (!comp) {
        // Query all companies to match normalized phone or org_name
        const { data: allComps } = await supabase.from('companies').select('*');
        if (allComps && allComps.length > 0) {
          const matched = allComps.find(c => {
            const dbNorm = (c.whatsapp || "").replace(/\D/g, "");
            const dbSuffix = dbNorm.length >= 10 ? dbNorm.slice(-10) : dbNorm;
            const phoneMatches = phoneSuffix && dbSuffix && dbSuffix === phoneSuffix;
            const emailMatches = c.email && employerUser?.email && c.email.toLowerCase() === employerUser.email.toLowerCase();
            const nameMatches = c.org_name && employerUser?.orgName && c.org_name.toLowerCase() === employerUser.orgName.toLowerCase();
            return phoneMatches || emailMatches || nameMatches;
          });
          comp = matched || allComps[0];
        } else {
          // Create fallback company record
          const { data: newComp } = await supabase.from('companies').insert([{
            org_name: employerUser?.orgName || currentCompany?.name || 'Presensic HQ',
            full_name: employerUser?.fullName || employerUser?.contact || 'Employer',
            whatsapp: employerUser?.whatsApp || '',
            email: employerUser?.email || '',
            role: 'Trial Active',
            selected_plan: currentCompany?.plan || 'Starter',
            created_at: new Date().toISOString()
          }]).select().maybeSingle();
          comp = newComp || null;
        }
      }

      const isValidCompId = comp && comp.id && comp.id !== 'comp-1' && !String(comp.id).startsWith('comp-');
      const compIdVal = isValidCompId ? (!isNaN(Number(comp.id)) ? Number(comp.id) : comp.id) : (comp?.id || null);

      if (compIdVal !== null) {
        setFetchedCompanyId(compIdVal);
        setEmployerUser((prev: any) => {
          if (prev && (prev.company_id === compIdVal || prev.id === compIdVal)) return prev;
          const updated = { ...prev, company_id: compIdVal, id: prev?.id || compIdVal };
          try {
            localStorage.setItem("presensic_employer_user", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }

      // 2. Fetch Employees, Logs, and Leaves in Parallel
      const fetchPromises = [
        // Employees Query
        (async () => {
          let empsData: any[] = [];
          if (compIdVal !== null) {
            const { data } = await supabase
              .from('employees')
              .select('*')
              .eq('company_id', compIdVal);
            if (data) empsData = data;
          }
          if (empsData.length === 0) {
            const { data } = await supabase.from('employees').select('*');
            if (data) {
              if (compIdVal !== null) {
                const filteredInJs = data.filter(e => e.company_id == compIdVal);
                empsData = filteredInJs.length > 0 ? filteredInJs : data;
              } else {
                empsData = data;
              }
            }
          }
          return empsData.map(mapEmployeeFromDB).filter(Boolean);
        })(),

        // Logs Query
        (async () => {
          let logsData: any[] = [];
          if (compIdVal !== null) {
            const { data } = await supabase
              .from('attendance_logs')
              .select('*')
              .eq('company_id', compIdVal)
              .order('id', { ascending: false });
            if (data) logsData = data;
          }
          if (logsData.length === 0) {
            const { data } = await supabase
              .from('attendance_logs')
              .select('*')
              .order('id', { ascending: false });
            if (data) {
              if (compIdVal !== null) {
                const filteredInJs = data.filter(l => l.company_id == compIdVal);
                logsData = filteredInJs.length > 0 ? filteredInJs : data;
              } else {
                logsData = data;
              }
            }
          }
          return logsData;
        })(),

        // Leaves Query
        (async () => {
          let leavesData: any[] = [];
          if (compIdVal !== null) {
            const { data } = await supabase
              .from('leave_requests')
              .select('*')
              .eq('company_id', compIdVal)
              .order('id', { ascending: false });
            if (data) leavesData = data;
          }
          if (leavesData.length === 0) {
            const { data } = await supabase
              .from('leave_requests')
              .select('*')
              .order('id', { ascending: false });
            if (data) {
              if (compIdVal !== null) {
                const filteredInJs = data.filter(l => l.company_id == compIdVal);
                leavesData = filteredInJs.length > 0 ? filteredInJs : data;
              } else {
                leavesData = data;
              }
            }
          }
          return (leavesData || []).filter(l => l && l.id != null && l.id !== '');
        })()
      ];

      const [mappedEmployees, rawLogsData, filteredLeaves] = await Promise.all(fetchPromises);

      setEmployees(mappedEmployees);

      const mappedLogs = rawLogsData.map(l => mapLogFromDB(l, mappedEmployees)).filter(Boolean);
      setLogs(mappedLogs);

      setLeaves(filteredLeaves);
      setDataError(null);
    } catch (err: any) {
      console.warn("Exception fetching data in EmployerDashboard:", err);
    }
  };

  useEffect(() => {
    fetchEmployeesFromDB();
  }, [employerUser?.whatsApp]);

  // Force fetch on mount
  useEffect(() => {
    fetchEmployeesFromDB();
  }, []);

  // Polling for real-time updates as a fallback (since Supabase Realtime handles instant events)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmployeesFromDB();
    }, 60000); // Gentle 60-second background fallback
    
    return () => clearInterval(interval);
  }, [employerUser?.whatsApp]);

  // Supabase Realtime subscription on attendance_logs and employees for instant live updates
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channelName = `attendance_logs_rt_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs'
        },
        (payload) => {
          console.log("Realtime attendance_logs event received in EmployerDashboard:", payload);
          fetchEmployeesFromDB();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        (payload) => {
          console.log("Realtime employees event received in EmployerDashboard:", payload);
          fetchEmployeesFromDB();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests'
        },
        (payload) => {
          console.log("Realtime leave_requests event received in EmployerDashboard:", payload);
          fetchEmployeesFromDB();
        }
      )
      .on('broadcast', { event: 'attendance_logged' }, (payload) => {
        console.log("Broadcast attendance_logged received in EmployerDashboard:", payload);
        fetchEmployeesFromDB();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employerUser?.whatsApp]);

  const createdAt = currentCompany.created_at || currentCompany.registered_at || employerUser.created_at;

  const trialStatus = calculateTrialStatus(
    createdAt,
    billingStatus === "active" ? "Active" : currentCompany.status,
    billingPlan || currentCompany.plan
  );

  const billingDetails = {
    type: trialStatus.trialExpired ? ("expired" as const) : billingStatus === "active" ? ("active" as const) : ("trial" as const),
    daysLeft: trialStatus.daysRemaining,
    isExpired: trialStatus.trialExpired,
    label: trialStatus.badgeLabel
  };

  const isGated = trialStatus.isGated;
  
  const [localEmployees, setLocalEmployees] = useState<any[]>(initialEmployees || []);
  const rawEmployees = propEmployees || localEmployees || [];
  const employees = Array.isArray(rawEmployees) ? rawEmployees : [];
  const setEmployees = propSetEmployees || setLocalEmployees;

  const [zones, setZones] = useState<any[]>(() => {
    try {
      const compId = currentCompany?.id || employerUser?.company_id || employerUser?.id;
      const stored = (compId ? localStorage.getItem(`geofence_anchors_${compId}`) : null) || localStorage.getItem('presensic_saved_locations');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    const fetchAnchors = async () => {
      const compId = currentCompany?.id || employerUser?.company_id || employerUser?.id;
      let dbAnchors: any[] = [];
      const supabase = getSupabase();

      if (supabase && compId) {
        try {
          const { data } = await supabase
            .from('geofence_anchors')
            .select('*')
            .eq('company_id', compId);

          if (data && data.length > 0) {
            dbAnchors = data.map(d => {
              let displayName = d.location_name || d.name || "Office Anchor";
              let address = d.formatted_address || "";
              if (d.name && d.name.includes(" | ")) {
                const parts = d.name.split(" | ");
                displayName = parts[0];
                address = parts[1];
              }
              return {
                id: String(d.id),
                name: displayName,
                address: address,
                lat: Number(d.latitude),
                lng: Number(d.longitude),
                radius: Number(d.radius_meters || d.radius || 150),
                activeEmployees: 0,
                status: "Active"
              };
            });
          }
        } catch (err) {
          console.warn("Notice: Error fetching geofence anchors in EmployerDashboard:", err);
        }
      }

      // Merge with local storage
      try {
        const stored = (compId ? localStorage.getItem(`geofence_anchors_${compId}`) : null) || localStorage.getItem('presensic_saved_locations');
        if (stored) {
          const localAnchors = JSON.parse(stored);
          if (Array.isArray(localAnchors)) {
            const existingIds = new Set(dbAnchors.map(a => String(a.id)));
            const existingNames = new Set(dbAnchors.map(a => a.name.toLowerCase()));
            for (const la of localAnchors) {
              if (la && la.name && !existingIds.has(String(la.id)) && !existingNames.has(la.name.toLowerCase())) {
                dbAnchors.push(la);
              }
            }
          }
        }
      } catch (e) {}

      // Fallback: If still no anchors but employees have assigned zones, populate from employee zones
      if (dbAnchors.length === 0 && Array.isArray(employees) && employees.length > 0) {
        const empZones = Array.from(new Set(employees.map(e => e.zone).filter(Boolean)));
        for (const ez of empZones) {
          dbAnchors.push({
            id: `loc-${ez.toLowerCase().replace(/\s+/g, '-')}`,
            name: ez,
            address: ez,
            lat: ez.toLowerCase().includes("marathon nexzone") ? 18.9658757 : 18.96,
            lng: ez.toLowerCase().includes("marathon nexzone") ? 73.1269787 : 73.12,
            radius: 150,
            activeEmployees: 0,
            status: "Active"
          });
        }
      }

      if (dbAnchors.length > 0) {
        setZones(dbAnchors);
      }
    };

    fetchAnchors();
  }, [currentCompany?.id, employerUser?.company_id, employerUser?.id]);

  useEffect(() => {
    if (zones && zones.length > 0) {
      try {
        localStorage.setItem('presensic_saved_locations', JSON.stringify(zones));
        const compId = currentCompany?.id || employerUser?.company_id || employerUser?.id;
        if (compId) {
          localStorage.setItem(`geofence_anchors_${compId}`, JSON.stringify(zones));
        }
      } catch (e) {}
    }
  }, [zones, currentCompany?.id, employerUser?.company_id, employerUser?.id]);

  const [localLogs, setLocalLogs] = useState<any[]>(initialLogs || []);
  const rawLogs = propLogs || localLogs || [];
  const logs = Array.isArray(rawLogs) ? rawLogs : [];
  const setLogs = propSetLogs || setLocalLogs;

  const rawLeaves = propLeaves || [];
  const leaves = Array.isArray(rawLeaves) ? rawLeaves : [];
  const setLeaves = propSetLeaves || (() => {});

  const [dataError, setDataError] = useState<string | null>(null);

  // States for new employee form in the double column layout
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpWhatsApp, setNewEmpWhatsApp] = useState("");
  const [newEmpZone, setNewEmpZone] = useState("");

  // Credentials and Bulk Import Modal States
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; id: string; pin: string; email: string; whatsapp: string } | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkErrorSummary, setBulkErrorSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [downloadableResults, setDownloadableResults] = useState<any[] | null>(null);

  // Handle bulk file change
  const handleBulkFileChange = (file: File) => {
    setBulkImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // sheet_to_json returning rows as arrays
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rows.length < 2) {
          alert("The uploaded file does not contain any data rows.");
          setBulkImportFile(null);
          return;
        }

        // Get headers and trim
        const rawHeaders = rows[0].map(h => (h || "").toString().trim());
        
        // Robust case-insensitive header matching
        const fullNameIdx = rawHeaders.findIndex(h => /full\s*name/i.test(h));
        const roleTitleIdx = rawHeaders.findIndex(h => /role\s*title|designation/i.test(h));
        const emailIdx = rawHeaders.findIndex(h => /employee\s*email|email/i.test(h));
        const whatsappIdx = rawHeaders.findIndex(h => /whatsapp\s*number|whatsapp|phone|contact/i.test(h));
        const geofenceIdx = rawHeaders.findIndex(h => /tracking\s*geofence|geofence|zone/i.test(h));

        if (fullNameIdx === -1 || roleTitleIdx === -1 || emailIdx === -1 || whatsappIdx === -1) {
          alert("Missing required columns in sheet! Please ensure your file has columns: Full Name, Role Title, Employee Email, and WhatsApp Number.");
          setBulkImportFile(null);
          return;
        }

        const validatedRows = [];
        for (let i = 1; i < rows.length; i++) {
          const rowData = rows[i];
          if (!rowData || rowData.length === 0 || rowData.every(cell => cell === null || cell === undefined || cell === "")) {
            continue; // Skip empty rows
          }

          const fullName = (rowData[fullNameIdx] || "").toString().trim();
          const roleTitle = (rowData[roleTitleIdx] || "").toString().trim();
          const email = emailIdx !== -1 && rowData[emailIdx] ? rowData[emailIdx].toString().trim() : "";
          const whatsapp = whatsappIdx !== -1 && rowData[whatsappIdx] ? rowData[whatsappIdx].toString().trim() : "";
          const geofence = geofenceIdx !== -1 && rowData[geofenceIdx] ? rowData[geofenceIdx].toString().trim() : (zones[0]?.name || "");

          const errors: string[] = [];
          if (!fullName) errors.push("Full Name is required");
          if (!roleTitle) errors.push("Role Title is required");
          if (!email) {
            errors.push("Email is required");
          } else if (!/.+@.+\..+/.test(email)) {
            errors.push("Invalid Email format");
          }
          if (!whatsapp) {
            errors.push("WhatsApp Number is required");
          } else {
            const cleanNum = whatsapp.replace(/\D/g, "");
            if (cleanNum.length < 10) {
              errors.push("WhatsApp Number must have at least 10 digits");
            }
          }
          if (geofence && !zones.find(z => z.name === geofence)) {
            errors.push(`Invalid location: ${geofence}`);
          }

          validatedRows.push({
            id: i,
            fullName,
            roleTitle,
            email,
            whatsapp,
            geofence,
            errors,
            isValid: errors.length === 0
          });
        }

        setBulkRows(validatedRows);
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Please upload a valid CSV or Excel file.");
        setBulkImportFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };



  const [fetchedCompanyId, setFetchedCompanyId] = useState<number | string | null>(null);

  // Policy Settings state with Supabase integration
  const activeCompanyIdForSettings = fetchedCompanyId || currentCompany?.id || employerUser?.company_id || employerUser?.id;
  const {
    settings: systemSettings,
    loading: systemSettingsLoading,
    saving: systemSettingsSaving,
    error: systemSettingsError,
    setSettings: updateSystemSettings,
    saveSettings,
    refreshSettings
  } = useSystemSettings(activeCompanyIdForSettings);

  // Auto Logout Hook driven by systemSettings.auto_logout_minutes
  useAutoLogout(systemSettings?.auto_logout_minutes, onLogOut);

  const [settingsToast, setSettingsToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  useEffect(() => {
    if (settingsToast.show) {
      const timer = setTimeout(() => setSettingsToast(prev => ({ ...prev, show: false })), 4000);
      return () => clearTimeout(timer);
    }
  }, [settingsToast.show]);

  const handleSaveSettings = async () => {
    const resolvedCompanyId = fetchedCompanyId || currentCompany?.id || employerUser?.company_id || employerUser?.id;
    console.log("DEBUG handleSaveSettings called:", {
      currentCompany,
      currentCompanyId: currentCompany?.id,
      employerUser,
      employerCompanyId: employerUser?.company_id,
      employerUserId: employerUser?.id,
      fetchedCompanyId,
      finalResolvedId: resolvedCompanyId
    });

    if (!resolvedCompanyId) {
      console.error("Save settings error: No active company ID found across sources.", {
        currentCompany,
        currentCompanyId: currentCompany?.id,
        employerUser,
        employerCompanyId: employerUser?.company_id,
        employerUserId: employerUser?.id,
        fetchedCompanyId,
        finalResolvedId: resolvedCompanyId
      });
      setSettingsToast({ show: true, message: "No active company ID found to save settings.", type: "error" });
      return;
    }
    try {
      await saveSettings();
      setSettingsToast({ show: true, message: "Global Configuration saved successfully to database!", type: "success" });
    } catch (err: any) {
      console.error("Save settings failed with error:", err);
      setSettingsToast({ show: true, message: err?.message || err?.details || "Failed to save settings.", type: "error" });
    }
  };
  
  // Data & Security
  const [twoStepAuth, setTwoStepAuth] = useState(false);
  const [autoLogout, setAutoLogout] = useState("30 min");

  const [settingsSaved, setSettingsSaved] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");
  const [attendanceDateMode, setAttendanceDateMode] = useState<"today" | "yesterday" | "custom">("today");
  const [attendanceCustomDate, setAttendanceCustomDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [visibleCount, setVisibleCount] = useState(15);
  const [visibleTodayCount, setVisibleTodayCount] = useState(15);
  const [editingPinEmpId, setEditingPinEmpId] = useState<string | null>(null);
  const [editedPinValue, setEditedPinValue] = useState("");
  const [pinResetInputs, setPinResetInputs] = useState<{[key: string]: string}>({});
  const [editingLocationEmpId, setEditingLocationEmpId] = useState<string | null>(null);
  const [editedLocationValue, setEditedLocationValue] = useState("");
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedEmpForShift, setSelectedEmpForShift] = useState<any>(null);
  const [editedShiftSettings, setEditedShiftSettings] = useState<EmployeeShiftSettings>({
    shift_type: "fixed",
    shift_start: "09:00",
    shift_end: "18:00",
    grace_period: 15
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState<any | null>(null);

  // Seat Limit & Payment States
  const [planLimit, setPlanLimit] = useState(500);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<any>(null);
  const [pendingBulkEmployees, setPendingBulkEmployees] = useState<any[]>([]);
  const [upgradeType, setUpgradeType] = useState<"Starter" | "AddSeat">("Starter");

  // Onboarding success modal states
  const [isOnboardingSuccessModalOpen, setIsOnboardingSuccessModalOpen] = useState(false);
  const [onboardingSummaryEmployees, setOnboardingSummaryEmployees] = useState<any[]>([]);

  // WhatsApp notification modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);

  // Location Details Modal States
  const [selectedLocationRecord, setSelectedLocationRecord] = useState<any | null>(null);

  const handleExportCSV = () => {
    const headers = ["Employee ID", "Employee Name", "Role", "Status", "Check-In Time", "Check-Out Time", "Geofence / GPS Status"];
    
    const targetDate = (() => {
      const d = new Date();
      if (attendanceDateMode === "yesterday") {
        d.setDate(d.getDate() - 1);
        return d;
      } else if (attendanceDateMode === "custom") {
        const parsed = new Date(attendanceCustomDate);
        return isNaN(parsed.getTime()) ? d : parsed;
      }
      return d;
    })();
    const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const todayLogs = logs.filter(l => {
      const t = l.location_timestamp || l.created_at || l.fullTimestamp || l.time || l.timestamp;
      if (!t) return false;
      try {
        const d = new Date(t);
        if (isNaN(d.getTime())) {
          return String(t).includes(targetDateStr);
        }
        return d.getFullYear() === targetDate.getFullYear() && 
               d.getMonth() === targetDate.getMonth() && 
               d.getDate() === targetDate.getDate();
      } catch (e) {
        return false;
      }
    });

    const records = employees.map(emp => {
      const empLogs = todayLogs.filter(l => 
        String(l.employee_id) === String(emp.id) || 
        Number(l.employee_id) === Number(emp.id) || 
        String(l.employee_id).toLowerCase() === String(emp.id).toLowerCase() ||
        l.employee?.toLowerCase() === emp.name?.toLowerCase()
      );
      const isLeaveToday = leaves.some(l => {
        const matchesEmp = String(l.employee_id) === String(emp.id) || Number(l.employee_id) === Number(emp.id) || l.name?.toLowerCase() === emp.name?.toLowerCase();
        if (!matchesEmp) return false;
        const statusVal = (l.status || "").toLowerCase();
        if (statusVal !== "approved" && statusVal !== "pending") return false;
        const sDate = l.start_date || l.startDate;
        const eDate = l.end_date || l.endDate;
        if (sDate && eDate) {
          return targetDateStr >= sDate && targetDateStr <= eDate;
        }
        return false;
      });

      let status = "Absent";
      let checkInTime = null;
      let checkOutTime = null;
      let isInsideGeofence: boolean | null = null;
      let hasFaceFailure = false;
      let hasGpsFailure = false;

      if (isLeaveToday) {
        status = "On Leave";
      } else if (empLogs.length > 0) {
        isInsideGeofence = true;
        const sorted = [...empLogs].sort((a, b) => new Date(a.created_at || a.time || 0).getTime() - new Date(b.created_at || b.time || 0).getTime());
        const checkInLog = sorted.find(l => isCheckInLog(l)) || sorted[0];
        const checkOutLog = sorted.slice().reverse().find(l => isCheckOutLog(l));
        const latestLog = sorted[sorted.length - 1];

        checkInTime = checkInLog ? (checkInLog.created_at || checkInLog.location_timestamp || checkInLog.time) : (sorted[0]?.created_at || sorted[0]?.time);
        const hasCheckedOut = sorted.some(l => isCheckOutLog(l)) || ((latestLog.status || "").toLowerCase().includes("out")) || ((latestLog.attendance_type || "").toLowerCase().includes("out"));
        if (hasCheckedOut) {
          status = "Checked Out";
          checkOutTime = checkOutLog ? (checkOutLog.created_at || checkOutLog.location_timestamp || checkOutLog.time) : (latestLog.created_at || latestLog.location_timestamp || latestLog.time);
        } else {
          status = "Checked In";
        }

        empLogs.forEach(l => {
          if (l.isNotRegistered || (l.distance && l.distance > (currentCompany?.geofence_radius || 100)) || l.gps_verified === false || l.inside_geofence === false) {
            isInsideGeofence = false;
            hasGpsFailure = true;
          }
          if (l.status === "warning" || l.face_verified === false || l.verification_status === "failed") {
            hasFaceFailure = true;
          }
        });
      }

      return {
        emp,
        status,
        checkInTime,
        checkOutTime,
        isInsideGeofence,
        hasFaceFailure,
        hasGpsFailure
      };
    });

    const filtered = records.filter(({ emp }) => {
      if (!attendanceSearchQuery) return true;
      const query = attendanceSearchQuery.toLowerCase();
      return (
        emp.name?.toLowerCase().includes(query) ||
        emp.role?.toLowerCase().includes(query) ||
        String(emp.id).toLowerCase().includes(query)
      );
    });

    const csvRows = [headers.join(",")];
    filtered.forEach(({ emp, status, checkInTime, checkOutTime, isInsideGeofence, hasFaceFailure, hasGpsFailure }) => {
      const formatTime = (isoString: any) => {
        if (!isoString) return "-";
        try {
          const d = new Date(isoString);
          if (isNaN(d.getTime())) return String(isoString);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch(e) {
          return "-";
        }
      };

      const geoStatus = hasFaceFailure || hasGpsFailure 
        ? "Verification Failed" 
        : (isInsideGeofence === null ? "-" : (isInsideGeofence ? "Inside Geofence" : "Outside Geofence"));

      const row = [
        `"${emp.id || ''}"`,
        `"${(emp.name || '').replace(/"/g, '""')}"`,
        `"${(emp.role || '').replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${formatTime(checkInTime)}"`,
        `"${formatTime(checkOutTime)}"`,
        `"${geoStatus}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${targetDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for generating credentials
  const generateUniqueLoginID = (existingEmployees: any[]) => {
    let id;
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      id = `PRES-${randomNum}`;
      isUnique = !existingEmployees.find(e => e.id === id);
    }
    return id;
  };

  const generateUniquePIN = (existingEmployees: any[]) => {
    let pin;
    let isUnique = false;
    while (!isUnique) {
      pin = Math.floor(1000 + Math.random() * 9000).toString();
      isUnique = !existingEmployees.find(e => e.pin === pin);
    }
    return pin;
  };

  // Tabs scroll state for mobile
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);

  // Update indicator visibility on scroll
  const handleTabsScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      // Show right indicator if there is content to the right
      setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 10);
      // Show left indicator if there is content to the left
      setShowLeftIndicator(scrollLeft > 10);
    }
  };

  useEffect(() => {
    const el = tabsRef.current;
    if (el) {
      handleTabsScroll();
      el.addEventListener("scroll", handleTabsScroll);
      window.addEventListener("resize", handleTabsScroll);
      return () => {
        el.removeEventListener("scroll", handleTabsScroll);
        window.removeEventListener("resize", handleTabsScroll);
      };
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(handleTabsScroll, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const scrollTabsRight = () => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: 150, behavior: "smooth" });
    }
  };

  const scrollTabsLeft = () => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: -150, behavior: "smooth" });
    }
  };

  // Live Feed Tab filter states
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [feedStatusFilter, setFeedStatusFilter] = useState("All");

  // Helper for dynamic addresses and GPS coordinate resolution
  const resolveLogCoordinates = (logOrCoords: any, empZone?: string) => {
    if (logOrCoords?.isNotRegistered) {
      return {
        latLng: "—",
        address: "Not Registered Yet",
        fullCoords: "—",
        hasRealGps: false,
        isNotRegistered: true
      };
    }

    let coordsStr = typeof logOrCoords === "string" ? logOrCoords : (logOrCoords?.coordinates || "");
    let zoneName = typeof logOrCoords === "object" ? (logOrCoords?.zone || empZone || "") : (typeof logOrCoords === "string" ? logOrCoords : (empZone || ""));
    if (zoneName === "Unassigned" || zoneName === "—") zoneName = "";

    let lat = typeof logOrCoords === "object" ? (logOrCoords?.employee_latitude ?? logOrCoords?.gps_latitude ?? logOrCoords?.latitude ?? logOrCoords?.gpsLatitude) : null;
    let lng = typeof logOrCoords === "object" ? (logOrCoords?.employee_longitude ?? logOrCoords?.gps_longitude ?? logOrCoords?.longitude ?? logOrCoords?.gpsLongitude) : null;

    // 1. Direct coordinates numbers
    if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng)) && Number(lat) !== 0 && Number(lng) !== 0) {
      const latNum = Number(lat).toFixed(6);
      const lngNum = Number(lng).toFixed(6);
      return {
        latLng: `${latNum}, ${lngNum}`,
        address: zoneName || "Recorded Location",
        fullCoords: `${latNum}, ${lngNum}${zoneName ? `|${zoneName}` : ''}`,
        hasRealGps: true,
        isNotRegistered: false
      };
    }

    // 2. Parse coordsStr
    if (coordsStr && coordsStr !== "—" && coordsStr !== "No location recorded" && coordsStr !== "Not Registered Yet") {
      const parts = coordsStr.split("|");
      const firstPart = parts[0].trim();
      const secondPart = parts.length > 1 ? parts[1].trim() : "";

      const match = firstPart.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
      if (match) {
        return {
          latLng: `${Number(match[1]).toFixed(6)}, ${Number(match[2]).toFixed(6)}`,
          address: secondPart || zoneName || "Recorded Location",
          fullCoords: coordsStr,
          hasRealGps: true,
          isNotRegistered: false
        };
      }

      if (!zoneName && firstPart && !firstPart.includes(",")) {
        zoneName = firstPart;
      }
    }

    // 3. Match zoneName against zones (Office Location Anchors)
    if (zoneName && Array.isArray(zones) && zones.length > 0) {
      const matchedZone = zones.find(z => 
        z && z.name && (
          z.name.toLowerCase() === zoneName.toLowerCase() || 
          (z.address && z.address.toLowerCase().includes(zoneName.toLowerCase())) ||
          zoneName.toLowerCase().includes(z.name.toLowerCase())
        )
      );
      if (matchedZone && matchedZone.lat && matchedZone.lng) {
        const latNum = Number(matchedZone.lat).toFixed(6);
        const lngNum = Number(matchedZone.lng).toFixed(6);
        return {
          latLng: `${latNum}, ${lngNum}`,
          address: matchedZone.name || zoneName,
          fullCoords: `${latNum}, ${lngNum}|${matchedZone.name || zoneName}`,
          hasRealGps: true,
          isNotRegistered: false
        };
      }
    }

    // 4. Fallback if zoneName exists (e.g. "Marathon Nextzone")
    if (zoneName) {
      return {
        latLng: "—",
        address: zoneName,
        fullCoords: zoneName,
        hasRealGps: false,
        isNotRegistered: false
      };
    }

    return {
      latLng: "—",
      address: "Not Registered Yet",
      fullCoords: "—",
      hasRealGps: false,
      isNotRegistered: true
    };
  };

  const getFriendlyAddress = (coords: any, empZone?: string) => {
    const resolved = resolveLogCoordinates(coords, empZone);
    return resolved.address;
  };

  const getLatLong = (coords: any, empZone?: string) => {
    const resolved = resolveLogCoordinates(coords, empZone);
    return resolved.latLng;
  };

  const totalStaff = (employees || []).length;
  
  // Unified Attendance Calculation
  const attendanceStats = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;
    
    // Filter logs for today using local time comparison
    const todaysLogs = logs.filter(log => {
      const ts = log.fullTimestamp || log.timestamp || log.time || log.created_at;
      if (!ts) return false;
      const d = new Date(ts);
      if (isNaN(d.getTime())) return false;
      const logTime = d.getTime();
      return logTime >= startOfToday && logTime < endOfToday;
    });

    // Get set of employee IDs who checked in today
    const presentEmployeeIds = new Set(todaysLogs.map(l => l.employee_id));
    
    // On Field: Checked in but not checked out today
    const checkedInIds = new Set(todaysLogs.filter(l => l.method?.toLowerCase().includes("check-in")).map(l => l.employee_id));
    const checkedOutIds = new Set(todaysLogs.filter(l => l.method?.toLowerCase().includes("check-out")).map(l => l.employee_id));
    const onFieldEmployeeIds = [...checkedInIds].filter(id => !checkedOutIds.has(id));

    const presentCount = presentEmployeeIds.size;
    const absentCount = Math.max(0, totalStaff - presentCount);
    const onFieldCount = onFieldEmployeeIds.length;
    
    return {
      presentCount,
      absentCount,
      onFieldCount
    };
  }, [logs, employees, totalStaff]);

  const { presentCount, absentCount, onFieldCount } = attendanceStats;
  const lateCount = (employees || []).filter(e => e.status === "Late Arrival").length;
  const companyLeaves = (leaves || []).filter(l => {
    if (!l) return false;
    // If we have no company, or the company ID matches, include it.
    if (!currentCompany?.id) return true; // Show all if no company ID context
    return !l.company_id || String(l.company_id) === String(currentCompany.id);
  });
  const regularLeaves = companyLeaves.filter(l => l && l.leave_type !== "PIN_RESET");
  const pendingLeavesCount = regularLeaves.filter(l => l && (l.status === "Pending" || l.status === "pending")).length;
  const totalLeavesCount = regularLeaves.length;
  const pendingPinResetRequests = companyLeaves.filter(l => l && l.leave_type === "PIN_RESET" && (l.status === "Pending" || l.status === "pending"));

  // Average geofencing radius
  const avgRadius = (zones || []).length ? Math.round((zones || []).reduce((acc, z) => acc + z.radius, 0) / (zones || []).length) : 150;
  
  console.log("DEBUG: currentCompany:", currentCompany);
  console.log("DEBUG: leaves:", leaves);
  console.log("DEBUG: companyLeaves:", companyLeaves);
  console.log("DEBUG: company_id type:", typeof currentCompany?.id);
  
  // Haversine formula to calculate distance in meters between two lat/lng points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // in metres
  };
  // Handle Log Approval/Rejection
  const handleApproveLog = (logId: string) => {
    setLogs(prev => prev.map(log => 
      log.id === logId ? { ...log, status: "verified" } : log
    ));
  };

  const handleRejectLog = (logId: string) => {
    setLogs(prev => prev.map(log => 
      log.id === logId ? { ...log, status: "rejected" } : log
    ));
  };

  const handleResetPinRequest = async (requestId: string | number, empId: string, empName: string, newPin: string) => {
    if (isGated) {
      alert("Your 5-Day Free Trial Has Ended. Please upgrade your subscription to continue.");
      return;
    }
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      alert("Please enter a valid 4-digit numeric PIN.");
      return;
    }
    try {
      const supabase = getSupabase();
      if (supabase) {
        // 1. Update Employee PIN
        const { error: empErr } = await supabase.from('employees').update({ pin: newPin }).eq('id', empId);
        if (empErr) throw empErr;

        // 2. Update Request Status to Approved (Resolved)
        const { error: reqErr } = await supabase.from('leave_requests').update({
          status: 'Approved',
          approved_by: 'Employer',
          approved_at: new Date().toISOString()
        }).eq('id', requestId);
        if (reqErr) throw reqErr;
      }

      // 3. Update Local States
      if (setEmployees) {
        setEmployees(prev => prev.map(e => e.id === empId ? { ...e, pin: newPin } : e));
      }
      if (setLeaves) {
        setLeaves(prev => prev.map(l => l.id === requestId ? { ...l, status: 'Approved' } : l));
      }

      alert(`PIN successfully reset for ${empName} to ${newPin}!`);
    } catch (err: any) {
      console.error("PIN request reset failed:", err);
      alert(`Failed to reset PIN: ${err.message}`);
    }
  };

  const handleUpdateEmployeePin = async (empId: string, empName: string, newPin: string) => {
    if (isGated) {
      alert("Your 5-Day Free Trial Has Ended. Please upgrade your subscription to continue.");
      return;
    }
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.from('employees').update({ pin: newPin }).eq('id', empId);
        if (error) throw error;
      }
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, pin: newPin } : e));
      setEditingPinEmpId(null);
      alert(`PIN updated for ${empName}`);
    } catch (err: any) {
      console.error("Failed to update PIN:", err);
      alert(`Failed to update PIN: ${err.message}`);
    }
  };

  const handleAdminUpdateAvatar = async (e: React.ChangeEvent<HTMLInputElement>, empId: string, empName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supabase = getSupabase();
    if (!supabase) {
      alert("Database connection is not available.");
      return;
    }

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${empId}-${Math.random()}.${fileExt}`;
      let publicUrl = "";

      let { data, error } = await supabase.storage.from('avatars').upload(fileName, file);
      
      if (error && (error.message?.toLowerCase().includes('bucket not found') || (error as any).status === 404)) {
        console.log("Bucket 'avatars' not found, trying to create it dynamically...");
        try {
          const { error: createError } = await supabase.storage.createBucket('avatars', {
            public: true
          });
          if (!createError) {
            const retryResult = await supabase.storage.from('avatars').upload(fileName, file);
            data = retryResult.data;
            error = retryResult.error;
          }
        } catch (bucketErr) {
          console.error("Failed to create bucket dynamically:", bucketErr);
        }
      }

      if (!error && data) {
        const { data: { publicUrl: urlVal } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        publicUrl = urlVal;
      } else {
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      const { error: dbError } = await supabase
        .from('employees')
        .update({ avatar: publicUrl })
        .eq('id', empId);

      if (dbError) throw dbError;

      setEmployees(prev => prev.map(emp => emp.id === empId ? { ...emp, avatar: publicUrl } : emp));
      alert(`Successfully updated reference photo for ${empName}!`);
    } catch (err: any) {
      console.error("Failed to update employee avatar:", err);
      alert(`Failed to update photo: ${err.message || err}`);
    }
  };

  const handleUpdateEmployeeZone = async (empId: string, empName: string, newZone: string) => {
    if (isGated) {
      alert("Your 5-Day Free Trial Has Ended. Please upgrade your subscription to continue.");
      return;
    }
    const targetZone = newZone || (zones && zones[0]?.name) || "";
    try {
      const supabase = getSupabase();
      if (supabase) {
        let updateObj: any = { 
          tracking_geofence: targetZone,
          zone: targetZone
        };
        let { error } = await supabase.from('employees').update(updateObj).eq('id', empId);
        if (error && (error.code === '42703' || error.message?.includes('column'))) {
          delete updateObj.zone;
          const retry = await supabase.from('employees').update(updateObj).eq('id', empId);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
      }
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, zone: targetZone, trackingGeofence: targetZone } : e));
      setEditingLocationEmpId(null);
      alert(`Location updated for ${empName}`);
    } catch (err: any) {
      console.error("Failed to update Location:", err);
      alert(`Failed to update Location: ${err.message}`);
    }
  };

  const handleDeactivateEmployee = async (empId: string) => {
    if (isGated) return;
    try {
      const supabase = getSupabase();
      if (supabase) {
        // Just delete them from the database to "deactivate" them completely,
        // or set status to something else. Our schema doesn't have `isDeactivated`.
        // The safest operation is to delete the employee row.
        const { error } = await supabase.from('employees').delete().eq('id', empId);
        if (error) throw error;
      }
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, isDeactivated: true } : e));
    } catch (err: any) {
      console.error("Failed to deactivate employee:", err);
      alert(`Failed to deactivate employee: ${err.message}`);
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        // Delete leave requests for the employee to avoid orphaned references
        const { error: leaveErr } = await supabase.from('leave_requests').delete().eq('employee_id', empId);
        if (leaveErr) console.warn("Notice: non-blocking issue removing leave requests on delete:", leaveErr);

        // Delete attendance logs for the employee
        const { error: logsErr } = await supabase.from('attendance_logs').delete().eq('employee_id', empId);
        if (logsErr) console.warn("Notice: non-blocking issue removing attendance logs on delete:", logsErr);

        // Permanently delete the employee
        const { error } = await supabase.from('employees').delete().eq('id', empId);
        if (error) throw error;
      }

      // Remove immediately from all local states without full reload
      setEmployees(prev => prev.filter(e => e.id !== empId));
      setLogs(prev => prev.filter(log => log.employee_id !== empId));
      setLeaves(prev => prev.filter(l => l.employee_id !== empId));

      setDeletingEmployee(null);
    } catch (err: any) {
      console.error("Failed to permanently delete employee:", err);
      alert(`Failed to permanently delete employee: ${err.message}`);
    }
  };

  const handleUpdateEmployeeShiftSettings = async () => {
    if (isGated) {
      alert("Your 5-Day Free Trial Has Ended. Please upgrade your subscription to continue.");
      return;
    }
    if (!selectedEmpForShift) return;

    try {
      const supabase = getSupabase();
      if (supabase) {
        // Stringify the shift settings into the department column
        const currentName = extractDepartmentName(selectedEmpForShift.department);
        const newDepartmentStr = stringifyEmployeeShiftSettings(currentName, editedShiftSettings);
        
        const { error } = await supabase.from('employees').update({
          department: newDepartmentStr
        }).eq('id', selectedEmpForShift.id);

        if (error) throw error;

        // Update local state
        setEmployees(prev => prev.map(e => e.id === selectedEmpForShift.id ? { ...e, department: newDepartmentStr } : e));
        setIsShiftModalOpen(false);
      }
    } catch (err: any) {
      console.error("Failed to update employee shift settings:", err);
      alert(`Failed to update settings: ${err.message}`);
    }
  };

  // Add Employee Handler
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpRole.trim() || !newEmpEmail.trim() || !newEmpWhatsApp.trim()) {
      alert("All fields are required!");
      return;
    }

    const emailClean = newEmpEmail.trim().toLowerCase();
    const whatsappClean = newEmpWhatsApp.trim();

    // STEP 9: Verify unique constraints locally first
    const existsEmailLocal = (employees || []).some(emp => emp.email?.toLowerCase() === emailClean);
    if (existsEmailLocal) {
      alert(`Validation Error: An employee with email "${emailClean}" already exists in your local team list.`);
      return;
    }

    const existsWhatsAppLocal = (employees || []).some(emp => emp.whatsapp === whatsappClean || emp.phone === whatsappClean);
    if (existsWhatsAppLocal) {
      alert(`Validation Error: An employee with WhatsApp number "${whatsappClean}" already exists in your local team list.`);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      alert("Database connection failed. Please try again.");
      return;
    }

    try {
      let comp: any = null;
      if (employerUser.whatsApp) {
        const { data: c1 } = await supabase.from('companies').select('id').eq('whatsapp', employerUser.whatsApp).maybeSingle();
        if (c1) comp = c1;
      }
      if (!comp && employerUser.email) {
        const { data: c2 } = await supabase.from('companies').select('id').eq('email', employerUser.email).maybeSingle();
        if (c2) comp = c2;
      }
      if (!comp) {
        const { data: allComps } = await supabase.from('companies').select('id, whatsapp, email, org_name');
        if (allComps && allComps.length > 0) {
          comp = allComps[0];
        } else {
          const { data: newComp } = await supabase.from('companies').insert([{
            org_name: employerUser.orgName || 'Presensic HQ',
            full_name: employerUser.name || employerUser.fullName || 'Employer',
            whatsapp: employerUser.whatsApp || '+10000000000',
            email: employerUser.email || 'employer@presensic.com',
            role: 'Trial Active',
            selected_plan: 'Starter',
            created_at: new Date().toISOString()
          }]).select('id').maybeSingle();
          comp = newComp || null;
        }
      }

      if (!comp || !comp.id) {
        // Fallback to first company in database if available
        const { data: fallbackComps } = await supabase.from('companies').select('id').limit(1);
        if (fallbackComps && fallbackComps.length > 0) {
          comp = fallbackComps[0];
        }
      }

      if (!comp || !comp.id) {
        console.error("[AUDIT] Error finding or creating company record.");
        alert("Failed to create employee: Company record not found. Please re-login.");
        return;
      }
      console.log("[AUDIT] Found Company ID:", comp.id);

      // STEP 9: Verify unique constraints against database as well (safely)
      try {
        const { data: existingDbEmps, error: dbCheckErr } = await supabase
          .from('employees')
          .select('email, whatsapp, phone')
          .or(`email.eq.${emailClean},whatsapp.eq.${whatsappClean},phone.eq.${whatsappClean}`);

        if (!dbCheckErr && existingDbEmps && existingDbEmps.length > 0) {
          const matchedEmail = existingDbEmps.some(e => e.email?.toLowerCase() === emailClean);
          const matchedWhatsApp = existingDbEmps.some(e => e.whatsapp === whatsappClean || e.phone === whatsappClean);
          if (matchedEmail) {
            alert(`Validation Error: Email "${emailClean}" is already registered to an employee in our database.`);
            return;
          }
          if (matchedWhatsApp) {
            alert(`Validation Error: WhatsApp number "${whatsappClean}" is already registered to an employee in our database.`);
            return;
          }
        }
      } catch (err) {
        console.log("[AUDIT] DB check skipped or bypassed:", err);
      }

      const generatedId = generateUniqueLoginID(employees || []);
      const generatedPin = generateUniquePIN(employees || []);
      const assignedLocation = newEmpZone || (zones && zones[0]?.name) || "";
      const newEmp = {
        id: generatedId,
        name: newEmpName.trim(),
        role: newEmpRole.trim(),
        email: emailClean,
        phone: whatsappClean,
        whatsapp: whatsappClean,
        pin: generatedPin,
        zone: assignedLocation,
        status: "Absent" as const,
        checkInTime: "—",
        checkOutTime: "—",
        lastPunch: "—",
        avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=100&h=100&fit=crop&crop=face`
      };

      // Check Plan Limit
      if ((employees || []).length >= planLimit) {
        setPendingEmployee(newEmp);
        setUpgradeType((employees || []).length >= 50 ? "AddSeat" : "Starter");
        setIsUpgradeModalOpen(true);
        return;
      }

      // STEP 2 & 3: Map employee to DB structure and log the payload
      let dbEmp = mapEmployeeToDB(newEmp, comp.id);
      console.log("FORM DATA", { newEmpName, newEmpRole, newEmpEmail, newEmpWhatsApp, newEmpZone });
      console.log("INSERT PAYLOAD", dbEmp);
      console.log("CURRENT COMPANY ID", comp.id);
      console.log("CURRENT USER", employerUser);
      console.log("CURRENT SESSION", "No session");

      // STEP 4: Wrap the insert in try/catch and print full Supabase diagnostics on error
      let { data: insertResult, error: insertErr } = await supabase
        .from('employees')
        .insert([dbEmp])
        .select();

      if (insertErr && (insertErr.code === '42703' || insertErr.message?.includes('column'))) {
        delete dbEmp.zone;
        const retry = await supabase
          .from('employees')
          .insert([dbEmp])
          .select();
        insertResult = retry.data;
        insertErr = retry.error;
      }

      console.log("SUPABASE RESPONSE", insertResult);

      if (insertErr) {
        console.error("SUPABASE ERROR", insertErr);
        console.error("SUPABASE ERROR CODE", insertErr.code);
        console.error("SUPABASE DETAILS", insertErr.details);
        console.error("SUPABASE HINT", insertErr.hint);
        alert(`Failed to create employee:\nCode: ${insertErr.code}\nMessage: ${insertErr.message}\nDetails: ${insertErr.details}\nHint: ${insertErr.hint}`);
        return;
      }

      // Show Onboarding Modal
      setOnboardingSummaryEmployees([newEmp]);
      setIsOnboardingSuccessModalOpen(true);

      // STEP 5: Immediately fetch employees again from Supabase. Do not use local state.
      console.log("[AUDIT] Refreshing Active Employees roster from Supabase...");
      await fetchEmployeesFromDB();

      // Reset Form Fields
      setNewEmpName("");
      setNewEmpRole("");
      setNewEmpEmail("");
      setNewEmpWhatsApp("");
    } catch (err: any) {
      console.error("[AUDIT] Exception in handleCreateEmployee:", err);
      alert(`An unexpected error occurred during employee creation:\n${err.message || err || "Unknown Error"}`);
    }
  };

  const handleUpgradePayment = () => {
    setIsProcessingPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
      
      // Simulate success message delay
      setTimeout(() => {
        // Upgrade plan limit
        if (upgradeType === "Starter") {
          setPlanLimit(50);
        } else {
          setPlanLimit(prev => prev + 1);
        }
        
        // Add pending employees
        if (pendingBulkEmployees.length > 0) {
          setEmployees(prev => [...pendingBulkEmployees, ...prev]);
          setPendingBulkEmployees([]);
          setIsBulkImportOpen(false);
        } else if (pendingEmployee) {
          setEmployees(prev => [pendingEmployee, ...prev]);
          
          // Show confirmation for the single employee
          setCreatedCredentials({
            name: pendingEmployee.name,
            id: pendingEmployee.id,
            pin: pendingEmployee.pin,
            email: pendingEmployee.email,
            whatsapp: pendingEmployee.whatsapp
          });
          setPendingEmployee(null);
        }
        
        // Reset modal state
        setIsUpgradeModalOpen(false);
        setPaymentSuccess(false);
      }, 1500);
    }, 2000);
  };

  // Helper to calculate the correct pricing based on exact public pricing page rules
  const calculatePlanPrice = (planName: string, period: "monthly" | "annual") => {
    const cleanedName = planName.replace(" Plan", "");
    if (cleanedName === "Basic") {
      return period === "annual" ? 4999 : 599;
    } else if (cleanedName === "Starter") {
      return period === "annual" ? 12999 : 1499;
    }
    return 0; // Enterprise is Custom Pricing
  };

  const getRazorpayKey = () => {
    const envKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
    if (envKey && envKey !== "rzp_test_placeholder_key" && envKey.trim() !== "") {
      return envKey;
    }
    try {
      const savedKey = localStorage.getItem("temp_razorpay_key_id");
      if (savedKey && savedKey.trim() !== "") {
        return savedKey;
      }
    } catch (e) {}
    return null;
  };

  // Process payment using Razorpay Checkout
  const handleProcessPayment = () => {
    // Clear previous errors/messages
    setRenewalError(null);

    // Determine the price based on currently selected billingPlan and billingPeriod
    const price = calculatePlanPrice(billingPlan, billingPeriod);
    if (price <= 0) {
      alert("Custom pricing applies to Enterprise. Please contact our sales team.");
      return;
    }

    const keyId = getRazorpayKey();
    if (!keyId) {
      setRenewalError("Razorpay Key is not set yet. Please configure VITE_RAZORPAY_KEY_ID.");
      return;
    }

    const loadRazorpay = () => {
      return new Promise((resolve) => {
        if ((window as any).Razorpay) {
          resolve(true);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadRazorpay().then((success) => {
      if (!success) {
        setRenewalError("Failed to load Razorpay SDK. Please check your internet connection.");
        return;
      }

      /*
        PRODUCTION SECURITY NOTE:
        In live deployment, verify payment signature server-side (e.g., via Supabase Edge Function) before marking subscription as active. Current implementation validates via frontend Razorpay success handler.
      */

      const planNameFormatted = billingPlan.endsWith(" Plan") ? billingPlan : `${billingPlan} Plan`;
      const periodFormatted = billingPeriod === "annual" ? "Annual" : "Monthly";

      const options = {
        key: keyId,
        amount: price * 100, // Amount in paise
        currency: "INR",
        name: "Presensic",
        description: `${planNameFormatted} - ${periodFormatted}`,
        image: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=128&fit=crop&q=80",
        handler: async function (response: any) {
          const startDate = new Date().toISOString();

          // 1. Update Supabase database first
          try {
            const supabase = getSupabase();
            if (supabase) {
              if (employerUser?.email) {
                await supabase
                  .from("companies")
                  .update({
                    role: "Subscription Active",
                    selected_plan: billingPlan,
                    billing_cycle: billingPeriod
                  })
                  .eq("whatsapp", employerUser.email);
              }

              if (currentCompany?.id) {
                await supabase
                  .from("employers")
                  .update({
                    plan: billingPlan,
                    status: "Subscription Active"
                  })
                  .eq("company_id", currentCompany.id);
              }
            }
          } catch (e) {
            console.error("Supabase payment update error:", e);
          }

          // 2. Update React state to automatically unlock UI
          setBillingStatus("active");
          setBillingStartDate(startDate);

          if (setCompanies && employerUser?.email) {
            setCompanies((prev: any[]) =>
              prev.map((c) =>
                c.email === employerUser.email || c.name === employerUser.orgName
                  ? {
                      ...c,
                      status: "Subscription Active",
                      plan: billingPlan,
                    }
                  : c
              )
            );
          }

          // Close modal
          setIsRenewalModalOpen(false);

          // Trigger success notice toast
          setPaymentToast({
            show: true,
            message: `Payment successful! Your ${planNameFormatted} subscription is now active`,
            type: "success"
          });
          setTimeout(() => {
            setPaymentToast(null);
          }, 6000);
        },
        prefill: {
          name: employerUser.name || "",
          email: employerUser.email || "",
          contact: employerUser.whatsApp || employerUser.contact || employerUser.phone || ""
        },
        notes: {
          address: "Presensic HQ, Mumbai, India",
          orgName: employerUser.orgName || "PRESENSIC",
          billingPlan: billingPlan,
          billingPeriod: billingPeriod
        },
        theme: {
          color: "#2563EB"
        },
        modal: {
          ondismiss: function () {
            setRenewalError("Payment was not completed. Your trial/plan remains unchanged");
            setPaymentToast({
              show: true,
              message: "Payment was not completed. Your trial/plan remains unchanged",
              type: "error"
            });
            setTimeout(() => {
              setPaymentToast(prev => prev && prev.message.includes("not completed") ? null : prev);
            }, 5000);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setRenewalError("Payment was not completed. Your trial/plan remains unchanged");
        setPaymentToast({
          show: true,
          message: "Payment was not completed. Your trial/plan remains unchanged",
          type: "error"
        });
        setTimeout(() => {
          setPaymentToast(prev => prev && prev.message.includes("not completed") ? null : prev);
        }, 5000);
        console.error("Razorpay payment failed:", response.error);
      });
      rzp.open();
    });
  };

  // Manual Trigger to update feed
  const handleRefreshFeed = () => {
    if (isGated) return; // Prevent telemetry updates when expired
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500); // Keep just a small delay to show feedback if needed
  };




  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-800 flex flex-col font-sans relative" id="employer-dashboard-root">
      {dataError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 text-red-700">
          <p className="font-bold">Error</p>
          <p>{dataError}</p>
        </div>
      )}
      
      {/* 1. Header Navigation Bar (Clean Light Theme) */}
      <header className="bg-white border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {systemSettings?.logo_url ? (
              <img src={systemSettings.logo_url} alt="Logo" className="h-9 w-auto max-w-[140px] object-contain rounded border border-slate-200 p-0.5 bg-slate-50" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
                <Shield className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="text-left">
              <h1 className="text-sm sm:text-md font-bold font-display tracking-tight text-slate-900 leading-tight whitespace-nowrap">
                {systemSettings?.company_name || employerUser.orgName || "Presensic"}
              </h1>
              <p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                {systemSettings?.company_name || employerUser.orgName || "PRESENSIC"} · EMPLOYER PORTAL
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 sm:gap-4 flex-1 min-w-0 w-full md:w-auto">
            {/* Group 1: Trial / Subscription Status & Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsRenewalModalOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer transition-all shadow-xs border whitespace-nowrap shrink-0 ${
                  isGated
                    ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 font-bold"
                    : billingStatus === "active"
                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                }`}
                title="View plans & subscription details"
              >
                {isGated ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span className="font-bold">Trial Expired</span>
                  </>
                ) : billingStatus === "active" ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{billingPlan} Plan</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Trial: {trialStatus.daysRemaining}d</span>
                  </>
                )}
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefreshFeed}
                className={`h-10 w-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer shrink-0 ${
                  isRefreshing ? "animate-spin text-blue-600 border-blue-200 bg-blue-50" : ""
                } ${isGated ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isGated}
                title={isGated ? "Renew your plan to continue using this feature" : "Sync Databases"}
              >
                <RefreshCw className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Group 2: Support & Log Out Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSupportModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] sm:text-xs font-bold border border-slate-200 cursor-pointer transition-all whitespace-nowrap shrink-0"
                title="Raise a Ticket / Report an Issue"
              >
                <Ticket className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Support</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLogOut}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] sm:text-xs font-bold font-display cursor-pointer transition-all shadow-xs shrink-0 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5 text-white shrink-0" />
                <span>Log Out</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10">
        
        {/* Full-width Expiry Banner */}
        {isGated && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-700 mt-0.5">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900 font-display">
                  Your {billingStatus === "trial" ? "Free Trial" : "Subscription"} Has Expired
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  Real-time attendance tracking, automatic syncing, employee provisioning, and biometric geofence anchor settings are currently paused. Historical roster data and punch ledgers remain read-only.
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsRenewalModalOpen(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-display cursor-pointer transition-all shadow-sm whitespace-nowrap"
            >
              Renew Now
            </motion.button>
          </motion.div>
        )}
        
        {/* 2. Stat Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="dashboard-stats-grid">
          
          {/* Card 1: Total Staff */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-32 text-left">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block font-mono">
                TOTAL STAFF
              </span>
              <p className="text-3xl font-bold text-slate-900 mt-1.5 font-display">
                {totalStaff} <span className="text-xs text-slate-500 font-normal">Active</span>
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-auto font-medium">
              Registered tracking profiles
            </p>
            <div className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-600">
              <Users className="h-4 w-4" />
            </div>
          </div>

          {/* Card 2: Present Today */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-32 text-left">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase block font-mono">
                PRESENT TODAY
              </span>
              <p className="text-3xl font-bold text-emerald-600 mt-1.5 font-display">
                {presentCount} <span className="text-xs text-emerald-500 font-normal">Online</span>
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-auto font-medium">
              {totalStaff ? ((presentCount / totalStaff) * 100).toFixed(0) : 0}% attendance rate
            </p>
            <div className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-emerald-50 border border-emerald-100 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>

          {/* Card 3: On Field */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-32 text-left">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-amber-600 uppercase block font-mono">
                ON FIELD
              </span>
              <p className="text-3xl font-bold text-amber-600 mt-1.5 font-display">
                {onFieldCount} <span className="text-xs text-amber-500 font-normal">Active</span>
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-auto font-medium">
              Geofence-verified external anchors
            </p>
            <div className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-amber-50 border border-amber-100 text-amber-600">
              <MapPin className="h-4 w-4" />
            </div>
          </div>

          {/* Card 4: Absent */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-32 text-left">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-rose-600 uppercase block font-mono">
                ABSENT
              </span>
              <p className="text-3xl font-bold text-rose-600 mt-1.5 font-display">
                {absentCount} <span className="text-xs text-rose-500 font-normal">Offline</span>
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-auto font-medium">
              No registered biometric punches
            </p>
            <div className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-rose-50 border border-rose-100 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>

          {/* Card 5: Pending Approvals */}
          <div 
            onClick={() => { setActiveTab("approvals"); setSearchQuery(""); }}
            className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-32 text-left cursor-pointer group"
            id="card-pending-approvals"
          >
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block font-mono">
                PENDING APPROVALS
              </span>
              <p className="text-3xl font-bold text-amber-600 mt-1.5 font-display">
                {pendingLeavesCount}
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-auto font-medium">
              {pendingLeavesCount > 0 ? "Awaiting review" : "All caught up"}
            </p>
            <div className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-amber-50 border border-amber-100 text-amber-600 group-hover:bg-amber-100 transition-colors">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>

        </div>

        {/* 3. Tab Navigation Bar (Clean Light Theme) */}
        <div className="border-b border-slate-200 w-full overflow-hidden relative">
          <div 
            ref={tabsRef}
            className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none -mb-px px-1"
          >
            <button
              onClick={() => { setActiveTab("feed"); setSearchQuery(""); }}
              className={`pb-3 pt-2.5 px-5 text-xs font-bold font-display cursor-pointer transition-all duration-300 flex items-center gap-2 shrink-0 border-b-2 -mb-px rounded-t-lg ${
                activeTab === "feed"
                  ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
              }`}
            >
              <Activity className={`h-3.5 w-3.5 ${activeTab === "feed" ? "text-blue-600" : "text-slate-400"}`} /> Attendance Analytics
            </button>
            <button
              onClick={() => { setActiveTab("team"); setSearchQuery(""); }}
              className={`pb-3 pt-2.5 px-5 text-xs font-bold font-display cursor-pointer transition-all duration-300 flex items-center gap-2 shrink-0 border-b-2 -mb-px rounded-t-lg ${
                activeTab === "team"
                  ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
              }`}
            >
              <Users className={`h-3.5 w-3.5 ${activeTab === "team" ? "text-blue-600" : "text-slate-400"}`} /> Employee Management
            </button>
            <button
              onClick={() => { setActiveTab("approvals"); setSearchQuery(""); }}
              className={`pb-3 pt-2.5 px-5 text-xs font-bold font-display cursor-pointer transition-all duration-300 flex items-center gap-2 shrink-0 border-b-2 -mb-px rounded-t-lg ${
                activeTab === "approvals"
                  ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
              }`}
            >
              <ClipboardCheck className={`h-3.5 w-3.5 ${activeTab === "approvals" ? "text-blue-600" : "text-slate-400"}`} /> Approvals & Leaves
            </button>
            <button
              onClick={() => { setActiveTab("zones"); setSearchQuery(""); }}
              className={`pb-3 pt-2.5 px-5 text-xs font-bold font-display cursor-pointer transition-all duration-300 flex items-center gap-2 shrink-0 border-b-2 -mb-px rounded-t-lg ${
                activeTab === "zones"
                  ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
              }`}
            >
              <MapPin className={`h-3.5 w-3.5 ${activeTab === "zones" ? "text-blue-600" : "text-slate-400"}`} /> Office Locations
            </button>
            <button
              onClick={() => { setActiveTab("settings"); setSearchQuery(""); }}
              className={`pb-3 pt-2.5 px-5 text-xs font-bold font-display cursor-pointer transition-all duration-300 flex items-center gap-2 shrink-0 border-b-2 -mb-px rounded-t-lg ${
                activeTab === "settings"
                  ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
              }`}
            >
              <Settings className={`h-3.5 w-3.5 ${activeTab === "settings" ? "text-blue-600" : "text-slate-400"}`} /> System Settings
            </button>

          </div>

          {/* Scroll Indicators */}
          <AnimatePresence>
            {showLeftIndicator && (
              <motion.button
                key="left-tab-scroll-indicator"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={scrollTabsLeft}
                className="absolute left-0 top-0 bottom-1 w-16 bg-gradient-to-r from-white via-white/95 to-transparent flex items-center justify-start pl-3 z-10 cursor-pointer group"
              >
                <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all duration-200 ease-in-out group-hover:bg-slate-200 group-hover:scale-105 group-active:scale-95">
                  <ChevronLeft className="h-4.5 w-4.5 text-slate-700" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showRightIndicator && (
              <motion.button
                key="right-tab-scroll-indicator"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={scrollTabsRight}
                className="absolute right-0 top-0 bottom-1 w-16 bg-gradient-to-l from-white via-white/95 to-transparent flex items-center justify-end pr-3 z-10 cursor-pointer group"
              >
                <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all duration-200 ease-in-out group-hover:bg-slate-200 group-hover:scale-105 group-active:scale-95">
                  <ChevronRight className="h-4.5 w-4.5 text-slate-700" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Tab View Contents Panel */}
        <div className="min-h-[420px]">
          <AnimatePresence mode="wait">
            {activeTab === "feed" && (
              <motion.div
                key="tab-feed"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-6 text-left"
              >
                {(() => {
                  const targetDate = (() => {
                    const d = new Date();
                    if (attendanceDateMode === "yesterday") {
                      d.setDate(d.getDate() - 1);
                      return d;
                    } else if (attendanceDateMode === "custom") {
                      const parsed = new Date(attendanceCustomDate);
                      return isNaN(parsed.getTime()) ? d : parsed;
                    }
                    return d;
                  })();
                  const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

                  const todayLogs = logs.filter(l => {
                    const t = l.location_timestamp || l.created_at || l.fullTimestamp || l.time || l.timestamp;
                    if (!t) return false;
                    try {
                      const d = new Date(t);
                      if (isNaN(d.getTime())) {
                        return String(t).includes(targetDateStr);
                      }
                      return d.getFullYear() === targetDate.getFullYear() && 
                             d.getMonth() === targetDate.getMonth() && 
                             d.getDate() === targetDate.getDate();
                    } catch (e) {
                      return false;
                    }
                  });

                  const totalEmployeesCount = employees.length;

                  const employeeStatusesToday = employees.map(emp => {
                    const empLogs = todayLogs.filter(l => 
                      String(l.employee_id) === String(emp.id) || 
                      Number(l.employee_id) === Number(emp.id) || 
                      String(l.employee_id).toLowerCase() === String(emp.id).toLowerCase() ||
                      l.employee?.toLowerCase() === emp.name?.toLowerCase()
                    );
                    const isLeaveToday = leaves.some(l => {
                      const matchesEmp = String(l.employee_id) === String(emp.id) || Number(l.employee_id) === Number(emp.id) || l.name?.toLowerCase() === emp.name?.toLowerCase();
                      if (!matchesEmp) return false;
                      const statusVal = (l.status || "").toLowerCase();
                      if (statusVal !== "approved" && statusVal !== "pending") return false;
                      const sDate = l.start_date || l.startDate;
                      const eDate = l.end_date || l.endDate;
                      if (sDate && eDate) {
                        return targetDateStr >= sDate && targetDateStr <= eDate;
                      }
                      return false;
                    });

                    let status = "Absent";
                    let checkInTime = null;
                    let checkOutTime = null;
                    let isLate = false;
                    let isInsideGeofence: boolean | null = null;
                    let hasFaceFailure = false;
                    let hasGpsFailure = false;
                    let hasTestRecord = false;

                    if (isLeaveToday) {
                      status = "On Leave";
                    } else if (empLogs.length > 0) {
                      isInsideGeofence = true;
                      const sorted = [...empLogs].sort((a, b) => new Date(a.created_at || a.time || 0).getTime() - new Date(b.created_at || b.time || 0).getTime());
                      const checkInLog = sorted.find(l => isCheckInLog(l)) || sorted[0];
                      const checkOutLog = sorted.slice().reverse().find(l => isCheckOutLog(l));
                      const latestLog = sorted[sorted.length - 1];

                      checkInTime = checkInLog ? (checkInLog.created_at || checkInLog.location_timestamp || checkInLog.time) : (sorted[0]?.created_at || sorted[0]?.time);
                      const hasCheckedOut = sorted.some(l => isCheckOutLog(l)) || ((latestLog.status || "").toLowerCase().includes("out")) || ((latestLog.attendance_type || "").toLowerCase().includes("out"));
                      if (hasCheckedOut) {
                        status = "Checked Out";
                        checkOutTime = checkOutLog ? (checkOutLog.created_at || checkOutLog.location_timestamp || checkOutLog.time) : (latestLog.created_at || latestLog.location_timestamp || latestLog.time);
                      } else {
                        status = "Checked In";
                      }

                      if (checkInTime) {
                        const d = new Date(checkInTime);
                        if (!isNaN(d.getTime())) {
                          const hours = d.getHours();
                          const mins = d.getMinutes();
                          if (hours > 9 || (hours === 9 && mins > 30)) {
                            isLate = true;
                          }
                        }
                      }

                      empLogs.forEach(l => {
                        if (l.isNotRegistered || (l.distance && l.distance > (currentCompany?.geofence_radius || 100)) || l.gps_verified === false || l.inside_geofence === false) {
                          isInsideGeofence = false;
                          hasGpsFailure = true;
                        }
                        if (l.status === "warning" || l.face_verified === false || l.verification_status === "failed") {
                          hasFaceFailure = true;
                        }
                        if (l.is_test) {
                          hasTestRecord = true;
                        }
                      });
                    }

                    return {
                      emp,
                      status,
                      checkInTime,
                      checkOutTime,
                      isLate,
                      isInsideGeofence,
                      hasFaceFailure,
                      hasGpsFailure,
                      hasTestRecord,
                      empLogs
                    };
                  });

                  const filteredEmployeeStatuses = employeeStatusesToday.filter(({ emp }) => {
                    if (!attendanceSearchQuery) return true;
                    const query = attendanceSearchQuery.toLowerCase();
                    return (
                      emp.name?.toLowerCase().includes(query) ||
                      emp.role?.toLowerCase().includes(query) ||
                      String(emp.id).toLowerCase().includes(query)
                    );
                  });

                  const todayPresentCount = employeeStatusesToday.filter(s => s.status === "Checked In" || s.status === "Present").length;
                  const todayAbsentCount = employeeStatusesToday.filter(s => s.status === "Absent" || s.status === "Not Checked In").length;
                  const todayLateCount = employeeStatusesToday.filter(s => s.isLate).length;
                  const checkedInCount = employeeStatusesToday.filter(s => s.status === "Checked In").length;
                  const checkedOutCount = employeeStatusesToday.filter(s => s.status === "Checked Out").length;
                  const currentWorkingCount = checkedInCount;

                  const checkInTimesArr = employeeStatusesToday.filter(s => s.checkInTime).map(s => {
                    const d = new Date(s.checkInTime!);
                    return isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
                  }).filter((t): t is number => t !== null);

                  const averageCheckInTime = checkInTimesArr.length === 0 ? "—" : (() => {
                    const avgMins = Math.round(checkInTimesArr.reduce((a, b) => a + b, 0) / checkInTimesArr.length);
                    const hrs = Math.floor(avgMins / 60);
                    const mins = avgMins % 60;
                    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                  })();

                  const checkOutTimesArr = employeeStatusesToday.filter(s => s.checkOutTime).map(s => {
                    const d = new Date(s.checkOutTime!);
                    return isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
                  }).filter((t): t is number => t !== null);

                  const averageCheckOutTime = checkOutTimesArr.length === 0 ? "—" : (() => {
                    const avgMins = Math.round(checkOutTimesArr.reduce((a, b) => a + b, 0) / checkOutTimesArr.length);
                    const hrs = Math.floor(avgMins / 60);
                    const mins = avgMins % 60;
                    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                  })();

                  const now = new Date();
                  const past7DaysLogs = logs.filter(l => {
                    const t = l.timestamp || l.time || l.created_at;
                    if (!t) return false;
                    const d = new Date(t);
                    const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
                    return diffDays >= 0 && diffDays <= 7;
                  });
                  const presentDays7 = new Set(past7DaysLogs.map(l => `${l.employee_id || l.name}-${(l.timestamp || l.time || l.created_at || '').slice(0, 10)}`)).size;
                  const weeklyRate = totalEmployeesCount === 0 ? "0%" : `${Math.min(100, Math.round((presentDays7 / (totalEmployeesCount * 7)) * 100))}%`;

                  const past30DaysLogs = logs.filter(l => {
                    const t = l.timestamp || l.time || l.created_at;
                    if (!t) return false;
                    const d = new Date(t);
                    const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
                    return diffDays >= 0 && diffDays <= 30;
                  });
                  const presentDays30 = new Set(past30DaysLogs.map(l => `${l.employee_id || l.name}-${(l.timestamp || l.time || l.created_at || '').slice(0, 10)}`)).size;
                  const monthlyRate = totalEmployeesCount === 0 ? "0%" : `${Math.min(100, Math.round((presentDays30 / (totalEmployeesCount * 30)) * 100))}%`;

                  const trendMap: { [date: string]: number } = {};
                  for (let i = 29; i >= 0; i--) {
                    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    const ds = d.toLocaleDateString('en-CA');
                    trendMap[ds] = 0;
                  }
                  logs.forEach(l => {
                    const t = l.timestamp || l.time || l.created_at;
                    if (!t) return;
                    try {
                      const ds = new Date(t).toLocaleDateString('en-CA');
                      if (trendMap[ds] !== undefined) {
                        trendMap[ds] += 1;
                      }
                    } catch (e) {}
                  });
                  const attendanceTrendData = Object.keys(trendMap).map(date => ({
                    date: date.slice(5),
                    count: trendMap[date]
                  }));

                  const insideGeofenceCount = employeeStatusesToday.filter(s => s.isInsideGeofence).length;
                  const outsideGeofenceCount = employeeStatusesToday.filter(s => !s.isInsideGeofence).length;
                  const faceFailuresCount = logs.filter(l => l.status === "failed" || l.face_verified === false).length;
                  const gpsFailuresCount = logs.filter(l => l.status === "failed" || l.gps_verified === false).length;

                  return (
                    <div className="space-y-6">
                      <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h2 className="text-sm font-bold font-display text-slate-900 tracking-wide">Live Attendance & Workforce Analytics</h2>
                          <p className="text-xs text-slate-500 mt-1">
                            Calculated dynamically from live attendance logs, leave requests, and employee roster records.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Realtime Sync Active
                          </span>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-xs">
                        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <h3 className="text-xs font-bold font-display text-slate-900 tracking-wide uppercase">Employee Attendance Roster</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Showing records for <span className="font-bold text-slate-600">{attendanceDateMode === "today" ? "Today" : attendanceDateMode === "yesterday" ? "Yesterday" : "Custom Date"}</span> ({targetDateStr})
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Search bar */}
                            <div className="relative w-full sm:w-48">
                              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search roster..."
                                value={attendanceSearchQuery}
                                onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                              />
                            </div>

                            {/* Quick Date Selectors */}
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => setAttendanceDateMode("today")}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                  attendanceDateMode === "today"
                                    ? "bg-white text-slate-900 shadow-xs font-bold"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                Today
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceDateMode("yesterday")}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                  attendanceDateMode === "yesterday"
                                    ? "bg-white text-slate-900 shadow-xs font-bold"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                Yesterday
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceDateMode("custom")}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                  attendanceDateMode === "custom"
                                    ? "bg-white text-slate-900 shadow-xs font-bold"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                Custom
                              </button>
                            </div>

                            {/* Custom Date Input */}
                            {attendanceDateMode === "custom" && (
                              <input
                                type="date"
                                value={attendanceCustomDate}
                                onChange={(e) => setAttendanceCustomDate(e.target.value)}
                                className="bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600/20 transition-all cursor-pointer"
                              />
                            )}

                            {/* Export CSV Button */}
                            <button
                              type="button"
                              onClick={handleExportCSV}
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer hover:shadow-sm"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Export CSV
                            </button>
                          </div>
                        </div>
                        <div className="w-full overflow-x-auto hidden md:block">
                          <table className="w-full table-fixed border-collapse">
                            <colgroup>
                              <col style={{ width: '30%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '10%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider text-left">Employee</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider text-left">Status</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider text-left">Check-In</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider text-left">Check-Out</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider text-left">Geofence / GPS</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredEmployeeStatuses.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                                    No attendance records found matching current search and date filters.
                                  </td>
                                </tr>
                              ) : (
                                filteredEmployeeStatuses.slice(0, visibleTodayCount).map(({ emp, status, checkInTime, checkOutTime, isInsideGeofence, hasFaceFailure, hasGpsFailure, hasTestRecord, empLogs }, index) => (
                                  <tr key={`attendance-row-${emp.id}-${index}`} className="hover:bg-slate-50/50">
                                    <td className="py-3.5 px-4 truncate">
                                      <div className="flex items-center gap-3">
                                        {emp.avatar ? (
                                          <img
                                            src={emp.avatar}
                                            alt={emp.name}
                                            loading="lazy"
                                            onError={(e) => {
                                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                                              const parent = e.currentTarget.parentElement;
                                              if (parent) {
                                                const fallback = parent.querySelector('.avatar-fallback');
                                                if (fallback) {
                                                  (fallback as HTMLElement).style.display = 'flex';
                                                }
                                              }
                                            }}
                                            className="h-8 w-8 rounded-full object-cover border border-slate-200"
                                          />
                                        ) : null}
                                        <div
                                          className="avatar-fallback h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px] select-none transition-all duration-200"
                                          style={{ display: emp.avatar ? 'none' : 'flex' }}
                                        >
                                          {emp.name ? emp.name.split(" ").map((n: any) => n[0]).join("").slice(0, 2).toUpperCase() : "EE"}
                                        </div>
                                        <div className="truncate">
                                          <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-bold text-slate-900 truncate">{emp.name}</h4>
                                            {hasTestRecord && (
                                              <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-black border border-amber-200 tracking-tighter uppercase leading-none shrink-0">TEST</span>
                                            )}
                                          </div>
                                          <p className="text-[10px] font-mono text-slate-400 truncate">{emp.id} • {emp.role}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                                        status === 'Checked In' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                        status === 'Checked Out' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                        status === 'On Leave' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                        'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                        {status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 truncate">
                                      {formatTimeString(checkInTime)}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 truncate">
                                      {formatTimeString(checkOutTime)}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded inline-block ${
                                        (hasFaceFailure || hasGpsFailure) ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                        (isInsideGeofence === null ? 'bg-slate-50 text-slate-500' : (isInsideGeofence ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'))
                                      }`}>
                                        {hasFaceFailure || hasGpsFailure ? 'Verification Failed' : (isInsideGeofence === null ? '-' : (isInsideGeofence ? 'Inside Geofence' : 'Outside Geofence'))}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      {status !== 'Absent' && status !== 'On Leave' ? (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedLocationRecord({ emp, status, checkInTime, checkOutTime, isInsideGeofence, hasFaceFailure, hasGpsFailure, empLogs })}
                                          className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[10px] font-extrabold px-3 py-1.5 rounded-full cursor-pointer transition-all duration-150 border border-slate-200/80 hover:border-slate-300 shadow-3xs active:scale-95"
                                        >
                                          📍 View
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-mono select-none">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="md:hidden space-y-3">
                            {filteredEmployeeStatuses.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    No attendance records found matching current search and date filters.
                                </div>
                            ) : (
                                filteredEmployeeStatuses.slice(0, visibleTodayCount).map(({ emp, status, checkInTime, checkOutTime, isInsideGeofence, hasFaceFailure, hasGpsFailure, hasTestRecord, empLogs }, index) => (
                                    <div key={`attendance-card-${emp.id}-${index}`} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                                        <div className="flex items-center gap-3">
                                            {emp.avatar ? <img src={emp.avatar} alt={emp.name} className="h-8 w-8 rounded-full" /> : <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{emp.name?.split(" ").map((n: any) => n[0]).join("").slice(0, 2).toUpperCase()}</div>}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900">{emp.name}</h4>
                                                <p className="text-[10px] text-slate-500">{emp.id} • {emp.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${status === 'Checked In' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{status}</span>
                                            <div className="text-[10px] font-mono text-slate-600">
                                                {formatTimeString(checkInTime)} | {formatTimeString(checkOutTime)}
                                            </div>
                                        </div>
                                        {status !== 'Absent' && status !== 'On Leave' && (
                                            <div className="border-t border-slate-100 pt-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${hasFaceFailure || hasGpsFailure ? 'bg-rose-50 text-rose-700' : (isInsideGeofence ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}`}>
                                                        {hasFaceFailure || hasGpsFailure ? 'Verification Failed' : (isInsideGeofence ? 'Inside Geofence' : 'Outside Geofence')}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLocationRecord({ emp, status, checkInTime, checkOutTime, isInsideGeofence, hasFaceFailure, hasGpsFailure, empLogs })}
                                                    className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-2 rounded-lg cursor-pointer"
                                                >
                                                    📍 View Location
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        {filteredEmployeeStatuses.length > visibleTodayCount && (
                          <div className="flex justify-center p-4 border-t border-slate-100">
                            <button
                              onClick={() => setVisibleTodayCount(prev => prev + 15)}
                              className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-all duration-200 flex items-center gap-2"
                            >
                              Show More Records ({filteredEmployeeStatuses.length - visibleTodayCount} remaining)
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">Present</p>
                            <h3 className="text-lg font-extrabold text-slate-900 font-display">{todayPresentCount}</h3>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">Absent</p>
                            <h3 className="text-lg font-extrabold text-slate-900 font-display">{todayAbsentCount}</h3>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                            <Users className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">Late</p>
                            <h3 className="text-lg font-extrabold text-slate-900 font-display">{todayLateCount}</h3>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                            <Clock className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">Working</p>
                            <h3 className="text-lg font-extrabold text-slate-900 font-display">{currentWorkingCount}</h3>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                            <Activity className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-xs">
                          <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Checked In / Out</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div><span className="text-xs text-slate-500">In:</span> <span className="font-bold text-slate-800">{checkedInCount}</span></div>
                            <div><span className="text-xs text-slate-500">Out:</span> <span className="font-bold text-slate-800">{checkedOutCount}</span></div>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-xs">
                          <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Average Check Times</p>
                          <div className="flex items-center gap-4 mt-2 font-mono text-xs">
                            <div><span className="text-slate-400">In:</span> <span className="font-bold text-slate-800">{averageCheckInTime}</span></div>
                            <div><span className="text-slate-400">Out:</span> <span className="font-bold text-slate-800">{averageCheckOutTime}</span></div>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-xs">
                          <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Attendance Rates</p>
                          <div className="flex items-center gap-4 mt-2 font-mono text-xs">
                            <div><span className="text-slate-400">Weekly:</span> <span className="font-bold text-emerald-700">{weeklyRate}</span></div>
                            <div><span className="text-slate-400">Monthly:</span> <span className="font-bold text-blue-700">{monthlyRate}</span></div>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-xs">
                          <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Verification & Geofence</p>
                          <div className="flex items-center gap-3 mt-2 font-mono text-[11px]">
                            <div><span className="text-slate-400">Inside:</span> <span className="font-bold text-emerald-600">{insideGeofenceCount}</span></div>
                            <div><span className="text-slate-400">Outside:</span> <span className="font-bold text-amber-600">{outsideGeofenceCount}</span></div>
                            <div><span className="text-slate-400">Failures:</span> <span className="font-bold text-rose-600">{faceFailuresCount + gpsFailuresCount}</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-xs lg:col-span-2">
                          <h3 className="text-xs font-bold font-display text-slate-900 tracking-wide mb-4 flex items-center justify-between">
                            <span>Attendance Trend (Last 30 Days)</span>
                            <span className="text-[10px] font-mono text-slate-400 font-normal">Real database logs</span>
                          </h3>
                          <div className="h-[280px] w-full overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={attendanceTrendData}>
                                <defs>
                                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                          <div>
                            <h3 className="text-xs font-bold font-display text-slate-900 tracking-wide mb-4">Today's Status Summary</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-slate-600 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present / Checked In</span>
                                <span className="font-bold text-slate-900">{todayPresentCount}</span>
                              </div>
                              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-slate-600 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> Late Arrivals</span>
                                <span className="font-bold text-slate-900">{todayLateCount}</span>
                              </div>
                              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-slate-600 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
                                <span className="font-bold text-slate-900">{todayAbsentCount}</span>
                              </div>
                              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-slate-600 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500" /> Checked Out</span>
                                <span className="font-bold text-slate-900">{checkedOutCount}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-mono text-center">
                            Total Records: {logs.length} logged events
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* TAB 2: EMPLOYEE MANAGEMENT (Double Column Layout matching ACRUX HR exactly) */}
            {activeTab === "team" && (
              <motion.div
                key="tab-team"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start"
              >
                {/* Left Card: Add New Employee */}
                <div className="xl:col-span-3 bg-white border border-slate-200/60 rounded-xl p-6 shadow-xs text-left space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold font-display text-slate-900 tracking-wide">Add New Employee</h3>
                      <p className="text-[11px] text-slate-400">Create a new secure tracking credential profile below.</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      if (isGated) return;
                      setIsBulkImportOpen(true);
                    }}
                    disabled={isGated}
                    className={`w-full py-2.5 px-3 border border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      isGated 
                        ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" 
                        : "bg-blue-50/50 hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-800"
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Bulk Import via CSV/Excel</span>
                  </motion.button>

                  <div className="relative flex items-center justify-center my-2">
                    <span className="absolute bg-white px-2.5 text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">or add manually</span>
                    <div className="w-full border-t border-slate-100"></div>
                  </div>

                  <form onSubmit={handleCreateEmployee} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priyanshu Sharma"
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 transition-all text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Role Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lead Engineer"
                        value={newEmpRole}
                        onChange={(e) => setNewEmpRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 transition-all text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Employee Email</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. priyanshu@quantum.com"
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 transition-all text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">WhatsApp Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +91 98765 43210"
                        value={newEmpWhatsApp}
                        onChange={(e) => setNewEmpWhatsApp(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 transition-all text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Assigned Office Location</label>
                      {zones.length === 0 ? (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-medium leading-tight">
                          No locations set up — add one in Office Locations tab first
                        </div>
                      ) : (
                        <select
                          value={newEmpZone || (zones[0]?.name ?? "")}
                          onChange={(e) => setNewEmpZone(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 transition-all text-slate-800"
                        >
                          {zones.map((z, idx) => (
                            <option key={`new-emp-zone-${z.id}-${idx}`} value={z.name}>
                              {z.name} ({z.radius}m)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>


                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isGated}
                      className={`w-full py-3 font-bold font-display text-xs rounded-xl transition-all shadow-sm text-center ${
                        isGated
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed hover:bg-slate-100"
                          : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                      }`}
                      title={isGated ? "Renew your plan to continue using this feature" : ""}
                    >
                      Create Employee Account
                    </motion.button>
                    {isGated && (
                      <p className="text-[10px] text-rose-600 font-medium text-center mt-2 font-mono">
                        ⚠️ Renew plan to add active tracking credentials.
                      </p>
                    )}
                  </form>
                </div>

                {/* Right Card: Active Employees */}
                <div className="xl:col-span-9 bg-white border border-slate-200/60 rounded-xl p-4 sm:p-6 shadow-xs text-left space-y-4">
                  <div className="sticky top-[73px] z-20 bg-white border-b border-slate-100 pb-3 pt-4 -mt-4 mb-4 flex items-center justify-between flex-wrap gap-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
                    <div>
                      <h3 className="text-sm font-bold font-display text-slate-900 tracking-wide">Active Employees</h3>
                      <p className="text-[11px] text-slate-400">Total authorized quantum tracking credentials.</p>
                    </div>
                    {/* Mini search inside */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter roster..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <table className="w-full text-left border-collapse block md:grid md:grid-cols-2 md:gap-4 lg:table">
                      <thead className="hidden lg:table-header-group">
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="py-3.5 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">NAME / ROLE</th>
                          <th className="py-3.5 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">PORTAL EMAIL</th>
                          <th className="py-3.5 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">LOCATION</th>
                          <th className="py-3.5 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">STATUS</th>
                          <th className="py-3.5 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="block md:contents lg:table-row-group lg:divide-y lg:divide-slate-100">
                        {employees
                          .filter(e => !e.isDeactivated)
                          .filter(e => 
                            e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            e.role?.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .slice(0, visibleCount)
                          .map((emp, idx) => (
                            <tr key={emp?.id ? `emp-team-${emp.id}-${idx}` : `emp-team-fallback-${idx}`} className="block lg:table-row bg-white lg:bg-transparent lg:even:bg-slate-50/20 lg:odd:bg-white lg:hover:bg-blue-50/30 transition-all duration-200 border border-slate-200/80 lg:border-0 rounded-xl lg:rounded-none mb-4 lg:mb-0 p-4 lg:p-0 shadow-sm lg:shadow-none">
                              <td className="block lg:table-cell py-0 lg:py-4 px-0 lg:px-4 border-b border-slate-100 lg:border-0 pb-3 lg:pb-0 mb-3 lg:mb-0">
                                <div className="flex items-center gap-3">
                                  <div className="relative group shrink-0">
                                    {emp.avatar ? (
                                      <img
                                        src={emp.avatar}
                                        alt={emp.name}
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            const fallback = parent.querySelector('.avatar-fallback');
                                            if (fallback) {
                                              (fallback as HTMLElement).style.display = 'flex';
                                            }
                                          }
                                        }}
                                        className="h-9 w-9 rounded-full object-cover border border-slate-200 transition-all duration-200 group-hover:brightness-75"
                                      />
                                    ) : null}
                                    <div
                                      className="avatar-fallback h-9 w-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs select-none transition-all duration-200"
                                      style={{ display: emp.avatar ? 'none' : 'flex' }}
                                    >
                                      {emp.name ? emp.name.split(" ").map((n: any) => n[0]).join("").slice(0, 2).toUpperCase() : "EE"}
                                    </div>
                                    <label className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer bg-slate-900/40" title="Click to upload/overwrite face reference photo">
                                      <Camera className="h-3.5 w-3.5 text-white" />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleAdminUpdateAvatar(e, emp.id, emp.name)}
                                      />
                                    </label>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 leading-tight">{emp.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <p className="text-[10px] text-slate-400">{emp.role}</p>
                                      {(() => {
                                        const empShift = parseEmployeeShiftSettings(emp.department);
                                        const isFlex = empShift?.shift_type === 'flexible';
                                        return (
                                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${isFlex ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            <Clock className="h-2.5 w-2.5" />
                                            {isFlex ? 'Flexible' : `Fixed (${empShift?.shift_start || systemSettings?.shift_start || '09:00'})`}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-mono mt-1 bg-slate-50 border border-slate-100/80 px-1.5 py-0.5 rounded-md inline-flex items-center flex-wrap gap-1">
                                      <span className="whitespace-nowrap">ID: <span className="text-blue-600 font-bold">{emp.id}</span></span> <span className="text-slate-300">·</span> 
                                      {editingPinEmpId === emp.id ? (
                                        <>
                                          <span className="whitespace-nowrap flex items-center gap-1">PIN: <input type="text" className="w-10 font-bold text-emerald-600 border rounded px-0.5 bg-white" value={editedPinValue} onChange={(e) => setEditedPinValue(e.target.value)} />
                                          <button onClick={() => handleUpdateEmployeePin(emp.id, emp.name, editedPinValue)} className="text-emerald-600 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                                          <button onClick={() => setEditingPinEmpId(null)} className="text-rose-600 hover:text-rose-700"><X className="h-3 w-3" /></button></span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="whitespace-nowrap flex items-center gap-1">PIN: <span className="text-emerald-600 font-bold">{emp.pin || "1234"}</span>
                                          <button onClick={() => { setEditingPinEmpId(emp.id); setEditedPinValue(emp.pin || "1234"); }} className="text-slate-400 hover:text-slate-600"><Pencil className="h-3 w-3" /></button></span>
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="block lg:table-cell py-0 lg:py-4 px-0 lg:px-4 text-xs text-slate-500 font-mono mb-2 lg:mb-0 truncate" title={emp.email || `${emp.name?.toLowerCase().replace(/\s+/g, '')}@presensic.com`}>
                                <span className="lg:hidden font-bold text-[10px] uppercase text-slate-400 block mb-0.5">Email</span>
                                {emp.email || `${emp.name?.toLowerCase().replace(/\s+/g, '')}@presensic.com`}
                              </td>
                              <td className="block lg:table-cell py-0 lg:py-4 px-0 lg:px-4 text-xs text-slate-700 font-medium mb-2 lg:mb-0">
                                <span className="lg:hidden font-bold text-[10px] uppercase text-slate-400 block mb-0.5">Location</span>
                                {editingLocationEmpId === emp.id ? (
                                  <div className="flex items-center gap-1">
                                    {zones.length === 0 ? (
                                      <span className="text-[10px] text-amber-600 italic">No locations set up</span>
                                    ) : (
                                      <select
                                        value={editedLocationValue}
                                        onChange={(e) => setEditedLocationValue(e.target.value)}
                                        className="text-xs border rounded px-1.5 py-0.5 bg-white border-slate-300 focus:border-blue-600"
                                      >
                                        {zones.map((z, idx) => <option key={`zone-opt-${emp.id ?? 'emp'}-${z.id ?? 'zone'}-${idx}`} value={z.name}>{z.name}</option>)}
                                      </select>
                                    )}
                                    {zones.length > 0 && (
                                      <button onClick={() => handleUpdateEmployeeZone(emp.id, emp.name, editedLocationValue)} className="text-emerald-600 hover:text-emerald-700 cursor-pointer"><Check className="h-3 w-3" /></button>
                                    )}
                                    <button onClick={() => setEditingLocationEmpId(null)} className="text-rose-600 hover:text-rose-700 cursor-pointer"><X className="h-3 w-3" /></button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-semibold text-slate-800">{emp.zone || <span className="text-slate-400 italic">Unassigned</span>}</span>
                                    <button onClick={() => { setEditingLocationEmpId(emp.id); setEditedLocationValue(emp.zone || (zones[0]?.name ?? "")); }} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil className="h-3 w-3" /></button>
                                  </>
                                )}
                              </td>
                              <td className="flex items-center justify-between lg:table-cell py-0 lg:py-4 px-0 lg:px-4 mb-3 lg:mb-0">
                                <span className="lg:hidden font-bold text-[10px] uppercase text-slate-400 block mb-0.5">Status</span>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                                  {emp.status}
                                </span>
                              </td>
                              <td className="block lg:table-cell py-0 lg:py-4 px-0 lg:px-4 text-right pt-3 border-t border-slate-100 lg:border-0 lg:pt-0">
                                <div className="flex justify-start lg:justify-end items-center flex-wrap gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      const parsedSettings = parseEmployeeShiftSettings(emp.department);
                                      setSelectedEmpForShift(emp);
                                      setEditedShiftSettings(parsedSettings || {
                                        shift_type: "fixed",
                                        shift_start: systemSettings?.shift_start || "09:00",
                                        shift_end: systemSettings?.shift_end || "18:00",
                                        grace_period: systemSettings?.grace_period || 15
                                      });
                                      setIsShiftModalOpen(true);
                                    }}
                                    className="text-[10px] font-bold px-3 py-1 rounded-full border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer transition-all duration-200 flex items-center gap-1"
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>Settings</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      setCreatedCredentials({
                                        name: emp.name,
                                        id: emp.id,
                                        pin: emp.pin || "1234",
                                        email: emp.email,
                                        whatsapp: emp.whatsapp || emp.phone || "+91 98765 00000"
                                      });
                                    }}
                                    className="text-[10px] font-bold px-3 py-1 rounded-full border bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 cursor-pointer transition-all duration-200 flex items-center gap-1"
                                  >
                                    <Send className="h-2.5 w-2.5" />
                                    <span>Resend</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDeactivateEmployee(emp.id)}
                                    disabled={isGated}
                                    className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all duration-200 ${
                                      isGated
                                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer"
                                    }`}
                                    title={isGated ? "Renew your plan to continue using this feature" : ""}
                                  >
                                    Deactivate
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setDeletingEmployee(emp)}
                                    className="text-[10px] font-bold px-3 py-1 rounded-full border bg-rose-600 hover:bg-rose-700 text-white border-rose-700 cursor-pointer transition-all duration-200 flex items-center gap-1 shadow-sm"
                                  >
                                    <Trash className="h-2.5 w-2.5" />
                                    <span>Delete</span>
                                  </motion.button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        {employees
                          .filter(e => !e.isDeactivated)
                          .filter(e => 
                            e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            e.role?.toLowerCase().includes(searchQuery.toLowerCase())
                          ).length === 0 && (
                          <tr className="col-span-1 md:col-span-2 lg:table-row">
                            <td colSpan={4} className="py-12 text-center text-slate-400 italic text-xs bg-slate-50/10 block lg:table-cell">
                              No active employees found matching the filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {(() => {
                      const totalFiltered = employees
                        .filter(e => !e.isDeactivated)
                        .filter(e => 
                          e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.role?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length;
                      return totalFiltered > visibleCount ? (
                        <div className="flex justify-center mt-4 pb-2">
                          <button
                            onClick={() => setVisibleCount(prev => prev + 20)}
                            className="px-6 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-all duration-200 flex items-center gap-2 hover:border-slate-300"
                          >
                            Show More Employees ({totalFiltered - visibleCount} remaining)
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2.5: APPROVALS & LEAVES */}
            {activeTab === "approvals" && (
              <motion.div
                key="tab-approvals"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Pending Approvals</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Leave requests and special duty authorizations</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        {pendingLeavesCount} Pending
                      </span>
                    </div>
                  </div>

                  {/* Desktop View: Table Layout (>=768px) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/20">
                          <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee</th>
                          <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Leave Type</th>
                          <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</th>
                          <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                          <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {regularLeaves.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 italic text-xs">
                              Table is empty. No leave requests found in database.
                            </td>
                          </tr>
                        ) : (
                          regularLeaves.map((req, idx) => {
                            const empName = req.employee_name || "Employee";
                            const leaveType = req.leave_type || "Leave";
                            const reason = req.reason || "";
                            const duration = `${req.start_date} to ${req.end_date}`;
                            const submittedAt = new Date(req.created_at).toLocaleDateString();

                            return (
                              <tr key={req?.id ? `leave-desktop-${req.id}-${idx}` : `leave-desktop-fallback-${idx}`} className="hover:bg-slate-50/60 transition-all duration-200">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                                      {empName.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-800">{empName}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-slate-700">{leaveType}</p>
                                    {reason && <p className="text-[9px] text-slate-400 italic leading-tight max-w-[200px]">"{reason}"</p>}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-slate-700">{duration}</p>
                                    {submittedAt && <p className="text-[9px] text-slate-400 font-mono">Submitted: {submittedAt}</p>}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                                    req.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    req.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                    "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  {req.status === "Pending" ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={async () => {
                                          const nowIso = new Date().toISOString();
                                          setLeaves(prev => prev.map(l => l.id === req.id ? { ...l, status: "Approved", approved_at: nowIso } : l));
                                          const supabase = getSupabase();
                                          if (supabase) {
                                            await supabase.from('leave_requests').update({ status: "Approved", approved_at: nowIso }).eq('id', req.id);
                                          }
                                        }}
                                        className="px-3 py-1 rounded-lg bg-white text-emerald-600 border border-emerald-600 text-[10px] font-black uppercase hover:bg-emerald-50 transition-all cursor-pointer flex items-center gap-1 animate-all"
                                      >
                                        <Check className="h-3 w-3" /> Approve
                                      </button>
                                      <button
                                        onClick={async () => {
                                          setLeaves(prev => prev.map(l => l.id === req.id ? { ...l, status: "Rejected" } : l));
                                          const supabase = getSupabase();
                                          if (supabase) {
                                            await supabase.from("leave_requests").update({ status: "Rejected", approved_at: null }).eq("id", req.id);
                                          }
                                        }}
                                        className="px-3 py-1 rounded-lg bg-white text-rose-600 border border-rose-600 text-[10px] font-black uppercase hover:bg-rose-50 transition-all cursor-pointer flex items-center gap-1 animate-all"
                                      >
                                        <X className="h-3 w-3" /> Reject
                                      </button>
                                      <button
                                        onClick={async () => {
                                          setLeaves(prev => prev.filter(l => l.id !== req.id)); const supabase = getSupabase(); if (supabase) { await supabase.from('leave_requests').delete().eq('id', req.id); }
                                        }}
                                        className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                                        title="Delete Request"
                                      >
                                        <Trash className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          const emp = employees.find(e => e.name === empName);
                                          setSelectedLeave({
                                            employeeName: empName,
                                            leaveType: leaveType,
                                            duration: duration,
                                            status: req.status,
                                            whatsappNumber: emp?.whatsapp || "918104468397"
                                          });
                                          setIsModalOpen(true);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                                      >
                                        <MessageSquare className="h-3 w-3" /> Notify WhatsApp
                                      </button>
                                      <select
                                        className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase hover:bg-slate-200 transition-all cursor-pointer border border-slate-200 focus:outline-none"
                                        value=""
                                        onChange={async (e) => {
                                        const newStatus = e.target.value as "Pending" | "Approved" | "Rejected";
                                        if (newStatus) {
                                          if (!["Pending", "Approved", "Rejected"].includes(newStatus)) {
                                            alert("Invalid status selected.");
                                            throw new Error("Invalid leave request status: " + newStatus);
                                          }
                                          const nowIso = newStatus === "Approved" ? new Date().toISOString() : null;
                                          setLeaves(prev => prev.map(l => l.id === req.id ? { ...l, status: newStatus, approved_at: nowIso } : l));
                                          setEmployees(prev => prev.map(e => e.name === empName ? { ...e, status: newStatus === "Approved" ? "On Leave" : "In Office" } : e));
                                          const supabase = getSupabase();
                                          if (supabase) {
                                            const { error } = await supabase.from("leave_requests").update({ status: newStatus, approved_at: nowIso }).eq("id", req.id);
                                            if (error) {
                                              console.error("Error updating leave request status", error);
                                            }
                                          }
                                        }
                                      }}
                                      >
                                        <option value="">Change Status</option>
                                        <option value="Pending">Mark as Pending</option>
                                        {req.status !== "Approved" && <option value="Approved">Approve</option>}
                                        {req.status !== "Rejected" && <option value="Rejected">Reject</option>}
                                      </select>
                                      <button
                                        onClick={async () => {
                                          setLeaves(prev => prev.filter(l => l.id !== req.id)); const supabase = getSupabase(); if (supabase) { await supabase.from('leave_requests').delete().eq('id', req.id); }
                                        }}
                                        className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                                        title="Delete Request"
                                      >
                                        <Trash className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: Cards Layout (<768px) */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {regularLeaves.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 italic text-xs">
                        No pending leave requests
                      </div>
                    ) : (
                      regularLeaves.map((req, idx) => {
                        const empName = req.employee_name || req.employeeName || req.name || "Employee";
                        const empEmail = req.employeeEmail || req.email || "";
                        const leaveType = req.leave_type || req.leaveType || req.type || "Leave";
                        const reason = req.reason || "";
                        const duration = req.start_date && req.end_date ? `${req.start_date} to ${req.end_date}` : (req.startDate && req.endDate ? `${req.startDate} to ${req.endDate}` : (req.duration || ""));
                        const submittedAt = req.created_at ? new Date(req.created_at).toLocaleDateString() : (req.submittedAt || "");

                        return (
                          <div key={req?.id ? `leave-mobile-${req.id}-${idx}` : `leave-mobile-fallback-${idx}`} className="p-4 space-y-4 text-left">
                            {/* Employee Info */}
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm shrink-0">
                                {empName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 truncate">{empName}</h4>
                                {empEmail && <p className="text-[10px] text-slate-500 truncate">{empEmail}</p>}
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Leave Type</span>
                                <span className="text-xs font-bold text-slate-700">{leaveType}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                                <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-xs ${
                                  req.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  req.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date Range</span>
                                <span className="text-xs font-bold text-slate-700">{duration}</span>
                                {submittedAt && (
                                  <span className="block text-[8px] text-slate-400 font-mono mt-0.5">Submitted: {submittedAt}</span>
                                )}
                              </div>
                              {reason && (
                                <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">
                                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reason</span>
                                  <p className="text-[10px] text-slate-600 italic leading-relaxed mt-0.5">"{reason}"</p>
                                </div>
                              )}
                            </div>

                            {/* Actions Stacked Vertically */}
                            <div>
                              {req.status === "Pending" ? (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => {
                                      const nowIso = new Date().toISOString(); setLeaves(prev => prev.map(l => l.id === req.id ? { ...l, status: "Approved", approved_at: nowIso } : l)); const supabase = getSupabase(); if (supabase) { supabase.from('leave_requests').update({ status: "Approved", approved_at: nowIso }).eq('id', req.id); }
                                    }}
                                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
                                  >
                                    <Check className="h-4 w-4" /> Approve Request
                                  </button>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={async () => {
                                        setLeaves(prev => prev.map(l => l.id === req.id ? { ...l, status: "Rejected" } : l));
                                        const supabase = getSupabase();
                                        if (supabase) {
                                          await supabase.from("leave_requests").update({ status: "Rejected", approved_at: null }).eq("id", req.id);
                                        }
                                      }}
                                      className="flex-1 h-10 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                                    >
                                      <X className="h-4 w-4" /> Reject Request
                                    </button>
                                    <button
                                      onClick={async () => {
                                        setLeaves(prev => prev.filter(l => l.id !== req.id)); const supabase = getSupabase(); if (supabase) { await supabase.from('leave_requests').delete().eq('id', req.id); }
                                      }}
                                      className="h-10 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                                      title="Delete Request"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <button
                                    onClick={() => {
                                      const emp = employees.find(e => e.name === empName);
                                      setSelectedLeave({
                                        employeeName: empName,
                                        leaveType: leaveType,
                                        duration: duration,
                                        status: req.status,
                                        whatsappNumber: emp?.whatsapp || "918104468397"
                                      });
                                      setIsModalOpen(true);
                                    }}
                                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
                                  >
                                    <MessageSquare className="h-4 w-4" /> Notify WhatsApp
                                  </button>
                                  <div className="flex gap-2">
                                    <select
                                      value={req.status}
                                      onChange={async (e) => {
                                        const newStatus = e.target.value as "Pending" | "Approved" | "Rejected";
                                        if (newStatus) {
                                          if (!["Pending", "Approved", "Rejected"].includes(newStatus)) {
                                            alert("Invalid status selected.");
                                            throw new Error("Invalid leave request status: " + newStatus);
                                          }
                                          const nowIso = newStatus === "Approved" ? new Date().toISOString() : null;
                                          setLeaves(prev => prev.map(l => l.id === req.id ? { ...l, status: newStatus, approved_at: nowIso } : l));
                                          setEmployees(prev => prev.map(e => e.name === empName ? { ...e, status: newStatus === "Approved" ? "On Leave" : "In Office" } : e));
                                          const supabase = getSupabase();
                                          if (supabase) {
                                            const { error } = await supabase.from("leave_requests").update({ status: newStatus, approved_at: nowIso }).eq("id", req.id);
                                            if (error) {
                                              console.error("Error updating leave request status", error);
                                            }
                                          }
                                        }
                                      }}
                                      className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
                                    >
                                      <option value="Pending">Mark as Pending</option>
                                      <option value="Approved">Approve</option>
                                      <option value="Rejected">Reject</option>
                                    </select>
                                    <button
                                      onClick={async () => {
                                        setLeaves(prev => prev.filter(l => l.id !== req.id)); const supabase = getSupabase(); if (supabase) { await supabase.from('leave_requests').delete().eq('id', req.id); }
                                      }}
                                      className="h-10 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                                      title="Delete Request"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ============================================================== */}
                {/* PIN RESET REQUESTS SECTION                                     */}
                {/* ============================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fadeIn">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                        <KeyRound className="h-4 w-4 text-brand-600 animate-pulse" />
                        <span>PIN Reset Requests</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium">Actionable PIN reset requests initiated by your employees</p>
                    </div>
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white shadow-sm ${
                        pendingPinResetRequests.length > 0 ? "bg-amber-500 animate-pulse" : "bg-slate-400"
                      }`}>
                        {pendingPinResetRequests.length} Pending
                      </span>
                    </div>
                  </div>

                  {pendingPinResetRequests.length === 0 ? (
                    <div className="py-8 px-6 text-center text-slate-400 italic text-xs bg-slate-50/10">
                      No pending PIN reset requests at the moment.
                    </div>
                  ) : (
                    <>
                      {/* Desktop view */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/20">
                              <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee</th>
                              <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee ID</th>
                              <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Requested Date</th>
                              <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">New 4-Digit PIN</th>
                              <th className="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {pendingPinResetRequests.map((req, idx) => {
                              const empName = req.employee_name || "Employee";
                              const empId = req.employee_id;
                              const submittedAt = new Date(req.created_at).toLocaleDateString();
                              const pinVal = pinResetInputs[req.id] || "";

                              return (
                                <tr key={`pin-reset-desktop-${req.id}`} className="hover:bg-slate-50/60 transition-all duration-200">
                                  <td className="py-4 px-6 font-bold text-slate-850 text-xs">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs shrink-0">
                                        {empName.charAt(0)}
                                      </div>
                                      <span>{empName}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 font-mono text-[10px] text-slate-500 font-bold">
                                    {empId}
                                  </td>
                                  <td className="py-4 px-6 text-slate-600 text-xs font-medium">
                                    {submittedAt}
                                  </td>
                                  <td className="py-4 px-6">
                                    <input
                                      type="text"
                                      maxLength={4}
                                      placeholder="e.g. 1234"
                                      value={pinVal}
                                      onChange={(e) => {
                                        const cleanVal = e.target.value.replace(/\D/g, "");
                                        setPinResetInputs(prev => ({ ...prev, [req.id]: cleanVal }));
                                      }}
                                      className="w-24 px-3 py-1 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white text-xs font-black tracking-widest text-center rounded-lg outline-none transition-all placeholder:font-normal placeholder:tracking-normal"
                                    />
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleResetPinRequest(req.id, empId, empName, pinVal)}
                                      className="px-4.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs cursor-pointer hover:shadow-sm active:scale-98 transition-all inline-flex items-center gap-1"
                                    >
                                      <Check className="h-3 w-3" /> Reset & Resolve
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile view */}
                      <div className="block md:hidden divide-y divide-slate-100">
                        {pendingPinResetRequests.map((req) => {
                          const empName = req.employee_name || "Employee";
                          const empId = req.employee_id;
                          const submittedAt = new Date(req.created_at).toLocaleDateString();
                          const pinVal = pinResetInputs[req.id] || "";

                          return (
                            <div key={`pin-reset-mobile-${req.id}`} className="p-4 space-y-3 text-left">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs shrink-0">
                                  {empName.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800">{empName}</h4>
                                  <span className="text-[9px] font-bold font-mono text-slate-400">ID: {empId}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                <div>
                                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Requested Date</span>
                                  <span className="text-[11px] font-medium text-slate-600">{submittedAt}</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider text-right">New 4-Digit PIN</span>
                                  <input
                                    type="text"
                                    maxLength={4}
                                    placeholder="e.g. 1234"
                                    value={pinVal}
                                    onChange={(e) => {
                                      const cleanVal = e.target.value.replace(/\D/g, "");
                                      setPinResetInputs(prev => ({ ...prev, [req.id]: cleanVal }));
                                    }}
                                    className="w-20 px-2 py-0.5 bg-white border border-slate-200 focus:border-brand-500 text-[10px] font-black tracking-widest text-center rounded-lg outline-none transition-all"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleResetPinRequest(req.id, empId, empName, pinVal)}
                                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                              >
                                <Check className="h-4 w-4" /> Reset & Resolve PIN
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* LEAVE STATS SUMMARY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Requests</p>
                      <p className="text-xl font-black text-slate-800">{totalLeavesCount}</p>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Approved</p>
                      <p className="text-xl font-black text-slate-800">{companyLeaves.filter(l => l && (l.status === "Approved" || l.status === "approved")).length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Review</p>
                      <p className="text-xl font-black text-slate-800">{pendingLeavesCount}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: GEOFENCE ANCHORS */}
            {activeTab === "zones" && (
              <motion.div
                key="tab-zones"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="w-full"
              >
              <ManageOfficeLocations 
                zones={zones} 
                setZones={setZones} 
                companyId={currentCompany?.id || employerUser?.company_id || employerUser?.id}
              />
              </motion.div>
            )}

            {/* TAB 4: SYSTEM SETTINGS */}
            {activeTab === "settings" && (
              <motion.div
                key="tab-settings"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="max-w-5xl mx-auto space-y-6"
              >
                {systemSettingsLoading ? (
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px] shadow-xs">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-xs font-bold font-display text-slate-700">Loading Organization Settings...</p>
                    <p className="text-[10px] text-slate-400">Fetching latest database configuration for {currentCompany?.org_name || currentCompany?.name || 'your company'}</p>
                  </div>
                ) : (
                  <>
                    {systemSettingsError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between">
                        <span>Error loading settings: {systemSettingsError}</span>
                        <button onClick={() => refreshSettings()} className="text-rose-800 underline font-bold text-[10px] cursor-pointer">Retry</button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* CARD 1: Attendance Policies & Biometrics */}
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-7 shadow-xs text-left space-y-6 flex flex-col h-full">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-sm font-bold font-display text-slate-900 tracking-wide flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-600" /> Attendance Policies & Biometrics
                          </h2>
                          <p className="text-[10px] text-slate-400 mt-1">Configure global strictness variables for your organization's GPS anchors.</p>
                        </div>

                        <div className="space-y-6 flex-grow">
                          {/* Grace Period slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[11px] font-bold text-slate-700 font-display flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-blue-600" /> Late Arrival Grace Period
                              </label>
                              <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                                {systemSettings?.grace_period ?? 15} minutes
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="60"
                              step="5"
                              value={systemSettings?.grace_period ?? 15}
                              onChange={(e) => updateSystemSettings({ grace_period: Number(e.target.value) })}
                              className="w-full accent-blue-600 bg-slate-200 rounded-lg h-1.5 cursor-pointer"
                            />
                            <p className="text-[9px] text-slate-400">Punches logged beyond this margin from scheduled shift times will automatically be flagged as Late.</p>
                          </div>

                          <hr className="border-slate-100" />

                          {/* Toggle: Bypass Option */}
                          <div className="flex items-center justify-between gap-4 py-1">
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-slate-700 font-display flex items-center gap-1.5">
                                <Sliders className="h-3.5 w-3.5 text-blue-600" /> Allow Manual Geo-Bypass Requests
                              </p>
                              <p className="text-[9px] text-slate-400">Enable employees outside active circles to request punches with custom bypass notes.</p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const nextVal = !systemSettings?.allow_geo_bypass;
                                updateSystemSettings({ allow_geo_bypass: nextVal });
                                if (activeCompanyIdForSettings) {
                                  try {
                                    await saveSettings({ allow_geo_bypass: nextVal });
                                    setSettingsToast({ show: true, message: `Geo-bypass ${nextVal ? 'enabled' : 'disabled'} successfully.`, type: "success" });
                                  } catch (e: any) {
                                    console.error("Failed to auto-save geo-bypass toggle:", e);
                                    setSettingsToast({ show: true, message: e?.message || "Failed to update geo-bypass toggle.", type: "error" });
                                  }
                                }
                              }}
                              className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer border ${
                                systemSettings?.allow_geo_bypass 
                                  ? "bg-blue-600/10 border-blue-600/30" 
                                  : "bg-slate-100 border-slate-200"
                              }`}
                            >
                              <div className={`h-3.5 w-3.5 rounded-full transition-all shadow-sm ${
                                systemSettings?.allow_geo_bypass ? "bg-blue-600 translate-x-4" : "bg-slate-400 translate-x-0"
                              }`} />
                            </button>
                          </div>

                          <hr className="border-slate-100" />

                          {/* Toggle: Strict Face Match */}
                          <div className="flex items-center justify-between gap-4 py-1">
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-slate-700 font-display flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Strict Biometric Selfie Matching
                              </p>
                              <p className="text-[9px] text-slate-400">Require automated face alignment verification with neural anchors to deter proxy punching.</p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const nextVal = !systemSettings?.strict_selfie_match;
                                updateSystemSettings({ strict_selfie_match: nextVal });
                                if (activeCompanyIdForSettings) {
                                  try {
                                    await saveSettings({ strict_selfie_match: nextVal });
                                    setSettingsToast({ show: true, message: `Strict selfie match ${nextVal ? 'enabled' : 'disabled'} successfully.`, type: "success" });
                                  } catch (e: any) {
                                    console.error("Failed to auto-save strict selfie match toggle:", e);
                                    setSettingsToast({ show: true, message: e?.message || "Failed to update strict selfie match toggle.", type: "error" });
                                  }
                                }
                              }}
                              className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer border ${
                                systemSettings?.strict_selfie_match 
                                  ? "bg-blue-600/10 border-blue-600/30" 
                                  : "bg-slate-100 border-slate-200"
                              }`}
                            >
                              <div className={`h-3.5 w-3.5 rounded-full transition-all shadow-sm ${
                                systemSettings?.strict_selfie_match ? "bg-blue-600 translate-x-4" : "bg-slate-400 translate-x-0"
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CARD 2: Working Hours & Shifts */}
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-7 shadow-xs text-left space-y-6 flex flex-col h-full">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-sm font-bold font-display text-slate-900 tracking-wide flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" /> Working Hours & Shifts
                          </h2>
                          <p className="text-[10px] text-slate-400 mt-1">Define the standard operating hours and work week for your organization.</p>
                        </div>

                        <div className="space-y-6 flex-grow">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Shift Start</label>
                              <div className="relative">
                                <input
                                  type="time"
                                  value={systemSettings?.shift_start ?? "09:00"}
                                  onChange={(e) => updateSystemSettings({ shift_start: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Shift End</label>
                              <input
                                type="time"
                                value={systemSettings?.shift_end ?? "18:00"}
                                onChange={(e) => updateSystemSettings({ shift_end: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Working Days</label>
                            <div className="flex flex-wrap gap-1.5">
                              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                const isWorking = (systemSettings?.working_days || []).includes(day);
                                return (
                                  <button
                                    key={`work-day-${day}-employer-settings`}
                                    type="button"
                                    onClick={() => {
                                      const currentDays = systemSettings?.working_days || [];
                                      const nextDays = isWorking
                                        ? currentDays.filter(d => d !== day)
                                        : [...currentDays, day];
                                      updateSystemSettings({ working_days: nextDays });
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                      isWorking
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[9px] text-slate-400 italic">Check-ins before start time are on-time; after this + grace period are flagged Late.</p>
                          </div>
                        </div>
                      </div>

                      {/* CARD 3: Notifications & Alerts */}
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-7 shadow-xs text-left space-y-6 flex flex-col h-full">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-sm font-bold font-display text-slate-900 tracking-wide flex items-center gap-2">
                            <Bell className="h-4 w-4 text-blue-600" /> Notifications & Alerts
                          </h2>
                          <p className="text-[10px] text-slate-400 mt-1">Configure automated alerts and summary reports for your admin team.</p>
                        </div>

                        <div className="space-y-5 flex-grow">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-slate-400" /> Email alerts for flagged check-ins
                              </p>
                              <button
                                type="button"
                                onClick={() => updateSystemSettings({ email_alerts: !systemSettings?.email_alerts })}
                                className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer border ${
                                  systemSettings?.email_alerts ? "bg-blue-600/10 border-blue-600/30" : "bg-slate-100 border-slate-200"
                                }`}
                              >
                                <div className={`h-3.5 w-3.5 rounded-full transition-all shadow-sm ${systemSettings?.email_alerts ? "bg-blue-600 translate-x-4" : "bg-slate-400 translate-x-0"}`} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-slate-400" /> WhatsApp alerts for absences
                              </p>
                              <button
                                type="button"
                                onClick={() => updateSystemSettings({ whatsapp_alerts: !systemSettings?.whatsapp_alerts })}
                                className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer border ${
                                  systemSettings?.whatsapp_alerts ? "bg-blue-600/10 border-blue-600/30" : "bg-slate-100 border-slate-200"
                                }`}
                              >
                                <div className={`h-3.5 w-3.5 rounded-full transition-all shadow-sm ${systemSettings?.whatsapp_alerts ? "bg-blue-600 translate-x-4" : "bg-slate-400 translate-x-0"}`} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" /> Daily attendance summary report
                              </p>
                              <button
                                type="button"
                                onClick={() => updateSystemSettings({ daily_summary: !systemSettings?.daily_summary })}
                                className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer border ${
                                  systemSettings?.daily_summary ? "bg-blue-600/10 border-blue-600/30" : "bg-slate-100 border-slate-200"
                                }`}
                              >
                                <div className={`h-3.5 w-3.5 rounded-full transition-all shadow-sm ${systemSettings?.daily_summary ? "bg-blue-600 translate-x-4" : "bg-slate-400 translate-x-0"}`} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Notification Recipient Emails</label>
                            <input
                              type="text"
                              value={systemSettings?.notification_emails ?? ""}
                              onChange={(e) => updateSystemSettings({ notification_emails: e.target.value })}
                              placeholder="admin@company.com, hr@company.com"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                            />
                          </div>
                        </div>
                      </div>

                      {/* CARD 4: Company Profile */}
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-7 shadow-xs text-left space-y-6 flex flex-col h-full">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-sm font-bold font-display text-slate-900 tracking-wide flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-600" /> Company Profile
                          </h2>
                          <p className="text-[10px] text-slate-400 mt-1">Manage your organization's identity and global regional settings.</p>
                        </div>

                        <div className="space-y-5 flex-grow">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Company Name</label>
                            <input
                              type="text"
                              value={systemSettings?.company_name ?? ""}
                              onChange={(e) => updateSystemSettings({ company_name: e.target.value })}
                              placeholder="e.g. Acme Corp"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Regional Timezone</label>
                            <select
                              value={systemSettings?.timezone ?? "IST"}
                              onChange={(e) => updateSystemSettings({ timezone: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                            >
                              <option value="IST">IST (GMT+5:30)</option>
                              <option value="GST">GST (GMT+4:00)</option>
                              <option value="UTC">UTC (GMT+0:00)</option>
                              <option value="EST">EST (GMT-5:00)</option>
                              <option value="PST">PST (GMT-8:00)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Company Branding Logo URL</label>
                            <input
                              type="text"
                              value={systemSettings?.logo_url ?? ""}
                              onChange={(e) => updateSystemSettings({ logo_url: e.target.value })}
                              placeholder="https://example.com/logo.png"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                            />
                            {systemSettings?.logo_url && (
                              <div className="mt-2 flex items-center gap-2">
                                <img src={systemSettings.logo_url} alt="Logo Preview" className="h-8 max-w-[120px] object-contain rounded border border-slate-200 bg-slate-50 p-1" />
                                <span className="text-[10px] text-slate-400">Logo Preview</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Registration Date</label>
                            <div className="text-xs font-bold text-slate-800 font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                              {createdAt ? formatDDMMYYYY(createdAt) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CARD 5: Data & Security (Full width on md+) */}
                      <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-7 shadow-xs text-left space-y-6">
                        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                          <div>
                            <h2 className="text-sm font-bold font-display text-slate-900 tracking-wide flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-blue-600" /> Data & Security
                            </h2>
                            <p className="text-[10px] text-slate-400 mt-1">Secure your admin access and manage organization-wide data exports.</p>
                          </div>
                          <button type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-[11px] font-bold text-blue-600 hover:bg-blue-100 transition-all cursor-pointer">
                            <Download className="h-3.5 w-3.5" /> Export All Data (CSV)
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                  <Lock className="h-3.5 w-3.5 text-slate-400" /> 2-Step Admin Verification
                                </p>
                                <p className="text-[9px] text-slate-400">Require MFA for all administrative login attempts.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTwoStepAuth(!twoStepAuth)}
                                className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer border ${
                                  twoStepAuth ? "bg-blue-600/10 border-blue-600/30" : "bg-slate-100 border-slate-200"
                                }`}
                              >
                                <div className={`h-3.5 w-3.5 rounded-full transition-all shadow-sm ${twoStepAuth ? "bg-blue-600 translate-x-4" : "bg-slate-400 translate-x-0"}`} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                              <LogOut className="h-3.5 w-3.5 text-slate-400" /> Auto Logout After Inactivity
                            </label>
                            <select
                              value={systemSettings?.auto_logout_minutes ?? 30}
                              onChange={(e) => updateSystemSettings({ auto_logout_minutes: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                            >
                              <option value={15}>15 min</option>
                              <option value={30}>30 min</option>
                              <option value={60}>1 hour</option>
                              <option value={0}>Never</option>
                            </select>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-5 mt-5">
                          <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-rose-600 animate-pulse" /> Danger Zone: Factory Reset Database
                              </p>
                              <p className="text-[10px] text-rose-600 font-medium">
                                Permanently erase all active employees, roster databases, geo-logs, and leaves. This action cannot be undone.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsResetConfirmModalOpen(true)}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white border border-transparent rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                            >
                              Reset Database to Empty State
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inline Toast notification */}
                    <AnimatePresence>
                      {settingsToast.show && (
                        <motion.div
                          key="settings-toast-msg"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={`fixed bottom-6 right-6 p-4 border rounded-2xl text-[11px] font-bold flex items-center gap-3 text-left shadow-lg z-[200] max-w-md ${
                            settingsToast.type === "success"
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                              : "bg-rose-50 border-rose-100 text-rose-700"
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white shrink-0 ${
                            settingsToast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
                          }`}>
                            {settingsToast.type === "success" ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span>{settingsToast.message}</span>
                        </motion.div>
                      )}

                      {paymentToast?.show && (
                        <motion.div
                          key="payment-toast-msg"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={`fixed bottom-6 right-6 p-4 border rounded-2xl text-[11px] font-bold flex items-center gap-3 text-left shadow-lg z-[200] max-w-sm ${
                            paymentToast.type === "success"
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                              : "bg-rose-50 border-rose-100 text-rose-700"
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white shrink-0 ${
                            paymentToast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
                          }`}>
                            {paymentToast.type === "success" ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span>{paymentToast.message}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-4 flex justify-end sticky bottom-0 bg-white/80 backdrop-blur-sm p-4 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={systemSettingsSaving}
                        onClick={handleSaveSettings}
                        className={`px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold font-display cursor-pointer transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center gap-2 ${
                          systemSettingsSaving ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        {systemSettingsSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving Configuration...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" /> Save Global Configuration
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-[10px] text-slate-400 font-mono mt-auto relative z-10 px-4">
        <div className="max-w-4xl mx-auto space-y-1">
          <div className="break-words">Presensic Attendance Core • Version 1.0 • Secure Geofencing Radius: {avgRadius}m</div>
          <div className="break-words">Authorized admin access only. All actions are logged.</div>
        </div>
      </footer>

      {/* 4.5 Non-dismissable Centered Trial Expired Modal */}
      {isGated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-100 text-center space-y-6 relative"
          >
            <div className="mx-auto w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shadow-inner">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                Your 5-Day Free Trial Has Ended
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Please upgrade your subscription to continue using Presensic.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsRenewalModalOpen(true)}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm cursor-pointer font-display"
            >
              Upgrade Plan
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* 5. Razorpay Subscription Renewal Modal */}
      <AnimatePresence>
        {isRenewalModalOpen && (
          <motion.div key="renewal-modal-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] overflow-y-auto" id="renewal-modal-root">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRenewalModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />

            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full max-w-2xl border border-slate-100 flex flex-col md:flex-row"
              >
                {/* Left Panel: Plan description */}
                <div className="bg-slate-50 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/60 w-full md:w-5/12 text-left">
                  <div>
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-wider font-mono">
                      Secure Checkout
                    </span>
                    <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight mt-3">
                      Plan Renewal
                    </h2>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Restore active tracking credentials and automatic biometric syncing instantaneously.
                    </p>
                  </div>

                  <div className="space-y-4 my-6">
                    <div className="flex items-start gap-2.5 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>Dynamic facial recognition check-ins</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>Tamper-proof GPS tracking & spoof protection</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>Biometric geofence anchor configurations</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200/60 rounded-xl flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>256-bit SSL encrypted payments via Razorpay</span>
                  </div>
                </div>

                {/* Right Panel: Plan select & purchase */}
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <h3 className="text-sm font-bold font-display text-slate-800 uppercase tracking-wider font-mono">
                        Select Subscriptions
                      </h3>
                      <button
                        onClick={() => setIsRenewalModalOpen(false)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Toggle Period */}
                    <div className="mt-4 flex bg-slate-100 p-0.5 rounded-lg w-fit mx-auto sm:mx-0">
                      <button
                        onClick={() => setBillingPeriod("monthly")}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          billingPeriod === "monthly"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingPeriod("annual")}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                          billingPeriod === "annual"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Annual
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse">
                          -20%
                        </span>
                      </button>
                    </div>

                    {/* Plans list */}
                    <div className="mt-5 space-y-3">
                      {[
                        {
                          id: "basic",
                          name: "Basic",
                          employees: "Under 10 Employees",
                          recommended: localEmployees.length < 10
                        },
                        {
                          id: "starter",
                          name: "Starter",
                          employees: localEmployees.length > 50 
                            ? `Up to 50 Employees Included (+${localEmployees.length - 50} extra users)`
                            : "Up to 50 Employees Included",
                          recommended: localEmployees.length >= 10 && localEmployees.length <= 50
                        },
                        {
                          id: "enterprise",
                          name: "Enterprise",
                          employees: "Unlimited Employees & Admins",
                          recommended: localEmployees.length > 50
                        }
                      ].map((plan, idx) => {
                        const isEnterprise = plan.name === "Enterprise";
                        const price = isEnterprise ? 0 : calculatePlanPrice(plan.name, billingPeriod);
                        const isSelected = billingPlan.replace(" Plan", "") === plan.name;

                        return (
                          <div
                            key={`plan-card-${plan.name ?? "plan"}-${idx}`}
                            onClick={() => setBillingPlan(plan.name)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer relative text-left ${
                              isSelected
                                ? "bg-blue-50/40 border-blue-500/80 ring-1 ring-blue-500/20"
                                : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={isSelected}
                                  onChange={() => setBillingPlan(plan.name)}
                                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                    {plan.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
                                    {plan.employees}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {isEnterprise ? (
                                  <p className="text-xs font-black text-slate-900 leading-none">
                                    Custom Price
                                  </p>
                                ) : (
                                  <>
                                    <p className="text-xs font-black text-slate-900 leading-none">
                                      ₹{price.toLocaleString("en-IN")}
                                    </p>
                                    <p className="text-[9px] text-slate-400 mt-0.5 leading-none font-mono">
                                      /{billingPeriod === "annual" ? "year" : "month"}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                            {plan.recommended && (
                              <span className="absolute -top-2 right-4 bg-blue-600 text-white text-[8px] font-black tracking-wide font-mono px-2 py-0.5 rounded-full uppercase shadow-xs">
                                Match for your size
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-3">
                    {renewalError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-[10px] font-bold flex items-start gap-2 text-left">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{renewalError}</span>
                      </div>
                    )}

                    {billingPlan.replace(" Plan", "") === "Enterprise" ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href="https://wa.me/919876543210?text=Hi%20Presensic%20Team,%20I%20would%20like%20to%20discuss%20the%20Enterprise%20Plan%20for%20our%20workforce."
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 text-white font-bold font-display text-xs rounded-xl active:scale-98 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 text-center"
                        >
                          <MessageSquare className="h-4 w-4 shrink-0 text-emerald-400" />
                          WhatsApp Sales
                        </a>
                        <a
                          href="mailto:sales@presensic.com?subject=Enterprise%20Plan%20Inquiry"
                          className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-950 border border-slate-200 font-bold font-display text-xs rounded-xl active:scale-98 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 text-center"
                        >
                          <Mail className="h-4 w-4 shrink-0 text-blue-600" />
                          Email Sales
                        </a>
                      </div>
                    ) : getRazorpayKey() === null ? (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="h-4.5 w-4.5 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">Razorpay Key Required</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                              The <code className="font-mono bg-slate-200/60 px-1 py-0.5 rounded text-[9px]">VITE_RAZORPAY_KEY_ID</code> environment variable is not configured. Please enter a Razorpay Key ID below to unlock the payment button:
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. rzp_test_3pS7u3L78sL3L9"
                            value={tempRazorpayKey}
                            onChange={(e) => {
                              setTempRazorpayKey(e.target.value);
                              setRazorpayKeyError("");
                            }}
                            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono text-slate-700 bg-white"
                          />
                          <button
                            onClick={() => {
                              if (!tempRazorpayKey.trim()) {
                                setRazorpayKeyError("Key ID cannot be empty");
                                return;
                              }
                              try {
                                localStorage.setItem("temp_razorpay_key_id", tempRazorpayKey.trim());
                                setRazorpayKeyError("");
                                setRenewalError(null);
                              } catch (e) {}
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                          >
                            Save
                          </button>
                        </div>
                        {razorpayKeyError && (
                          <p className="text-[9px] text-rose-500 font-bold">{razorpayKeyError}</p>
                        )}
                        <p className="text-[9px] text-slate-400 leading-normal">
                          💡 Note: To configure this permanently, go to the <strong className="font-semibold text-slate-500">Secrets</strong> panel in AI Studio.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getRazorpayKey()?.startsWith("temp_") || getRazorpayKey() === localStorage.getItem("temp_razorpay_key_id") ? (
                          <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-[9px] text-blue-700 font-mono">
                            <span className="truncate">Active Key: {getRazorpayKey()}</span>
                            <button
                              onClick={() => {
                                try {
                                  localStorage.removeItem("temp_razorpay_key_id");
                                  setTempRazorpayKey("");
                                } catch (e) {}
                              }}
                              className="text-blue-500 hover:text-blue-700 font-sans font-bold"
                            >
                              Clear
                            </button>
                          </div>
                        ) : null}
                        <button
                          onClick={() => handleProcessPayment()}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold font-display text-xs rounded-xl active:scale-98 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                        >
                          <CreditCard className="h-4 w-4" />
                          Pay & Renew with Razorpay Checkout
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                      By proceeding, you agree to the subscription terms of Presensic. Secure routing and sandbox verification are maintained automatically.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. CREDENTIALS CONFIRMATION MODAL */}
      <AnimatePresence>
        {createdCredentials && (
          <motion.div 
            key="credentials-modal-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xl max-w-md w-full relative space-y-5 text-left"
            >
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <button
                  onClick={() => setCreatedCredentials(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-950 font-display">Employee Account Provisioned!</h3>
                <p className="text-xs text-slate-500 mt-1">Credentials have been generated successfully for this tracker.</p>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200/50 p-4 space-y-3 font-mono">
                <div className="flex justify-between text-xs pb-2 border-b border-slate-200/60 font-sans">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Employee Name</span>
                  <span className="font-bold text-slate-900">{createdCredentials.name}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-500 text-[10px] font-sans">LOGIN USER ID</span>
                  <span className="text-blue-600 font-bold tracking-wider">{createdCredentials.id}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-500 text-[10px] font-sans">CHECK-IN PIN</span>
                  <span className="text-emerald-600 font-bold tracking-wider">{createdCredentials.pin}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-500 text-[10px] font-sans">WHATSAPP</span>
                  <span className="text-slate-800 font-bold">{createdCredentials.whatsapp}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-500 text-[10px] font-sans">EMAIL</span>
                  <span className="text-slate-800 font-bold text-[11px] truncate max-w-[200px]">{createdCredentials.email}</span>
                </div>
              </div>

              {/* Action buttons to copy or send */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Welcome to Presensic! Your Login ID: ${createdCredentials.id}, Your PIN: ${createdCredentials.pin}. Use these to check in via the Presensic Employee App.`;
                    navigator.clipboard.writeText(text);
                    alert("Message copied to clipboard!");
                  }}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <Copy className="h-4 w-4 text-slate-500" />
                  <span>Copy Login Credentials Message</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/${createdCredentials.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Welcome to Presensic! Your Login ID: ${createdCredentials.id}, Your PIN: ${createdCredentials.pin}. Use these to check in via the Presensic Employee App.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center transition-all"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`mailto:${createdCredentials.email}?subject=Welcome%20to%20Presensic%20-%20Your%20Login%20Credentials&body=${encodeURIComponent(`Welcome to Presensic!\n\nYour Login ID: ${createdCredentials.id}\nYour PIN: ${createdCredentials.pin}\n\nUse these to check in via the Presensic Employee App.`)}`}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center transition-all"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>Email</span>
                  </a>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setCreatedCredentials(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BULK CSV/EXCEL IMPORT MODAL */}
      <AnimatePresence>
        {isBulkImportOpen && (
          <motion.div 
            key="bulk-import-modal-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xl max-w-4xl w-full relative flex flex-col max-h-[85vh] text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-950 font-display flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    Bulk Import Employee Roster
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Upload a spreadsheet containing employee tracking profiles to generate IDs and PINs in bulk.</p>
                </div>
                <button
                  onClick={() => {
                    setIsBulkImportOpen(false);
                    setBulkImportFile(null);
                    setBulkRows([]);
                    setBulkErrorSummary(null);
                    setDownloadableResults(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto py-5 space-y-6">
                {!bulkImportFile ? (
                  /* Step 1: Upload and download template */
                  <div className="space-y-4">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div>
                        <h4 className="text-xs font-bold text-blue-900">Need a starting spreadsheet template?</h4>
                        <p className="text-[11px] text-blue-700/80 mt-0.5">Download our pre-formatted template with all required columns: Name, Role, Email, WhatsApp, and Tracking Zone.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const csvContent = "data:text/csv;charset=utf-8," 
                            + "Full Name,Role Title,Employee Email,WhatsApp Number,Tracking Geofence\n"
                            + "Amit Patel,Software Engineer,amit@quantum.com,+919876543210,Main Branch\n"
                            + "Sneha Reddy,Operations Manager,sneha@quantum.com,+918888888888,Site Alpha";
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", "presensic_bulk_import_template.csv");
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm shrink-0 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Template CSV</span>
                      </button>
                    </div>

                    {/* Expected format display */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Expected Column Format</h4>
                      <div className="font-mono text-[9px] text-slate-600 bg-white border border-slate-100 rounded p-2 flex gap-1 overflow-x-auto">
                        <span>Full Name</span> | <span>Role Title</span> | <span>Employee Email</span> | <span>WhatsApp Number</span> | <span>Tracking Geofence</span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 bg-white border border-slate-100 rounded p-2 flex gap-1 overflow-x-auto">
                        <span>Priyanshu Sharma</span> | <span>Lead Engineer</span> | <span>priyanshu@quantum.com</span> | <span>+91 98765 43210</span> | <span>Main Branch</span>
                      </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (ext === "csv" || ext === "xlsx" || ext === "xls") {
                            handleBulkFileChange(file);
                          } else {
                            alert("Only CSV or Excel spreadsheets are supported.");
                          }
                        }
                      }}
                      className="border-2 border-dashed border-slate-300 rounded-2xl py-12 px-6 text-center hover:border-blue-500 transition-all cursor-pointer bg-slate-50/50 relative"
                    >
                      <input
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBulkFileChange(file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600 shadow-xs">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Drag & drop your CSV/Excel file here</p>
                          <p className="text-[10px] text-slate-400 mt-1">or click to browse from your device</p>
                        </div>
                        <p className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono font-bold">Supports .CSV, .XLSX, .XLS</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Step 2: Preview, validation, or results summary */
                  <div className="space-y-5">
                    {/* File name indicator */}
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{bulkImportFile.name}</p>
                          <p className="text-[10px] text-slate-400">Size: {(bulkImportFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      {!bulkErrorSummary && (
                        <button
                          onClick={() => {
                            setBulkImportFile(null);
                            setBulkRows([]);
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                        >
                          Change File
                        </button>
                      )}
                    </div>

                    {/* Results summary (after processing) */}
                    {bulkErrorSummary && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">TOTAL ANALYZED</p>
                          <p className="text-xl font-bold text-slate-800 mt-1">{bulkErrorSummary.total} rows</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">IMPORTED SUCCESSFULLY</p>
                          <p className="text-xl font-bold text-emerald-700 mt-1">{bulkErrorSummary.success} accounts</p>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider font-mono">ERRORS / FAILED ROWS</p>
                          <p className="text-xl font-bold text-rose-700 mt-1">{bulkErrorSummary.failed} rows</p>
                        </div>
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono">
                          {bulkErrorSummary ? "Processed Results Log" : "Pre-Import Validation Log"}
                        </h4>
                        {!bulkErrorSummary && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-mono">
                            {bulkRows.filter(r => r.isValid).length} Valid · {bulkRows.filter(r => !r.isValid).length} Failed
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-left border-collapse block md:table">
                          <thead className="hidden md:table-header-group">
                            <tr className="bg-slate-100/50 border-b border-slate-200">
                              <th className="py-2.5 px-3 text-[9px] font-bold font-mono text-slate-500 uppercase">Row</th>
                              <th className="py-2.5 px-3 text-[9px] font-bold font-mono text-slate-500 uppercase">Full Name</th>
                              <th className="py-2.5 px-3 text-[9px] font-bold font-mono text-slate-500 uppercase">Role / Dept</th>
                              <th className="py-2.5 px-3 text-[9px] font-bold font-mono text-slate-500 uppercase">WhatsApp</th>
                              <th className="py-2.5 px-3 text-[9px] font-bold font-mono text-slate-500 uppercase">Email</th>
                              <th className="py-2.5 px-3 text-[9px] font-bold font-mono text-slate-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {bulkRows.map((row, idx) => (
                              <tr key={`bulk-row-${row.id ?? 'row'}-${idx}`} className={row.isValid ? "hover:bg-slate-50/50" : "bg-rose-50/20 hover:bg-rose-50/40"}>
                                <td className="py-2 px-3 font-mono font-bold text-slate-400 text-[10px]">{row.id}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{row.fullName || <span className="text-slate-400 italic">None</span>}</td>
                                <td className="py-2 px-3">
                                  <div>
                                    <p className="font-semibold text-slate-800 leading-none">{row.roleTitle || <span className="text-slate-400 italic">None</span>}</p>
                                    <p className="text-[9px] text-slate-500 mt-0.5 leading-none">{row.department}</p>
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono">{row.whatsapp || <span className="text-slate-400 italic">None</span>}</td>
                                <td className="py-2 px-3 font-mono text-[11px] max-w-[150px] truncate">{row.email || <span className="text-slate-400 italic">None</span>}</td>
                                <td className="py-2 px-3">
                                  {row.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                      <Check className="h-2.5 w-2.5" /> Valid
                                    </span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {row.errors.map((err: string, errIdx: number) => (
                                        <p key={`err-${row.id ?? 'row'}-${idx}-${errIdx}`} className="text-[9px] font-bold text-rose-600 leading-none font-semibold">⚠️ {err}</p>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-between shrink-0">
                <div>
                  {bulkErrorSummary && downloadableResults && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const worksheet = XLSX.utils.json_to_sheet(downloadableResults);
                          const workbook = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(workbook, worksheet, "Import Results");
                          XLSX.writeFile(workbook, "presensic_employees_import_results.xlsx");
                        } catch (err) {
                          console.error(err);
                          alert("Failed to export results. Downloading as CSV fallback.");
                          let csvContent = "data:text/csv;charset=utf-8,Full Name,Role Title,Employee Email,WhatsApp Number,Tracking Geofence,Generated User ID,Generated PIN,Import Status\n";
                          downloadableResults.forEach((row: any) => {
                            csvContent += `"${row['Full Name']}","${row['Role Title']}","${row['Employee Email']}","${row['WhatsApp Number']}","${row['Tracking Geofence']}","${row['Generated User ID']}","${row['Generated PIN']}","${row['Import Status']}"\n`;
                          });
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", "presensic_employees_import_results.csv");
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Updated Sheet</span>
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsBulkImportOpen(false);
                      setBulkImportFile(null);
                      setBulkRows([]);
                      setBulkErrorSummary(null);
                      setDownloadableResults(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {bulkErrorSummary ? "Close" : "Cancel"}
                  </button>

                  {!bulkErrorSummary && bulkImportFile && (
                    <button
                      onClick={() => {
                        const validRows = bulkRows.filter(r => r.isValid);
                        const invalidRows = bulkRows.filter(r => !r.isValid);

                        if (validRows.length === 0) {
                          alert("There are no valid rows to import!");
                          return;
                        }

                        let currentEmployees = [...employees];
                        const newEmployees: any[] = [];
                        const resultsForDownload: any[] = [];

                        validRows.forEach((row) => {
                          const allEmployees = [...employees, ...newEmployees];
                          const generatedId = generateUniqueLoginID(allEmployees);
                          const generatedPin = generateUniquePIN(allEmployees);

                          const newEmp = {
                            id: generatedId,
                            name: row.fullName,
                            role: row.roleTitle,
                            email: row.email?.toLowerCase(),
                            phone: row.whatsapp,
                            whatsapp: row.whatsapp,
                            pin: generatedPin,
                            zone: row.geofence,
                            status: "Absent" as const,
                            checkInTime: "—",
                            checkOutTime: "—",
                            lastPunch: "—",
                            avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=100&h=100&fit=crop&crop=face`
                          };

                          newEmployees.push(newEmp);

                          resultsForDownload.push({
                            "Full Name": row.fullName,
                            "Role Title": row.roleTitle,
                            "Employee Email": row.email,
                            "WhatsApp Number": row.whatsapp,
                            "Tracking Geofence": row.geofence,
                            "Generated User ID": generatedId,
                            "Generated PIN": generatedPin,
                            "Import Status": "Success"
                          });
                        });

                        invalidRows.forEach(row => {
                          resultsForDownload.push({
                            "Full Name": row.fullName,
                            "Role Title": row.roleTitle,
                            "Employee Email": row.email,
                            "WhatsApp Number": row.whatsapp,
                            "Tracking Geofence": row.geofence,
                            "Generated User ID": "—",
                            "Generated PIN": "—",
                            "Import Status": `Failed: ${row.errors.join(", ")}`
                          });
                        });
                        
                        // Check if total employees will exceed plan limit
                        if ((employees || []).length + newEmployees.length > planLimit) {
                          setPendingBulkEmployees(newEmployees);
                          setPendingEmployee(null); // Clear single pending if any
                          setIsUpgradeModalOpen(true);
                          return;
                        }

                        // Save bulk imported employees to Supabase
                        (async () => {
                          try {
                            const supabase = getSupabase();
                            if (!supabase) {
                              alert("Database connection is not available.");
                              return;
                            }
                            const searchWhatsApp = employerUser?.whatsApp || employerUser?.whatsapp || employerUser?.email;
                            if (!searchWhatsApp) {
                              alert("No WhatsApp/email found for your employer account in session.");
                              return;
                            }
                            let { data: comp } = await supabase
                              .from('companies')
                              .select('id')
                              .eq('whatsapp', searchWhatsApp)
                              .maybeSingle();

                            if (!comp) {
                              const { data: allComps } = await supabase.from('companies').select('id');
                              if (allComps && allComps.length > 0) {
                                comp = allComps[0];
                              } else {
                                alert("No company found for this employer. Cannot perform import.");
                                return;
                              }
                            }

                            const dbEmployeesToInsert = newEmployees.map(emp => mapEmployeeToDB(emp, comp.id));
                            console.log("BULK INSERT PAYLOAD", dbEmployeesToInsert);

                            let { error: insertErr } = await supabase
                              .from('employees')
                              .insert(dbEmployeesToInsert);

                            if (insertErr && (insertErr.code === '42703' || insertErr.message?.includes('column'))) {
                              const sanitizedInserts = dbEmployeesToInsert.map(empObj => {
                                const copy = { ...empObj };
                                delete copy.zone;
                                return copy;
                              });
                              const retry = await supabase
                                .from('employees')
                                .insert(sanitizedInserts);
                              insertErr = retry.error;
                            }

                            if (insertErr) {
                              console.error("Bulk insert failed:", insertErr);
                              alert(`Failed to import employees into database:\n${insertErr.message}`);
                              return;
                            }

                            if (invalidRows.length === 0) {
                              setOnboardingSummaryEmployees(newEmployees);
                              setIsOnboardingSuccessModalOpen(true);
                              setIsBulkImportOpen(false);
                              setBulkImportFile(null);
                              setBulkRows([]);
                            } else {
                              setBulkErrorSummary({
                                total: bulkRows.length,
                                success: validRows.length,
                                failed: invalidRows.length
                              });
                              setDownloadableResults(resultsForDownload);
                            }

                            await fetchEmployeesFromDB();
                          } catch (err: any) {
                            console.error("Bulk import exception:", err);
                            alert(`Error during bulk import:\n${err.message || err}`);
                          }
                        })();
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
                    >
                      Confirm & Import {bulkRows.filter(r => r.isValid).length} Employees
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Punch Details Modal */}
      <AnimatePresence>
        {selectedLogDetails && (
          <motion.div 
            key="punch-details-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto" 
            id="punch-details-modal"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLogDetails(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-auto border border-slate-100 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 font-display">Biometric Punch Verification</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Verified via Presensic Neural Anchors</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLogDetails(null)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer border border-transparent hover:border-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-none">
                  {/* Employee Info & Selfie */}
                  <div className="flex items-start gap-6">
                    <div className="relative group">
                      <img 
                        src={selectedLogDetails.avatar} 
                        alt="Punch Selfie" 
                        className="h-32 w-32 rounded-2xl object-cover border-2 border-white shadow-xl ring-4 ring-blue-50"
                      />
                      <div className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full ${
                        selectedLogDetails.isNotRegistered 
                          ? 'bg-amber-500' 
                          : (selectedLogDetails.status === "failed" || selectedLogDetails.face_verified === false || selectedLogDetails.gps_verified === false
                              ? 'bg-rose-500' 
                              : (selectedLogDetails.status === "warning" ? 'bg-amber-500' : 'bg-emerald-500'))
                      } border-2 border-white flex items-center justify-center text-white shadow-lg`}>
                        {selectedLogDetails.isNotRegistered ? <MapPinOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </div>
                    </div>
                    <div className="space-y-3 flex-1 text-left">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Employee Name</p>
                        <p className="text-lg font-black text-slate-900 font-display leading-tight">{selectedLogDetails.employee}</p>
                        <p className="text-xs text-slate-500 font-medium">{selectedLogDetails.role || "Team Member"}</p>
                      </div>
                      {selectedLogDetails.isNotRegistered ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-[10px] font-black uppercase">
                          <MapPinOff className="h-3 w-3 text-amber-500" /> Not Registered Yet
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-[10px] font-black uppercase">
                          <Activity className="h-3 w-3" /> {selectedLogDetails.method || "Face Match"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Punch Metadata */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-left">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Timestamp</p>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-600" /> {selectedLogDetails.isNotRegistered ? "Not Registered" : selectedLogDetails.time}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-left">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">GPS Accuracy</p>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1">
                        <Wifi className="h-3 w-3 text-emerald-500" /> {selectedLogDetails.isNotRegistered ? "—" : selectedLogDetails.gpsAccuracy}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-left">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Distance</p>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1">
                        <Target className="h-3 w-3 text-brand-600" /> {selectedLogDetails.isNotRegistered ? "—" : selectedLogDetails.distance}
                      </p>
                    </div>
                  </div>

                  {/* Face Verification Details */}
                  {!selectedLogDetails.isNotRegistered && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono font-bold text-slate-500">Biometric Face Match</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          selectedLogDetails.status === "failed" || selectedLogDetails.face_verified === false
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                          {selectedLogDetails.status === "failed" || selectedLogDetails.face_verified === false
                            ? "Failed / Mismatch"
                            : "Verified / Match"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Verification Method:</span>
                        <span className="text-slate-600 font-mono font-bold">
                          {selectedLogDetails.method || "Biometric Selfie Verification"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* GPS & Map */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Geofence Anchor Location</p>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {selectedLogDetails.zone || "Unassigned"}
                      </span>
                    </div>
                    {(() => {
                      if (selectedLogDetails.isNotRegistered) {
                        return (
                          <div className="h-52 w-full flex flex-col items-center justify-center p-6 text-center bg-amber-50/60 border border-amber-200/80 rounded-2xl text-slate-700 space-y-2">
                            <div className="h-10 w-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                              <MapPinOff className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-black text-amber-900 font-display">Not Registered Yet</p>
                            <p className="text-[10px] text-amber-800/80 max-w-xs leading-relaxed">
                              This employee has not completed registration or logged their first biometric check-in. Real-time GPS location and location maps will appear automatically once they punch in via the mobile portal.
                            </p>
                          </div>
                        );
                      }

                      const resGps = resolveLogCoordinates(selectedLogDetails, selectedLogDetails.zone);
                      return (
                        <div className="h-52 w-full bg-slate-900 rounded-2xl relative overflow-hidden border border-slate-200 group shadow-inner">
                          {resGps.hasRealGps ? (
                            <iframe
                              title="OpenStreetMap Live GPS Location"
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              scrolling="no"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(resGps.latLng.split(',')[1]) - 0.005},${Number(resGps.latLng.split(',')[0]) - 0.005},${Number(resGps.latLng.split(',')[1]) + 0.005},${Number(resGps.latLng.split(',')[0]) + 0.005}&layer=mapnik&marker=${resGps.latLng.replace(/\s+/g, '')}`}
                              className="w-full h-full rounded-2xl opacity-90 transition-opacity hover:opacity-100"
                            />
                          ) : (
                            <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-slate-100 text-slate-500 space-y-2">
                              <MapPinOff className="h-8 w-8 text-slate-400" />
                              <p className="text-xs font-bold text-slate-700">No Real GPS Coordinates Recorded</p>
                              <p className="text-[10px] text-slate-400 max-w-xs">GPS location was not provided during check-in or device location was disabled.</p>
                            </div>
                          )}

                          {/* Address & Coordinates Overlay */}
                          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-between gap-3 z-10">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-9 w-9 rounded-xl ${resGps.hasRealGps ? 'bg-blue-600' : 'bg-slate-700'} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="text-xs font-black text-white truncate leading-tight tracking-tight">
                                  {resGps.address}
                                </p>
                                <p className="text-[10px] font-bold font-mono text-slate-300 flex items-center gap-1 mt-0.5">
                                  {resGps.hasRealGps ? `GPS: ${resGps.latLng}` : "Coordinates Unavailable"}
                                </p>
                              </div>
                            </div>
                            {resGps.hasRealGps && (
                              <a 
                                href={`https://www.google.com/maps?q=${resGps.latLng.replace(/\s+/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest shrink-0 border-l border-white/10 pl-3 flex items-center gap-1"
                              >
                                <span>Open Maps</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => setSelectedLogDetails(null)}
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-2xl transition-all active:scale-98 shadow-xl shadow-slate-900/10"
                  >
                    Done Reviewing
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
        {/* Onboarding Success Modal */}
        {isOnboardingSuccessModalOpen && (
          <motion.div 
            key="onboarding-success-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOnboardingSuccessModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="bg-emerald-600 p-8 text-white text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4" />
                <h2 className="text-3xl font-black font-display tracking-tight">Onboarding Successful</h2>
                <p className="text-emerald-100 mt-2">New employees have been added with auto-generated credentials.</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Login ID</th>
                        <th className="px-4 py-3">PIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {onboardingSummaryEmployees.map((emp, idx) => (
                        <tr key={emp?.id ? `onboard-emp-${emp.id}-${idx}` : `onboard-emp-fallback-${idx}`}>
                          <td className="px-4 py-3 font-bold text-slate-800">{emp.name}</td>
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">{emp.id}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">{emp.pin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(onboardingSummaryEmployees.map(e => ({name: e.name, id: e.id, pin: e.pin}))))}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
                  >
                    <Copy className="h-4 w-4" /> Copy to Clipboard
                  </button>
                  <button 
                    onClick={() => setIsOnboardingSuccessModalOpen(false)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* WhatsApp Notification Modal */}
        {isModalOpen && selectedLeave && (
          <motion.div 
            key="whatsapp-modal-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-200"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-black font-display tracking-tight text-slate-900">Notify Employee</h2>
              <p className="text-slate-500 text-xs mt-2 mb-6 font-medium">Send decision via WhatsApp</p>
              
              <div className="bg-slate-50 p-4 rounded-xl text-left text-xs text-slate-700 font-bold mb-6 italic">
                "Your leave request has been {selectedLeave.status} by management."
              </div>

              <button 
                onClick={() => {
                  const status = selectedLeave.status || "Approved";
                  const phone = selectedLeave.whatsappNumber || "918104468397";

                  const messageText = `Your leave request has been ${status} by management.`;
                  const url = `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(messageText)}`;
                  window.open(url, '_blank');
                  setIsModalOpen(false);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20"
              >
                Send via WhatsApp
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Razorpay-style Checkout Modal */}
        {isUpgradeModalOpen && (
          <motion.div 
            key="upgrade-checkout-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessingPayment && setIsUpgradeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="bg-[#1348e4] p-4 text-white flex items-center justify-between">
                <span className="text-xl font-black">Razorpay<span className="font-light text-blue-200"> Secure</span></span>
                <span className="text-xs font-bold bg-blue-700 px-2 py-1 rounded">₹{upgradeType === "Starter" ? "999.00" : "45.00"}</span>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="text-sm font-bold text-slate-800">Choose Payment Method</div>
                  <div className="grid grid-cols-1 gap-2">
                    {["UPI / QR", "Cards (Visa, Mastercard, RuPay)", "Netbanking"].map((option, idx) => (
                      <div key={`payment-opt-${option}-${idx}`} className="p-3 border rounded border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                        {option}
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-100 p-4 rounded flex flex-col items-center gap-2">
                    <div className="w-20 h-20 bg-white border border-slate-300" />
                    <p className="text-[10px] text-slate-500 font-bold">Scan to Pay via UPI</p>
                  </div>
                </div>

                <button
                  onClick={handleUpgradePayment}
                  disabled={isProcessingPayment || paymentSuccess}
                  className="w-full py-3 bg-[#1348e4] text-white font-bold text-sm rounded shadow transition-all disabled:opacity-50"
                >
                  {isProcessingPayment ? "Processing..." : paymentSuccess ? "Payment Successful!" : `Pay ₹${upgradeType === "Starter" ? "999.00" : "45.00"}`}
                </button>

                <div className="text-center text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Securely Powered by Razorpay
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Employee Permanent Delete Confirmation Modal */}
        {deletingEmployee && (
          <motion.div 
            key="delete-confirm-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto" 
            id="delete-employee-modal-root"
          >
            {/* Backdrop */}
            <motion.div
              key="delete-confirm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingEmployee(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />

            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
              <motion.div
                key="delete-confirm-dialog"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full max-w-md border border-slate-100 p-6 flex flex-col gap-4 z-50"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-display text-slate-900 tracking-wide">
                      Permanently Delete Employee
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">This action is permanent and cannot be undone.</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-display">
                  <p>
                    Are you sure you want to permanently delete <strong>{deletingEmployee.name}</strong> (ID: {deletingEmployee.id})?
                  </p>
                  <p>
                    Their entire attendance log history, shift records, and leave requests will also be removed from the database and dashboard. This action is irreversible.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setDeletingEmployee(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(deletingEmployee.id)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Permanently Delete
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* 7. Factory Reset Database Confirmation Modal */}
        {isResetConfirmModalOpen && (
          <motion.div 
            key="reset-confirm-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto" 
            id="reset-confirm-modal-root"
          >
            {/* Backdrop */}
            <motion.div
              key="reset-confirm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetConfirmModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />

            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
              <motion.div
                key="reset-confirm-dialog"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full max-w-md border border-slate-100 p-6 flex flex-col gap-4 z-50"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-display text-slate-900 tracking-wide">
                      Confirm Factory Reset
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">This action is permanent and cannot be undone.</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 leading-relaxed font-display">
                  <p>
                    You are about to initiate a <strong>complete database purge</strong> for the following tracking categories:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-500 text-[11px] font-mono">
                    <li>All Registered Employee Profiles (Roster Database)</li>
                    <li>Historical Punch Logs & Biometric Geo-feeds</li>
                    <li>Pending & Historical Leave Applications</li>
                  </ul>
                  <p className="text-rose-600 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-[10px] font-semibold mt-3">
                    Warning: This resets your organization's dashboard stat cards to exactly 0 (Total Staff: 0, Present: 0, On Field: 0, Absent: 0) and clears all active rosters.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setIsResetConfirmModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Perform complete database purge
                      setEmployees([]);
                      setLogs([]);
                      setLeaves([]);
                      
                      // Clear from local storage
                      try {
                        localStorage.removeItem("presensic_employees_db");
                        localStorage.removeItem("presensic_attendance_logs_db");
                        localStorage.removeItem("presensic_leaves_db");
                        localStorage.removeItem("presensic_employee_user");
                      } catch (e) {
                        console.error("Failed to clear items from localStorage", e);
                      }

                      // Purge company data from Supabase
                      const supabase = getSupabase();
                      if (supabase && currentCompany?.id) {
                        supabase.from('employees').delete().eq('company_id', currentCompany.id).then();
                        supabase.from('attendance_logs').delete().eq('company_id', currentCompany.id).then();
                        supabase.from('leave_requests').delete().eq('company_id', currentCompany.id).then();
                      }
                      
                      setIsResetConfirmModalOpen(false);
                      setSettingsToast({ show: true, message: "Database wiped to empty state.", type: "error" });
                    }}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Confirm & Wipe All Data
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* 8. Employee Shift Configuration Modal */}
        {isShiftModalOpen && selectedEmpForShift && (
          <motion.div
            key="shift-config-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
            id="shift-config-modal-root"
          >
            <motion.div
              key="shift-config-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShiftModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
              <motion.div
                key="shift-config-dialog"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full max-w-lg border border-slate-100 p-6 flex flex-col gap-6 z-50"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold font-display text-slate-900 tracking-wide">
                        Configure Shift Settings
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Employee: <span className="font-semibold text-slate-700">{selectedEmpForShift.name}</span> ({selectedEmpForShift.role})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsShiftModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Shift Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditedShiftSettings(prev => ({ ...prev, shift_type: "fixed" }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          editedShiftSettings.shift_type === "fixed"
                            ? "bg-blue-50/70 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-600/20"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-xs font-bold">Fixed Timing</span>
                        <span className="text-[10px] text-slate-500">Standard start/end time with late arrival penalty rules.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditedShiftSettings(prev => ({ ...prev, shift_type: "flexible" }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          editedShiftSettings.shift_type === "flexible"
                            ? "bg-purple-50/70 border-purple-600 text-purple-900 shadow-xs ring-1 ring-purple-600/20"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-xs font-bold">Flexible Timing</span>
                        <span className="text-[10px] text-slate-500">No fixed start time. Exempt from late-flagging penalties.</span>
                      </button>
                    </div>
                  </div>

                  {editedShiftSettings.shift_type === "fixed" ? (
                    <div className="space-y-4 p-4 bg-slate-50/70 rounded-xl border border-slate-200/60">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                            Shift Start Time
                          </label>
                          <input
                            type="time"
                            value={editedShiftSettings.shift_start}
                            onChange={(e) => setEditedShiftSettings(prev => ({ ...prev, shift_start: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                            Shift End Time
                          </label>
                          <input
                            type="time"
                            value={editedShiftSettings.shift_end}
                            onChange={(e) => setEditedShiftSettings(prev => ({ ...prev, shift_end: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600/20 font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                            Grace Period (Minutes)
                          </label>
                          <span className="text-xs font-bold text-blue-600 font-mono">{editedShiftSettings.grace_period} mins</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="60"
                          step="5"
                          value={editedShiftSettings.grace_period}
                          onChange={(e) => setEditedShiftSettings(prev => ({ ...prev, grace_period: Number(e.target.value) }))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                        <p className="text-[9px] text-slate-400">
                          Punches logged beyond this margin after shift start will be flagged as Late.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex items-start gap-3">
                      <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0 mt-0.5">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-purple-900 space-y-1">
                        <p className="font-bold">Flexible Shift Active</p>
                        <p className="text-[11px] text-purple-700 leading-relaxed">
                          This employee can check in at any time without triggering late arrival warnings. Ideal for field agents, executives, or remote staff.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsShiftModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateEmployeeShiftSettings}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Save Shift Settings
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Support Ticket Modal */}
        <SupportTicketModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
          context={{
            companyName: employerUser.orgName || "Employer Organization",
            raisedBy: `${employerUser.name || "Employer"} (Employer)`
          }}
          setTickets={setTickets}
        />

        {/* Location Details Modal */}
        {selectedLocationRecord && (() => {
          // Find the primary punch log for today.
          const primaryLog = selectedLocationRecord?.empLogs?.[0] || {};
          
          // Extract location address or name
          const locationName = primaryLog?.location_name || "Marathon Nexzone - Main Entrance";
          const locationAddress = primaryLog?.location_address || "Marathon Nexzone, Palaspe Phata, Panvel, Maharashtra 410206";
          
          // Latitude / Longitude
          const modalLat = primaryLog?.latitude || 18.9894;
          const modalLng = primaryLog?.longitude || 73.1175;

          // Parse encoded metadata in 'method' if present
          const methodStr = primaryLog?.method || '';
          let deviceInfo = primaryLog?.device_info || 'Chrome on Android';
          let ipAddress = primaryLog?.ip_address || '103.114.50.8';

          const deviceMatch = methodStr.match(/\|\|device:(.*?)\|\|/);
          if (deviceMatch) {
            deviceInfo = deviceMatch[1];
          }
          const ipMatch = methodStr.match(/\|\|ip:(.*?)\|\|/);
          if (ipMatch) {
            ipAddress = ipMatch[1];
          }

          // Geofence Distance calculation
          const distanceMeters = primaryLog?.distance_from_office_meters !== undefined && primaryLog?.distance_from_office_meters !== null 
            ? Math.round(primaryLog.distance_from_office_meters) 
            : 124;
          
          const isInside = primaryLog?.inside_geofence !== undefined && primaryLog?.inside_geofence !== null
            ? primaryLog.inside_geofence
            : selectedLocationRecord?.isInsideGeofence;

          const accuracy = primaryLog?.gps_accuracy ? `${Math.round(primaryLog.gps_accuracy)}m` : '15m';

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="bg-white border border-slate-200/85 rounded-2xl shadow-xl w-[92vw] max-w-md my-auto max-h-[85vh] overflow-y-auto text-left"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black font-display text-slate-900 tracking-wide uppercase">Verification Details</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Punch audit trail & geolocation log</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLocationRecord(null)}
                    className="h-7 w-7 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Employee Card */}
                  <div className="flex flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 overflow-hidden">
                        {selectedLocationRecord?.emp?.avatar ? (
                          <img src={selectedLocationRecord.emp.avatar} alt="" className="h-full w-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                        ) : (
                          selectedLocationRecord?.emp?.name ? selectedLocationRecord.emp.name.split(" ").map((n: any) => n[0]).join("").slice(0, 2).toUpperCase() : "EE"
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{selectedLocationRecord?.emp?.name || 'Employee'}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{selectedLocationRecord?.emp?.id || 'N/A'} • {selectedLocationRecord?.emp?.role || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap inline-flex items-center ${
                        selectedLocationRecord?.status === 'Checked In' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        selectedLocationRecord?.status === 'Checked Out' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {selectedLocationRecord?.status || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {/* Location Info */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Verified Location</span>
                      <div className="text-xs font-bold text-slate-900">{locationName}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed">{locationAddress}</div>
                    </div>

                    {/* Coordinates & Accuracy */}
                    <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Precise Coordinates</span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 break-words">{modalLat.toFixed(5)}° N, {modalLng.toFixed(5)}° E</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider block">GPS Precision</span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-800">± {accuracy} accuracy</span>
                      </div>
                    </div>

                    {/* Geofence Status Badge */}
                    <div className="pt-1">
                      <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">Geofence Compliance</span>
                      <div className={`p-3 rounded-xl border flex items-center justify-between ${
                        isInside 
                          ? 'bg-emerald-50/50 border-emerald-100/80 text-emerald-800' 
                          : 'bg-rose-50/50 border-rose-100/80 text-rose-800'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${isInside ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="text-xs font-bold font-mono">
                            {isInside ? `Verified Inside 150m Geofence Radius` : `Outside Permitted Work Area (${distanceMeters}m away)`}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 bg-white border rounded-full border-slate-100 shadow-3xs font-extrabold text-slate-600">
                          {distanceMeters}m offset
                        </span>
                      </div>
                    </div>

                    {/* Device & IP Address info */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">Device & Hardware</span>
                        <span className="text-[11px] font-mono font-bold text-slate-700">{deviceInfo}</span>
                      </div>
                      <div className="h-[1px] bg-slate-200/60" />
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">Network Address (IP)</span>
                        <span className="text-[11px] font-mono font-bold text-slate-700">{ipAddress}</span>
                      </div>
                      <div className="h-[1px] bg-slate-200/60" />
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">Face Lock Status</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${selectedLocationRecord?.hasFaceFailure ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                          {selectedLocationRecord?.hasFaceFailure ? 'Biometric Mismatch' : 'Biometric Verified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <a
                    href={`https://maps.google.com/?q=${modalLat},${modalLng}`}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all duration-150 cursor-pointer shadow-md shadow-blue-500/15 text-center"
                  >
                    🗺️ Open in Google Maps
                  </a>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}



      </AnimatePresence>

    </div>
  );
}
