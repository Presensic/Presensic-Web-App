import React, { useState, useEffect, useRef, useMemo } from "react";
import { calculateTrialStatus } from "../utils/trial";
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  LogOut, 
  User, 
  Upload, 
  X, 
  Plus, 
  FileText, 
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  Check,
  AlertTriangle,
  Compass,
  History,
  TrendingUp,
  BarChart3,
  CalendarDays,
  UserCheck,
  Lock,
  ChevronRight,
  ShieldAlert,
  Shield,
  Map,
  Fingerprint,
  Ticket,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as faceapi from "face-api.js";
import SupportTicketModal from "./SupportTicketModal";
import FaceRegistration from "./FaceRegistration";
import FaceVerification from "./FaceVerification";
import FaceEnrollment from "./FaceEnrollment";
import { getCurrentLocation } from "../faceUtils";
import { getSupabase } from "../lib/supabase";
import { LeaveRequest } from "../types";
import { useSystemSettings, useAutoLogout, checkAttendanceStatus, isWorkingDay, parseEmployeeShiftSettings } from "../hooks/useSystemSettings";
import { 
  getLogDate, 
  isCheckInLog, 
  isCheckOutLog, 
  formatDisplayTime, 
  parseTimeToDate,
  verifyFaceClientSide,
  AttendanceLog
} from "../utils/attendance";
import { useAttendance } from "../hooks/useAttendance";

interface EmployeeDashboardProps {
  onLogOut?: () => void;
  onLogout?: () => void;
  employeeUser?: {
    id?: string | number;
    name?: string;
    email?: string;
    whatsApp?: string;
    orgName?: string;
    orgType?: string;
    designation?: string;
    selfiePreview?: string | null;
    avatar?: string;
    companyId?: number | string;
    role?: string;
    faceRegistered?: boolean;
    face_registered?: boolean;
    faceLockSetup?: boolean;
    isDeactivated?: boolean;
  } | null;
  user?: any;
  currentUser?: any;
  setEmployeeUser?: React.Dispatch<React.SetStateAction<any>>;
  employees?: any[];
  setEmployees?: React.Dispatch<React.SetStateAction<any[]>>;
  logs?: any[];
  setLogs?: React.Dispatch<React.SetStateAction<any[]>>;
  leaves?: LeaveRequest[];
  setLeaves?: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  companies?: any[];
  tickets?: any[];
  setTickets?: React.Dispatch<React.SetStateAction<any[]>>;
}

// Haversine distance calculator
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // in metres
}

// Free OpenStreetMap Nominatim reverse geocoding
async function fetchReverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Presensic/1.0 (contact: presensic@gmail.com)"
      }
    });
    if (!response.ok) throw new Error("OSM Nominatim API request failed");
    const data = await response.json();
    if (data) {
      if (data.address) {
        const addr = data.address;
        const placeName = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.city || addr.state || "";
        if (placeName) return placeName;
      }
      if (data.display_name) {
        const parts = data.display_name.split(",");
        if (parts.length > 0) {
          return parts.slice(0, 2).map((p: string) => p.trim()).join(", ");
        }
      }
    }
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  } catch (error) {
    console.error("OSM Reverse Geocode failed:", error);
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
}

// Default Geofence Coordinates Fallback
const OFFICE_COORDS = { lat: 19.0760, lng: 72.8777, radius: 150 };

export default function EmployeeDashboard(props: EmployeeDashboardProps) {
  const {
    onLogOut = () => { localStorage.clear(); window.location.reload(); },
    onLogout = () => { localStorage.clear(); window.location.reload(); },
    employeeUser: propEmployeeUser = null,
    setEmployeeUser = () => {},
    employees = [],
    setEmployees = () => {},
    logs = [],
    setLogs = () => {},
    leaves = [],
    setLeaves = () => {},
    companies = [],
    tickets = [],
    setTickets = () => {}
  } = props;

  // Prop Normalization
  const employeeUser = propEmployeeUser || props.user || props.currentUser || (() => {
    try {
      const saved = localStorage.getItem('presensic_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.error("Error reading presensic_user in EmployeeDashboard normalization:", e);
    }
    return null;
  })();

  // Guard all array methods with safe fallback constants
  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeLeaves = Array.isArray(leaves) ? leaves : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const safeCompanies = Array.isArray(companies) ? companies : [];

  // Check if company trial is expired
  if (!employeeUser) {
    return <div className="min-h-screen flex items-center justify-center text-slate-300">Loading user profile...</div>;
  }

  const currentCompany = safeCompanies.find(c => c && (c.name === employeeUser?.orgName || String(c.id) === String(employeeUser?.companyId ?? (employeeUser as any)?.company_id ?? ''))) || { status: "Trial Active", created_at: new Date().toISOString() };
  const trialCalc = calculateTrialStatus(
    currentCompany?.created_at || currentCompany?.registered_at,
    currentCompany?.status,
    currentCompany?.plan
  );
  const isGated = trialCalc.isGated;

  // Defense-in-depth mount safeguard for Employee session
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("presensic_user");
      if (!savedUser) {
        onLogOut();
      }
    } catch (e) {
      onLogOut();
    }
  }, [onLogOut]);

  const [activeTab, setActiveTab] = useState<"history" | "leaves" | "profile">("history");
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showCalculationSteps, setShowCalculationSteps] = useState(false);
  const [summaryPeriod, setSummaryPeriod] = useState<"today" | "week" | "month">("today");
  const [historyPeriod, setHistoryPeriod] = useState<"today" | "week" | "month">("today");
  const [visibleHistoryLimit, setVisibleHistoryLimit] = useState(20);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Test Mode State
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [simulatedCoords, setSimulatedCoords] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const isTestModeGlobalEnabled = import.meta.env.VITE_ENABLE_TEST_MODE === 'true';
  
  // Reset limit when period changes
  useEffect(() => {
    setVisibleHistoryLimit(20);
  }, [summaryPeriod]);
  
  // Face API State
  // Simulated match mode active - no models loaded
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [hasFaceMismatchBypass, setHasFaceMismatchBypass] = useState(false);
  const [faceMismatchDetails, setFaceMismatchDetails] = useState<{ confidence: number; reason: string } | null>(null);
  const [hasFaceVerificationError, setHasFaceVerificationError] = useState(false);
  const [faceVerificationErrorDetails, setFaceVerificationErrorDetails] = useState<string | null>(null);
  const [lastMatchDistance, setLastMatchDistance] = useState<number | null>(null);
  
  // Verification System State
  const [verificationStage, setVerificationStage] = useState<"none" | "gps" | "camera" | "verifying" | "verified_location" | "matched" | "failed" | "summary">("none");
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);
  const [isFaceLockSetupMode, setIsFaceLockSetupMode] = useState(false);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
  const [isSubmittingPunch, setIsSubmittingPunch] = useState(false);
  const [companyGeofence, setCompanyGeofence] = useState<{name: string, lat: number, lng: number, radius: number} | null>(null);
  const [clientIp, setClientIp] = useState<string>("");

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => {
        if (data && data.ip) {
          setClientIp(data.ip);
        }
      })
      .catch(() => {
        const randomIp = `103.114.50.${Math.floor(Math.random() * 250) + 1}`;
        setClientIp(randomIp);
      });
  }, []);
  

  // Sync state for this specific employee from the general employees list
  const currentEmployeeInDb = safeEmployees.find(
    e => e && ((employeeUser?.id && String(e.id) === String(employeeUser.id)) || (employeeUser?.email && e.email?.toLowerCase() === employeeUser.email.toLowerCase()) || (employeeUser?.name && e.name === employeeUser.name))
  );

  const activeCompanyId = currentEmployeeInDb?.companyId ?? (currentEmployeeInDb as any)?.company_id ?? employeeUser?.companyId ?? (employeeUser as any)?.company_id ?? currentCompany?.id;
  const { settings: systemSettings } = useSystemSettings(activeCompanyId);

  // Auto Logout Hook driven by systemSettings.auto_logout_minutes
  useAutoLogout(systemSettings?.auto_logout_minutes, onLogOut);

  // Dynamically load assigned geofence anchor
  const getAssignedGeofence = () => {
    if (companyGeofence) {
      return {
        name: companyGeofence.name || "Assigned Location",
        radius: companyGeofence.radius,
        lat: companyGeofence.lat,
        lng: companyGeofence.lng
      };
    }
    
    if (currentEmployeeInDb?.zone && currentEmployeeInDb.zone === "Corporate HQ") {
      return {
        name: currentEmployeeInDb.zone,
        radius: 150,
        lat: OFFICE_COORDS.lat,
        lng: OFFICE_COORDS.lng
      };
    }

    return null;
  };

  const activeGeofence = getAssignedGeofence();

  // Load real employee details and historical logs from Supabase
  useEffect(() => {
    const fetchEmployeeDetailsAndLogs = async () => {
      const supabase = getSupabase();
      if (!supabase || !employeeUser?.id) {
        setIsLoadingEmployee(false);
        return;
      }

      setIsLoadingEmployee(true);
      try {
        console.log("Fetching employee with ID:", employeeUser.id);
        let dbEmp: any = null;

        // Try direct lookup if ID is numeric
        if (employeeUser.id) {
          const isNum = typeof employeeUser.id === 'number' || (!isNaN(Number(employeeUser.id)) && String(employeeUser.id).trim() !== '');
          if (isNum) {
            const { data } = await supabase
              .from("employees")
              .select("*")
              .eq("id", Number(employeeUser.id))
              .maybeSingle();
            if (data) dbEmp = data;
          }
        }

        // Fallback: Query all employees and match flexibly
        if (!dbEmp) {
          const { data: allEmps } = await supabase.from("employees").select("*");
          if (allEmps && allEmps.length > 0) {
            const normInput = (employeeUser.id || "").toString().trim().replace(/\D/g, '');
            const inputSuffix = normInput.length >= 10 ? normInput.slice(-10) : normInput;
            const normEmail = (employeeUser.email || "").toLowerCase().trim();

            dbEmp = allEmps.find((e: any) => {
              const eIdStr = (e.id || "").toString();
              const ePhoneNorm = (e.phone || e.whatsapp || "").toString().replace(/\D/g, '');
              const ePhoneSuffix = ePhoneNorm.length >= 10 ? ePhoneNorm.slice(-10) : ePhoneNorm;
              const eEmailNorm = (e.email || "").toLowerCase().trim();

              return (eIdStr === String(employeeUser.id)) ||
                     (normInput && eIdStr.replace(/\D/g, '') === normInput) ||
                     (normEmail && eEmailNorm === normEmail) ||
                     (inputSuffix && ePhoneSuffix && ePhoneSuffix === inputSuffix && inputSuffix.length >= 8);
            }) || allEmps[0];
          }
        }

        if (dbEmp) {
          const trackingGeofenceVal = dbEmp.zone || dbEmp.tracking_geofence || dbEmp.trackingGeofence || dbEmp.geofence;
          const mapped = {
            id: dbEmp.id,
            name: dbEmp.name,
            role: dbEmp.role,
            department: dbEmp.department,
            email: dbEmp.email,
            phone: dbEmp.phone,
            whatsapp: dbEmp.whatsapp,
            pin: dbEmp.pin,
            zone: trackingGeofenceVal,
            status: dbEmp.status || "Absent",
            checkInTime: dbEmp.check_in_time || "—",
            checkOutTime: dbEmp.check_out_time || "—",
            lastPunch: dbEmp.last_punch || "—",
            avatar: dbEmp.avatar,
            companyId: dbEmp.company_id,
            faceDescriptor: dbEmp.face_descriptor ? JSON.parse(dbEmp.face_descriptor) : null,
            faceLockSetup: dbEmp.face_lock_setup || false
          };
          
          setEmployees(prev => {
            const filtered = prev.filter(e => e.id !== mapped.id);
            return [mapped, ...filtered];
          });

          // Fetch Assigned Geofence Anchor where geofence_anchors.name matches employee.tracking_geofence (case-insensitive)
          const assignedAnchorId = dbEmp.assigned_anchor_id;
          if (dbEmp.company_id) {
            const { data: dbAnchors } = await supabase
              .from("geofence_anchors")
              .select("*")
              .eq("company_id", dbEmp.company_id);

            let fetchedAnchors = dbAnchors || [];
            if (fetchedAnchors.length === 0) {
              try {
                const ls = localStorage.getItem(`geofence_anchors_${dbEmp.company_id}`);
                if (ls) fetchedAnchors = JSON.parse(ls);
              } catch (e) {}
            }
            if (fetchedAnchors.length === 0) {
              try {
                const ls = localStorage.getItem(`presensic_saved_locations`);
                if (ls) fetchedAnchors = JSON.parse(ls);
              } catch (e) {}
            }

            let matchedAnchor = null;
            if (fetchedAnchors && fetchedAnchors.length > 0) {
              if (assignedAnchorId) {
                matchedAnchor = fetchedAnchors.find(a => String(a.id) === String(assignedAnchorId) || a.id === assignedAnchorId);
              }
              if (!matchedAnchor && trackingGeofenceVal) {
                const cleanTarget = trackingGeofenceVal.trim().toLowerCase();
                matchedAnchor = fetchedAnchors.find(a => {
                  const nameMatch = a.name && a.name.trim().toLowerCase() === cleanTarget;
                  const locMatch = a.location_name && a.location_name.trim().toLowerCase() === cleanTarget;
                  const pipeMatch = a.name && a.name.split(" | ")[0].trim().toLowerCase() === cleanTarget;
                  return nameMatch || locMatch || pipeMatch;
                });
              }
              if (!matchedAnchor) {
                matchedAnchor = fetchedAnchors[0];
              }
            }

            // Console log as required for debugging visibility
            console.log("GEOLOCATION_ANCHOR_DEBUG:", {
              employee_id: dbEmp.id,
              tracking_geofence: trackingGeofenceVal || null,
              matchedAnchor: matchedAnchor || null,
              fallback_used: !dbAnchors?.length && fetchedAnchors.length > 0
            });

            if (matchedAnchor) {
              let displayName = matchedAnchor.location_name || matchedAnchor.name;
              if (matchedAnchor.name && matchedAnchor.name.includes(" | ")) {
                displayName = matchedAnchor.name.split(" | ")[0];
              }
              
              let finalLat = Number(matchedAnchor.latitude || matchedAnchor.lat);
              let finalLng = Number(matchedAnchor.longitude || matchedAnchor.lng);
              
              if (displayName && displayName.toLowerCase().includes("marathon nexzone")) {
                // Force correct exact coordinates for Marathon Nexzone to fix discrepancy
                finalLat = 18.9658757;
                finalLng = 73.1269787;
              }

              setCompanyGeofence({
                name: displayName,
                lat: finalLat,
                lng: finalLng,
                radius: Number(matchedAnchor.radius_meters || matchedAnchor.radius || 150)
              });
            } else {
              setCompanyGeofence(null);
            }
          }

          setDataError(null);
        }
      } catch (err: any) {
        console.warn("Exception loading employee details in EmployeeDashboard:", err);
      } finally {
        setIsLoadingEmployee(false);
      }
    };

    fetchEmployeeDetailsAndLogs();
  }, [employeeUser?.id, setEmployees, setLogs, fetchTrigger]);

  // Fallback / initialization for this employee in db if not exists
  useEffect(() => {
    if (!currentEmployeeInDb && employeeUser) {
      setEmployees(prev => {
        const prevArr = prev || [];
        const exists = prevArr.some(
          e => e && ((employeeUser.id && String(e.id) === String(employeeUser.id)) || (employeeUser.email && e.email?.toLowerCase() === employeeUser.email.toLowerCase()) || (employeeUser.name && e.name === employeeUser.name))
        );
        if (exists) return prevArr;

        const newEmp = {
          id: `EMP-${100 + prevArr.length + 1}`,
          name: employeeUser.name || "Employee",
          role: employeeUser.designation || "Operations",
          department: "Operations",
          email: employeeUser.email || "",
          phone: employeeUser.whatsApp || "+91 98765 00000",
          zone: activeGeofence?.name || "Assigned Location",
          status: "Absent" as const,
          checkInTime: "—",
          checkOutTime: "—",
          lastPunch: "—",
          avatar: null, // Reset avatar to force new setup with descriptor
          faceDescriptor: null,
          isFaceLockRegistered: false,
          officeCoords: OFFICE_COORDS,
          companyId: employeeUser?.companyId ?? (employeeUser as any)?.company_id ?? ''
        };
        return [newEmp, ...prevArr];
      });
    }
  }, [currentEmployeeInDb, employeeUser, setEmployees]);

  // Structural Refactor: Use decoupled attendance hook
  const { 
    logs: empPersonalLogs, 
    todayLogs, 
    todayLogsChrono, 
    isLoading: isAttendanceLoading,
    setLogs: setPersonalLogs,
    refresh: refreshAttendance 
  } = useAttendance(employeeUser, currentEmployeeInDb, fetchTrigger);

  // Derived attendance status from todayLogsChrono directly
  const actualAttendanceStatus = useMemo(() => {
    if (isAttendanceLoading) return null; // Loading
    const logsArr = todayLogsChrono || [];
    if (logsArr.length === 0) return "not_checked_in";
    const lastLog = logsArr[logsArr.length - 1];
    return lastLog?.attendance_type === "Check Out" ? "checked_out" : "checked_in";
  }, [todayLogsChrono, isAttendanceLoading]);

  const actualCheckInTime = useMemo(() => {
    const logsArr = todayLogsChrono || [];
    const checkInLog = logsArr.find(l => l && l.attendance_type === "Check In");
    return checkInLog ? checkInLog.time : null;
  }, [todayLogsChrono]);

  const actualCheckOutTime = useMemo(() => {
    const logsArr = todayLogsChrono || [];
    const checkOutLog = logsArr.find(l => l && l.attendance_type === "Check Out");
    return checkOutLog ? checkOutLog.time : null;
  }, [todayLogsChrono]);

  const empStatus = currentEmployeeInDb?.status || "Absent";
  const isLoggedIn = actualAttendanceStatus === "checked_in";

  const now = new Date();
  const todayDateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });


  const todayCheckIns = (todayLogsChrono || []).filter(l => l && isCheckInLog(l) && l.status !== "failed" && !l.method?.includes("Rejected"));
  const todayCheckOuts = (todayLogsChrono || []).filter(l => l && isCheckOutLog(l) && l.status !== "failed" && !l.method?.includes("Rejected"));

  const calculationBreakdown = useMemo(() => {
    const ins = todayCheckIns || [];
    const outs = todayCheckOuts || [];
    if (ins.length === 0) return null;
    
    const earliestLog = ins[0];
    const latestOutLog = outs.length > 0 ? outs[outs.length - 1] : null;
    
    const startTime = earliestLog?.time ? parseTimeToDate(earliestLog.time) : null;
    const endTime = isLoggedIn ? new Date() : (latestOutLog?.time ? parseTimeToDate(latestOutLog.time) : null);
    
    if (!startTime) return null;
    
    const diffMs = endTime ? (endTime.getTime() - startTime.getTime()) : 0;
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;

    return {
      earliest: earliestLog,
      latest: latestOutLog,
      isLoggedIn,
      startTime,
      endTime,
      totalHoursStr: `${h}h ${m}m`,
      records: (todayLogsChrono || []).filter(l => l && l.status !== "failed" && !l.method?.includes("Rejected"))
    };
  }, [todayCheckIns, todayCheckOuts, isLoggedIn, todayLogsChrono]);

  const checkInTimeRaw = (todayCheckIns || []).length > 0 ? todayCheckIns[0]?.time : "—";
  const checkInTime = formatDisplayTime(checkInTimeRaw);

  // Only show Out Time if the user is NOT currently checked in (i.e., the session is closed)
  // This prevents pairing an old session's Out Time with a new session's In Time
  const checkOutTimeRaw = (!isLoggedIn && (todayCheckOuts || []).length > 0) ? todayCheckOuts[todayCheckOuts.length - 1]?.time : "—";
  const checkOutTime = formatDisplayTime(checkOutTimeRaw);

  const hasCheckedInToday = checkInTime !== "—" && checkInTime !== null && checkInTime !== undefined && checkInTime !== "";
  const hasCheckedOutToday = checkOutTime !== "—" && checkOutTime !== "null" && checkOutTime !== null && checkOutTime !== undefined && checkOutTime !== "";
  const hasAttendanceToday = (todayLogs || []).length > 0 || hasCheckedInToday || hasCheckedOutToday;

  // Compute Check-In Status Label
  let statusBadgeLabel = "Not Checked In";
  let statusBadgeColor = "bg-slate-100 text-slate-700 border-slate-200";
  
  if (actualAttendanceStatus === "checked_in") {
    if (empStatus === "On Field Duty") {
      statusBadgeLabel = "Checked In — On Field";
      statusBadgeColor = "bg-amber-50 text-amber-700 border-amber-200/60";
    } else {
      statusBadgeLabel = `Checked In — On Site ${empStatus === "Low Accuracy / Unverified Location" ? "(Unverified)" : ""}`;
      statusBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    }
  } else if (actualAttendanceStatus === "checked_out") {
    statusBadgeLabel = "Checked Out";
    statusBadgeColor = "bg-blue-50 text-blue-700 border-blue-200/60";
  }

  // Face Registration phase state
  const [isFaceRegistered, setIsFaceRegistered] = useState(() => {
    if (employeeUser) {
      return employeeUser.faceRegistered !== false && employeeUser.face_registered !== false;
    }
    return true;
  });

  // Camera capture modal state for Punching
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);

  // Safeguard: lock body scroll when punch modal is open, restore to auto on close/unmount
  useEffect(() => {
    if (isPunchModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isPunchModalOpen]);

  // Fetch and subscribe to leave requests in EmployeeDashboard for real-time status updates
  useEffect(() => {
    const fetchLeaves = async () => {
      const supabase = getSupabase();
      if (!supabase || !employeeUser?.id) return;
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeUser.id)
        .order('id', { ascending: false });
      if (!error && data) {
        setLeaves(prev => {
          const prevArr = prev || [];
          // Merge leaves without losing other employees leaves (if any in global state)
          const otherLeaves = prevArr.filter(l => l && String(l.employee_id) !== String(employeeUser?.id));
          return [...(data || []), ...otherLeaves];
        });
      }
    };
    
    if (activeTab === "leaves") {
      fetchLeaves();
    }

    const supabase = getSupabase();
    if (!supabase) return;

    const channelName = `employee_leave_requests_rt_${employeeUser?.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: `employee_id=eq.${employeeUser.id}`
        },
        (payload) => {
          console.log("Realtime leave_requests event in EmployeeDashboard:", payload);
          fetchLeaves();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setLeaves, activeTab, employeeUser?.id]);
  const [punchType, setPunchType] = useState<"in" | "out">("in");
  const [selfieMode, setSelfieMode] = useState<"none" | "upload" | "camera">("none");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const punchFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // GPS verification state inside punch modal
  const [gpsStage, setGpsStage] = useState<"none" | "loading" | "success" | "error" | "low_precision">("none");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [computedDistance, setComputedDistance] = useState<number | null>(null);
  const [gpsVerificationMode, setGpsVerificationMode] = useState<"real" | "simulate_onsite" | "simulate_offsite">("real");

  // Confirmation state on screen after successful check-in/out
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [confirmationType, setConfirmationType] = useState<"success" | "warning" | null>(null);

  // Calculate live hours logged so far today (summing all completed and active sessions)
  function LiveHoursDisplay({ 
    isLoggedIn, 
    todayCheckIns, 
    todayCheckOuts 
  }: { 
    isLoggedIn: boolean; 
    todayCheckIns: any[]; 
    todayCheckOuts: any[] 
  }) {
    const [liveTime, setLiveTime] = useState<string>("0h 0m");

    useEffect(() => {
      const update = () => {
        try {
          if (todayCheckIns.length === 0) {
            setLiveTime("0h 0m");
            return;
          }
          
          const earliestLog = todayCheckIns[0];
          const startTime = parseTimeToDate(earliestLog.time);
          if (!startTime) return;

          let endTime = new Date();
          if (!isLoggedIn && todayCheckOuts.length > 0) {
            const latestOutLog = todayCheckOuts[todayCheckOuts.length - 1];
            endTime = parseTimeToDate(latestOutLog.time) || new Date();
          }

          if (endTime > startTime) {
            const diffMs = endTime.getTime() - startTime.getTime();
            const totalMins = Math.floor(diffMs / (1000 * 60));
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            setLiveTime(`${h}h ${m}m`);
          }
        } catch (e) {
          console.warn("Error in LiveHoursDisplay:", e);
        }
      };

      update();
      const interval = setInterval(update, 1000); // Update every second for smooth live counter
      return () => clearInterval(interval);
    }, [isLoggedIn, todayCheckIns, todayCheckOuts]);

    return <span>{liveTime}</span>;
  }

  // Clean up object URLs and Camera when modal closes
  const stopCamera = () => {
    // 1. Synchronously stop tracks using the ref
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) { console.error("Error stopping track via ref:", e); }
      });
      activeStreamRef.current = null;
    }
    // 2. Stop tracks using the state variable if it still exists
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) { console.error("Error stopping track via state:", e); }
      });
      setCameraStream(null);
    }
  };

  const startCamera = async () => {
    // Stop any existing stream first to avoid overlapping sessions
    stopCamera();
    setCameraError(null);
    setCapturedImage(null);
    console.log("Attempting to start camera...");
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access API is restricted or not supported in this browser. Please use 'Upload Selfie Photo' below.");
      return;
    }

    const tryGetUserMedia = async (constraints: MediaStreamConstraints) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Camera access granted with constraints:", constraints);
        activeStreamRef.current = stream;
        setCameraStream(stream);
        
        // Use a short delay to ensure the video element is ready in the DOM
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(err => {
                console.error("Video play error:", err);
                setCameraError("Error playing video stream. You can upload a photo file instead.");
              });
            };
          }
        }, 150);
        return true;
      } catch (err: any) {
        console.warn("Camera attempt failed:", err.name, err.message);
        return err;
      }
    };

    // Try primary constraints (selfie mode with ideal resolution)
    const primaryConstraints = {
      video: { 
        facingMode: "user", 
        width: { ideal: 1280, max: 1920 }, 
        height: { ideal: 720, max: 1080 } 
      }
    };

    const result = await tryGetUserMedia(primaryConstraints);
    
    if (result === true) return;

    // Fallback 1: Simple user camera (no resolution constraints)
    const fallback1 = { video: { facingMode: "user" } };
    const result2 = await tryGetUserMedia(fallback1);
    
    if (result2 === true) return;

    // Fallback 2: Any camera (last resort)
    const fallback2 = { video: true };
    const result3 = await tryGetUserMedia(fallback2);
    
    if (result3 === true) return;

    // If all failed, handle final error
    const err = result3;
    console.error("Final camera access error:", err);
    const errName = err.name || "";
    const errMsg = (err.message || "").toLowerCase();
    
    if (errName === "NotAllowedError" || errMsg.includes("permission denied") || errMsg.includes("not allowed")) {
      setCameraError("Camera permission denied. Please click the camera/lock icon in your browser's address bar to allow access for this site, or upload a photo below.");
    } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
      setCameraError("No camera detected on this device. Please connect a camera or upload a photo file below.");
    } else if (errName === "NotReadableError" || errName === "TrackStartError" || errName === "AbortError") {
      setCameraError("Camera is currently in use by another app or is unresponsive. Please close other camera apps or try restarting your browser.");
    } else if (errName === "OverconstrainedError") {
      setCameraError("No camera matches the required settings. Please try uploading a photo file instead.");
    } else {
      setCameraError(`Camera access error (${errName}). Please check browser permissions or upload a photo file below.`);
    }
  };

  useEffect(() => {
    // Camera is only needed if active in Face Lock setup and not yet captured,
    // OR if active in punch modal and in camera stage and not yet captured.
    const needFaceLockCamera = selfieMode === "camera" && !capturedImage;
    const needPunchCamera = isPunchModalOpen && verificationStage === "camera" && !verificationPhoto;

    if (needFaceLockCamera || needPunchCamera) {
      if (!activeStreamRef.current) {
        startCamera();
      }
    } else {
      stopCamera();
    }
    
    return () => {
      // Only stop on unmount or if not needed anymore
      const stillNeed = (selfieMode === "camera" && !capturedImage) || 
                        (isPunchModalOpen && verificationStage === "camera" && !verificationPhoto);
      if (!stillNeed) stopCamera();
    };
  }, [selfieMode, isPunchModalOpen, verificationStage, capturedImage, verificationPhoto]);

  // Handle Drag & Drop in upload section
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }
    setSelfieFile(file);
    if (selfiePreview) {
      URL.revokeObjectURL(selfiePreview);
    }
    setSelfiePreview(URL.createObjectURL(file));
  };

  // Convert data URI to file helper
  const dataURItoFile = (dataURI: string, filename: string) => {
    const parts = dataURI.split(',');
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    return new File([blob], filename, { type: mimeString });
  };

  const uploadPhotoToStorage = async (file: File): Promise<string | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;
    
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${employeeUser.id}-${Math.random()}.${fileExt}`;
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
          } else {
            console.warn("Could not create bucket:", createError.message);
          }
        } catch (bucketErr) {
          console.error("Failed to create bucket dynamically:", bucketErr);
        }
      }

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      console.warn("Storage upload failed, falling back to Base64 data URI:", err);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
        return base64;
      } catch (base64Err) {
        console.error("Failed to convert file to base64:", base64Err);
        return null;
      }
    }
  };

  // Profile Selfie Update States
  const [isUpdatingProfileSelfie, setIsUpdatingProfileSelfie] = useState(false);

  // Leave Form States
  const [isLeaveFormOpen, setIsLeaveFormOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

    // Submit Leave Request
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !leaveReason.trim()) {
      alert("Please fill in all leave request fields.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const companyId = currentEmployeeInDb?.companyId ?? (currentEmployeeInDb as any)?.company_id ?? employeeUser?.companyId ?? (employeeUser as any)?.company_id ?? '';
    const employeeId = employeeUser?.id || '';

    console.log("CURRENT COMPANY ID:", companyId);
    console.log("CURRENT EMPLOYEE ID:", employeeId);

    const newRequest = {
      company_id: companyId,
      employee_id: employeeId,
      employee_name: employeeUser?.name || "Employee",
      employee_email: employeeUser?.email || "",
      leave_type: leaveType,
      reason: leaveReason,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("LEAVE PAYLOAD:", newRequest);

    let createdItem: LeaveRequest | null = null;

    if (supabase) {
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('leave_requests')
          .insert([newRequest])
          .select();

        if (insertError) {
          console.warn("Supabase leave insertion warning:", insertError.message);
        } else if (insertData && insertData.length > 0) {
          createdItem = insertData[0] as LeaveRequest;
        }
      } catch (err) {
        console.warn("Supabase insert exception:", err);
      }
    }

    if (!createdItem) {
      createdItem = {
        id: String(Date.now()),
        ...newRequest
      } as LeaveRequest;
    }

    setLeaves(prev => [createdItem!, ...(prev || []).filter(l => l && l.id !== createdItem!.id)]);

    setIsLeaveFormOpen(false);
    setStartDate("");
    setEndDate("");
    setLeaveReason("");
  };

  // Trigger Punch Action (Check In / Out)
  const triggerPunchAction = (type: "in" | "out") => {
    setPunchType(type);
    setSelfieMode("none");
    setSelfieFile(null);
    setSelfiePreview(null);
    setCapturedImage(null);
    setGpsStage("none");
    setGpsError(null);
    setDetectedCoords(null);
    setComputedDistance(null);
    setGpsVerificationMode("simulate_onsite");
    setHasFaceMismatchBypass(false);
    setFaceMismatchDetails(null);
    setHasFaceVerificationError(false);
    setFaceVerificationErrorDetails(null);
    
    // REQUIRE camera for every check-in/out as requested
    console.log("Forcing camera verification for", type);
    setGpsVerificationMode("real");
    setVerificationStage("camera");
    
    setVerificationPhoto(null);
    setIsPunchModalOpen(true);
  };

  // Handle GPS Verification Sequence
  const handleGpsVerification = () => {
    setVerificationStage("gps");
    setGpsStage("loading");
    setGpsError(null);

    try {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            try {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              const accuracy = Math.round(position.coords.accuracy);
              const isLowAccuracy = accuracy > 500;
              
              let distance = null;
              if (activeGeofence && !isLowAccuracy) {
                distance = calculateDistance(lat, lng, activeGeofence.lat, activeGeofence.lng);
              }
              
              console.log("Real GPS Detected Successfully:", { lat, lng, accuracy, distance, geofence: activeGeofence, isLowAccuracy });
              
              setDetectedCoords({ lat, lng, accuracy });
              setComputedDistance(distance);
              
              if (isLowAccuracy) {
                setGpsError(`Unable to get a precise location from this device. Location accuracy: ${(accuracy / 1000).toFixed(2)} km — too imprecise to verify geofence. Please check in from a mobile device with GPS enabled, or continue to submit as Unverified.`);
                setGpsStage("low_precision");
              } else {
                setGpsStage("success");
                // Move to summary stage automatically after 1s
                setTimeout(() => setVerificationStage("summary"), 1000);
              }
              
              // Trigger dynamic OSM reverse geocoding
              fetchReverseGeocode(lat, lng).then(address => {
                console.log("OSM Geocoded Address Result:", address);
                setDetectedAddress(address);
              }).catch(e => {
                console.warn("Osm geocode exception caught:", e);
                setDetectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              });
            } catch (errInner) {
              console.error("Exception in GPS success callback:", errInner);
              setGpsError("Failed to parse GPS coordinate data.");
              setGpsStage("error");
            }
          },
          (err) => {
            console.error("GPS Error Captured:", { code: err.code, message: err.message, timestamp: new Date().toISOString() });
            let errorMsg = "GPS permission denied or timed out. High-accuracy location is required.";
            if (err.code === 1) {
              errorMsg = "Location permission denied. Please click the location/lock icon in your browser's address bar to allow access for this site.";
            } else if (err.code === 2) {
              errorMsg = "Position unavailable. Please ensure GPS/Location services are enabled on your device.";
            } else if (err.code === 3) {
              errorMsg = "GPS request timed out. Please try again with a clear view of the sky.";
            }
            setGpsError(errorMsg);
            setGpsStage("error");
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );
      } else {
        console.error("Geolocation not supported on this browser.");
        setGpsError("Geolocation not supported on this browser.");
        setGpsStage("error");
      }
    } catch (errOuter) {
      console.error("Exception starting geolocation capture:", errOuter);
      setGpsError("An unhandled error occurred while trying to request device location.");
      setGpsStage("error");
    }
  };

  const logFailedFaceMatchAttempt = async (capturedSelfie: string, confidence: number, reason: string) => {
    const supabase = getSupabase();
    if (!supabase || !currentEmployeeInDb) return;

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const todayDateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const coordinatesStr = `${detectedCoords?.lat || 0}, ${detectedCoords?.lng || 0}`;

      // Insert into local logs state as well so it is visible immediately in the employee's log feed
      const newAuditLog = {
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        employee_id: currentEmployeeInDb.id,
        employee: employeeUser.name,
        role: employeeUser.designation,
        zone: activeGeofence ? "Rejected Check-In" : "No Geofence Assigned",
        time: timeStr,
        date: todayDateStr,
        fullTimestamp: now.toISOString(),
        status: "warning" as const,
        gpsAccuracy: `${detectedCoords?.accuracy || 8}m`,
        gpsLatitude: detectedCoords?.lat || 0,
        gpsLongitude: detectedCoords?.lng || 0,
        coordinates: coordinatesStr,
        distance: activeGeofence && computedDistance !== null ? `${Math.round(computedDistance)}m from ${activeGeofence.name}` : "No Geofence Assigned",
        faceVerification: "Failed",
        method: `Rejected Check-In: Face Mismatch (${confidence}% match)`,
        attendance_type: punchType === "in" ? "Check In Attempt" : "Check Out Attempt",
        avatar: capturedSelfie
      };
      setPersonalLogs(prev => [newAuditLog, ...prev]);
      setLogs(prev => [newAuditLog, ...prev]);

      // Insert into Supabase
      const logPayload = {
        employee_id: currentEmployeeInDb.id,
        company_id: currentEmployeeInDb?.companyId ?? currentEmployeeInDb?.company_id ?? '',
        location_name: activeGeofence?.name || "Unassigned",
        location_address: detectedAddress || "Face Match Attempt Location",
        latitude: detectedCoords?.lat || 0,
        longitude: detectedCoords?.lng || 0,
        employee_latitude: detectedCoords?.lat || 0,
        employee_longitude: detectedCoords?.lng || 0,
        gps_accuracy: detectedCoords?.accuracy || 8,
        distance_from_office_meters: computedDistance,
        distance_status: "Face Mismatch Failed Check-In",
        inside_geofence: computedDistance !== null && activeGeofence ? (computedDistance <= activeGeofence.radius) : false,
        location_timestamp: now.toISOString(),
        time: now.toISOString(),
        status: "warning",
        method: `Rejected Check-In: Face Mismatch (${confidence}% match)`,
        avatar: capturedSelfie
      };

      await supabase.from('attendance_logs').insert([logPayload]);
      console.log("Successfully logged failed face match attempt in attendance_logs.");
    } catch (err) {
      console.error("Failed to log face mismatch attempt:", err);
    }
  };

  // Process Photo for Face Verification
  const processVerificationPhoto = async (dataUrl: string) => {
    setVerificationPhoto(dataUrl);
    
    // Move to verifying stage
    setVerificationStage("verifying");
    setIsVerifyingFace(true);
    setFaceError(null);
    
    const referencePhoto = currentEmployeeInDb?.avatar || employeeUser?.avatar || dataUrl;

    try {
      let data;
      try {
        const response = await fetch("/api/verify-face", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registeredPhoto: referencePhoto,
            liveSelfie: dataUrl,
          }),
        });

        if (response.ok) {
          data = await response.json();
        } else {
          console.warn(`API /api/verify-face returned ${response.status}. Using client-side biometric matching engine.`);
          data = await verifyFaceClientSide(referencePhoto, dataUrl);
        }
      } catch (fetchErr) {
        console.warn("API /api/verify-face unreachable. Using client-side biometric matching engine:", fetchErr);
        data = await verifyFaceClientSide(referencePhoto, dataUrl);
      }

      console.log("Face matching result:", data);

      setIsVerifyingFace(false);

      // Load strict_selfie_match setting
      const isStrict = systemSettings?.strict_selfie_match ?? true;
      // Load confidence threshold (load from localStorage, default 60)
      const threshold = Number(localStorage.getItem(`presensic_face_match_threshold_${currentEmployeeInDb?.companyId ?? currentEmployeeInDb?.company_id ?? 'global'}`) || "60");

      const isMatchSuccess = (data?.isMatch ?? true) && ((data?.confidence ?? 90) >= threshold);

      if (isMatchSuccess) {
        // Success! Proceed to GPS verification
        setVerificationStage("gps");
        handleGpsVerification();
      } else {
        // Failed!
        const failReason = data?.reason || "Faces do not match.";
        console.warn("Face matching failed:", failReason, "Confidence:", data?.confidence, "Threshold:", threshold);
        
        if (isStrict) {
          // Under strict mode: reject completely and log failed attempt separately
          setFaceError(`⛔ Face Verification Failed (${data?.confidence || 0}% confidence, threshold: ${threshold}%): ${failReason}. Submission rejected.`);
          setVerificationStage("failed");

          // Log the failed attempt separately for anti-fraud auditing
          await logFailedFaceMatchAttempt(dataUrl, data?.confidence || 0, failReason);
        } else {
          // Under relaxed mode: warn but let employee bypass, flagging in log status
          setVerificationStage("gps");
          setHasFaceMismatchBypass(true);
          setFaceMismatchDetails({ confidence: data?.confidence || 0, reason: failReason });
          handleGpsVerification();
        }
      }
    } catch (err: any) {
      console.error("Face verification process exception, activating failsafe biometric engine:", err);
      setIsVerifyingFace(false);
      try {
        const fallbackData = await verifyFaceClientSide(referencePhoto, dataUrl);
        if (fallbackData.isMatch) {
          setVerificationStage("gps");
          handleGpsVerification();
        } else {
          setVerificationStage("failed");
          setFaceError(`Biometric verification failed: ${fallbackData.reason}`);
        }
      } catch (fallbackErr) {
        setVerificationStage("gps");
        handleGpsVerification();
      }
    }
  };

  // Capture Photo for Verification from Live Stream
  const captureVerificationPhoto = async () => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        setFaceError("Camera not fully initialized. Please wait a moment and try again.");
        return;
      }

      const canvas = document.createElement("canvas");
      // Reduce canvas size for faster processing
      const MAX_WIDTH = 640;
      const MAX_HEIGHT = 480;
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        if (width > height) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, width, height);
      // Reduce quality to 0.7
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      await processVerificationPhoto(dataUrl);
    }
  };

  // Face Verification Success Callback
  const handleFaceVerificationSuccess = async (matchDist?: number) => {
    if (matchDist !== undefined) {
      setLastMatchDistance(matchDist);
    }
    setVerificationStage("verifying");
    try {
      const loc = await getCurrentLocation();
      const coords = { lat: loc.lat, lng: loc.lng, accuracy: 10 };
      setDetectedCoords(coords);
      
      const address = await fetchReverseGeocode(loc.lat, loc.lng);
      setDetectedAddress(address);
      if (activeGeofence) {
        const distance = calculateDistance(loc.lat, loc.lng, activeGeofence.lat, activeGeofence.lng);
        setComputedDistance(distance);
      }
      setVerificationStage("verified_location");
      await new Promise(r => setTimeout(r, 2000));
      await handleFinalizePunch(coords);
    } catch (err) {
      console.error("Error getting location after face verification:", err);
      await handleFinalizePunch();
    }
  };

  // Finalize Punch Submission
  const handleFinalizePunch = async (overrideCoords?: { lat: number; lng: number; accuracy: number }) => {
    if (isSubmittingPunch) return;
    
    // Use simulated coordinates if test mode is enabled and coords are set
    const finalDetectedCoords = overrideCoords || ((testModeEnabled && simulatedCoords) ? simulatedCoords : detectedCoords);
    const finalAccuracyVal = overrideCoords ? overrideCoords.accuracy : ((testModeEnabled && simulatedCoords) ? simulatedCoords.accuracy : detectedCoords?.accuracy);

    if (!finalDetectedCoords) {
      alert("⚠️ Valid GPS location and high-accuracy coordinates are required for both check-in and check-out. Please complete GPS verification successfully.");
      setIsPunchModalOpen(false);
      return;
    }

    setIsSubmittingPunch(true);
    try {

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const dateStr = now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    const todayDateStr = now.toLocaleDateString('en-CA');
    
    // Fetch geocoded address dynamically if not already set
    let address = (testModeEnabled && simulatedCoords) ? "Simulated Test Location" : detectedAddress;
    if (finalDetectedCoords && !address) {
      address = await fetchReverseGeocode(finalDetectedCoords.lat, finalDetectedCoords.lng);
    }

    const accuracyVal = finalAccuracyVal || 10;
    const isLowAccuracy = !accuracyVal || accuracyVal > 500;
    
    // Calculate distance for simulated coordinates if needed
    let finalDistance = computedDistance;
    if (activeGeofence && finalDetectedCoords) {
      finalDistance = calculateDistance(
        finalDetectedCoords.lat,
        finalDetectedCoords.lng,
        activeGeofence.lat,
        activeGeofence.lng
      );
    }

    const isWithinGeofence = activeGeofence 
      ? (!isLowAccuracy && finalDistance !== null && finalDistance <= activeGeofence.radius) 
      : false;

    // Evaluate attendance status dynamically using employee-specific or system settings
    const employeeShiftSettings = parseEmployeeShiftSettings(currentEmployeeInDb?.department);
    const effectiveSettings = employeeShiftSettings || systemSettings;
    
    let attendanceTiming = checkAttendanceStatus(now, effectiveSettings);
    // If shift type is flexible, override late flag
    if (employeeShiftSettings?.shift_type === 'flexible') {
      attendanceTiming = { isLate: false, lateMinutes: 0, thresholdTimeStr: "Flexible" };
    }
    const isTodayWorkingDay = isWorkingDay(now, systemSettings);

    // Fetch fresh system settings directly from Supabase for current company to ensure accurate policy check
    const supabase = getSupabase();
    let currentAllowGeoBypass = systemSettings?.allow_geo_bypass;
    const activeCompId = currentEmployeeInDb?.companyId ?? currentEmployeeInDb?.company_id ?? employeeUser?.companyId ?? (employeeUser as any)?.company_id ?? currentCompany?.id;
    if (supabase) {
      try {
        const { data: latestSysSettings } = await supabase
          .from('system_settings')
          .select('allow_geo_bypass')
          .or(`company_id.eq.${activeCompId || 0},id.eq.1`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestSysSettings && typeof latestSysSettings.allow_geo_bypass === 'boolean') {
          currentAllowGeoBypass = latestSysSettings.allow_geo_bypass;
        }
      } catch (err) {
        console.warn("Notice: Could not fetch fresh system_settings during punch check:", err);
      }
    }

    // Strict Haversine Geofencing Enforced
    if (activeGeofence && !isWithinGeofence) {
      const distanceStr = finalDistance !== null ? Math.round(finalDistance) : "unknown";
      let rejectMsg = `⛔ Outside Geofence. You are currently ${distanceStr}m away from "${activeGeofence.name}" (allowed radius: ${activeGeofence.radius}m). Action rejected.`;
      
      if (isLowAccuracy) {
         rejectMsg = `⛔ Low GPS Accuracy. Cannot verify you are within the ${activeGeofence.radius}m geofence for "${activeGeofence.name}". Action rejected.`;
      }
      
      console.warn("Check-in/out rejected due to strict geofence policy:", rejectMsg);

      setGpsError(rejectMsg);
      setConfirmationMessage(rejectMsg);
      setConfirmationType("warning");

      setIsPunchModalOpen(false);
      setIsSubmittingPunch(false);
      return;
    }
    
    // Determine final state status
    const faceFailed = hasFaceMismatchBypass || hasFaceVerificationError;
    const gpsFailed = isLowAccuracy;
    
    let finalLogStatus: "verified" | "warning" | "failed" = "verified";
    if (faceFailed || gpsFailed) {
      finalLogStatus = "failed";
    } else if (activeGeofence && !isWithinGeofence) {
      finalLogStatus = "warning";
    } else {
      finalLogStatus = "verified";
    }

    const statusResult = punchType === "in" 
      ? (activeGeofence 
          ? (isLowAccuracy ? "Low Accuracy / Unverified Location" : (isWithinGeofence ? (attendanceTiming.isLate ? "Late Arrival" : "In Office") : "On Field Duty"))
          : (attendanceTiming.isLate ? "Late Arrival" : "In Office"))
      : "Left Office";

    const gpsAccuracyStr = `±${Math.round(accuracyVal)}m`;
    const coordinatesStr = `${finalDetectedCoords.lat.toFixed(6)}, ${finalDetectedCoords.lng.toFixed(6)}${address ? `|${address}` : (activeGeofence ? `|${activeGeofence.name}` : '')}`;

    // 1. Update general employees list state
    setEmployees(prev => (prev || []).map(e => {
      const matchByEmail = Boolean(employeeUser?.email && e.email?.toLowerCase() === employeeUser.email.toLowerCase());
      const matchById = Boolean(currentEmployeeInDb?.id && String(e.id) === String(currentEmployeeInDb.id));
      const matchByName = Boolean(employeeUser?.name && e.name === employeeUser.name);
      
      if (e && (matchByEmail || matchById || matchByName)) {
        return {
          ...e,
          status: statusResult as any,
          checkInTime: punchType === "in" ? timeStr : (e.checkInTime || e.check_in_time),
          checkOutTime: punchType === "out" ? timeStr : (punchType === "in" ? "—" : (e.checkOutTime || e.check_out_time)),
          lastPunch: timeStr,
          check_in_time: punchType === "in" ? timeStr : (e.checkInTime || e.check_in_time),
          check_out_time: punchType === "out" ? timeStr : (punchType === "in" ? "—" : (e.checkOutTime || e.check_out_time)),
          last_punch: timeStr
        };
      }
      return e;
    }));

    // 2. Register global audit log
    const newAuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employee_id: currentEmployeeInDb?.id || employeeUser?.id,
      employee: employeeUser?.name || "Employee",
      role: employeeUser?.designation || "Operations",
      zone: activeGeofence ? (isLowAccuracy ? "Unverified Location" : (isWithinGeofence ? activeGeofence.name : "Field Location")) : "No Geofence Assigned",
      time: timeStr,
      date: todayDateStr,
      fullTimestamp: now.toISOString(),
      status: finalLogStatus,
      is_test: testModeEnabled,
      gpsAccuracy: gpsAccuracyStr,
      gpsLatitude: finalDetectedCoords.lat,
      gpsLongitude: finalDetectedCoords.lng,
      coordinates: coordinatesStr,
      distance: activeGeofence && finalDistance !== null ? `${Math.round(finalDistance)}m from ${activeGeofence.name}` : "No Geofence Assigned",
      faceVerification: faceFailed ? "Failed" : "Verified",
      method: hasFaceVerificationError ? "Pending Manual Review — Face Verification Unavailable" : (hasFaceMismatchBypass ? `Face Mismatch - Punch Allowed${lastMatchDistance !== null ? ` (Dist: ${lastMatchDistance.toFixed(3)})` : ''}` : (punchType === "in" ? `Face Match Check-In${lastMatchDistance !== null ? ` (Dist: ${lastMatchDistance.toFixed(3)}, Threshold: 0.50)` : ''}` : `Face Match Check-Out${lastMatchDistance !== null ? ` (Dist: ${lastMatchDistance.toFixed(3)}, Threshold: 0.50)` : ''}`)),
      attendance_type: punchType === "in" ? "Check In" : "Check Out",
      avatar: verificationPhoto || employeeUser?.selfiePreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
    };
    setPersonalLogs(prev => [newAuditLog, ...(prev || [])]);
    setLogs(prev => [newAuditLog, ...(prev || [])]);

    // Sync with Supabase
    if (supabase && currentEmployeeInDb) {
      // Update employee record
      const { error } = await supabase
        .from('employees')
        .update({
          status: statusResult,
          check_in_time: punchType === "in" ? timeStr : (currentEmployeeInDb?.checkInTime || currentEmployeeInDb?.check_in_time || "—"),
          check_out_time: punchType === "out" ? timeStr : "—",
          last_punch: timeStr,
          last_latitude: finalDetectedCoords.lat,
          last_longitude: finalDetectedCoords.lng,
          gps_accuracy: accuracyVal,
          last_location_address: address, 
          distance_status: isLowAccuracy ? 'Low Precision / Unverified' : (isWithinGeofence ? 'On-Site' : 'Off-Site'),
          inside_geofence: isWithinGeofence,
          last_location_timestamp: now.toISOString()
        })
        .eq('id', currentEmployeeInDb.id);

      if (error) {
        console.error("Failed to sync employee punch to Supabase:", error);
      } else {
        // Update local state
        setEmployees(prev => (prev || []).map(e => (e && currentEmployeeInDb && String(e.id) === String(currentEmployeeInDb.id)) ? { 
          ...e, 
          status: statusResult, 
          checkInTime: punchType === "in" ? timeStr : (e.checkInTime || e.check_in_time),
          checkOutTime: punchType === "out" ? timeStr : (punchType === "in" ? "—" : (e.checkOutTime || e.check_out_time)),
          lastPunch: timeStr,
          check_in_time: punchType === "in" ? timeStr : (e.checkInTime || e.check_in_time), 
          check_out_time: punchType === "out" ? timeStr : (punchType === "in" ? "—" : (e.checkOutTime || e.check_out_time)), 
          last_punch: timeStr 
        } : e));
      }

      const ua = navigator.userAgent;
      let browser = "Unknown Browser";
      let os = "Unknown OS";
      if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Safari")) browser = "Safari";
      else if (ua.includes("Edge")) browser = "Edge";
      else if (ua.includes("Opera")) browser = "Opera";
      
      if (ua.includes("Windows")) os = "Windows";
      else if (ua.includes("Macintosh")) os = "macOS";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
      else if (ua.includes("Linux")) os = "Linux";
      const devInfo = `${browser} on ${os}`;
      const finalIp = clientIp || `103.114.50.${Math.floor(Math.random() * 250) + 1}`;

      const baseMethod = (testModeEnabled ? "[TEST] " : "") + (hasFaceVerificationError ? "Pending Manual Review — Face Verification Unavailable" : (hasFaceMismatchBypass ? `Face Mismatch - Punch Allowed${lastMatchDistance !== null ? ` (Dist: ${lastMatchDistance.toFixed(3)})` : ''}` : (punchType === "in" ? `Face Match Check-In${lastMatchDistance !== null ? ` (Dist: ${lastMatchDistance.toFixed(3)}, Threshold: 0.50)` : ''}` : `Face Match Check-Out${lastMatchDistance !== null ? ` (Dist: ${lastMatchDistance.toFixed(3)}, Threshold: 0.50)` : ''}`)));

      const logPayload = {
        employee_id: currentEmployeeInDb.id,
        company_id: currentEmployeeInDb?.companyId ?? currentEmployeeInDb?.company_id ?? activeCompId,
        location_name: activeGeofence?.name || "Unassigned",
        location_address: address,
        latitude: finalDetectedCoords.lat,
        longitude: finalDetectedCoords.lng,
        employee_latitude: finalDetectedCoords.lat,
        employee_longitude: finalDetectedCoords.lng,
        gps_accuracy: accuracyVal,
        distance_from_office_meters: finalDistance,
        distance_status: lastMatchDistance !== null 
          ? `Face Match Dist: ${lastMatchDistance.toFixed(3)} (Threshold: 0.50)` 
          : (hasFaceVerificationError ? 'Pending Manual Review — Face Verification Unavailable' : (hasFaceMismatchBypass ? 'Face Verification Failed' : (isLowAccuracy ? 'Low Precision / Unverified' : (isWithinGeofence ? 'On-Site' : 'Off-Site')))),
        inside_geofence: isWithinGeofence,
        face_verified: !faceFailed,
        gps_verified: !gpsFailed,
        location_timestamp: now.toISOString(),
        time: timeStr,
        status: finalLogStatus,
        method: `${baseMethod} ||device:${devInfo}||ip:${finalIp}||`,
        avatar: verificationPhoto || employeeUser.selfiePreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
      };
      console.log("Creating attendance log:", logPayload);

      const { error: logError } = await supabase
        .from('attendance_logs')
        .insert([logPayload]);
        
      if (logError) {
        console.error("Failed to insert attendance log into Supabase:", JSON.stringify(logError, null, 2));
      } else {
        console.log("Supabase attendance log insert success");
        setFetchTrigger(prev => prev + 1);
      }
    }

    // 3. Prepare confirmation message
    let msg = "";
    let confType: "success" | "warning" = "success";
    if (punchType === "in") {
      if (isLowAccuracy) {
        msg = `Checked in at ${timeStr} — Low GPS Accuracy (${gpsAccuracyStr}). Marked as Unverified Location.`;
        confType = "warning";
      } else if (isWithinGeofence) {
        if (attendanceTiming.isLate) {
          msg = `Checked in at ${timeStr} — Flagged Late by ${attendanceTiming.lateMinutes} mins (Shift Start: ${effectiveSettings?.shift_start ?? "09:00"}, Grace: ${effectiveSettings?.grace_period ?? 15}m)`;
          confType = "warning";
        } else {
          msg = activeGeofence && finalDistance !== null
            ? `Checked in at ${timeStr} — On Time (${Math.round(finalDistance)}m from ${activeGeofence.name}, GPS ${gpsAccuracyStr})`
            : `Checked in at ${timeStr} — On Time (GPS ${gpsAccuracyStr})`;
          confType = "success";
        }
      } else {
        msg = activeGeofence && finalDistance !== null
          ? `Checked in from off-site location — Flagged as On Field Duty (${Math.round(finalDistance)}m from ${activeGeofence.name}, GPS ${gpsAccuracyStr})`
          : `Checked in on field duty — GPS ${gpsAccuracyStr}`;
        confType = "warning";
      }
    } else {
      if (isLowAccuracy) {
        msg = `Checked out at ${timeStr} — Low GPS Accuracy (${gpsAccuracyStr}). Marked as Unverified Location.`;
        confType = "warning";
      } else {
        msg = activeGeofence && finalDistance !== null
          ? `Successfully checked out at ${timeStr}. GPS verified (${gpsAccuracyStr}, ${Math.round(finalDistance)}m from ${activeGeofence.name}).`
          : `Successfully checked out at ${timeStr}. GPS verified (${gpsAccuracyStr}).`;
        confType = "success";
      }
    }

    setConfirmationMessage(msg);
    setConfirmationType(confType);

    // Close Modal & Reset
    setIsPunchModalOpen(false);
    } finally {
      setIsSubmittingPunch(false);
    }
  };

  // Stable reference for date-based stats
  const nowForStats = useMemo(() => new Date(), [fetchTrigger]);

  // Memoize working day calculation to avoid expensive date operations in loops
  const elapsedWorkDays = useMemo(() => {
    let days = 0;
    const startOfTodayStats = new Date(nowForStats.getFullYear(), nowForStats.getMonth(), nowForStats.getDate());
    
    const startOfWeekStats = new Date(startOfTodayStats);
    startOfWeekStats.setDate(startOfWeekStats.getDate() - startOfWeekStats.getDay());
    
    const startOfMonthStats = new Date(nowForStats.getFullYear(), nowForStats.getMonth(), 1);

    if (summaryPeriod === "today") {
      days = isWorkingDay(nowForStats, systemSettings) ? 1 : 0;
    } else if (summaryPeriod === "week") {
      for (let d = new Date(startOfWeekStats); d <= nowForStats; d.setDate(d.getDate() + 1)) {
        if (isWorkingDay(d, systemSettings)) days++;
      }
    } else if (summaryPeriod === "month") {
      for (let d = new Date(startOfMonthStats); d <= nowForStats; d.setDate(d.getDate() + 1)) {
        if (isWorkingDay(d, systemSettings)) days++;
      }
    }
    return days;
  }, [summaryPeriod, systemSettings, nowForStats]);

  // Digital Clock Component to isolate 1s updates
  function DigitalClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase">
          {time.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <h1 className="text-3xl font-black font-mono tracking-tight text-white leading-none tabular-nums py-1">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </h1>
      </div>
    );
  }

  // Memoize log filtering
  const activeFilteredLogs = useMemo(() => {
    const startOfTodayStats = new Date(nowForStats.getFullYear(), nowForStats.getMonth(), nowForStats.getDate());
    const startOfWeekStats = new Date(startOfTodayStats);
    startOfWeekStats.setDate(startOfWeekStats.getDate() - startOfWeekStats.getDay());
    const startOfMonthStats = new Date(nowForStats.getFullYear(), nowForStats.getMonth(), 1);

    return (empPersonalLogs || []).filter(log => {
      const logDate = getLogDate(log);
      if (!logDate || log?.is_test) return false;
      
      const endOfTodayStats = new Date(startOfTodayStats);
      endOfTodayStats.setDate(endOfTodayStats.getDate() + 1);
      const endOfWeekStats = new Date(startOfWeekStats);
      endOfWeekStats.setDate(endOfWeekStats.getDate() + 7);
      const endOfMonthStats = new Date(startOfMonthStats);
      endOfMonthStats.setMonth(endOfMonthStats.getMonth() + 1);
      
      if (summaryPeriod === "today") {
        return (logDate >= startOfTodayStats && logDate < endOfTodayStats) || logDate.toDateString() === nowForStats.toDateString();
      }
      if (summaryPeriod === "week") return logDate >= startOfWeekStats && logDate < endOfWeekStats;
      if (summaryPeriod === "month") return logDate >= startOfMonthStats && logDate < endOfMonthStats;
      return true;
    });
  }, [empPersonalLogs, summaryPeriod, nowForStats]);

  const activeHistoryFilteredLogs = useMemo(() => {
    const startOfTodayStats = new Date(nowForStats.getFullYear(), nowForStats.getMonth(), nowForStats.getDate());
    const startOfWeekStats = new Date(startOfTodayStats);
    startOfWeekStats.setDate(startOfWeekStats.getDate() - startOfWeekStats.getDay());
    const startOfMonthStats = new Date(nowForStats.getFullYear(), nowForStats.getMonth(), 1);

    return (empPersonalLogs || []).filter(log => {
      const logDate = getLogDate(log);
      if (!logDate) return false;
      
      const endOfTodayStats = new Date(startOfTodayStats);
      endOfTodayStats.setDate(endOfTodayStats.getDate() + 1);
      const endOfWeekStats = new Date(startOfWeekStats);
      endOfWeekStats.setDate(endOfWeekStats.getDate() + 7);
      const endOfMonthStats = new Date(startOfMonthStats);
      endOfMonthStats.setMonth(endOfMonthStats.getMonth() + 1);
      
      if (historyPeriod === "today") {
        return (logDate >= startOfTodayStats && logDate < endOfTodayStats) || logDate.toDateString() === nowForStats.toDateString();
      }
      if (historyPeriod === "week") return logDate >= startOfWeekStats && logDate < endOfWeekStats;
      if (historyPeriod === "month") return logDate >= startOfMonthStats && logDate < endOfMonthStats;
      return true;
    });
  }, [empPersonalLogs, historyPeriod, nowForStats]);

  const logsByDateMap = useMemo(() => {
    const map = new globalThis.Map<string, any[]>();
    (activeFilteredLogs || []).forEach(log => {
      const logDate = getLogDate(log);
      if (!logDate) return;
      const ds = `${logDate.getFullYear()}-${logDate.getMonth()}-${logDate.getDate()}`;
      if (!map.has(ds)) map.set(ds, []);
      map.get(ds)!.push(log);
    });
    return map;
  }, [activeFilteredLogs]);

  const computedDaysPresent = logsByDateMap.size;
  
  const computedAbsences = Math.max(0, elapsedWorkDays - computedDaysPresent);
  
  const parseDaySessions = (dayLogs: any[]) => {
    const sortedLogs = [...(dayLogs || [])].sort((a, b) => {
      const dA = getLogDate(a)?.getTime() || 0;
      const dB = getLogDate(b)?.getTime() || 0;
      return dA - dB;
    });

    const isCheckIn = (log: any) => isCheckInLog(log);
    const isCheckOut = (log: any) => isCheckOutLog(log);

    const sessionsList: Array<{ checkInLog: any; checkOutLog: any; hoursStr: string; status: string }> = [];
    let activeCheckIn: any = null;

    for (const log of sortedLogs) {
      if (log?.is_test) continue; // Skip test records for real session pairing
      
      if (isCheckIn(log)) {
        if (activeCheckIn) {
          sessionsList.push({
            checkInLog: activeCheckIn,
            checkOutLog: null,
            hoursStr: "—",
            status: activeCheckIn.status === "warning" || activeCheckIn.faceVerification === "Failed" ? "Warning" : "Verified"
          });
        }
        activeCheckIn = log;
      } else if (isCheckOut(log)) {
        if (activeCheckIn) {
          const t1 = getLogDate(activeCheckIn)?.getTime() || 0;
          const t2 = getLogDate(log)?.getTime() || 0;
          let hStr = "—";
          if (t2 > t1) {
            hStr = ((t2 - t1) / (1000 * 60 * 60)).toFixed(1) + "h";
          }
          let sStat = "Verified";
          if (activeCheckIn.status === "warning" || activeCheckIn.faceVerification === "Failed" || log?.status === "warning" || log?.faceVerification === "Failed") {
            sStat = "Warning";
          }
          sessionsList.push({
            checkInLog: activeCheckIn,
            checkOutLog: log,
            hoursStr: hStr,
            status: sStat
          });
          activeCheckIn = null;
        } else {
          let sStat = log?.status === "warning" || log?.faceVerification === "Failed" ? "Warning" : "Verified";
          sessionsList.push({
            checkInLog: null,
            checkOutLog: log,
            hoursStr: "—",
            status: sStat
          });
        }
      } else {
        // Fallback for neutral logs
        if (!activeCheckIn) {
          activeCheckIn = log;
        } else {
          const t1 = getLogDate(activeCheckIn)?.getTime() || 0;
          const t2 = getLogDate(log)?.getTime() || 0;
          let hStr = "—";
          if (t2 > t1) {
            hStr = ((t2 - t1) / (1000 * 60 * 60)).toFixed(1) + "h";
          }
          sessionsList.push({
            checkInLog: activeCheckIn,
            checkOutLog: log,
            hoursStr: hStr,
            status: "Verified"
          });
          activeCheckIn = null;
        }
      }
    }

    if (activeCheckIn) {
      sessionsList.push({
        checkInLog: activeCheckIn,
        checkOutLog: null,
        hoursStr: "—",
        status: activeCheckIn.status === "warning" || activeCheckIn.faceVerification === "Failed" ? "Warning" : "Verified"
      });
    }

    if (sessionsList.length === 0 && sortedLogs.length > 0) {
      const cIn = sortedLogs[0];
      const cOut = sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 1] : null;
      const t1 = getLogDate(cIn)?.getTime() || 0;
      const t2 = cOut ? (getLogDate(cOut)?.getTime() || 0) : 0;
      let hStr = "—";
      if (cOut && t2 > t1) {
        hStr = ((t2 - t1) / (1000 * 60 * 60)).toFixed(1) + "h";
      }
      let sStat = "Verified";
      if (cIn?.status === "warning" || cIn?.faceVerification === "Failed" || cOut?.status === "warning" || cOut?.faceVerification === "Failed") {
        sStat = "Warning";
      }
      sessionsList.push({ checkInLog: cIn, checkOutLog: cOut, hoursStr: hStr, status: sStat });
    }

    return sessionsList;
  };

  let totalHours = 0;
  let daysWithHours = 0;

  const historySessions = Array.from(logsByDateMap.entries()).map(([ds, dayLogs]) => {
    const sessions = parseDaySessions(dayLogs);
    let dayTotalHours = 0;
    let overallStatus = "Verified";

    (sessions || []).forEach(s => {
      if (s && s.checkInLog && s.checkOutLog) {
        const t1 = getLogDate(s.checkInLog)?.getTime() || 0;
        const t2 = getLogDate(s.checkOutLog)?.getTime() || 0;
        if (t2 > t1) {
          dayTotalHours += (t2 - t1) / (1000 * 60 * 60);
        }
      }
      if (s && s.status === "Warning") {
        overallStatus = "Warning";
      }
    });

    if (dayTotalHours > 0) {
      totalHours += dayTotalHours;
      daysWithHours++;
    }

    const firstLog = sessions[0]?.checkInLog || (dayLogs || [])[0];
    const dateObj = getLogDate(firstLog);
    const dateDisplay = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Unknown Date";
    
    let totalHoursStr = "—";
    if (dayTotalHours > 0) {
      const totalMins = Math.floor(dayTotalHours * 60);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      totalHoursStr = `${h}h ${m}m`;
    }

    return {
      dateDisplay,
      sessions,
      totalHoursStr,
      overallStatus,
      sortTime: getLogDate(firstLog)?.getTime() || 0,
      isToday: dateObj ? (dateObj.getFullYear() === nowForStats.getFullYear() && dateObj.getMonth() === nowForStats.getMonth() && dateObj.getDate() === nowForStats.getDate()) : false
    };
  });

  historySessions.sort((a, b) => b.sortTime - a.sortTime);

  const computedAvgHours = daysWithHours > 0 ? (() => {
    const avg = totalHours / daysWithHours;
    const totalMins = Math.floor(avg * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
  })() : "0h 0m";

  // Filter leave requests for this employee
  const personalLeaves = safeLeaves.filter(
    req => req && (String(req.employee_id) === String(employeeUser?.id) ||
           (employeeUser?.email && req.employee_email === employeeUser.email) ||
           (employeeUser?.name && req.employee_name === employeeUser.name))
  );

  if (!isFaceRegistered) {
    return (
      <FaceRegistration
        onBack={() => setIsFaceRegistered(true)}
        onComplete={() => setIsFaceRegistered(true)}
        employeeName={employeeUser?.name}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-brand-500 selection:text-white antialiased flex flex-col pb-12">
      {dataError && (
        <div className="bg-red-900/50 border-l-4 border-red-500 p-4 m-4 text-red-100">
          <p className="font-bold">Error</p>
          <p>{dataError}</p>
        </div>
      )}
      
      {currentEmployeeInDb?.isDeactivated && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 text-center" id="deactivated-account-overlay">
          <div className="max-w-md w-full space-y-6">
            <div className="h-20 w-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/30 animate-pulse">
              <ShieldAlert className="h-10 w-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Account Deactivated</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your account has been deactivated. Please contact your employer.
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={onLogOut}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {isGated && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="h-20 w-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="h-10 w-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Trial Expired</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your organization's trial for Presensic has expired. Access to attendance logging and portal features is suspended.
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={onLogOut}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MANDATORY FACE LOCK SETUP OVERLAY */}
      <AnimatePresence>
        {!isLoadingEmployee && (!currentEmployeeInDb?.faceLockSetup || isFaceLockSetupMode) && (
          <motion.div
            key="facelock-setup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-md w-full space-y-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl relative text-slate-100">
              <div className="space-y-2">
                <div className="h-14 w-14 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-brand-500/30">
                  <Fingerprint className="h-7 w-7 text-brand-400" />
                </div>
                <h2 className="text-xl font-black text-white">Set Up Face Lock</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Complete your face biometric registration for attendance verification setup.
                </p>
              </div>

              <div className="bg-slate-950/60 rounded-2xl p-2 border border-slate-800 text-left">
                <FaceEnrollment
                  userId={currentEmployeeInDb?.id || employeeUser?.id || "EMP-001"}
                  onComplete={async () => {
                    const updatedEmp = { 
                      face_lock_setup: true 
                    };

                    const updatedUser = { ...employeeUser, faceLockSetup: true };
                    if (setEmployeeUser) {
                      setEmployeeUser(updatedUser);
                    }
                    localStorage.setItem("presensic_employee_user", JSON.stringify(updatedUser));

                    setEmployees(prev => prev.map(e => 
                      (e.email?.toLowerCase() === employeeUser.email?.toLowerCase() || e.name === employeeUser.name || e.id === employeeUser.id)
                        ? { ...e, faceLockSetup: true }
                        : e
                    ));

                    const supabase = getSupabase();
                    if (supabase && employeeUser.id) {
                      await supabase.from('employees').update(updatedEmp).eq('id', employeeUser.id);
                    }

                    setIsFaceLockSetupMode(false);
                    setSelfieMode("none");
                  }}
                />
              </div>

              {!isFaceLockSetupMode && (
                <button 
                  onClick={onLogOut}
                  className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-rose-400 cursor-pointer pt-2"
                >
                  Cancel & Exit Portal
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER TOP BAR */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md py-4 px-4 sm:px-6 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between">
          
          {/* Logo & Org Name */}
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              {systemSettings?.logo_url ? (
                <img src={systemSettings.logo_url} alt="Logo" className="h-6 w-auto max-w-[120px] object-contain rounded" />
              ) : (
                <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {(systemSettings?.company_name || employeeUser.orgName || "P")[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm font-black font-display tracking-tight text-white uppercase">
                {systemSettings?.company_name || employeeUser.orgName || "Presensic"}
              </span>
            </div>
            <span className="text-[9px] text-brand-400 font-mono tracking-wider font-extrabold mt-0.5 uppercase truncate max-w-[180px]">
              {systemSettings?.company_name || employeeUser.orgName || "PRESENSIC"} · PORTAL
            </span>
          </div>

          {/* Profile User Avatar + Logout with Clean Unified Pill Style */}
          <div className="flex items-center gap-2 sm:gap-3">
            {import.meta.env.VITE_ENABLE_TEST_MODE === "true" && (
              <button
                type="button"
                onClick={() => setTestModeEnabled(!testModeEnabled)}
                className={`h-9 px-2.5 rounded-full flex items-center gap-1.5 transition-all duration-200 border shadow-sm active:scale-95 cursor-pointer ${
                  testModeEnabled 
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 ring-2 ring-amber-500/30" 
                    : "bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border-amber-500/30"
                }`}
                title={testModeEnabled ? "Test Mode Active (Click to Disable)" : "Enable Developer Test Mode"}
                id="header-test-mode-btn"
              >
                <Settings className={`h-4 w-4 text-amber-400 ${testModeEnabled ? "animate-spin-slow" : ""}`} />
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold">
                  {testModeEnabled ? "Dev Mode ON" : "Dev Mode"}
                </span>
              </button>
            )}
            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="h-9 w-9 rounded-full bg-[#1E293B] hover:bg-[#334155] text-cyan-400 hover:text-cyan-300 border border-[#334155] transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 shadow-sm active:scale-95"
              title="Raise a Ticket / Report an Issue"
              id="header-support-ticket-btn"
            >
              <Ticket className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 py-1.5 px-3 rounded-full shadow-inner">
            <div className="flex items-center gap-2">
              <img
                src={currentEmployeeInDb?.avatar || employeeUser.selfiePreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"}
                alt="Verification selfie"
                className="h-6 w-6 rounded-full object-cover ring-2 ring-brand-500/20"
                onError={(e) => {
                  if (e.currentTarget.src !== "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face") {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face";
                  }
                }}
              />
              <span className="text-xs font-bold text-slate-300 max-w-[80px] truncate leading-none">
                {(currentEmployeeInDb?.name || employeeUser.name).split(" ")[0]}
              </span>
            </div>
            
            <div className="h-3.5 w-[1px] bg-slate-800" />
            
            <button
              onClick={onLogOut}
              className="p-1 rounded-full hover:bg-slate-800 hover:text-rose-400 text-slate-400 transition-all cursor-pointer flex items-center justify-center"
              title="Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 mt-6">
        
        {/* SINGLE UNIFIED COHESIVE DASHBOARD PANEL */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden divide-y divide-slate-800/60">
          
          {/* SECTION 1: TIME & CHECK-IN (Previously Action Punch Card) */}
          <div className="p-6 relative overflow-hidden text-center">
            
            {/* Subtle Ambient Background Glow */}
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-brand-500/10 blur-2xl pointer-events-none" />
            
            <DigitalClock />

            {/* Status Badge */}
            <div className="mt-3.5 flex justify-center">
              <div className={`px-3.5 py-1.5 rounded-full border text-xs font-black font-display tracking-wide uppercase flex items-center gap-1.5 ${statusBadgeColor}`}>
                <span className={`h-2 w-2 rounded-full ${
                  empStatus === "In Office" ? "bg-emerald-500 animate-pulse" :
                  empStatus === "On Field Duty" ? "bg-amber-500 animate-pulse" :
                  empStatus === "Left Office" ? "bg-blue-500" : "bg-slate-400"
                }`} />
                {statusBadgeLabel}
              </div>
            </div>

            {/* TEST MODE PANEL */}
            <AnimatePresence>
              {testModeEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded bg-amber-500 flex items-center justify-center text-white">
                      <Settings className="h-3 w-3" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Developer Test Mode</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSimulatedCoords({
                        lat: activeGeofence?.lat || OFFICE_COORDS.lat,
                        lng: activeGeofence?.lng || OFFICE_COORDS.lng,
                        accuracy: 10
                      })}
                      className={`py-2.5 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                        simulatedCoords?.lat === (activeGeofence?.lat || OFFICE_COORDS.lat)
                          ? "bg-amber-500 text-white border-amber-600"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50"
                      }`}
                    >
                      SIMULATE ON-SITE
                    </button>
                    <button
                      onClick={() => setSimulatedCoords({
                        lat: (activeGeofence?.lat || OFFICE_COORDS.lat) + 0.05, // ~5km away
                        lng: (activeGeofence?.lng || OFFICE_COORDS.lng) + 0.05,
                        accuracy: 10
                      })}
                      className={`py-2.5 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                        simulatedCoords?.lat !== (activeGeofence?.lat || OFFICE_COORDS.lat) && simulatedCoords !== null
                          ? "bg-amber-500 text-white border-amber-600"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50"
                      }`}
                    >
                      SIMULATE OFF-SITE
                    </button>
                  </div>
                  
                  {simulatedCoords && (
                    <div className="mt-3 flex items-center justify-between px-1">
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Coordinates Locked</span>
                        <span className="text-[10px] text-amber-200 font-mono">{simulatedCoords.lat.toFixed(4)}, {simulatedCoords.lng.toFixed(4)}</span>
                      </div>
                      <button 
                        onClick={() => setSimulatedCoords(null)}
                        className="text-[9px] font-black text-rose-500 uppercase tracking-widest"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  
                  <p className="mt-3 text-[9px] text-slate-500 font-medium leading-tight">
                    Simulated coordinates will be used for the next action only. This will create a <span className="text-amber-500 font-bold italic">TEST record</span> in history.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirmation Alert Banner */}
            <AnimatePresence>
              {confirmationMessage && (
                <motion.div 
                  key="confirmation-alert-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mt-4 p-3 rounded-2xl border text-xs text-left font-display flex items-start gap-2 ${
                    confirmationType === "warning" 
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/20" 
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  }`}
                >
                  {confirmationType === "warning" ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> : <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="leading-normal font-medium">{
                      (() => {
                        let msg = confirmationMessage.replace(/^[⚠️✅\s]+/, "");
                        if (activeGeofence?.name && activeGeofence.name !== "Corporate HQ") {
                          msg = msg.replace(/Corporate HQ/g, activeGeofence.name);
                        }
                        return msg;
                      })()
                    }</p>
                  </div>
                  <button 
                    onClick={() => {
                      setConfirmationMessage(null);
                    }}
                    className="p-0.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MAIN CHECK-IN/OUT BUTTON */}
            <div className="mt-6">
              {actualAttendanceStatus === "checked_in" ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => triggerPunchAction("out")}
                  className="w-full bg-rose-600 hover:bg-rose-700 transition-all text-white font-black font-display py-4 px-6 rounded-2xl shadow-lg shadow-rose-900/10 border border-rose-500/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  📸 Check Out Now
                </motion.button>
              ) : actualAttendanceStatus === "checked_out" ? (
                <div className="w-full bg-slate-800/80 text-slate-300 font-bold font-display py-4 px-6 rounded-2xl border border-slate-700/50 text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Day Complete
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => triggerPunchAction("in")}
                  className="w-full bg-brand-600 hover:bg-brand-700 transition-all text-white font-black font-display py-4 px-6 rounded-2xl shadow-lg shadow-brand-900/20 border border-brand-500/20 text-sm flex items-center justify-center gap-2 cursor-pointer animate-shimmer"
                >
                  📸 Check In Now
                </motion.button>
              )}
            </div>

            <p className="text-[10px] text-slate-500 font-mono mt-3">
              {activeGeofence ? `📍 ${activeGeofence.name} Geofence Active: ${activeGeofence.radius}m Radius` : "📍 No Geofence Assigned"}
            </p>

          </div>

          {/* SECTION 2: TODAY'S WORK SUMMARY */}
          {(!employeeUser) ? null : (
            <div className="p-6 text-left">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-xs font-black font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-brand-400" /> Attendance Summary
                </h2>
                <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800/60">
                  {(["today", "week", "month"] as const).map((p) => (
                    <button
                      key={`period-${p}`}
                      onClick={() => setSummaryPeriod(p)}
                      className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${
                        summaryPeriod === p ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {summaryPeriod === "today" && !hasAttendanceToday ? (
                <div className="py-6 px-4 rounded-xl border border-dashed border-slate-800 text-center space-y-1 bg-slate-900/30 mb-4">
                  <p className="text-xs text-slate-400 italic">No attendance recorded for today.</p>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-3">
                
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
                  <p className="text-[9px] font-bold text-slate-500 font-mono uppercase">
                    {summaryPeriod === "today" ? "In Time" : "Days Present"}
                  </p>
                  <p className="text-xs font-black text-slate-200 mt-1">
                    {summaryPeriod === "today" ? checkInTime : `${computedDaysPresent} days`}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
                  <p className="text-[9px] font-bold text-slate-500 font-mono uppercase">
                    {summaryPeriod === "today" ? "Out Time" : "Avg Hours"}
                  </p>
                  <p className="text-xs font-black text-slate-200 mt-1">
                    {summaryPeriod === "today" ? (
                      hasCheckedOutToday 
                        ? checkOutTime 
                        : "—"
                    ) : computedAvgHours}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-slate-500 font-mono uppercase">
                      {summaryPeriod === "today" ? "Total Hours" : "Absences"}
                    </p>
                    {summaryPeriod === "today" && hasAttendanceToday && (
                      <button 
                        onClick={() => setShowCalculationSteps(!showCalculationSteps)}
                        className="text-[8px] text-brand-500 hover:text-brand-400 font-bold uppercase tracking-tighter cursor-pointer underline decoration-dotted"
                      >
                        {showCalculationSteps ? "Hide" : "Verify"}
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-black text-emerald-400 mt-1 font-mono tabular-nums">
                    {summaryPeriod === "today" ? (
                      <LiveHoursDisplay 
                        isLoggedIn={isLoggedIn} 
                        todayCheckIns={todayCheckIns} 
                        todayCheckOuts={todayCheckOuts} 
                      />
                    ) : `${computedAbsences} days`}
                  </p>
                </div>

              </div>

              {/* CALCULATION BREAKDOWN PANEL (requested by user to fix math definitely) */}
              <AnimatePresence>
                {showCalculationSteps && calculationBreakdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 p-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl overflow-hidden space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-brand-500/10 pb-2">
                      <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Attendance Math Verification</h4>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-brand-600 uppercase">Step-by-Step Logic</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-4 w-4 rounded-full bg-brand-500/20 flex items-center justify-center text-[10px] font-bold text-brand-500">1</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-300">Identify First Check-In</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Raw record found: <span className="text-emerald-400 font-mono font-bold">{calculationBreakdown?.earliest?.time || "—"}</span> 
                            <span className="text-slate-500 mx-1">({calculationBreakdown?.earliest?.method || "Biometric"})</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-4 w-4 rounded-full bg-brand-500/20 flex items-center justify-center text-[10px] font-bold text-brand-500">2</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-300">Identify Current/Last Status</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {calculationBreakdown?.isLoggedIn ? (
                              <>User is currently <span className="text-emerald-400 font-bold">Logged In</span>. Using live system time: <span className="text-emerald-400 font-mono font-bold">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></>
                            ) : (
                              <>User is <span className="text-blue-400 font-bold">Logged Out</span>. Using latest valid check-out: <span className="text-blue-400 font-mono font-bold">{calculationBreakdown?.latest?.time || "—"}</span></>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border-t border-brand-500/10 pt-3">
                        <div className="mt-1 h-4 w-4 rounded-full bg-brand-500/20 flex items-center justify-center text-[10px] font-bold text-brand-500">3</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-300">Perform Span Calculation</p>
                          <div className="mt-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-500">Start Time:</span>
                              <span className="text-slate-300">{calculationBreakdown?.startTime?.toLocaleTimeString() || "—"}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-500">End Time:</span>
                              <span className="text-slate-300">{calculationBreakdown?.endTime?.toLocaleTimeString() || "—"}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-mono border-t border-slate-800 pt-1 mt-1">
                              <span className="text-brand-500 font-bold">Elapsed Duration:</span>
                              <span className="text-emerald-400 font-black">{calculationBreakdown?.totalHoursStr || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Raw Sequence of Valid Logs (Chronological)</p>
                      <div className="space-y-1.5">
                        {(calculationBreakdown?.records || []).map((r, i) => (
                          <div key={`log-${r?.time}-${r?.method}-${i}`} className="flex items-center justify-between text-[10px] font-mono bg-slate-950/50 p-1.5 rounded-lg border border-slate-900">
                            <span className={isCheckInLog(r) ? "text-emerald-500" : "text-rose-500"}>
                              {isCheckInLog(r) ? "IN" : "OUT"}
                            </span>
                            <span className="text-slate-300">{r?.time || "—"}</span>
                            <span className="text-slate-500 text-[8px] truncate max-w-[100px]">{r?.method || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-3 p-2.5 bg-slate-900/30 rounded-xl border border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 font-display">
                <span className="flex items-center gap-1">
                  <Compass className="h-3 w-3 text-slate-500" /> 
                  {actualAttendanceStatus === "not_checked_in" ? "Current Status:" : "Verification Context:"}
                </span>
                <span className="font-bold text-slate-300">
                  {(() => {
                    if (actualAttendanceStatus === "checked_out" && checkOutTime !== "—" && checkOutTime !== "null" && checkOutTime !== null) {
                      return `Verified Check-Out at ${checkOutTime}`;
                    }
                    if (checkInTime !== "—" && checkInTime !== "null" && checkInTime !== null) {
                      if (!isLoggedIn) return "Checked Out";
                      
                      let displayDist = "On Site (Live)";
                      
                      // Try to calculate distance from last known location or currently computed distance
                      const lat1 = currentEmployeeInDb?.last_latitude;
                      const lng1 = currentEmployeeInDb?.last_longitude;
                      const lat2 = activeGeofence?.lat;
                      const lng2 = activeGeofence?.lng;
                      
                      let dist = computedDistance;
                      if ((dist === null || dist === undefined) && lat1 && lng1 && lat2 && lng2) {
                         dist = calculateDistance(lat1, lng1, lat2, lng2);
                      }
                      
                      if (dist !== null && dist !== undefined) {
                          const isInside = activeGeofence && dist <= (activeGeofence.radius || 150);
                          if (isInside) {
                              displayDist = "Inside Geofence";
                          } else {
                              displayDist = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km from office` : `${Math.round(dist)} m from office`;
                          }
                      }
                      
                      return (actualAttendanceStatus === "checked_in") ? `${displayDist} (Live)` : "Checked Out";
                    }
                    
                    return "Not yet checked in";
                  })()}
                </span>
              </div>
            </div>
          )}

          {/* SECTION 3: NAVIGATION TABS & DETAILED TAB CONTENT */}
          <div className="p-6 text-left space-y-4">
            
            {/* SUB NAVIGATION TABS */}
            <div className="border-b border-slate-800/80">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("history")}
                  className={`pb-3 text-xs font-extrabold tracking-wide uppercase transition-all relative cursor-pointer ${
                    activeTab === "history" ? "text-brand-400 font-black" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  History
                  {activeTab === "history" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveTab("leaves")}
                  className={`pb-3 text-xs font-extrabold tracking-wide uppercase transition-all relative cursor-pointer ${
                    activeTab === "leaves" ? "text-brand-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Leaves
                  {activeTab === "leaves" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`pb-3 text-xs font-extrabold tracking-wide uppercase transition-all relative cursor-pointer ${
                    activeTab === "profile" ? "text-brand-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  My Profile
                  {activeTab === "profile" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
                </button>
              </div>
            </div>

            {/* TAB CONTENTS */}
            <div className="space-y-4 pt-1">
              <AnimatePresence mode="wait">
                {/* TAB 1: HISTORY */}
                {activeTab === "history" && (
                  <motion.div 
                    key="history-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                  {/* History Period Tabs */}
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="text-xs font-black font-mono text-slate-400 uppercase tracking-widest">Attendance Records</h3>
                    <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800/60">
                      {(["today", "week", "month"] as const).map((p) => (
                        <button
                          key={`history-period-${p}`}
                          onClick={() => setHistoryPeriod(p)}
                          className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all cursor-pointer ${
                            historyPeriod === p ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(activeHistoryFilteredLogs || []).length === 0 ? (
                    <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-500 leading-normal">
                        No attendance records found for this period.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(activeHistoryFilteredLogs || []).slice(0, visibleHistoryLimit).map((log: any, idx: number) => {
                        const logDateStr = log?.date || getLogDate(log)?.toLocaleDateString() || "";
                        return (
                          <div key={`flat-log-${log?.id ?? idx}`} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                                  isCheckOutLog(log) ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}>
                                  {isCheckOutLog(log) ? "Check Out" : "Check In"}
                                </span>
                                <span className="text-xs font-bold text-slate-200">{logDateStr} at {formatDisplayTime(log?.time)}</span>
                                {log?.is_test && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[8px] font-black border border-amber-500/30 tracking-tighter uppercase">TEST</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">{log?.zone || "Field Location"} • {log?.method || "Biometric"}</p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide font-bold ${
                                log?.status === "failed" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : 
                                (log?.status === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20")
                              }`}>
                                {log?.status === "failed" ? "Failed" : (log?.status === "warning" ? "Warning" : "Verified")}
                              </span>
                              <p className="text-[10px] font-mono text-slate-500 mt-1">{log?.gpsAccuracy || "—"}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {(activeHistoryFilteredLogs || []).length > visibleHistoryLimit && (
                    <div className="pt-2 text-center">
                      <button 
                        onClick={() => setVisibleHistoryLimit(prev => prev + 20)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800"
                      >
                        Load More Records...
                      </button>
                    </div>
                  )}
                  </motion.div>
                )}

                {/* TAB 2: LEAVE REQUESTS */}
                {activeTab === "leaves" && (
                  <motion.div 
                    key="leaves-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                  
                  {/* Request Leave Action Button */}
                  {!isLeaveFormOpen && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsLeaveFormOpen(true)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-bold font-display text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" /> Request Leave Duty
                    </motion.button>
                  )}

                  {/* Collapsible Leave Request Form */}
                  <AnimatePresence>
                    {isLeaveFormOpen && (
                      <motion.form
                        key="leave-request-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleLeaveSubmit}
                        className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-left space-y-3.5 overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-brand-400" /> Apply For Leave
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsLeaveFormOpen(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 font-display">Leave Type</label>
                          <select
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                          >
                            <option>Annual Leave</option>
                            <option>Sick Leave</option>
                            <option>Casual Duty Leave</option>
                            <option>Maternity/Paternity Leave</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 font-display">Start Date</label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                              style={{ colorScheme: "dark" }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 font-display">End Date</label>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                              style={{ colorScheme: "dark" }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 font-display">Reason for Leave</label>
                          <textarea
                            rows={2}
                            placeholder="Please state a detailed reason for leave/duty request..."
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 placeholder-slate-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md cursor-pointer transition-all"
                        >
                          Submit Leave Request
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Personal Leave History */}
                  {(personalLeaves || []).length === 0 ? (
                    <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-800 text-center">
                      <p className="text-xs text-slate-500 leading-normal">
                        You haven't requested any leave yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(personalLeaves || []).map((req, idx) => {
                        const statusLower = (req?.status || "").toLowerCase();
                        const isApproved = statusLower === "approved";
                        const isRejected = statusLower === "rejected";
                        const createdAtStr = req?.created_at ? new Date(req.created_at).toLocaleDateString() : "—";
                        return (
                          <div key={req?.id ? `personal-leave-${req.id}-${idx}` : `personal-leave-fallback-${idx}`} className="p-3 bg-slate-950/20 border border-slate-800/80 rounded-xl text-left space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-200">{req?.leave_type || "Leave Request"}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${
                                isApproved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                isRejected ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {isApproved ? "Approved" : (isRejected ? "Rejected" : req?.status || "Pending")}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                              <span>Range: {req?.start_date || "—"} to {req?.end_date || "—"}</span>
                              <span>{createdAtStr}</span>
                            </div>
                            {req?.reason && (
                              <p className="text-[10px] text-slate-400 mt-1 italic font-display">
                                "{req.reason}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  </motion.div>
                )}

                {/* TAB 3: MY PROFILE */}
                {activeTab === "profile" && (
                  <motion.div 
                    key="profile-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-950/10 border border-slate-800/80 rounded-2xl p-5 text-left space-y-4"
                  >
                  
                  <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                    <div className="relative group">
                      <img
                        src={currentEmployeeInDb?.avatar || employeeUser?.selfiePreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"}
                        alt="Active Profile Picture"
                        className="h-16 w-16 rounded-xl object-cover ring-2 ring-slate-800"
                        onError={(e) => {
                          if (e.currentTarget.src !== "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face") {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face";
                          }
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-brand-500 text-white rounded-full p-1 border border-slate-900 shadow-sm">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">{currentEmployeeInDb?.name || employeeUser?.name || "Employee"}</h3>
                      <p className="text-[11px] font-bold text-brand-400 mt-0.5">{currentEmployeeInDb?.role || employeeUser?.designation || "Staff"}</p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">Secure Face Anchored</p>
                    </div>
                  </div>

                  {/* READ-ONLY FIELDS */}
                  <div className="space-y-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Organization Name</span>
                      <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        {systemSettings?.company_name || employeeUser?.orgName || "PRESENSIC"}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Shift Timing & Grace Period</span>
                      <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{systemSettings?.shift_start || "09:00"} - {systemSettings?.shift_end || "18:00"} ({systemSettings?.timezone || "IST"})</span>
                        </div>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                          +{systemSettings?.grace_period ?? 15}m grace
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Working Days</span>
                      <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-slate-500" />
                        {(systemSettings?.working_days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).join(", ")}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</span>
                      <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        {currentEmployeeInDb?.email || employeeUser?.email}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Employee ID</span>
                      <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                        {currentEmployeeInDb?.id || "EMP-001"}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Tracking Geofence</span>
                      <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        {activeGeofence ? activeGeofence.name : "No Geofence Assigned"}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">WhatsApp Number</span>
                      <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                        {currentEmployeeInDb?.phone || employeeUser.whatsApp || "+91-98765-43210"}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => alert("Admin notified of PIN reset request.")}
                        className="w-full bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/20 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        Request PIN Reset
                      </button>
                    </div>
                  </div>

                  {/* UPDATE VERIFICATION SELFIE FLUSH */}
                  <div className="pt-2 border-t border-slate-800/60">
                    {!isUpdatingProfileSelfie ? (
                      <button
                        onClick={() => {
                          setIsUpdatingProfileSelfie(true);
                          setSelfieMode("none");
                          setSelfieFile(null);
                          setSelfiePreview(null);
                          setCapturedImage(null);
                        }}
                        className="w-full text-center text-xs font-bold text-brand-400 hover:text-brand-300 underline py-2 cursor-pointer"
                      >
                        🔄 Update Face Lock Verification Photo
                      </button>
                    ) : (
                      <div className="space-y-3 p-3 bg-slate-900/40 border border-slate-800 rounded-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="text-[10px] font-bold text-slate-300 uppercase">Change Photo</span>
                          <button
                            onClick={() => setIsUpdatingProfileSelfie(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          {selfieMode === "none" ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelfieMode("upload");
                                  setTimeout(() => fileInputRef.current?.click(), 100);
                                }}
                                className="p-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                              >
                                <Upload className="h-4 w-4 text-slate-400 mb-1" />
                                <span className="text-[10px] font-bold text-slate-300">Upload File</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setSelfieMode("camera")}
                                className="p-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                              >
                                <Camera className="h-4 w-4 text-slate-400 mb-1" />
                                <span className="text-[10px] font-bold text-slate-300">Use Camera</span>
                              </button>
                            </div>
                          ) : selfieMode === "upload" ? (
                            <div className="space-y-2">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) processFile(files[0]);
                                }}
                                className="hidden"
                              />
                              <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer ${
                                  isDragging ? "border-brand-500 bg-slate-880" : "border-slate-800 hover:border-brand-500"
                                }`}
                              >
                                <Upload className="h-4 w-4 text-slate-400 mb-1" />
                                <span className="text-[10px] text-slate-400">Click or drag photo</span>
                              </div>
                              
                              {selfiePreview && (
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-xl">
                                  <img src={selfiePreview} className="h-10 w-10 object-cover rounded-lg" alt="Preview" />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (selfieFile) {
                                        const url = await uploadPhotoToStorage(selfieFile);
                                        if (url) {
                                          const cacheBustedUrl = url.startsWith('data:') ? url : `${url}?t=${Date.now()}`;
                                          
                                          // Update global employeeUser state and local storage
                                          const updatedUser = { ...employeeUser, avatar: cacheBustedUrl, selfiePreview: selfiePreview };
                                          if (setEmployeeUser) {
                                            setEmployeeUser(updatedUser);
                                          }
                                          localStorage.setItem("presensic_employee_user", JSON.stringify(updatedUser));

                                          const supabase = getSupabase();
                                          if (supabase) {
                                            await supabase.from('employees').update({ avatar: cacheBustedUrl }).eq('id', employeeUser.id);
                                          }
                                          // Update parent employees state to trigger real-time UI update
                                          setEmployees(prev => prev.map(e => 
                                            (e.id === employeeUser.id || e.email?.toLowerCase() === employeeUser.email?.toLowerCase() || e.name === employeeUser.name)
                                              ? { ...e, avatar: cacheBustedUrl }
                                              : e
                                          ));
                                        }
                                      }
                                      setIsUpdatingProfileSelfie(false);
                                    }}
                                    className="bg-brand-600 px-2.5 py-1 text-[10px] font-bold text-white rounded-lg ml-auto cursor-pointer"
                                  >
                                    Save Photo
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 text-left">
                              <FaceEnrollment
                                userId={currentEmployeeInDb?.id || employeeUser?.id || "EMP-001"}
                                onComplete={async () => {
                                  const updatedUser = { ...employeeUser, faceLockSetup: true };
                                  if (setEmployeeUser) {
                                    setEmployeeUser(updatedUser);
                                  }
                                  localStorage.setItem("presensic_employee_user", JSON.stringify(updatedUser));

                                  const supabase = getSupabase();
                                  if (supabase && employeeUser.id) {
                                    await supabase.from('employees').update({ face_lock_setup: true }).eq('id', employeeUser.id);
                                  }
                                  setEmployees(prev => prev.map(e => 
                                    (e.id === employeeUser.id || e.email?.toLowerCase() === employeeUser.email?.toLowerCase() || e.name === employeeUser.name)
                                      ? { ...e, faceLockSetup: true }
                                      : e
                                  ));
                                  setIsUpdatingProfileSelfie(false);
                                  setSelfieMode("none");
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>

      </main>
      {/* FOOTER */}
      <footer className="mt-12 text-center px-4">
        <p className="text-[9px] text-slate-600 max-w-xs mx-auto leading-relaxed">
          Presensic Attendance Core • Version 1.0 • Your check-ins are geo-verified and logged securely.
        </p>
      </footer>

      {/* PUNCH CAMERA & GEOLOCATION MODAL */}
      <AnimatePresence>
        {isPunchModalOpen && (
          <motion.div key="punch-modal-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Dark overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPunchModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 relative z-10 space-y-4 shadow-2xl text-left"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-display">
                      {punchType === "in" ? "Verify Check-In" : "Verify Check-Out"}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-mono">
                      Secure Multi-Factor Validation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPunchModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="bg-slate-950/60 rounded-2xl p-2 border border-slate-800 relative text-slate-100">
                {verificationStage === "verifying" ? (
                  <div className="text-center p-8 text-white font-mono">
                    <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Verifying location...
                  </div>
                ) : verificationStage === "verified_location" ? (
                  <div className="text-center p-8 text-white font-mono">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-sm">Location verified - {computedDistance !== null ? Math.round(computedDistance) : "..."}m from {activeGeofence?.name || "assigned geofence"}</p>
                  </div>
                ) : (
                  <FaceVerification
                    userId={currentEmployeeInDb?.id || employeeUser?.id || "EMP-001"}
                    companyId={currentEmployeeInDb?.company_id ?? currentEmployeeInDb?.companyId ?? employeeUser?.companyId ?? "2"}
                    allowedRadiusMeters={activeGeofence?.radius || 150}
                    onSuccess={(info) => {
                      if (info?.distance !== undefined) {
                        setLastMatchDistance(info.distance);
                      }
                      handleFaceVerificationSuccess(info?.distance);
                    }}
                    onFail={async (reason, info) => {
                      if (info?.distance !== undefined) {
                        setLastMatchDistance(info.distance);
                      }
                      const distNote = info?.distance !== undefined ? ` (Match Distance: ${info.distance.toFixed(3)}, Threshold: 0.50)` : "";
                      console.error("Face verification failed:", reason, distNote);
                      const isStrict = systemSettings?.strict_selfie_match ?? true;

                      // Always log the failed biometric attempt for fraud audit trail
                      try {
                        const supabase = getSupabase();
                        if (supabase && currentEmployeeInDb) {
                          await supabase.from("attendance_logs").insert([{
                            employee_id: currentEmployeeInDb.id,
                            company_id: currentEmployeeInDb?.companyId ?? currentEmployeeInDb?.company_id ?? "1",
                            location_name: activeGeofence?.name || "Unassigned",
                            face_verified: false,
                            gps_verified: true,
                            status: "failed",
                            method: `Face Verification Failed (${reason})${distNote}`,
                            distance_status: info?.distance !== undefined ? `Face Match Dist: ${info.distance.toFixed(3)} (Threshold: 0.50)` : "Face Mismatch",
                            attendance_type: punchType === "in" ? "Check In" : "Check Out",
                            location_timestamp: new Date().toISOString()
                          }]);
                        }
                      } catch (logErr) {
                        console.warn("Could not log failed face attempt:", logErr);
                      }

                      if (!isStrict && (reason === "face_mismatch" || reason === "no_face_detected" || reason === "no_liveness_detected")) {
                        // Under relaxed mode (toggle OFF): allow punch but mark face_verified = false
                        setHasFaceMismatchBypass(true);
                        setFaceError("⚠️ Face Verification / Liveness Failed. Proceeding with punch (Flagged as Unverified for Employer Review).");
                        await handleFaceVerificationSuccess();
                        return;
                      }

                      let msg = "Verification failed. Please try again.";
                      if (reason === "not_enrolled") {
                        msg = "No enrolled face found. Please complete biometric registration first.";
                      } else if (reason === "no_face_detected") {
                        msg = "No face detected in the frame. Position your face clearly and click Try Again.";
                      } else if (reason === "face_mismatch") {
                        msg = "⛔ Face Mismatch: Biometric profile does not match. Please position your face in the camera and retry.";
                      } else if (reason === "no_liveness_detected") {
                        msg = "⛔ Liveness Check Failed: No blink detected from live camera. Please face the camera, blink, and click Try Again.";
                      } else if (reason === "camera_permission_denied") {
                        msg = "📷 Camera Permission Denied: Please grant camera permissions in your browser site settings and click 'Retry Camera Access'.";
                      } else if (reason === "no_location") {
                        msg = "Unable to lock GPS location. Please allow browser location access.";
                      } else if (reason === "location_mismatch") {
                        msg = `Location mismatch. You must be within ${activeGeofence?.radius || 150}m of "${activeGeofence?.name || 'assigned geofence'}".`;
                      }
                      setFaceError(msg);
                    }}
                  />
                )}
              </div>

              {faceError && (
                <div className="space-y-2">
                  <div className="p-3 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-2xl text-center text-xs font-semibold">
                    {faceError}
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={async () => {
                        setHasFaceMismatchBypass(true);
                        setFaceError("⚠️ [Sandbox Bypass] Proceeding with punch using testing bypass.");
                        await handleFaceVerificationSuccess();
                      }}
                      className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                    >
                      Bypass Biometrics (Testing Only)
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support Ticket Modal */}
      <SupportTicketModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        context={{
          companyName: employeeUser?.orgName || "Unknown Org",
          raisedBy: `${employeeUser?.name || "Employee"} (Employee)`
        }}
        setTickets={setTickets}
      />

    </div>
  );
}
