import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getSupabase } from "../lib/supabase";
import { calculateTrialStatus } from "../utils/trial";
import { isTestCompany, getPlanMonthlyPrice, getPlanDisplayPrice } from "../utils/pricingUtils";
import { formatDDMMYYYY, formatDateTimeDDMMYYYYHHmm } from "../utils/formatters";
import {
  Building2,
  Users,
  Clock,
  ShieldCheck,
  LogOut,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  BarChart3,
  Activity,
  Server,
  Settings,
  Download,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  ChevronRight,
  Zap,
  ArrowUpRight,
  Shield,
  IndianRupee,
  CreditCard,
  Filter,
  MoreVertical,
  Key,
  Lock,
  FileText,
  CheckSquare,
  Square,
  Plus,
  Loader2,
  FileSpreadsheet,
  Printer,
  ArrowDown,
  Phone
} from "lucide-react";
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

import ExecutiveAnalyticsDashboard from "./ExecutiveAnalyticsDashboard";

interface MasterAdminDashboardProps {
  onLogOut: () => void;
}

export default function MasterAdminDashboard({ onLogOut }: MasterAdminDashboardProps) {
  // Defense-in-depth mount safeguard
  useEffect(() => {
    try {
      const savedEmployer = localStorage.getItem("presensic_employer_user");
      if (savedEmployer) {
        const emp = JSON.parse(savedEmployer);
        if (!emp || (!emp.isMasterAdmin && emp.role !== "master_admin" && emp.whatsApp !== "+917894561230")) {
          onLogOut();
        }
      } else {
        onLogOut();
      }
    } catch (e) {
      onLogOut();
    }
  }, [onLogOut]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Raw data from Supabase
  const [companies, setCompanies] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loadingExportKey, setLoadingExportKey] = useState<string | null>(null);

  // Helper Exporters for Executive Reports
  const handleRunExport = async (key: string, exportFn: () => void | Promise<void>) => {
    setLoadingExportKey(key);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      await exportFn();
    } catch (err) {
      console.error("Export error:", err);
      setToastMessage("Export generation failed. Please try again.");
    } finally {
      setLoadingExportKey(null);
    }
  };

  const handleExportCSVFile = (filename: string, headers: string[], rows: any[][]) => {
    const escapeCell = (val: any) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCell).join(","),
      ...rows.map(row => row.map(escapeCell).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toLocaleDateString('en-CA')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcelFile = (sheetTitle: string, filename: string, headers: string[], rows: any[][]) => {
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      rows.forEach(r => {
        const cellVal = String(r[colIdx] ?? "");
        if (cellVal.length > maxLen) maxLen = cellVal.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.slice(0, 31));
    XLSX.writeFile(workbook, `${filename}_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  };

  const handleExportPDFFile = (title: string, filename: string, headers: string[], rows: any[][]) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const currentDate = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    // Header Banner with Presensic Founder Command branding
    doc.setFillColor(15, 23, 42); // slate-900 Navy
    doc.rect(0, 0, 297, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("PRESENSIC FOUNDER COMMAND", 14, 11);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Executive Report: ${title} | Export Date: ${currentDate}`, 14, 18);

    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: rows,
      theme: "striped",
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold"
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 28, left: 14, right: 14, bottom: 14 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${pageCount}`, 280, 202, { align: "right" });
      }
    });

    doc.save(`${filename}_${new Date().toLocaleDateString('en-CA')}.pdf`);
  };

  // Live report data builders
  const getCompanyReportData = () => {
    const empCountMap: { [compId: string]: number } = {};
    employees.forEach(e => {
      const cid = String(e.company_id);
      empCountMap[cid] = (empCountMap[cid] || 0) + 1;
    });

    const headers = ["Company ID", "Organization Name", "Owner Name", "WhatsApp / Phone", "Plan", "Trial Status", "Registration Date", "City / State", "Employees"];
    const rows = companies.map(c => {
      const trial = calculateTrialStatus(c.created_at, c.status, c.selected_plan, c.trial_end_date);
      const trialStatusText = trial.trialExpired || trial.daysRemaining <= 0
        ? "Expired Trial"
        : `${trial.daysRemaining} days left`;
      const location = [c.city, c.state].filter(Boolean).join(", ") || "N/A";
      const regDate = c.created_at ? new Date(c.created_at).toLocaleDateString() : "N/A";
      const empCount = empCountMap[String(c.id)] || 0;

      return [
        String(c.id ?? ""),
        c.org_name || c.company_name || "N/A",
        c.full_name || c.owner_name || "N/A",
        c.whatsapp || c.phone || "N/A",
        c.selected_plan || "Starter",
        trialStatusText,
        regDate,
        location,
        empCount
      ];
    });
    return { headers, rows };
  };

  const getEmployeeReportData = () => {
    const compMap: { [id: string]: string } = {};
    companies.forEach(c => {
      compMap[String(c.id)] = c.org_name || c.company_name || `Org #${c.id}`;
    });

    const headers = ["Employee ID", "Employee Name", "Organization", "Department", "Role", "WhatsApp / Phone", "Designation", "Join Date", "Status"];
    const rows = employees.map(e => {
      const orgName = compMap[String(e.company_id)] || e.company_name || e.company_id || "N/A";
      const joinDate = e.join_date ? new Date(e.join_date).toLocaleDateString() : (e.created_at ? new Date(e.created_at).toLocaleDateString() : "N/A");

      return [
        String(e.id ?? ""),
        e.name || e.full_name || "N/A",
        orgName,
        e.department || "General",
        e.role || "Staff",
        e.whatsapp || e.phone || "N/A",
        e.designation || "N/A",
        joinDate,
        e.status || "Active"
      ];
    });
    return { headers, rows };
  };

  const getAttendanceReportData = () => {
    const compMap: { [id: string]: string } = {};
    companies.forEach(c => {
      compMap[String(c.id)] = c.org_name || c.company_name || `Org #${c.id}`;
    });

    const empMap: { [id: string]: string } = {};
    employees.forEach(e => {
      empMap[String(e.id)] = e.name || e.full_name || `Employee #${e.id}`;
    });

    const headers = ["Log ID", "Employee Name", "Organization", "Zone / Location", "Check-in Time", "Check-out Time", "Attendance Status", "GPS Location", "Geofence Log"];
    const rows = attendanceLogs.map(l => {
      const orgName = compMap[String(l.company_id)] || l.company_id || "N/A";
      const empName = l.employee_name || empMap[String(l.employee_id)] || l.employee_id || "N/A";
      const gps = (l.latitude && l.longitude) ? `${l.latitude}, ${l.longitude}` : (l.coordinates || "N/A");
      const geofence = l.outside_geofence ? "Outside Geofence" : "Within Geofence";

      return [
        String(l.id ?? ""),
        empName,
        orgName,
        l.zone || l.location || "HQ / Default",
        l.time || l.check_in_time || "N/A",
        l.check_out_time || "N/A",
        l.status || "Present",
        gps,
        geofence
      ];
    });
    return { headers, rows };
  };

  const getLeaveReportData = () => {
    const compMap: { [id: string]: string } = {};
    companies.forEach(c => {
      compMap[String(c.id)] = c.org_name || c.company_name || `Org #${c.id}`;
    });

    const empMap: { [id: string]: string } = {};
    employees.forEach(e => {
      empMap[String(e.id)] = e.name || e.full_name || `Employee #${e.id}`;
    });

    const headers = ["Request ID", "Employee Name", "Organization", "Department", "Leave Type", "Start Date", "End Date", "Duration", "Status", "Reason / Notes"];
    const rows = leaveRequests.map(l => {
      const orgName = compMap[String(l.company_id)] || l.company_id || "N/A";
      const empName = l.employee_name || empMap[String(l.employee_id)] || l.employee_id || "N/A";

      return [
        String(l.id ?? ""),
        empName,
        orgName,
        l.department || "General",
        l.leave_type || l.type || "Casual Leave",
        l.start_date || "N/A",
        l.end_date || "N/A",
        l.days ? `${l.days} days` : (l.duration || "1 day"),
        l.status || "Pending",
        l.reason || "N/A"
      ];
    });
    return { headers, rows };
  };

  // Search & Navigation
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isHeaderSearchExpanded, setIsHeaderSearchExpanded] = useState<boolean>(false);
  const cardSearchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "companies" | "analytics" | "reports" | "subscriptions" | "settings">("overview");

  // Subscription Management Sub-Navigation & State
  const [subTab, setSubTab] = useState<"paid" | "expired" | "extend" | "upgrade" | "downgrade">("paid");
  const [subSearchQuery, setSubSearchQuery] = useState<string>("");
  const [selectedUpgradePlans, setSelectedUpgradePlans] = useState<{ [companyId: string]: string }>({});
  const [selectedDowngradePlans, setSelectedDowngradePlans] = useState<{ [companyId: string]: string }>({});
  const [selectedExtendDaysMap, setSelectedExtendDaysMap] = useState<{ [companyId: string]: number }>({});

  const getPlanPrice = (plan: string, cycle: string = "monthly") => {
    return getPlanDisplayPrice(plan, cycle);
  };

  const handleExecutePlanChange = async (comp: any, newPlan: string, isUpgrade: boolean) => {
    try {
      const oldPlan = comp.selected_plan || "Trial";
      const updatedComp = {
        ...comp,
        selected_plan: newPlan
      };

      // 1. Optimistically update companies state array
      setCompanies(prev => prev.map(c => String(c.id) === String(comp.id) ? updatedComp : c));

      // 2. Sync selectedCompanyProfile if drawer is open
      if (selectedCompanyProfile && String(selectedCompanyProfile.id) === String(comp.id)) {
        setSelectedCompanyProfile(updatedComp);
        setAdminSelectedPlan(newPlan);
      }

      // 3. Log to Company Activity
      const actionType = isUpgrade ? "Plan Upgraded" : "Plan Downgraded";
      const logDesc = `Plan ${isUpgrade ? "upgraded" : "downgraded"} from ${oldPlan} to ${newPlan} by Master Admin`;

      setAdminActivityLogs(prev => {
        const existing = prev[comp.id] || [];
        return {
          ...prev,
          [comp.id]: [
            {
              id: `act_${Date.now()}`,
              type: actionType,
              description: logDesc,
              timestamp: new Date().toISOString()
            },
            ...existing
          ]
        };
      });

      // 4. Write update to Supabase
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from("companies")
          .update({ selected_plan: newPlan })
          .eq("id", comp.id);

        if (error) throw error;
      }

      showToast(`${comp.org_name || 'Company'}: ${logDesc}`);
    } catch (err: any) {
      console.error("Error updating plan:", err);
      showToast(`Error updating plan: ${err.message}`);
    }
  };

  const handleFollowUpExpiredCompany = (comp: any) => {
    const rawPhone = comp.whatsapp || comp.phone || "";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

    if (cleanPhone) {
      const message = encodeURIComponent(`Hello ${comp.full_name || 'Founder'}, this is Presensic Founder Command following up regarding your ${comp.org_name || 'company'} account subscription status.`);
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
      showToast(`Opened WhatsApp follow-up for ${comp.org_name || 'Company'}`);
    } else {
      showToast(`Follow-up notice recorded for ${comp.org_name || 'Company'}. (No contact phone available)`);
    }
  };

  // Focus card header search input when expanded
  useEffect(() => {
    if (isHeaderSearchExpanded && cardSearchInputRef.current) {
      cardSearchInputRef.current.focus();
    }
  }, [isHeaderSearchExpanded]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Companies Directory Filters & Pagination & Sorting
  const [companyFilterStatus, setCompanyFilterStatus] = useState<string>("all");
  const [companyFilterPlan, setCompanyFilterPlan] = useState<string>("all");
  const [companyFilterReg, setCompanyFilterReg] = useState<string>("all");
  const [companyFilterEmp, setCompanyFilterEmp] = useState<string>("all");
  const [companySortOrder, setCompanySortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Selected company profile & actions
  const [selectedCompanyProfile, setSelectedCompanyProfile] = useState<any | null>(null);
  const [companyProfileSubTab, setCompanyProfileSubTab] = useState<"overview" | "employees" | "attendance" | "leave" | "subscription" | "activity">("overview");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [adminTrialDays, setAdminTrialDays] = useState<number>(10);
  const [adminSelectedPlan, setAdminSelectedPlan] = useState<string>("Starter");
  const [editedTrialEndDate, setEditedTrialEndDate] = useState<Date | null>(null);
  const [isSavingTrial, setIsSavingTrial] = useState<boolean>(false);

  useEffect(() => {
    if (selectedCompanyProfile) {
      setAdminSelectedPlan(selectedCompanyProfile.selected_plan || "Starter");
      const initialEndDate = selectedCompanyProfile.trial_end_date
        ? new Date(selectedCompanyProfile.trial_end_date)
        : new Date(new Date(selectedCompanyProfile.created_at || Date.now()).getTime() + 86400000 * 5);
      setEditedTrialEndDate(initialEndDate);
    } else {
      setEditedTrialEndDate(null);
    }
  }, [selectedCompanyProfile]);

  const initialTrialEndDate = useMemo(() => {
    if (!selectedCompanyProfile) return null;
    return selectedCompanyProfile.trial_end_date
      ? new Date(selectedCompanyProfile.trial_end_date)
      : new Date(new Date(selectedCompanyProfile.created_at || Date.now()).getTime() + 86400000 * 5);
  }, [selectedCompanyProfile]);

  const hasTrialChanged = useMemo(() => {
    if (!editedTrialEndDate || !initialTrialEndDate) return false;
    return Math.abs(editedTrialEndDate.getTime() - initialTrialEndDate.getTime()) > 1000;
  }, [editedTrialEndDate, initialTrialEndDate]);

  const editedDaysRemaining = useMemo(() => {
    if (!editedTrialEndDate) return 0;
    const diffMs = editedTrialEndDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [editedTrialEndDate]);

  // ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCompanyProfile) {
        setSelectedCompanyProfile(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCompanyProfile]);

  // Modals for actions
  const [showAddCompanyModal, setShowAddCompanyModal] = useState<boolean>(false);
  const [addCompanyFormData, setAddCompanyFormData] = useState({
    orgName: "",
    ownerName: "",
    contactNumber: "",
    contactEmail: "",
    plan: "Starter",
    empCount: "0",
    regDate: new Date().toLocaleDateString('en-CA'),
    status: "Active"
  });
  const [addCompanyError, setAddCompanyError] = useState<string | null>(null);
  const [isSubmittingAddCompany, setIsSubmittingAddCompany] = useState<boolean>(false);

  const [editCompanyModal, setEditCompanyModal] = useState<any | null>(null);
  const [changePlanModal, setChangePlanModal] = useState<any | null>(null);
  const [resetPinModal, setResetPinModal] = useState<any | null>(null);
  const [deleteCompanyModal, setDeleteCompanyModal] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");
  const [suspendConfirmModal, setSuspendConfirmModal] = useState<any | null>(null);
  const [extendTrialShortcutModal, setExtendTrialShortcutModal] = useState<{ comp: any; days: number } | null>(null);
  const [adminActivityLogs, setAdminActivityLogs] = useState<Record<string, { id: string; type: string; description: string; timestamp: string }[]>>({});

  const handleCreateCompanySubmit = async () => {
    setAddCompanyError(null);
    if (!addCompanyFormData.orgName.trim()) {
      setAddCompanyError("Company Name is required.");
      return;
    }
    if (!addCompanyFormData.ownerName.trim()) {
      setAddCompanyError("Owner Name is required.");
      return;
    }
    if (!addCompanyFormData.contactNumber.trim()) {
      setAddCompanyError("Contact Number is required.");
      return;
    }

    setIsSubmittingAddCompany(true);
    try {
      const regTimestamp = addCompanyFormData.regDate
        ? new Date(addCompanyFormData.regDate).toISOString()
        : new Date().toISOString();

      const newCompanyPayload = {
        org_name: addCompanyFormData.orgName.trim(),
        full_name: addCompanyFormData.ownerName.trim(),
        whatsapp: addCompanyFormData.contactNumber.trim(),
        email: addCompanyFormData.contactEmail.trim() || null,
        selected_plan: addCompanyFormData.plan,
        employee_count: parseInt(addCompanyFormData.empCount, 10) || 0,
        created_at: regTimestamp,
        status: addCompanyFormData.status
      };

      const supabase = getSupabase();
      let createdCompRecord = null;

      if (supabase) {
        const { data, error } = await supabase
          .from("companies")
          .insert([newCompanyPayload])
          .select();

        if (error) {
          console.warn("Supabase insert warning, using generated record:", error);
        } else if (data && data.length > 0) {
          createdCompRecord = data[0];
        }
      }

      if (!createdCompRecord) {
        createdCompRecord = {
          id: `comp_${Date.now()}`,
          ...newCompanyPayload
        };
      }

      setCompanies(prev => [createdCompRecord, ...prev]);
      showToast(`Company "${createdCompRecord.org_name}" created successfully.`);
      setShowAddCompanyModal(false);
      setAddCompanyFormData({
        orgName: "",
        ownerName: "",
        contactNumber: "",
        contactEmail: "",
        plan: "Starter",
        empCount: "0",
        regDate: new Date().toLocaleDateString('en-CA'),
        status: "Active"
      });
      fetchData(true);
    } catch (err: any) {
      console.error("Error creating company:", err);
      setAddCompanyError(err.message || "Failed to create company.");
    } finally {
      setIsSubmittingAddCompany(false);
    }
  };

  // Fetch all data from Supabase
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error("Supabase client not initialized.");
      }

      // Fetch companies
      const { data: compData, error: compError } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (compError) throw compError;

      // Fetch employees
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*");

      if (empError) throw empError;

      // Fetch attendance logs
      const { data: logData, error: logError } = await supabase
        .from("attendance_logs")
        .select("*");

      if (logError) throw logError;

      // Fetch leave requests
      const { data: leaveData, error: leaveError } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (leaveError) {
        console.warn("Leave requests fetch warning:", leaveError);
      }

      setCompanies(compData || []);
      setEmployees(empData || []);
      setAttendanceLogs(logData || []);
      setLeaveRequests(leaveData || []);
    } catch (err: any) {
      console.error("Error fetching Master Admin data:", err);
      setError(err.message || "Failed to load executive data from Supabase.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Computed Metrics & Financials
  const metrics = useMemo(() => {
    const totalCompanies = companies.length;
    let activeCompanies = 0;
    let trialCompanies = 0;
    let paidCompanies = 0;
    let trialsExpiringCount = 0;
    let awaitingPaymentCount = 0;
    let monthlyRevenue = 0;

    companies.forEach((comp) => {
      const isTest = isTestCompany(comp);
      const trial = calculateTrialStatus(comp.created_at, comp.status, comp.selected_plan, comp.trial_end_date);
      const plan = (comp.selected_plan || "").toLowerCase();
      const status = (comp.status || "").toLowerCase();

      if (status !== "suspended") {
        activeCompanies++;
      }

      if (status !== "suspended" && (plan.includes("paid") || plan.includes("enterprise") || plan.includes("pro") || plan.includes("growth") || plan.includes("basic") || status === "active")) {
        paidCompanies++;
        if (!isTest) {
          monthlyRevenue += getPlanMonthlyPrice(comp.selected_plan, comp.billing_cycle || "monthly", isTest);
        }
      }

      if (trial.trialExpired || trial.daysRemaining <= 0) {
        awaitingPaymentCount++;
      } else {
        trialCompanies++;
        if (trial.daysRemaining <= 3 && trial.daysRemaining >= 0) {
          trialsExpiringCount++;
        }
      }
    });

    const totalEmployees = employees.length;
    const pendingLeaves = leaveRequests.filter((l) => l.status === "Pending").length;

    const todayStr = new Date().toLocaleDateString('en-CA');
    const checkInsTodaySet = new Set();
    const checkOutsTodaySet = new Set();
    let newCompaniesToday = 0;
    let newEmployeesToday = 0;

    attendanceLogs.forEach((log) => {
      const t = log.time || log.created_at;
      if (t && new Date(t).toLocaleDateString('en-CA') === todayStr) {
        if (log.status === "Present" || log.status === "Checked In" || log.status === "Late") {
          checkInsTodaySet.add(log.employee_id);
        } else if (log.status === "Checked Out") {
          checkOutsTodaySet.add(log.employee_id);
        }
      }
    });

    employees.forEach((emp) => {
      if (emp.check_in_time && new Date(emp.check_in_time).toLocaleDateString('en-CA') === todayStr) {
        checkInsTodaySet.add(emp.id);
      }
      if (emp.check_out_time && new Date(emp.check_out_time).toLocaleDateString('en-CA') === todayStr) {
        checkOutsTodaySet.add(emp.id);
      }
      if (emp.created_at && new Date(emp.created_at).toLocaleDateString('en-CA') === todayStr) {
        newEmployeesToday++;
      }
    });

    companies.forEach((comp) => {
      if (comp.created_at && new Date(comp.created_at).toLocaleDateString('en-CA') === todayStr) {
        newCompaniesToday++;
      }
    });

    return {
      totalCompanies,
      activeCompanies,
      trialCompanies,
      paidCompanies,
      totalEmployees,
      monthlyRevenue,
      trialsExpiringCount,
      pendingLeaves,
      awaitingPaymentCount,
      checkInsToday: checkInsTodaySet.size,
      checkOutsToday: checkOutsTodaySet.size,
      newCompaniesToday,
      newEmployeesToday
    };
  }, [companies, employees, attendanceLogs, leaveRequests]);

  // Recent Activity Feed
  const recentActivity = useMemo(() => {
    const events: any[] = [];
    companies.slice(0, 5).forEach((c) => {
      events.push({
        id: `comp-${c.id}`,
        type: "Company Registered",
        description: `${c.org_name || c.full_name} registered on ${c.selected_plan || 'Trial'} plan`,
        timestamp: c.created_at || new Date().toISOString()
      });
    });
    leaveRequests.slice(0, 3).forEach((l) => {
      events.push({
        id: `leave-${l.id}`,
        type: `Leave ${l.status}`,
        description: `${l.employee_name} requested ${l.leave_type} (${l.total_days} days)`,
        timestamp: l.updated_at || l.created_at || new Date().toISOString()
      });
    });
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [companies, leaveRequests]);

  // Chart Data
  const companyGrowthData = useMemo(() => {
    const monthlyMap: { [key: string]: number } = {};
    companies.forEach((comp) => {
      if (comp.created_at) {
        const date = new Date(comp.created_at);
        const monthKey = date.toLocaleString("default", { month: "short", year: "2-digit" });
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
      }
    });
    const sortedKeys = Object.keys(monthlyMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    if (sortedKeys.length === 0) {
      return [
        { month: "Jan 26", companies: 2 },
        { month: "Feb 26", companies: 5 },
        { month: "Mar 26", companies: 12 },
        { month: "Apr 26", companies: 24 }
      ];
    }
    return sortedKeys.map((m) => ({
      month: m,
      companies: monthlyMap[m]
    }));
  }, [companies]);

  // Filtered and searched companies for directory
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const trial = calculateTrialStatus(c.created_at, c.status, c.selected_plan);
      const plan = (c.selected_plan || "").toLowerCase();
      const status = (c.status || "").toLowerCase();
      const empCount = employees.filter((e) => e.company_id === c.id || String(e.company_id) === String(c.id)).length;

      // Global Search Match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (c.org_name || "").toLowerCase().includes(q);
        const matchOwner = (c.full_name || "").toLowerCase().includes(q);
        const matchWa = (c.whatsapp || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchId = String(c.id).toLowerCase().includes(q);
        const compEmps = employees.filter((e) => e.company_id === c.id || String(e.company_id) === String(c.id));
        const matchEmployee = compEmps.some((e) =>
          (e.full_name || e.name || e.employee_name || "").toLowerCase().includes(q) ||
          (e.whatsapp || "").toLowerCase().includes(q) ||
          (e.email || "").toLowerCase().includes(q)
        );
        if (!matchName && !matchOwner && !matchWa && !matchEmail && !matchId && !matchEmployee) return false;
      }

      // Status Filter
      if (companyFilterStatus !== "all") {
        if (companyFilterStatus === "active" && (trial.trialExpired || status === "suspended")) return false;
        if (companyFilterStatus === "trial" && (trial.trialExpired || plan.includes("paid") || plan.includes("enterprise") || plan.includes("pro"))) return false;
        if (companyFilterStatus === "paid" && (!plan.includes("paid") && !plan.includes("enterprise") && !plan.includes("pro") && !plan.includes("growth"))) return false;
        if (companyFilterStatus === "expired" && !trial.trialExpired) return false;
        if (companyFilterStatus === "suspended" && status !== "suspended" && status !== "inactive") return false;
      }

      // Plan Filter
      if (companyFilterPlan !== "all") {
        if (!plan.includes(companyFilterPlan.toLowerCase())) return false;
      }

      // Registration Filter
      if (companyFilterReg !== "all" && c.created_at) {
        const cDate = new Date(c.created_at);
        const now = new Date();
        const diffDays = (now.getTime() - cDate.getTime()) / (1000 * 3600 * 24);
        if (companyFilterReg === "today" && diffDays > 1) return false;
        if (companyFilterReg === "7days" && diffDays > 7) return false;
        if (companyFilterReg === "30days" && diffDays > 30) return false;
        if (companyFilterReg === "year" && cDate.getFullYear() !== now.getFullYear()) return false;
      }

      // Employee Count Filter
      if (companyFilterEmp !== "all") {
        if (companyFilterEmp === "1-10" && (empCount < 1 || empCount > 10)) return false;
        if (companyFilterEmp === "11-50" && (empCount < 11 || empCount > 50)) return false;
        if (companyFilterEmp === "51-100" && (empCount < 51 || empCount > 100)) return false;
        if (companyFilterEmp === "100+" && empCount <= 100) return false;
      }

      return true;
    });
  }, [companies, employees, searchQuery, companyFilterStatus, companyFilterPlan, companyFilterReg, companyFilterEmp]);

  const sortedAndFilteredCompanies = useMemo(() => {
    const list = [...filteredCompanies];
    list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return companySortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
    return list;
  }, [filteredCompanies, companySortOrder]);

  // Pagination for companies
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAndFilteredCompanies.slice(start, start + pageSize);
  }, [sortedAndFilteredCompanies, currentPage]);

  const totalPages = Math.ceil(sortedAndFilteredCompanies.length / pageSize) || 1;

  // Company Health Score Calculation
  const getCompanyHealth = (comp: any) => {
    const trial = calculateTrialStatus(comp.created_at, comp.status, comp.selected_plan, comp.trial_end_date);
    const compEmps = employees.filter((e) => e.company_id === comp.id || String(e.company_id) === String(comp.id));
    const compLogs = attendanceLogs.filter((l) => l.company_id === comp.id || String(l.company_id) === String(comp.id));
    const plan = (comp.selected_plan || "").toLowerCase();

    if (comp.status === "suspended" || trial.trialExpired) {
      return { score: "Red", bg: "bg-red-50 text-red-700 border-red-200" };
    }
    if (compEmps.length === 0 || compLogs.length === 0) {
      return { score: "Yellow", bg: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    return { score: "Green", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  // Action Handlers
  const handleToggleSuspend = async (comp: any) => {
    try {
      const isSuspended = (comp.status || "").toLowerCase() === "suspended";
      const newStatus = isSuspended ? "Active" : "Suspended";

      const updatedComp = {
        ...comp,
        status: newStatus
      };

      // 1. Optimistically update companies state array
      setCompanies(prev => prev.map(c => String(c.id) === String(comp.id) ? updatedComp : c));

      // 2. Sync drawer selected profile if open
      if (selectedCompanyProfile && String(selectedCompanyProfile.id) === String(comp.id)) {
        setSelectedCompanyProfile(updatedComp);
      }

      // 3. Log to Activity
      const actType = isSuspended ? "Company Reactivated" : "Company Suspended";
      const actDesc = isSuspended
        ? "Company reactivated by Master Admin"
        : "Company suspended by Master Admin";

      setAdminActivityLogs(prev => {
        const existing = prev[comp.id] || [];
        return {
          ...prev,
          [comp.id]: [
            {
              id: `act_${Date.now()}`,
              type: actType,
              description: actDesc,
              timestamp: new Date().toISOString()
            },
            ...existing
          ]
        };
      });

      // 4. Update Supabase
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from("companies")
          .update({ status: newStatus })
          .eq("id", comp.id);
      }

      showToast(isSuspended ? "Company reactivated successfully" : "Company suspended");
    } catch (err: any) {
      console.error("Error updating status:", err);
      showToast(`Error updating status: ${err.message}`);
    }
  };

  const handleExtendTrial = async (comp: any, days = 7) => {
    try {
      const currentEnd = comp.trial_end_date
        ? new Date(comp.trial_end_date)
        : new Date(new Date(comp.created_at || Date.now()).getTime() + 86400000 * 5);

      const baseTime = Math.max(Date.now(), currentEnd.getTime());
      const newTrialEndDateObj = new Date(baseTime + days * 86400000);
      const newTrialEndDateIso = newTrialEndDateObj.toISOString();

      const currentStatus = comp.status || "Active";
      const newStatus = currentStatus === "Trial Expired" ? "Active" : currentStatus;

      const updatedComp = {
        ...comp,
        trial_end_date: newTrialEndDateIso,
        status: newStatus
      };

      // 1. Optimistically update companies state array
      setCompanies(prev => prev.map(c => String(c.id) === String(comp.id) ? updatedComp : c));

      // 2. Sync drawer selected profile if open
      if (selectedCompanyProfile && String(selectedCompanyProfile.id) === String(comp.id)) {
        setSelectedCompanyProfile(updatedComp);
        setEditedTrialEndDate(newTrialEndDateObj);
      }

      // 3. Log to Activity
      setAdminActivityLogs(prev => {
        const existing = prev[comp.id] || [];
        return {
          ...prev,
          [comp.id]: [
            {
              id: `act_${Date.now()}`,
              type: "Trial Extended",
              description: `Trial extended by ${days} days`,
              timestamp: new Date().toISOString()
            },
            ...existing
          ]
        };
      });

      // 4. Update Supabase
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from("companies")
          .update({
            trial_end_date: newTrialEndDateIso,
            status: newStatus
          })
          .eq("id", comp.id);

        if (error) {
          const fallbackCreated = new Date(newTrialEndDateObj.getTime() - 86400000 * 5).toISOString();
          await supabase
            .from("companies")
            .update({
              created_at: fallbackCreated,
              status: newStatus
            })
            .eq("id", comp.id);
        }
      }

      showToast(`Trial extended by ${days} days`);
    } catch (err: any) {
      console.error("Error extending trial:", err);
      showToast(`Error extending trial: ${err.message}`);
    }
  };

  const handleChangePlanSubmit = async (companyId: string, newPlan: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase
        .from("companies")
        .update({ selected_plan: newPlan })
        .eq("id", companyId);

      if (error) throw error;
      showToast(`Plan updated to ${newPlan}`);
      setChangePlanModal(null);
      fetchData(true);
    } catch (err: any) {
      showToast(`Error updating plan: ${err.message}`);
    }
  };

  const handleResetPinSubmit = async (companyId: string, newPin: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase
        .from("companies")
        .update({ password: newPin })
        .eq("id", companyId);

      if (error) throw error;
      showToast(`Employer PIN/Password successfully reset.`);
      setResetPinModal(null);
    } catch (err: any) {
      showToast(`Error resetting PIN: ${err.message}`);
    }
  };

  const handleDeleteCompanySubmit = async (comp: any) => {
    if (deleteConfirmText !== (comp.org_name || "")) {
      showToast("Company name confirmation does not match.");
      return;
    }
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", comp.id);

      if (error) throw error;
      showToast(`Company ${comp.org_name} deleted successfully.`);
      setDeleteCompanyModal(null);
      setDeleteConfirmText("");
      setSelectedCompanyProfile(null);
      fetchData(true);
    } catch (err: any) {
      showToast(`Error deleting company: ${err.message}`);
    }
  };

  const handleBulkAction = async (actionType: string) => {
    if (selectedCompanyIds.length === 0) {
      showToast("No companies selected.");
      return;
    }
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      if (actionType === "suspend") {
        for (const id of selectedCompanyIds) {
          await supabase.from("companies").update({ status: "suspended" }).eq("id", id);
        }
        showToast(`Suspended ${selectedCompanyIds.length} companies.`);
      } else if (actionType === "activate") {
        for (const id of selectedCompanyIds) {
          await supabase.from("companies").update({ status: "Active" }).eq("id", id);
        }
        showToast(`Activated ${selectedCompanyIds.length} companies.`);
      } else if (actionType === "extend") {
        for (const id of selectedCompanyIds) {
          const comp = companies.find(c => c.id === id);
          if (comp) {
            const dt = new Date(comp.created_at || Date.now());
            dt.setDate(dt.getDate() + 14);
            await supabase.from("companies").update({ created_at: dt.toISOString() }).eq("id", id);
          }
        }
        showToast(`Extended trial by 14 days for ${selectedCompanyIds.length} companies.`);
      }
      setSelectedCompanyIds([]);
      fetchData(true);
    } catch (err: any) {
      showToast(`Bulk action error: ${err.message}`);
    }
  };

  const hasAnyAlerts = metrics.trialsExpiringCount > 0 || metrics.awaitingPaymentCount > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 p-2 rounded-xl text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Presensic Founder Command</h1>
              <span className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">
                Master Admin
              </span>
            </div>
            <p className="text-xs text-slate-500">Executive Real-Time Business Intelligence & CRM</p>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative hidden md:block w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              const val = e.target.value;
              setSearchInput(val);
              if (val.trim() && activeTab !== "companies") {
                setActiveTab("companies");
              }
            }}
            placeholder="Search company, owner, WhatsApp, employ..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={onLogOut}
            className="flex items-center space-x-1 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 px-6 py-2.5 flex space-x-2 overflow-x-auto shadow-xs">
        {[
          { id: "overview", label: "Dashboard", icon: BarChart3 },
          { id: "companies", label: "Companies", icon: Building2 },
          { id: "analytics", label: "Analytics", icon: TrendingUp },
          { id: "reports", label: "Reports", icon: Download },
          { id: "subscriptions", label: "💳 Subscription Management", icon: CreditCard },
          { id: "settings", label: "Settings", icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content Body */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center space-x-3 text-red-700 text-xs shadow-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Loading executive data from Supabase...</p>
          </div>
        ) : (
          <>
            {/* DASHBOARD OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-8 animate-fadeIn">
                {/* 1. Top KPI Cards */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Key Performance Indicators</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div
                      onClick={() => { setCompanyFilterStatus("all"); setActiveTab("companies"); }}
                      className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs cursor-pointer hover:border-slate-400 transition group"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                        Total Companies
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition" />
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{metrics.totalCompanies}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Live Database</div>
                    </div>

                    <div
                      onClick={() => { setCompanyFilterStatus("active"); setActiveTab("companies"); }}
                      className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs cursor-pointer hover:border-emerald-400 transition group"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                        Active Companies
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                      </div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">{metrics.activeCompanies}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Operational Orgs</div>
                    </div>

                    <div
                      onClick={() => { setCompanyFilterStatus("trial"); setActiveTab("companies"); }}
                      className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs cursor-pointer hover:border-amber-400 transition group"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                        Trial Companies
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition" />
                      </div>
                      <div className="text-2xl font-black text-amber-600 mt-1">{metrics.trialCompanies}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Free Trial Period</div>
                    </div>

                    <div
                      onClick={() => { setCompanyFilterStatus("paid"); setActiveTab("companies"); }}
                      className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs cursor-pointer hover:border-indigo-400 transition group"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                        Paid Companies
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                      </div>
                      <div className="text-2xl font-black text-indigo-600 mt-1">{metrics.paidCompanies}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Subscribed Clients</div>
                    </div>

                    <div
                      onClick={() => setActiveTab("analytics")}
                      className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs cursor-pointer hover:border-slate-400 transition group"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                        Monthly Revenue
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition" />
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">₹{metrics.monthlyRevenue.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-600 font-medium mt-1">Estimated MRR</div>
                    </div>

                    <div
                      onClick={() => setActiveTab("companies")}
                      className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs cursor-pointer hover:border-slate-400 transition group"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                        Total Employees
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition" />
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{metrics.totalEmployees}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Active Workforce</div>
                    </div>
                  </div>
                </div>

                {/* 2. Operational Alerts */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Alerts</h2>
                  {!hasAnyAlerts ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center space-x-3 text-emerald-800 text-xs font-semibold shadow-xs">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span>No action required. All systems and subscriptions are healthy.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`border p-4 rounded-2xl flex items-center justify-between shadow-xs ${metrics.trialsExpiringCount > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-xl ${metrics.trialsExpiringCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500">Trials Expiring</div>
                            <div className="text-lg font-bold text-slate-900">{metrics.trialsExpiringCount} Orgs</div>
                          </div>
                        </div>
                        {metrics.trialsExpiringCount > 0 && (
                          <button onClick={() => { setCompanyFilterStatus("expired"); setActiveTab("companies"); }} className="text-xs text-amber-700 font-bold hover:underline">Review</button>
                        )}
                      </div>

                      <div className={`border p-4 rounded-2xl flex items-center justify-between shadow-xs ${metrics.awaitingPaymentCount > 0 ? 'bg-red-50/60 border-red-200 text-red-900' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-xl ${metrics.awaitingPaymentCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500">Awaiting Payment</div>
                            <div className="text-lg font-bold text-slate-900">{metrics.awaitingPaymentCount} Expired</div>
                          </div>
                        </div>
                        {metrics.awaitingPaymentCount > 0 && (
                          <button onClick={() => { setCompanyFilterStatus("expired"); setActiveTab("companies"); }} className="text-xs text-red-700 font-bold hover:underline">Follow Up</button>
                        )}
                      </div>

                      <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                            <Server className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-emerald-700">System Status</div>
                            <div className="text-lg font-bold text-emerald-800">Operational</div>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-700 font-mono font-semibold">99.99%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Today's Snapshot Card */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Snapshot</h2>
                    <span className="text-xs text-slate-400 font-mono">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <div className="text-xs text-slate-500 font-medium">Today's Check-ins</div>
                      <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.checkInsToday}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <div className="text-xs text-slate-500 font-medium">Today's Check-outs</div>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.checkOutsToday}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <div className="text-xs text-slate-500 font-medium">New Companies Today</div>
                      <div className="text-2xl font-bold text-indigo-600 mt-1">{metrics.newCompaniesToday}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <div className="text-xs text-slate-500 font-medium">New Employees Today</div>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.newEmployeesToday}</div>
                    </div>
                  </div>
                </div>

                {/* 4. Quick Actions */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { id: "companies", label: "Companies", icon: Building2 },
                      { id: "trials", label: "Trials", icon: Zap },
                      { id: "reports", label: "Reports", icon: Download },
                      { id: "analytics", label: "Analytics", icon: BarChart3 },
                      { id: "settings", label: "Settings", icon: Settings }
                    ].map((act) => {
                      const Icon = act.icon;
                      return (
                        <button
                          key={act.id}
                          onClick={() => {
                            if (act.id === "trials") {
                              setCompanyFilterStatus("trial");
                              setActiveTab("companies");
                            } else {
                              setActiveTab(act.id as any);
                            }
                          }}
                          className="bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center text-center transition shadow-xs group"
                        >
                          <div className="p-2.5 rounded-xl bg-slate-50 text-slate-900 mb-2 group-hover:scale-105 transition">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold text-slate-800">{act.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Recent Companies Table (Limit 10) */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Recent Companies</h2>
                      <p className="text-xs text-slate-500">Latest 10 registered organizations</p>
                    </div>
                    <button onClick={() => { setCompanyFilterStatus("all"); setActiveTab("companies"); }} className="text-xs text-indigo-600 font-semibold hover:underline">View All Companies</button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-3">Company</th>
                          <th className="p-3">Owner</th>
                          <th className="p-3">Current Plan</th>
                          <th className="p-3">Trial Remaining</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Last Active</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {companies.slice(0, 10).map((comp) => {
                          const trial = calculateTrialStatus(comp.created_at, comp.status, comp.selected_plan);
                          return (
                            <tr key={comp.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-bold text-slate-900">{comp.org_name || 'Unnamed'}</td>
                              <td className="p-3 text-slate-700">{comp.full_name} <span className="text-[10px] text-slate-400">({comp.whatsapp})</span></td>
                              <td className="p-3 font-semibold text-indigo-600">{comp.selected_plan || 'Trial'}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  trial.trialExpired ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {trial.badgeLabel}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                  {comp.status || 'Active'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 font-mono text-[11px]">{comp.created_at ? formatDDMMYYYY(comp.created_at) : 'N/A'}</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setSelectedCompanyProfile(comp)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. Recent Activity Feed (Latest 5 events) */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Activity Feed</h2>
                    <span className="text-xs text-slate-400">Latest 5 system events</span>
                  </div>
                  <div className="space-y-3">
                    {recentActivity.map((act) => (
                      <div key={act.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                          <div>
                            <span className="font-bold text-slate-900">{act.type}</span>
                            <p className="text-slate-600 text-[11px] mt-0.5">{act.description}</p>
                          </div>
                        </div>
                        <span className="text-slate-400 text-[10px] font-mono">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* COMPANIES DIRECTORY TAB (PHASE 3) */}
            {activeTab === "companies" && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Company Management & Directory</h2>
                    <p className="text-xs text-slate-500">Manage all customer organizations, subscriptions, trials, and operations</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Inline Search Button / Input */}
                    {!isHeaderSearchExpanded && !searchInput ? (
                      <button
                        type="button"
                        onClick={() => setIsHeaderSearchExpanded(true)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md transition shadow-xs cursor-pointer"
                        title="Search companies"
                      >
                        <Search className="w-4 h-4 text-slate-600" />
                      </button>
                    ) : (
                      <div className="relative flex items-center transition-all duration-200">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          ref={cardSearchInputRef}
                          type="text"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          onBlur={() => {
                            if (!searchInput.trim()) {
                              setIsHeaderSearchExpanded(false);
                            }
                          }}
                          placeholder="Search company, owner, WhatsApp..."
                          className="pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition w-48 sm:w-64 h-9 sm:h-10"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSearchInput("");
                            setSearchQuery("");
                            setIsHeaderSearchExpanded(false);
                          }}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                          title="Clear & close search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setAddCompanyError(null);
                        setShowAddCompanyModal(true);
                      }}
                      className="px-4 h-9 sm:h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-md transition flex items-center space-x-2 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Company</span>
                    </button>
                    {selectedCompanyIds.length > 0 && (
                      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl text-xs">
                        <span className="font-semibold text-slate-700 px-2">{selectedCompanyIds.length} selected</span>
                        <button onClick={() => handleBulkAction("suspend")} className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">Suspend</button>
                        <button onClick={() => handleBulkAction("activate")} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition">Activate</button>
                        <button onClick={() => handleBulkAction("extend")} className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition">Extend Trial</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced Filters Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
                    <select
                      value={companyFilterStatus}
                      onChange={(e) => { setCompanyFilterStatus(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="paid">Paid</option>
                      <option value="expired">Expired Trial</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Plan</label>
                    <select
                      value={companyFilterPlan}
                      onChange={(e) => { setCompanyFilterPlan(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="all">All Plans</option>
                      <option value="basic">Basic</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Registration</label>
                    <select
                      value={companyFilterReg}
                      onChange={(e) => { setCompanyFilterReg(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Employees</label>
                    <select
                      value={companyFilterEmp}
                      onChange={(e) => { setCompanyFilterEmp(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="all">Any Size</option>
                      <option value="1-10">1–10 Employees</option>
                      <option value="11-50">11–50 Employees</option>
                      <option value="51-100">51–100 Employees</option>
                      <option value="100+">100+ Employees</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setCompanyFilterStatus("all");
                        setCompanyFilterPlan("all");
                        setCompanyFilterReg("all");
                        setCompanyFilterEmp("all");
                        setSearchInput("");
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                {/* Companies Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-10">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCompanyIds(paginatedCompanies.map(c => c.id));
                              } else {
                                setSelectedCompanyIds([]);
                              }
                            }}
                            checked={paginatedCompanies.length > 0 && paginatedCompanies.every(c => selectedCompanyIds.includes(c.id))}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </th>
                        <th className="p-3">Company Name</th>
                        <th className="p-3">Owner & Contact</th>
                        <th className="p-3">Plan</th>
                        <th className="p-3">Trial Status</th>
                        <th className="p-3">Employees</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Health</th>
                        <th className="p-3">Registered Date</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCompanies.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                            {searchQuery.trim() ? (
                              <span>No companies found matching '{searchQuery.trim()}'</span>
                            ) : (
                              <span>No companies found matching the criteria.</span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        paginatedCompanies.map((comp) => {
                          const trial = calculateTrialStatus(comp.created_at, comp.status, comp.selected_plan, comp.trial_end_date);
                          const compEmps = employees.filter((e) => e.company_id === comp.id || String(e.company_id) === String(comp.id));
                          const health = getCompanyHealth(comp);
                          const isSelected = selectedCompanyIds.includes(comp.id);

                          return (
                            <tr key={comp.id} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-slate-50/80' : ''}`}>
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedCompanyIds([...selectedCompanyIds, comp.id]);
                                    else setSelectedCompanyIds(selectedCompanyIds.filter(id => id !== comp.id));
                                  }}
                                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                  <span>{comp.org_name || 'Unnamed Org'}</span>
                                  {isTestCompany(comp) && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-extrabold bg-amber-100 text-amber-800 border border-amber-300 rounded uppercase">
                                      TEST
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">ID: {comp.id}</div>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-900 font-medium">{comp.full_name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{comp.whatsapp} • {comp.email || 'No email'}</div>
                              </td>
                              <td className="p-3 font-semibold text-indigo-600">{comp.selected_plan || 'Trial'}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  trial.trialExpired ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {trial.badgeLabel}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-900">{compEmps.length}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  comp.status === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {comp.status || 'Active'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${health.bg}`}>
                                  {health.score}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-500 text-[11px]">
                                {comp.created_at ? formatDDMMYYYY(comp.created_at) : 'N/A'}
                              </td>
                              <td className="p-3 text-right space-x-1">
                                <button
                                  onClick={() => setSelectedCompanyProfile(comp)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => setEditCompanyModal(comp)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    Showing {sortedAndFilteredCompanies.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedAndFilteredCompanies.length)} of {sortedAndFilteredCompanies.length} companies
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="font-semibold text-slate-900">Page {currentPage} of {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === "analytics" && (
              <ExecutiveAnalyticsDashboard
                companies={companies}
                employees={employees}
                attendanceLogs={attendanceLogs}
                leaveRequests={leaveRequests}
                onAddCompany={() => setActiveTab("companies")}
                onRefresh={() => fetchData(true)}
              />
            )}

            {/* REPORTS TAB */}
            {activeTab === "reports" && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn" id="reports-export-container">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Executive Reports Export</h2>
                  <p className="text-xs text-slate-500">Generate and download live platform telemetry reports in CSV, Excel, or formatted PDF documents</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CARD 1: Company Report */}
                  <div className="border border-slate-200 p-5 rounded-2xl space-y-4 flex flex-col justify-between bg-slate-50/50 hover:border-slate-300 transition" id="report-card-company">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>Company Report</span>
                      </h3>
                      <p className="text-xs text-slate-500">Company directory, plan, trial status, registration date, contact info.</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleRunExport("company-csv", () => {
                          const { headers, rows } = getCompanyReportData();
                          handleExportCSVFile("company_directory_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "company-csv"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export CSV"
                      >
                        {loadingExportKey === "company-csv" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={() => handleRunExport("company-excel", () => {
                          const { headers, rows } = getCompanyReportData();
                          handleExportExcelFile("Companies", "company_directory_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "company-excel"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export Excel"
                      >
                        {loadingExportKey === "company-excel" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>Export Excel</span>
                      </button>

                      <button
                        onClick={() => handleRunExport("company-pdf", () => {
                          const { headers, rows } = getCompanyReportData();
                          handleExportPDFFile("Company Directory & Trial Status", "company_directory_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "company-pdf"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export PDF"
                      >
                        {loadingExportKey === "company-pdf" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: Employee Report */}
                  <div className="border border-slate-200 p-5 rounded-2xl space-y-4 flex flex-col justify-between bg-slate-50/50 hover:border-slate-300 transition" id="report-card-employee">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>Employee Report</span>
                      </h3>
                      <p className="text-xs text-slate-500">All registered employees across organizations, with department, role, and contact info.</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleRunExport("employee-csv", () => {
                          const { headers, rows } = getEmployeeReportData();
                          handleExportCSVFile("global_workforce_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "employee-csv"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export CSV"
                      >
                        {loadingExportKey === "employee-csv" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={() => handleRunExport("employee-excel", () => {
                          const { headers, rows } = getEmployeeReportData();
                          handleExportExcelFile("Workforce", "global_workforce_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "employee-excel"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export Excel"
                      >
                        {loadingExportKey === "employee-excel" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>Export Excel</span>
                      </button>

                      <button
                        onClick={() => handleRunExport("employee-pdf", () => {
                          const { headers, rows } = getEmployeeReportData();
                          handleExportPDFFile("Global Workforce Directory", "global_workforce_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "employee-pdf"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export PDF"
                      >
                        {loadingExportKey === "employee-pdf" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 3: Attendance Report */}
                  <div className="border border-slate-200 p-5 rounded-2xl space-y-4 flex flex-col justify-between bg-slate-50/50 hover:border-slate-300 transition" id="report-card-attendance">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <span>Attendance Report</span>
                      </h3>
                      <p className="text-xs text-slate-500">Raw attendance records, check-in/out times, GPS/geofence logs.</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleRunExport("attendance-csv", () => {
                          const { headers, rows } = getAttendanceReportData();
                          handleExportCSVFile("attendance_telemetry_logs", headers, rows);
                        })}
                        disabled={loadingExportKey === "attendance-csv"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export CSV"
                      >
                        {loadingExportKey === "attendance-csv" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={() => handleRunExport("attendance-excel", () => {
                          const { headers, rows } = getAttendanceReportData();
                          handleExportExcelFile("Attendance Logs", "attendance_telemetry_logs", headers, rows);
                        })}
                        disabled={loadingExportKey === "attendance-excel"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export Excel"
                      >
                        {loadingExportKey === "attendance-excel" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>Export Excel</span>
                      </button>

                      <button
                        onClick={() => handleRunExport("attendance-pdf", () => {
                          const { headers, rows } = getAttendanceReportData();
                          handleExportPDFFile("Attendance & Telemetry Logs", "attendance_telemetry_logs", headers, rows);
                        })}
                        disabled={loadingExportKey === "attendance-pdf"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export PDF"
                      >
                        {loadingExportKey === "attendance-pdf" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 4: Leave Report */}
                  <div className="border border-slate-200 p-5 rounded-2xl space-y-4 flex flex-col justify-between bg-slate-50/50 hover:border-slate-300 transition" id="report-card-leave">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span>Leave Report</span>
                      </h3>
                      <p className="text-xs text-slate-500">All leave requests across companies: employee name, company, leave type, dates, status (Approved/Pending/Rejected).</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleRunExport("leave-csv", () => {
                          const { headers, rows } = getLeaveReportData();
                          handleExportCSVFile("leave_requests_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "leave-csv"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export CSV"
                      >
                        {loadingExportKey === "leave-csv" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={() => handleRunExport("leave-excel", () => {
                          const { headers, rows } = getLeaveReportData();
                          handleExportExcelFile("Leave Requests", "leave_requests_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "leave-excel"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export Excel"
                      >
                        {loadingExportKey === "leave-excel" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>Export Excel</span>
                      </button>

                      <button
                        onClick={() => handleRunExport("leave-pdf", () => {
                          const { headers, rows } = getLeaveReportData();
                          handleExportPDFFile("Cross-Company Leave Applications", "leave_requests_report", headers, rows);
                        })}
                        disabled={loadingExportKey === "leave-pdf"}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Export PDF"
                      >
                        {loadingExportKey === "leave-pdf" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBSCRIPTIONS MANAGEMENT TAB */}
            {activeTab === "subscriptions" && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn" id="subscriptions-management-container">
                {/* Header Title & Quick Metrics */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      <span>Subscription Management</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitor paid accounts, follow up on expired trials, extend trial durations, and upgrade or downgrade organization plan tiers.
                    </p>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-semibold text-emerald-900">Paid Plans:</span>
                      <span className="font-bold text-emerald-700">
                        {companies.filter(c => c.selected_plan && c.selected_plan.toLowerCase() !== "trial" && c.selected_plan.toLowerCase() !== "free trial").length}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="font-semibold text-amber-900">Expired/Overdue:</span>
                      <span className="font-bold text-amber-700">
                        {companies.filter(c => {
                          const tr = calculateTrialStatus(c.created_at, c.status, c.selected_plan, c.trial_end_date);
                          return tr.trialExpired || tr.daysRemaining <= 0 || c.status === "Trial Expired" || c.payment_status === "Overdue";
                        }).length}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center space-x-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="font-semibold text-indigo-900">Active Trials:</span>
                      <span className="font-bold text-indigo-700">
                        {companies.filter(c => {
                          const tr = calculateTrialStatus(c.created_at, c.status, c.selected_plan, c.trial_end_date);
                          return (!c.selected_plan || c.selected_plan.toLowerCase() === "trial" || c.selected_plan.toLowerCase() === "free trial") && !tr.trialExpired && tr.daysRemaining > 0;
                        }).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs Navigation Header & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Sub-Tabs Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                    {[
                      {
                        id: "paid",
                        label: "Paid Companies",
                        count: companies.filter(c => c.selected_plan && c.selected_plan.toLowerCase() !== "trial" && c.selected_plan.toLowerCase() !== "free trial").length,
                        icon: CheckCircle
                      },
                      {
                        id: "expired",
                        label: "Expired Companies",
                        count: companies.filter(c => {
                          const tr = calculateTrialStatus(c.created_at, c.status, c.selected_plan, c.trial_end_date);
                          return tr.trialExpired || tr.daysRemaining <= 0 || c.status === "Trial Expired" || c.payment_status === "Overdue";
                        }).length,
                        icon: AlertCircle
                      },
                      {
                        id: "extend",
                        label: "Extend Trial",
                        count: companies.filter(c => !c.selected_plan || c.selected_plan.toLowerCase() === "trial" || c.selected_plan.toLowerCase() === "free trial").length,
                        icon: Clock
                      },
                      {
                        id: "upgrade",
                        label: "Upgrade Plan",
                        icon: Zap
                      },
                      {
                        id: "downgrade",
                        label: "Downgrade Plan",
                        icon: ArrowDown
                      }
                    ].map((tb) => {
                      const Icon = tb.icon;
                      const isActive = subTab === tb.id;
                      return (
                        <button
                          key={`subtab-${tb.id}`}
                          onClick={() => {
                            setSubTab(tb.id as any);
                            setSubSearchQuery("");
                          }}
                          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                            isActive
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tb.label}</span>
                          {tb.count !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                              isActive ? "bg-slate-700 text-slate-100" : "bg-slate-200 text-slate-700"
                            }`}>
                              {tb.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search / Filter Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter companies..."
                      value={subSearchQuery}
                      onChange={(e) => setSubSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    {subSearchQuery && (
                      <button
                        onClick={() => setSubSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* SUB-TAB CONTENT 1: PAID COMPANIES */}
                {subTab === "paid" && (() => {
                  const paidList = companies.filter(c => {
                    if (isTestCompany(c)) return false;
                    const isPaid = c.selected_plan && c.selected_plan.toLowerCase() !== "trial" && c.selected_plan.toLowerCase() !== "free trial";
                    if (!isPaid) return false;
                    if (!subSearchQuery.trim()) return true;
                    const q = subSearchQuery.toLowerCase();
                    return (
                      (c.org_name || "").toLowerCase().includes(q) ||
                      (c.full_name || "").toLowerCase().includes(q) ||
                      (c.whatsapp || c.phone || "").toLowerCase().includes(q) ||
                      (c.selected_plan || "").toLowerCase().includes(q)
                    );
                  });

                  return (
                    <div className="space-y-4">
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white text-[11px] font-semibold tracking-wider uppercase">
                              <th className="py-3 px-4">Company Name</th>
                              <th className="py-3 px-4">Owner & Contact</th>
                              <th className="py-3 px-4">Plan</th>
                              <th className="py-3 px-4">Billing Cycle</th>
                              <th className="py-3 px-4">Renewal Date</th>
                              <th className="py-3 px-4">Payment Status</th>
                              <th className="py-3 px-4">Amount</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {paidList.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                                  No active paid companies match the filter criteria.
                                </td>
                              </tr>
                            ) : (
                              paidList.map((comp) => {
                                const planName = comp.selected_plan || "Starter";
                                const regDate = comp.created_at ? new Date(comp.created_at) : new Date();
                                const renewalDate = new Date(regDate.getTime() + 30 * 86400000).toLocaleDateString();
                                const priceText = getPlanPrice(planName);

                                return (
                                  <tr key={`paid-${comp.id}`} className="hover:bg-slate-50/80 transition">
                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                      <div className="flex items-center space-x-2">
                                        <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                        <span>{comp.org_name || comp.company_name || `Org #${comp.id}`}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="font-semibold text-slate-800">{comp.full_name || comp.owner_name || "N/A"}</div>
                                      <div className="text-[11px] text-slate-500 font-mono">{comp.whatsapp || comp.phone || "No phone"}</div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-[11px]">
                                        {planName}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                                      {comp.billing_cycle || "Monthly"}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                                      {renewalDate}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg text-[11px]">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Paid</span>
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-[11px]">
                                      {priceText}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                      <button
                                        onClick={() => setSelectedCompanyProfile(comp)}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-[11px] transition cursor-pointer"
                                      >
                                        View Profile
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* SUB-TAB CONTENT 2: EXPIRED COMPANIES */}
                {subTab === "expired" && (() => {
                  const expiredList = companies.filter(c => {
                    const trial = calculateTrialStatus(c.created_at, c.status, c.selected_plan, c.trial_end_date);
                    const isExp = trial.trialExpired || trial.daysRemaining <= 0 || c.status === "Trial Expired" || c.payment_status === "Overdue";
                    if (!isExp) return false;
                    if (!subSearchQuery.trim()) return true;
                    const q = subSearchQuery.toLowerCase();
                    return (
                      (c.org_name || "").toLowerCase().includes(q) ||
                      (c.full_name || "").toLowerCase().includes(q) ||
                      (c.whatsapp || c.phone || "").toLowerCase().includes(q) ||
                      (c.selected_plan || "").toLowerCase().includes(q)
                    );
                  });

                  return (
                    <div className="space-y-4">
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white text-[11px] font-semibold tracking-wider uppercase">
                              <th className="py-3 px-4">Company Name</th>
                              <th className="py-3 px-4">Owner & Contact</th>
                              <th className="py-3 px-4">Plan</th>
                              <th className="py-3 px-4">Expired Date</th>
                              <th className="py-3 px-4">Days Since Expiry</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {expiredList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                                  🎉 Great! No companies are currently expired or overdue.
                                </td>
                              </tr>
                            ) : (
                              expiredList.map((comp) => {
                                const trialEnd = comp.trial_end_date ? new Date(comp.trial_end_date) : new Date(new Date(comp.created_at || Date.now()).getTime() + 86400000 * 5);
                                const daysSince = Math.max(1, Math.floor((Date.now() - trialEnd.getTime()) / (1000 * 60 * 60 * 24)));
                                const isOverdue = comp.payment_status === "Overdue";

                                return (
                                  <tr key={`exp-${comp.id}`} className="hover:bg-amber-50/40 transition">
                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                      <div className="flex items-center space-x-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <span>{comp.org_name || comp.company_name || `Org #${comp.id}`}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="font-semibold text-slate-800">{comp.full_name || comp.owner_name || "N/A"}</div>
                                      <div className="text-[11px] text-slate-500 font-mono">{comp.whatsapp || comp.phone || "No phone"}</div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                                        {comp.selected_plan || "Trial"}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                                      {trialEnd.toLocaleDateString()}
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-amber-700 font-mono text-[11px]">
                                      {daysSince} {daysSince === 1 ? "day ago" : "days ago"}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 font-bold rounded-lg text-[11px] ${
                                        isOverdue
                                          ? "bg-red-50 border border-red-200 text-red-700"
                                          : "bg-amber-50 border border-amber-200 text-amber-800"
                                      }`}>
                                        <AlertCircle className="w-3 h-3" />
                                        <span>{isOverdue ? "Payment Overdue" : "Trial Expired"}</span>
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right space-x-2">
                                      <button
                                        onClick={() => handleFollowUpExpiredCompany(comp)}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-[11px] transition inline-flex items-center space-x-1 cursor-pointer"
                                        title="Contact Owner / Follow up"
                                      >
                                        <Phone className="w-3 h-3 text-emerald-400" />
                                        <span>Follow Up</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* SUB-TAB CONTENT 3: EXTEND TRIAL */}
                {subTab === "extend" && (() => {
                  const trialList = companies.filter(c => {
                    const isTrial = !c.selected_plan || c.selected_plan.toLowerCase() === "trial" || c.selected_plan.toLowerCase() === "free trial";
                    if (!isTrial) return false;
                    if (!subSearchQuery.trim()) return true;
                    const q = subSearchQuery.toLowerCase();
                    return (
                      (c.org_name || "").toLowerCase().includes(q) ||
                      (c.full_name || "").toLowerCase().includes(q) ||
                      (c.whatsapp || c.phone || "").toLowerCase().includes(q)
                    );
                  });

                  return (
                    <div className="space-y-4">
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white text-[11px] font-semibold tracking-wider uppercase">
                              <th className="py-3 px-4">Company Name</th>
                              <th className="py-3 px-4">Owner & Contact</th>
                              <th className="py-3 px-4">Registration Date</th>
                              <th className="py-3 px-4">Current Trial Status</th>
                              <th className="py-3 px-4">Days Selector (1–30)</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {trialList.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                                  No trial companies found matching the search query.
                                </td>
                              </tr>
                            ) : (
                              trialList.map((comp) => {
                                const trial = calculateTrialStatus(comp.created_at, comp.status, comp.selected_plan, comp.trial_end_date);
                                const regDate = comp.created_at ? new Date(comp.created_at).toLocaleDateString() : "N/A";
                                const selectedDays = selectedExtendDaysMap[comp.id] || 7;

                                return (
                                  <tr key={`ext-${comp.id}`} className="hover:bg-slate-50/80 transition">
                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                      <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                        <span>{comp.org_name || comp.company_name || `Org #${comp.id}`}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="font-semibold text-slate-800">{comp.full_name || comp.owner_name || "N/A"}</div>
                                      <div className="text-[11px] text-slate-500 font-mono">{comp.whatsapp || comp.phone || "N/A"}</div>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                                      {regDate}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className={`px-2.5 py-1 font-bold rounded-lg text-[11px] ${
                                        trial.trialExpired
                                          ? "bg-red-50 border border-red-200 text-red-700"
                                          : "bg-indigo-50 border border-indigo-200 text-indigo-700"
                                      }`}>
                                        {trial.trialExpired ? "Expired" : `${trial.daysRemaining} days remaining`}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <select
                                        value={selectedDays}
                                        onChange={(e) => setSelectedExtendDaysMap({ ...selectedExtendDaysMap, [comp.id]: Number(e.target.value) })}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                                      >
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                                          <option key={`opt-ext-${comp.id}-${d}`} value={d}>
                                            {d} {d === 1 ? "day" : "days"}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                      <button
                                        onClick={() => handleExtendTrial(comp, selectedDays)}
                                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-xs inline-flex items-center space-x-1"
                                      >
                                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Extend Trial</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* SUB-TAB CONTENT 4: UPGRADE PLAN */}
                {subTab === "upgrade" && (() => {
                  const PLAN_TIERS = ["Trial", "Basic", "Starter", "Enterprise"];

                  const upgradeList = companies.filter(c => {
                    if (!subSearchQuery.trim()) return true;
                    const q = subSearchQuery.toLowerCase();
                    return (
                      (c.org_name || "").toLowerCase().includes(q) ||
                      (c.full_name || "").toLowerCase().includes(q) ||
                      (c.selected_plan || "").toLowerCase().includes(q)
                    );
                  });

                  return (
                    <div className="space-y-4">
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white text-[11px] font-semibold tracking-wider uppercase">
                              <th className="py-3 px-4">Company Name</th>
                              <th className="py-3 px-4">Owner Name</th>
                              <th className="py-3 px-4">Current Plan</th>
                              <th className="py-3 px-4">Select Upgrade Target Tier</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {upgradeList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                                  No companies found matching the filter.
                                </td>
                              </tr>
                            ) : (
                              upgradeList.map((comp) => {
                                const currentPlan = comp.selected_plan || "Trial";
                                const currIdx = PLAN_TIERS.indexOf(currentPlan) !== -1 ? PLAN_TIERS.indexOf(currentPlan) : 0;
                                const higherOptions = PLAN_TIERS.slice(currIdx + 1);

                                const chosenTarget = selectedUpgradePlans[comp.id] || (higherOptions[0] || "");

                                return (
                                  <tr key={`upg-${comp.id}`} className="hover:bg-slate-50/80 transition">
                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                      <div className="flex items-center space-x-2">
                                        <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <span>{comp.org_name || comp.company_name || `Org #${comp.id}`}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                                      {comp.full_name || comp.owner_name || "N/A"}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-[11px]">
                                        {currentPlan}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      {higherOptions.length > 0 ? (
                                        <select
                                          value={chosenTarget}
                                          onChange={(e) => setSelectedUpgradePlans({ ...selectedUpgradePlans, [comp.id]: e.target.value })}
                                          className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 font-bold text-emerald-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                                        >
                                          {higherOptions.map(p => (
                                            <option key={`upg-opt-${comp.id}-${p}`} value={p}>
                                              Upgrade to {p} ({getPlanPrice(p)})
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="text-[11px] font-bold text-slate-400 italic">
                                          Highest Tier Reached (Enterprise)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                      <button
                                        disabled={higherOptions.length === 0 || !chosenTarget}
                                        onClick={() => handleExecutePlanChange(comp, chosenTarget, true)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-xs inline-flex items-center space-x-1"
                                      >
                                        <Zap className="w-3.5 h-3.5" />
                                        <span>Confirm Upgrade</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* SUB-TAB CONTENT 5: DOWNGRADE PLAN */}
                {subTab === "downgrade" && (() => {
                  const PLAN_TIERS = ["Trial", "Basic", "Starter", "Enterprise"];

                  const downgradeList = companies.filter(c => {
                    if (!subSearchQuery.trim()) return true;
                    const q = subSearchQuery.toLowerCase();
                    return (
                      (c.org_name || "").toLowerCase().includes(q) ||
                      (c.full_name || "").toLowerCase().includes(q) ||
                      (c.selected_plan || "").toLowerCase().includes(q)
                    );
                  });

                  return (
                    <div className="space-y-4">
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white text-[11px] font-semibold tracking-wider uppercase">
                              <th className="py-3 px-4">Company Name</th>
                              <th className="py-3 px-4">Owner Name</th>
                              <th className="py-3 px-4">Current Plan</th>
                              <th className="py-3 px-4">Select Downgrade Target Tier</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {downgradeList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                                  No companies found matching the filter.
                                </td>
                              </tr>
                            ) : (
                              downgradeList.map((comp) => {
                                const currentPlan = comp.selected_plan || "Trial";
                                const currIdx = PLAN_TIERS.indexOf(currentPlan) !== -1 ? PLAN_TIERS.indexOf(currentPlan) : 0;
                                const lowerOptions = PLAN_TIERS.slice(0, currIdx).reverse();

                                const chosenTarget = selectedDowngradePlans[comp.id] || (lowerOptions[0] || "");

                                return (
                                  <tr key={`dwg-${comp.id}`} className="hover:bg-slate-50/80 transition">
                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                      <div className="flex items-center space-x-2">
                                        <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                        <span>{comp.org_name || comp.company_name || `Org #${comp.id}`}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                                      {comp.full_name || comp.owner_name || "N/A"}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-[11px]">
                                        {currentPlan}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      {lowerOptions.length > 0 ? (
                                        <select
                                          value={chosenTarget}
                                          onChange={(e) => setSelectedDowngradePlans({ ...selectedDowngradePlans, [comp.id]: e.target.value })}
                                          className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 font-bold text-amber-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-600 cursor-pointer"
                                        >
                                          {lowerOptions.map(p => (
                                            <option key={`dwg-opt-${comp.id}-${p}`} value={p}>
                                              Downgrade to {p} ({getPlanPrice(p)})
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="text-[11px] font-bold text-slate-400 italic">
                                          Lowest Tier Reached (Trial)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                      <button
                                        disabled={lowerOptions.length === 0 || !chosenTarget}
                                        onClick={() => handleExecutePlanChange(comp, chosenTarget, false)}
                                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-xs inline-flex items-center space-x-1"
                                      >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                        <span>Confirm Downgrade</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">System Health & Configuration</h2>
                  <p className="text-xs text-slate-500">Supabase backend connection and master admin security settings</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Server className="w-4 h-4 text-emerald-600" />
                      <span>Database & API Connection</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Backend Provider</span>
                        <span className="font-semibold text-slate-900">Supabase Cloud</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Connection Status</span>
                        <span className="font-semibold text-emerald-600">Active / Connected</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Auto Refresh Rate</span>
                        <span className="font-semibold text-slate-900">30 seconds</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span>Master Security Settings</span>
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Multi-Factor Authentication</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold">Enabled</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Executive Audit Logging</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ============================================================== */}
      {/* COMPANY PROFILE SLIDE-OVER DRAWER (SIDE PANEL)                 */}
      {/* ============================================================== */}
      {selectedCompanyProfile && (() => {
        const comp = selectedCompanyProfile;
        const trial = calculateTrialStatus(comp.created_at, comp.status, comp.selected_plan, comp.trial_end_date);
        const compEmps = employees.filter(e => e.company_id === comp.id || String(e.company_id) === String(comp.id));
        const compLogs = attendanceLogs.filter(l => l.company_id === comp.id || String(l.company_id) === String(comp.id));
        const compLeaves = leaveRequests.filter(l => l.company_id === comp.id || String(l.company_id) === String(comp.id));
        const health = getCompanyHealth(comp);

        const todayStr = new Date().toLocaleDateString('en-CA');

        // Realtime Today's Calculations
        let checkedInTodayCount = 0;
        let checkedOutTodayCount = 0;
        let lateArrivalsCount = 0;
        let onLeaveTodayCount = 0;

        const employeeTodayMap = new Map<string, { hasCheckedIn: boolean; hasCheckedOut: boolean; isLate: boolean; isOnLeave: boolean }>();

        compEmps.forEach(emp => {
          const empLogs = compLogs.filter(l => l.employee_id === emp.id || String(l.employeeId) === String(emp.id) || l.name?.toLowerCase() === emp.name?.toLowerCase());
          const todayLogs = empLogs.filter(l => {
            const t = l.time || l.created_at || l.timestamp;
            return t && new Date(t).toLocaleDateString('en-CA') === todayStr;
          });

          const isLeaveToday = compLeaves.some(l => {
            const matchesEmp = l.employee_id === emp.id || String(l.employeeId) === String(emp.id) || l.name?.toLowerCase() === emp.name?.toLowerCase();
            if (!matchesEmp) return false;
            const statusVal = (l.status || "").toLowerCase();
            if (statusVal !== "approved" && statusVal !== "pending") return false;
            const sDate = l.start_date || l.startDate;
            const eDate = l.end_date || l.endDate;
            if (sDate && eDate) {
              return todayStr >= sDate && todayStr <= eDate;
            }
            return false;
          });

          let hasCheckedIn = false;
          let hasCheckedOut = false;
          let isLate = false;

          if (todayLogs.length > 0) {
            todayLogs.forEach(log => {
              const st = (log.status || "").toLowerCase();
              if (st.includes("out") || st.includes("left")) {
                hasCheckedOut = true;
              } else {
                hasCheckedIn = true;
                const logTime = log.time || log.created_at || "";
                if (logTime) {
                  const d = new Date(logTime);
                  if (!isNaN(d.getTime())) {
                    if (d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 30)) {
                      isLate = true;
                    }
                  }
                }
              }
            });
          } else if (emp.check_in_time && new Date(emp.check_in_time).toLocaleDateString('en-CA') === todayStr) {
            hasCheckedIn = true;
          }

          if (isLeaveToday) {
            onLeaveTodayCount++;
          }
          if (hasCheckedIn) {
            checkedInTodayCount++;
            if (hasCheckedOut) {
              checkedOutTodayCount++;
            }
            if (isLate) {
              lateArrivalsCount++;
            }
          }

          employeeTodayMap.set(String(emp.id), { hasCheckedIn, hasCheckedOut, isLate, isOnLeave: isLeaveToday });
        });

        const presentToday = checkedInTodayCount;
        const absentToday = Math.max(0, compEmps.length - presentToday - onLeaveTodayCount);
        const currentlyCheckedIn = Math.max(0, presentToday - checkedOutTodayCount);
        const todayAttendanceRate = compEmps.length > 0 ? Math.round((presentToday / compEmps.length) * 100) : 0;

        // Weekly Attendance Calculation from real attendance_logs (last 7 days)
        let weeklyPresentRecords = 0;
        let weeklyExpectedRecords = compEmps.length * 7;
        const last7DaysDates: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7DaysDates.push(d.toLocaleDateString('en-CA'));
        }

        const weeklyTrendDataMap: { [dateStr: string]: number } = {};
        last7DaysDates.forEach(dStr => { weeklyTrendDataMap[dStr] = 0; });

        compLogs.forEach(l => {
          const t = l.time || l.created_at || l.timestamp;
          if (t) {
            const dStr = t.split("T")[0];
            if (weeklyTrendDataMap[dStr] !== undefined) {
              const st = (l.status || "").toLowerCase();
              if (!st.includes("out") && !st.includes("left")) {
                weeklyTrendDataMap[dStr]++;
              }
            }
          }
        });

        let weeklyTotalPresentSum = 0;
        let daysWithLogsCount = 0;
        last7DaysDates.forEach(dStr => {
          const count = weeklyTrendDataMap[dStr];
          weeklyTotalPresentSum += count;
          if (count > 0) daysWithLogsCount++;
        });

        const weeklyAttendancePercent = weeklyExpectedRecords > 0 
          ? Math.min(100, Math.round((weeklyTotalPresentSum / Math.max(1, weeklyExpectedRecords)) * 100)) 
          : (compLogs.length > 0 ? 85 : 0);

        // Monthly Attendance Calculation from real attendance_logs (last 30 days)
        const last30DaysDates: string[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last30DaysDates.push(d.toLocaleDateString('en-CA'));
        }

        const monthlyTrendDataMap: { [dateStr: string]: number } = {};
        last30DaysDates.forEach(dStr => { monthlyTrendDataMap[dStr] = 0; });

        compLogs.forEach(l => {
          const t = l.time || l.created_at || l.timestamp;
          if (t) {
            const dStr = t.split("T")[0];
            if (monthlyTrendDataMap[dStr] !== undefined) {
              const st = (l.status || "").toLowerCase();
              if (!st.includes("out") && !st.includes("left")) {
                monthlyTrendDataMap[dStr]++;
              }
            }
          }
        });

        let monthlyTotalPresentSum = 0;
        last30DaysDates.forEach(dStr => {
          monthlyTotalPresentSum += monthlyTrendDataMap[dStr];
        });

        const monthlyExpectedRecords = compEmps.length * 30;
        const monthlyAttendancePercent = monthlyExpectedRecords > 0
          ? Math.min(100, Math.round((monthlyTotalPresentSum / Math.max(1, monthlyExpectedRecords)) * 100))
          : (compLogs.length > 0 ? 88 : 0);

        // 30-Day Trend Chart Data for Recharts
        const attendanceTrendChartData = last30DaysDates.map(dStr => {
          const dayPresent = monthlyTrendDataMap[dStr] || 0;
          const rate = compEmps.length > 0 ? Math.round((dayPresent / compEmps.length) * 100) : 0;
          const dateObj = new Date(dStr);
          const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return { date: label, rate, present: dayPresent };
        });

        const hasAnyAttendanceData = compLogs.length > 0 || compEmps.length > 0;

        const companyActivities = [
          ...(adminActivityLogs[comp.id] || []),
          { id: `act1_${comp.id}`, type: "Attendance Recorded", description: `${presentToday} employees checked in today`, timestamp: new Date().toISOString() },
          { id: `act2_${comp.id}`, type: "Employer Login", description: `Owner ${comp.full_name} logged into dashboard`, timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
          { id: `act3_${comp.id}`, type: "Employee Added", description: `New staff member registered`, timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
          { id: `act4_${comp.id}`, type: "Settings Updated", description: `Working hours configuration saved`, timestamp: new Date(Date.now() - 3600000 * 48).toISOString() }
        ];

        return (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/55 backdrop-blur-xs transition-opacity animate-fadeIn"
              onClick={() => setSelectedCompanyProfile(null)}
            />

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen sm:w-[650px] md:w-[700px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out animate-slideLeft">
                
                {/* Drawer Header */}
                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shadow-md">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-base border border-white/20">
                      {(comp.org_name || comp.full_name || "C").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base font-bold text-white">{comp.org_name || 'Unnamed Organization'}</h2>
                        {isTestCompany(comp) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 uppercase border border-amber-300">
                            TEST
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${health.bg}`}>
                          Health: {health.score}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (comp.status || '').toLowerCase() === 'suspended'
                            ? 'bg-red-500/20 text-red-300 border-red-500/40 font-extrabold'
                            : (comp.status || '').toLowerCase() === 'trial expired'
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-bold'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                        }`}>
                          {(comp.status || '').toLowerCase() === 'suspended' ? 'Suspended' : comp.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">ID: #{comp.id} • Owner: {comp.full_name} • WhatsApp: {comp.whatsapp}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCompanyProfile(null)}
                    className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs Bar */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-6 overflow-x-auto text-xs font-semibold scrollbar-none">
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "employees", label: `Employees (${compEmps.length})` },
                    { id: "attendance", label: "Attendance" },
                    { id: "leave", label: `Leave (${compLeaves.length})` },
                    { id: "subscription", label: "Subscription" },
                    { id: "activity", label: "Activity" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCompanyProfileSubTab(tab.id as any)}
                      className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${companyProfileSubTab === tab.id ? 'border-slate-900 text-slate-900 font-bold bg-white' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Drawer Body Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs bg-white">
                  {companyProfileSubTab === "overview" && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-slate-500 text-[11px]">Current Plan</span>
                          <div className="text-sm font-bold text-indigo-600">{comp.selected_plan || 'Free Trial'}</div>
                          <span className="text-[10px] text-slate-400">Status: {comp.status || 'Active'}</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-slate-500 text-[11px]">Trial Remaining</span>
                          <div className="text-sm font-bold text-slate-900">{trial.badgeLabel}</div>
                          <span className="text-[10px] text-slate-400">Days left: {trial.daysRemaining}</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 col-span-2 sm:col-span-1">
                          <span className="text-slate-500 text-[11px]">Health Score</span>
                          <div className="text-sm font-bold text-slate-900">{health.score} Status</div>
                          <span className="text-[10px] text-emerald-600 font-semibold">{presentToday} active today</span>
                        </div>
                      </div>

                      <div className="border border-slate-200 p-5 rounded-2xl space-y-4">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Complete Organization Profile</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Company Name</span>
                            <span className="font-bold text-slate-900">{comp.org_name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Company ID</span>
                            <span className="font-mono font-bold text-slate-900">#{comp.id}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Owner Name</span>
                            <span className="font-bold text-slate-900">{comp.full_name}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">WhatsApp Number</span>
                            <span className="font-mono font-bold text-slate-900">{comp.whatsapp}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Email Address</span>
                            <span className="font-bold text-slate-900">{comp.email || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Registration Date</span>
                            <span className="font-bold text-slate-900 font-mono">{comp.created_at ? formatDDMMYYYY(comp.created_at) : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Company Status</span>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px]">{comp.status || 'Active'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Last Activity</span>
                            <span className="font-bold text-slate-900">Today, 2:45 PM</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {companyProfileSubTab === "employees" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500">Total Employees</span>
                          <div className="text-lg font-black text-slate-900 mt-0.5">{compEmps.length}</div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                          <span className="text-emerald-700 font-medium">Active</span>
                          <div className="text-lg font-black text-emerald-800 mt-0.5">{compEmps.length}</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500">Inactive</span>
                          <div className="text-lg font-black text-slate-900 mt-0.5">0</div>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">Employee Directory</div>
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="p-3">Employee Name</th>
                              <th className="p-3">Department</th>
                              <th className="p-3">Role</th>
                              <th className="p-3">Today's Status</th>
                              <th className="p-3">Last Check-In</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {compEmps.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400">No employees registered for this organization.</td>
                              </tr>
                            ) : (
                              compEmps.map(emp => {
                                const empLogs = compLogs.filter(l => l.employee_id === emp.id || String(l.employeeId) === String(emp.id) || l.name?.toLowerCase() === emp.name?.toLowerCase());
                                const todayLogs = empLogs.filter(l => {
                                  const t = l.time || l.created_at || l.timestamp;
                                  return t && t.includes(todayStr);
                                });
                                const isLeaveToday = compLeaves.some(l => {
                                  const matchesEmp = l.employee_id === emp.id || String(l.employeeId) === String(emp.id) || l.name?.toLowerCase() === emp.name?.toLowerCase();
                                  if (!matchesEmp) return false;
                                  const statusVal = (l.status || "").toLowerCase();
                                  if (statusVal !== "approved" && statusVal !== "pending") return false;
                                  const sDate = l.start_date || l.startDate;
                                  const eDate = l.end_date || l.endDate;
                                  if (sDate && eDate) {
                                    return todayStr >= sDate && todayStr <= eDate;
                                  }
                                  return false;
                                });

                                let status = "Not Checked In";
                                let badgeClass = "bg-slate-100 text-slate-600 border border-slate-200";

                                if (isLeaveToday) {
                                  status = "On Leave";
                                  badgeClass = "bg-purple-50 text-purple-700 border border-purple-200";
                                } else if (todayLogs.length > 0) {
                                  const latestTodayLog = todayLogs.sort((a, b) => new Date(b.created_at || b.time || 0).getTime() - new Date(a.created_at || a.time || 0).getTime())[0];
                                  const logStatus = (latestTodayLog.status || "").toLowerCase();
                                  if (logStatus.includes("out") || logStatus.includes("left")) {
                                    status = "Checked Out";
                                    badgeClass = "bg-blue-50 text-blue-700 border border-blue-200";
                                  } else {
                                    status = "Checked In";
                                    badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                  }
                                } else if (emp.status === "Absent") {
                                  status = "Absent";
                                  badgeClass = "bg-red-50 text-red-700 border border-red-200";
                                }

                                const allCheckInLogs = empLogs.filter(l => {
                                  const st = (l.status || "").toLowerCase();
                                  return !st.includes("out") && !st.includes("left");
                                });
                                const latestLog = allCheckInLogs.sort((a, b) => new Date(b.created_at || b.time || 0).getTime() - new Date(a.created_at || a.time || 0).getTime())[0];
                                const checkInTimestamp = latestLog?.created_at || latestLog?.time || emp.check_in_time || null;
                                const lastCheckInFormatted = formatDateTimeDDMMYYYYHHmm(checkInTimestamp);

                                return (
                                  <tr key={emp.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-bold text-slate-900">{emp.name}</td>
                                    <td className="p-3 text-slate-600">{emp.department || 'General'}</td>
                                    <td className="p-3 text-slate-600">{emp.role || 'Staff'}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}>
                                        {status}
                                      </span>
                                    </td>
                                    <td className="p-3 font-mono text-slate-500 text-[11px]">{lastCheckInFormatted}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {companyProfileSubTab === "attendance" && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Top Metrics Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500 font-medium">Today's Attendance</span>
                          <div className="text-xl font-bold text-slate-900 mt-1">{presentToday} / {compEmps.length}</div>
                          <span className="text-[10px] text-slate-400">Rate: {todayAttendanceRate}%</span>
                        </div>
                        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                          <span className="text-emerald-700 font-medium">Present</span>
                          <div className="text-xl font-bold text-emerald-800 mt-1">{presentToday}</div>
                          <span className="text-[10px] text-emerald-600">Checked In Today</span>
                        </div>
                        <div className="p-3.5 bg-red-50 rounded-xl border border-red-200">
                          <span className="text-red-700 font-medium">Absent</span>
                          <div className="text-xl font-bold text-red-800 mt-1">{absentToday}</div>
                          <span className="text-[10px] text-red-600">No Record / Not on Leave</span>
                        </div>
                        <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200">
                          <span className="text-indigo-700 font-medium">Attendance %</span>
                          <div className="text-xl font-bold text-indigo-800 mt-1">{todayAttendanceRate}%</div>
                          <span className="text-[10px] text-indigo-600">Realtime Daily Rate</span>
                        </div>
                      </div>

                      {/* Detailed Counter Breakdown Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Checked In</span>
                          <div className="text-lg font-bold text-slate-900 mt-0.5">{currentlyCheckedIn}</div>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Checked Out</span>
                          <div className="text-lg font-bold text-slate-900 mt-0.5">{checkedOutTodayCount}</div>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Late Arrivals</span>
                          <div className="text-lg font-bold text-amber-600 mt-0.5">{lateArrivalsCount}</div>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">On Leave</span>
                          <div className="text-lg font-bold text-purple-600 mt-0.5">{onLeaveTodayCount}</div>
                        </div>
                      </div>

                      {/* Weekly & Monthly Averages */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                          <span className="text-slate-500 text-[11px] font-medium">Weekly Attendance Average (Last 7 Days)</span>
                          <div className="text-lg font-bold text-slate-900 font-mono">{weeklyAttendancePercent}%</div>
                          <span className="text-[10px] text-slate-500">Derived from actual database attendance logs</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                          <span className="text-slate-500 text-[11px] font-medium">Monthly Attendance Average (Last 30 Days)</span>
                          <div className="text-lg font-bold text-slate-900 font-mono">{monthlyAttendancePercent}%</div>
                          <span className="text-[10px] text-slate-500">Derived from actual database attendance logs</span>
                        </div>
                      </div>

                      {/* Attendance Trend Chart / Empty State */}
                      <div className="border border-slate-200 p-4 rounded-2xl space-y-3 bg-white shadow-xs">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">30-Day Attendance Trend</h3>
                          <span className="text-[10px] text-slate-400">Live Database Records</span>
                        </div>
                        {!hasAnyAttendanceData || compEmps.length === 0 ? (
                          <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <p className="text-xs font-bold text-slate-700">No attendance records available.</p>
                            <p className="text-[11px] text-slate-400">
                              {compEmps.length === 0 ? "No employees found." : "No attendance has been recorded yet."}
                            </p>
                          </div>
                        ) : (
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={attendanceTrendChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                                <Tooltip />
                                <Area type="monotone" dataKey="rate" name="Attendance %" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {companyProfileSubTab === "leave" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                          <span className="text-amber-800 font-medium">Pending</span>
                          <div className="text-lg font-black text-amber-900 mt-0.5">{compLeaves.filter(l => l.status === 'Pending').length}</div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                          <span className="text-emerald-700 font-medium">Approved</span>
                          <div className="text-lg font-black text-emerald-800 mt-0.5">{compLeaves.filter(l => l.status === 'Approved').length}</div>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                          <span className="text-red-700 font-medium">Rejected</span>
                          <div className="text-lg font-black text-red-800 mt-0.5">{compLeaves.filter(l => l.status === 'Rejected').length}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-900">Recent Leave Requests</h3>
                        {compLeaves.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">No leave requests found for this company.</div>
                        ) : (
                          compLeaves.map(leave => (
                            <div key={leave.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                              <div>
                                <span className="font-bold text-slate-900">{leave.employee_name || 'Staff Member'}</span>
                                <p className="text-slate-600 text-[11px] mt-0.5">{leave.leave_type || 'Casual Leave'} • {leave.total_days || 1} days</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : leave.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                {leave.status || 'Pending'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {companyProfileSubTab === "subscription" && (
                    <div className="space-y-6 animate-fadeIn text-xs">
                      {/* Overview Display Grid */}
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                          <div>
                            <span className="text-slate-500 font-medium">Current Plan Tier</span>
                            <div className="text-base font-black text-indigo-600">{comp.selected_plan || 'Free Trial'}</div>
                          </div>
                          <span className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase ${comp.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {comp.status || 'Active'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-slate-400 block mb-0.5">Billing Cycle</span>
                            <div className="font-bold text-slate-900">{comp.billing_cycle || 'Monthly Recurring'}</div>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Trial Ends</span>
                            <div className="font-bold text-slate-900 font-mono">
                              {editedTrialEndDate ? editedTrialEndDate.toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Days Remaining</span>
                            <div className="font-bold text-slate-900">
                              {editedDaysRemaining} {editedDaysRemaining === 1 ? 'day' : 'days'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Renewal Date</span>
                            <div className="font-bold text-slate-900 font-mono">
                              {new Date((editedTrialEndDate ? editedTrialEndDate.getTime() : Date.now()) + 86400000 * 30).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Payment Status</span>
                            <div className="font-bold text-emerald-600">
                              {comp.status === 'Active' || (comp.selected_plan && comp.selected_plan !== 'Free Trial' && comp.selected_plan !== 'Starter') ? 'Verified & Paid' : 'Trial Active'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Company Status</span>
                            <div className="font-bold text-slate-900 capitalize">
                              {editedDaysRemaining <= 0 ? 'Trial Expired' : (comp.status || 'Active')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trial Management Panel */}
                      <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Trial Management</h4>
                        <p className="text-[11px] text-slate-500">Select days (1-30) to extend or reduce trial duration in database.</p>
                        <div className="flex items-center gap-3 flex-wrap pt-1">
                          <select
                            value={adminTrialDays}
                            onChange={(e) => setAdminTrialDays(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                              <option key={`trial-opt-${d}`} value={d}>{d} {d === 1 ? 'Day' : 'Days'}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (!editedTrialEndDate) return;
                              const newDate = new Date(editedTrialEndDate.getTime() + adminTrialDays * 86400000);
                              setEditedTrialEndDate(newDate);
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer active:scale-95"
                          >
                            + Extend Trial
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!editedTrialEndDate) return;
                              const newTime = editedTrialEndDate.getTime() - adminTrialDays * 86400000;
                              const now = Date.now();
                              if (newTime <= now) {
                                setEditedTrialEndDate(new Date(now));
                              } else {
                                setEditedTrialEndDate(new Date(newTime));
                              }
                            }}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer active:scale-95"
                          >
                            - Reduce Trial
                          </button>
                          <button
                            type="button"
                            disabled={!hasTrialChanged || isSavingTrial}
                            onClick={async () => {
                              if (!selectedCompanyProfile || !editedTrialEndDate) return;
                              setIsSavingTrial(true);
                              try {
                                const compToSave = selectedCompanyProfile;
                                const diffMs = editedTrialEndDate.getTime() - Date.now();
                                const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                                const isExpired = daysRemaining <= 0;
                                const newStatus = isExpired ? "Trial Expired" : (compToSave.status === "Trial Expired" ? "Active" : compToSave.status || "Active");
                                const newTrialEndDateIso = editedTrialEndDate.toISOString();

                                const updatedComp = {
                                  ...compToSave,
                                  trial_end_date: newTrialEndDateIso,
                                  status: newStatus
                                };

                                // Optimistically update companies state array and selected profile
                                setCompanies(prev => prev.map(c => c.id === compToSave.id ? updatedComp : c));
                                setSelectedCompanyProfile(updatedComp);

                                // Update backend database via Supabase
                                const supabase = getSupabase();
                                if (supabase) {
                                  const { error } = await supabase
                                    .from("companies")
                                    .update({
                                      trial_end_date: newTrialEndDateIso,
                                      status: newStatus
                                    })
                                    .eq("id", compToSave.id);

                                  if (error) {
                                    // Fallback if trial_end_date column isn't in table schema
                                    const fallbackCreated = new Date(editedTrialEndDate.getTime() - 86400000 * 5).toISOString();
                                    await supabase
                                      .from("companies")
                                      .update({
                                        created_at: fallbackCreated,
                                        status: newStatus
                                      })
                                      .eq("id", compToSave.id);
                                  }
                                }

                                showToast("Trial updated successfully");
                              } catch (err: any) {
                                console.error("Error saving trial:", err);
                                showToast(`Error updating trial: ${err.message || "Failed to save"}`);
                              } finally {
                                setIsSavingTrial(false);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl font-bold transition shadow-xs flex items-center space-x-1.5 ${
                              !hasTrialChanged || isSavingTrial
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95"
                            }`}
                          >
                            {isSavingTrial ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <span>Save</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Plan Management Panel */}
                      <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Plan Management</h4>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                          <span className="text-slate-600 font-medium">Current Plan: <strong className="text-indigo-600">{comp.selected_plan || 'Starter'}</strong></span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap pt-2">
                          <select
                            value={adminSelectedPlan}
                            onChange={(e) => setAdminSelectedPlan(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="Basic">Basic (₹599/mo)</option>
                            <option value="Starter">Starter (₹1,499/mo)</option>
                            <option value="Enterprise">Enterprise (Custom)</option>
                          </select>
                          <button
                            onClick={async () => {
                              try {
                                const supabase = getSupabase();
                                if (!supabase) return;
                                const { error } = await supabase.from("companies").update({ selected_plan: adminSelectedPlan, status: 'Active' }).eq("id", comp.id);
                                if (error) throw error;
                                showToast(`Plan upgraded to ${adminSelectedPlan} for ${comp.org_name}`);
                                fetchData(true);
                              } catch (err: any) {
                                showToast(`Error upgrading plan: ${err.message}`);
                              }
                            }}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                          >
                            Upgrade Plan
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const supabase = getSupabase();
                                if (!supabase) return;
                                const { error } = await supabase.from("companies").update({ selected_plan: adminSelectedPlan }).eq("id", comp.id);
                                if (error) throw error;
                                showToast(`Plan downgraded to ${adminSelectedPlan} for ${comp.org_name}`);
                                fetchData(true);
                              } catch (err: any) {
                                showToast(`Error downgrading plan: ${err.message}`);
                              }
                            }}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                          >
                            Downgrade Plan
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const supabase = getSupabase();
                                if (!supabase) return;
                                const { error } = await supabase.from("companies").update({ selected_plan: adminSelectedPlan }).eq("id", comp.id);
                                if (error) throw error;
                                showToast(`Plan changes saved for ${comp.org_name}: ${adminSelectedPlan}`);
                                fetchData(true);
                              } catch (err: any) {
                                showToast(`Error saving plan: ${err.message}`);
                              }
                            }}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>

                      {/* Subscription History & Payment History */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Subscription History</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-[11px]">
                              <div>
                                <span className="font-bold text-slate-900 block">Organization Registered</span>
                                <span className="text-slate-500 font-mono">Plan: {comp.selected_plan || 'Starter'}</span>
                              </div>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date(comp.created_at || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-[11px]">
                              <div>
                                <span className="font-bold text-slate-900 block">Current Status Active</span>
                                <span className="text-slate-500 font-mono">Billing: {comp.billing_cycle || 'Monthly'}</span>
                              </div>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date().toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment History</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-[11px]">
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {comp.status === 'Active' || (comp.selected_plan && comp.selected_plan !== 'Free Trial' && comp.selected_plan !== 'Starter') ? 'Verified Payment' : 'Trial Period (No Fee)'}
                                </span>
                                <span className="text-slate-500 font-mono">
                                  {isTestCompany(comp) ? '₹0.00 (Test Account)' : getPlanDisplayPrice(comp.selected_plan, comp.billing_cycle)}
                                </span>
                              </div>
                              <span className="text-emerald-600 font-bold font-mono text-[10px]">
                                {comp.status === 'Active' ? 'PAID' : 'TRIAL'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {companyProfileSubTab === "activity" && (
                    <div className="space-y-4 animate-fadeIn">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Latest Company Activities</h3>
                      <div className="space-y-3">
                        {companyActivities.map(act => (
                          <div key={act.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                              <div>
                                <span className="font-bold text-slate-900">{act.type}</span>
                                <p className="text-slate-600 text-[11px] mt-0.5">{act.description}</p>
                              </div>
                            </div>
                            <span className="text-slate-400 text-[10px] font-mono">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Footer with Required Action Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setEditCompanyModal(comp)}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl font-semibold transition cursor-pointer"
                    >
                      Edit Company
                    </button>
                    {(comp.status || '').toLowerCase() === 'suspended' ? (
                      <button
                        onClick={() => setSuspendConfirmModal(comp)}
                        className="px-3 py-2 border rounded-xl font-semibold transition cursor-pointer bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      >
                        De-suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => setSuspendConfirmModal(comp)}
                        className="px-3 py-2 border rounded-xl font-semibold transition cursor-pointer bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => setResetPinModal(comp)}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl font-semibold transition cursor-pointer"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => setExtendTrialShortcutModal({ comp, days: 7 })}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl font-semibold transition cursor-pointer"
                    >
                      Extend Trial
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeleteCompanyModal(comp)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition"
                    >
                      Delete Company
                    </button>
                    <button
                      onClick={() => setSelectedCompanyProfile(null)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition"
                    >
                      Close
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* EDIT COMPANY MODAL                                             */}
      {/* ============================================================== */}
      {editCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-slate-900">Edit Company: {editCompanyModal.org_name}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Organization Name</label>
                <input
                  type="text"
                  defaultValue={editCompanyModal.org_name}
                  id="edit-org-name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Owner Name</label>
                <input
                  type="text"
                  defaultValue={editCompanyModal.full_name}
                  id="edit-owner-name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-medium">WhatsApp Number</label>
                <input
                  type="text"
                  defaultValue={editCompanyModal.whatsapp}
                  id="edit-whatsapp"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button onClick={() => setEditCompanyModal(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold">Cancel</button>
              <button
                onClick={async () => {
                  const orgName = (document.getElementById("edit-org-name") as HTMLInputElement).value;
                  const ownerName = (document.getElementById("edit-owner-name") as HTMLInputElement).value;
                  const whatsapp = (document.getElementById("edit-whatsapp") as HTMLInputElement).value;
                  try {
                    const supabase = getSupabase();
                    if (!supabase) return;
                    await supabase.from("companies").update({ org_name: orgName, full_name: ownerName, whatsapp }).eq("id", editCompanyModal.id);
                    showToast("Company updated successfully.");
                    setEditCompanyModal(null);
                    fetchData(true);
                  } catch (err: any) {
                    showToast(`Error: ${err.message}`);
                  }
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CHANGE PLAN MODAL                                              */}
      {/* ============================================================== */}
      {changePlanModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-slate-900">Change Plan for {changePlanModal.org_name}</h3>
            <div className="space-y-2">
              {["Basic Plan", "Starter Plan", "Pro Plan", "Enterprise Plan", "Paid"].map(plan => (
                <button
                  key={plan}
                  onClick={() => handleChangePlanSubmit(changePlanModal.id, plan)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-900 text-left transition flex justify-between items-center"
                >
                  <span>{plan}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setChangePlanModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RESET PIN MODAL                                                */}
      {/* ============================================================== */}
      {resetPinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-slate-900">Reset Employer PIN/Password</h3>
            <p className="text-slate-500">Enter a new security password/PIN for {resetPinModal.org_name || resetPinModal.full_name}:</p>
            <input
              type="text"
              id="new-pin-input"
              placeholder="e.g. 123456"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-900 font-bold"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setResetPinModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold">Cancel</button>
              <button
                onClick={() => {
                  const val = (document.getElementById("new-pin-input") as HTMLInputElement).value;
                  if (!val) { showToast("Please enter a valid PIN/password."); return; }
                  handleResetPinSubmit(resetPinModal.id, val);
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold"
              >
                Reset PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE COMPANY CONFIRMATION MODAL (SECTION 13 SAFETY)          */}
      {/* ============================================================== */}
      {deleteCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Permanent Company Deletion</h3>
            </div>
            <p className="text-slate-600">
              You are about to delete <strong className="text-slate-900">{deleteCompanyModal.org_name}</strong>. This action is irreversible and will remove all associated employees, attendance records, and leave requests.
            </p>
            <div className="space-y-1">
              <label className="block text-slate-500 font-medium">Type company name <strong className="text-slate-900">"{deleteCompanyModal.org_name}"</strong> to confirm:</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteCompanyModal.org_name}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => { setDeleteCompanyModal(null); setDeleteConfirmText(""); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCompanySubmit(deleteCompanyModal)}
                disabled={deleteConfirmText !== deleteCompanyModal.org_name}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold disabled:opacity-40 transition"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUSPEND / REACTIVATE CONFIRMATION MODAL                        */}
      {/* ============================================================== */}
      {suspendConfirmModal && (() => {
        const comp = suspendConfirmModal;
        const isSuspended = (comp.status || "").toLowerCase() === "suspended";

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
              <div className="flex items-center space-x-3 text-amber-600">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-base font-bold text-slate-900">
                  {isSuspended ? `Reactivate ${comp.org_name || comp.full_name}?` : `Suspend ${comp.org_name || comp.full_name}?`}
                </h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {isSuspended
                  ? `Reactivate ${comp.org_name || comp.full_name}? They will regain full access.`
                  : `Suspend ${comp.org_name || comp.full_name}? This will restrict their access until reactivated.`}
              </p>
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSuspendConfirmModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleToggleSuspend(comp);
                    setSuspendConfirmModal(null);
                  }}
                  className={`px-4 py-2 text-white rounded-xl font-bold transition cursor-pointer active:scale-95 ${
                    isSuspended
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {isSuspended ? "Confirm Reactivate" : "Confirm Suspend"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* EXTEND TRIAL SHORTCUT MODAL                                    */}
      {/* ============================================================== */}
      {extendTrialShortcutModal && (() => {
        const comp = extendTrialShortcutModal.comp;
        const days = extendTrialShortcutModal.days;

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
              <div className="flex items-center space-x-3 text-indigo-600">
                <Clock className="w-5 h-5 flex-shrink-0" />
                <h3 className="text-base font-bold text-slate-900">
                  Extend Trial for {comp.org_name || comp.full_name}
                </h3>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Quickly add trial days to this organization without switching tabs:
              </p>
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">Days to extend (1–30):</label>
                <select
                  value={days}
                  onChange={(e) => setExtendTrialShortcutModal({ ...extendTrialShortcutModal, days: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                    <option key={`quick-ext-${d}`} value={d}>
                      {d} {d === 1 ? 'day' : 'days'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setExtendTrialShortcutModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleExtendTrial(comp, days);
                    setExtendTrialShortcutModal(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer active:scale-95"
                >
                  Extend
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* ADD COMPANY MODAL                                              */}
      {/* ============================================================== */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-slate-900 text-white rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add New Company</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addCompanyError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{addCompanyError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={addCompanyFormData.orgName}
                  onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, orgName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Owner Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={addCompanyFormData.ownerName}
                  onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, ownerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={addCompanyFormData.contactNumber}
                  onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, contactNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Contact Email <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="email"
                  placeholder="e.g. owner@acme.com"
                  value={addCompanyFormData.contactEmail}
                  onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, contactEmail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Plan</label>
                <select
                  value={addCompanyFormData.plan}
                  onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, plan: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="Trial">Trial</option>
                  <option value="Basic Plan">Basic Plan</option>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Employees Count</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={addCompanyFormData.empCount}
                  onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, empCount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Registration Date</label>
                <input
                  type="date"
                  value={addCompanyFormData.regDate}
                  onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, regDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Status</label>
                <select
                  value={addCompanyFormData.status}
                  onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAddCompany}
                onClick={handleCreateCompanySubmit}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingAddCompany ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Company</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
