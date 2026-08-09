import React, { useState, useMemo } from "react";
import { isTestCompany, getPlanMonthlyPrice } from "../utils/pricingUtils";
import {
  Building2,
  Users,
  Clock,
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  BarChart3,
  Activity,
  Download,
  Zap,
  ArrowUpRight,
  Shield,
  IndianRupee,
  CreditCard,
  Filter,
  Plus,
  TrendingDown,
  MapPin,
  Globe,
  PieChart as PieChartIcon,
  UserPlus,
  CheckSquare,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Layers,
  Sparkles
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { calculateTrialStatus } from "../utils/trial";

interface ExecutiveAnalyticsDashboardProps {
  companies: any[];
  employees: any[];
  attendanceLogs: any[];
  leaveRequests: any[];
  onAddCompany?: () => void;
  onRefresh?: () => void;
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function ExecutiveAnalyticsDashboard({
  companies = [],
  employees = [],
  attendanceLogs = [],
  leaveRequests = [],
  onAddCompany,
  onRefresh
}: ExecutiveAnalyticsDashboardProps) {
  // Filter States
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "90d" | "year" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [activeExportFormat, setActiveExportFormat] = useState<"csv" | "excel" | "pdf" | null>(null);
  const [activeTab, setActiveTab] = useState<"company" | "attendance" | "employee" | "revenue">("company");

  // Filtered dataset derivation based on company, plan, and status
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (selectedCompanyId !== "all" && String(c.id) !== String(selectedCompanyId)) return false;
      if (selectedPlanFilter !== "all") {
        const plan = (c.selected_plan || "Starter").toLowerCase();
        if (!plan.includes(selectedPlanFilter.toLowerCase())) return false;
      }
      if (selectedStatusFilter !== "all") {
        const trial = calculateTrialStatus(c.created_at, c.status, c.selected_plan, c.trial_end_date);
        const st = (c.status || "Active").toLowerCase();
        if (selectedStatusFilter === "trial") {
          if (trial.trialExpired || trial.daysRemaining <= 0) return false;
        } else if (selectedStatusFilter === "expired") {
          if (!trial.trialExpired && trial.daysRemaining > 0) return false;
        } else if (selectedStatusFilter === "active") {
          if (st === "suspended") return false;
        } else if (selectedStatusFilter === "suspended") {
          if (st !== "suspended") return false;
        } else if (!st.includes(selectedStatusFilter.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [companies, selectedCompanyId, selectedPlanFilter, selectedStatusFilter]);

  const filteredCompanyIds = useMemo(() => new Set(filteredCompanies.map(c => String(c.id))), [filteredCompanies]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => filteredCompanyIds.has(String(e.company_id)));
  }, [employees, filteredCompanyIds]);

  const filteredLogs = useMemo(() => {
    return attendanceLogs.filter(l => filteredCompanyIds.has(String(l.company_id)));
  }, [attendanceLogs, filteredCompanyIds]);

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => filteredCompanyIds.has(String(l.company_id)));
  }, [leaveRequests, filteredCompanyIds]);

  // Section 1: Executive KPI Calculations
  const metrics = useMemo(() => {
    const totalComps = filteredCompanies.length;
    let activeComps = 0;
    let suspendedComps = 0;
    let trialComps = 0;
    let paidComps = 0;
    let realPaidComps = 0;
    let expiredTrials = 0;
    let totalMRR = 0;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    let newCompsThisMonth = 0;
    let newCompsPrevMonth = 0;

    filteredCompanies.forEach(c => {
      const isTest = isTestCompany(c);
      const trial = calculateTrialStatus(c.created_at, c.status, c.selected_plan, c.trial_end_date);
      const st = (c.status || "Active").toLowerCase();
      const plan = c.selected_plan || "Starter";

      // 1. Active Orgs = non-suspended companies (Company Status === "Active" / not suspended)
      if (st !== "suspended") {
        activeComps++;
      } else {
        suspendedComps++;
      }

      // 2. Trials Active vs Expired Trials (mutually exclusive)
      if (trial.trialExpired || trial.daysRemaining <= 0) {
        expiredTrials++;
      } else {
        trialComps++; // Days Remaining > 0
      }

      if (st !== "suspended" && (plan.includes("paid") || plan.includes("enterprise") || plan.includes("pro") || plan.includes("growth") || plan.includes("basic") || st === "active")) {
        paidComps++;
        if (!isTest) {
          realPaidComps++;
        }
      }

      // Revenue sum — strictly exclude test accounts!
      if (!isTest && !trial.trialExpired && st !== "suspended") {
        totalMRR += getPlanMonthlyPrice(plan, c.billing_cycle || "monthly", isTest);
      }

      // Growth month check
      const createdMonth = (c.created_at || "").substring(0, 7);
      if (createdMonth === currentMonthStr) {
        newCompsThisMonth++;
      } else if (createdMonth === prevMonthStr) {
        newCompsPrevMonth++;
      }
    });

    const totalARR = totalMRR * 12;
    const arpc = realPaidComps > 0 ? Math.round(totalMRR / realPaidComps) : 0;

    // Company Growth %
    const compGrowthRate = newCompsPrevMonth > 0 
      ? Math.round(((newCompsThisMonth - newCompsPrevMonth) / newCompsPrevMonth) * 100) 
      : (newCompsThisMonth > 0 ? 100 : 0);

    // Employees KPI
    const totalEmps = filteredEmployees.length;
    let empsThisMonth = 0;
    let empsPrevMonth = 0;

    filteredEmployees.forEach(e => {
      const createdMonth = (e.created_at || "").substring(0, 7);
      if (createdMonth === currentMonthStr) empsThisMonth++;
      if (createdMonth === prevMonthStr) empsPrevMonth++;
    });

    const empGrowthRate = empsPrevMonth > 0 
      ? Math.round(((empsThisMonth - empsPrevMonth) / empsPrevMonth) * 100) 
      : (empsThisMonth > 0 ? 100 : 0);

    // Today's Attendance KPI
    const todayStr = now.toLocaleDateString('en-CA');
    const todayLogs = filteredLogs.filter(l => (l.time || l.created_at || "").includes(todayStr));
    const todayCheckedInEmps = new Set(todayLogs.map(l => String(l.employee_id)));
    const todayAttendancePercent = totalEmps > 0 ? Math.round((todayCheckedInEmps.size / totalEmps) * 100) : 0;

    return {
      totalCompanies: totalComps,
      activeCompanies: activeComps,
      suspendedCompanies: suspendedComps,
      trialCompanies: trialComps,
      paidCompanies: paidComps,
      realPaidComps,
      expiredTrials,
      totalMRR,
      totalARR,
      arpc,
      newCompsThisMonth,
      compGrowthRate,
      totalEmployees: totalEmps,
      empGrowthRate,
      todayAttendancePercent,
      todayCheckedInCount: todayCheckedInEmps.size
    };
  }, [filteredCompanies, filteredEmployees, filteredLogs]);

  // Section 2: Revenue Analytics Breakdown
  const revenuePlanBreakdown = useMemo(() => {
    const plans: { [key: string]: { count: number; mrr: number } } = {
      Starter: { count: 0, mrr: 0 },
      Basic: { count: 0, mrr: 0 },
      Enterprise: { count: 0, mrr: 0 }
    };

    filteredCompanies.forEach(c => {
      const isTest = isTestCompany(c);
      const planName = c.selected_plan || "Starter";
      const normalizedKey = planName.includes("Enterprise") ? "Enterprise" : planName.includes("Basic") ? "Basic" : "Starter";
      const price = getPlanMonthlyPrice(normalizedKey, c.billing_cycle || "monthly", isTest);
      plans[normalizedKey].count += 1;
      if (!isTest) {
        plans[normalizedKey].mrr += price;
      }
    });

    const pieData = Object.keys(plans).map(p => ({
      name: p,
      value: plans[p].mrr,
      count: plans[p].count
    }));

    return { plans, pieData };
  }, [filteredCompanies]);

  // Section 3: Company Growth Trend (Last 6 Months)
  const monthlyCompanyGrowth = useMemo(() => {
    const monthsMap: { [month: string]: { month: string; companies: number; employees: number; revenue: number } } = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap[key] = { month: label, companies: 0, employees: 0, revenue: 0 };
    }

    filteredCompanies.forEach(c => {
      const isTest = isTestCompany(c);
      const mKey = (c.created_at || "").substring(0, 7);
      if (monthsMap[mKey]) {
        monthsMap[mKey].companies += 1;
        if (!isTest) {
          monthsMap[mKey].revenue += getPlanMonthlyPrice(c.selected_plan, c.billing_cycle || "monthly", isTest);
        }
      }
    });

    filteredEmployees.forEach(e => {
      const mKey = (e.created_at || "").substring(0, 7);
      if (monthsMap[mKey]) {
        monthsMap[mKey].employees += 1;
      }
    });

    return Object.values(monthsMap);
  }, [filteredCompanies, filteredEmployees]);

  // Top 10 Largest Companies
  const topCompanies = useMemo(() => {
    return [...filteredCompanies]
      .map(c => {
        const empCount = filteredEmployees.filter(e => String(e.company_id) === String(c.id)).length;
        const compLogs = filteredLogs.filter(l => String(l.company_id) === String(c.id));
        const attRate = empCount > 0 ? Math.min(100, Math.round((compLogs.length / (empCount * 30)) * 100)) : 0;
        return { ...c, employeeCount: empCount, attendanceRate: attRate };
      })
      .sort((a, b) => b.employeeCount - a.employeeCount)
      .slice(0, 10);
  }, [filteredCompanies, filteredEmployees, filteredLogs]);

  // Section 4: Employee & Attendance Detail
  const employeeAnalytics = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    let checkedInToday = 0;
    let checkedOutToday = 0;
    let lateArrivals = 0;
    let outsideGeofence = 0;
    let faceFailures = 0;
    let gpsFailures = 0;

    filteredLogs.forEach(l => {
      const t = l.time || l.created_at;
      if (!t) return;
      
      const logLocalDate = new Date(t).toLocaleDateString('en-CA');
      if (logLocalDate === todayStr) {
        const st = (l.status || "").toLowerCase();
        if (st.includes("out") || st.includes("left")) {
          checkedOutToday++;
        } else {
          checkedInToday++;
          const timePart = t.split("T")[1] || t.split(" ")[1] || "";
          if (timePart && timePart > "09:30") lateArrivals++;
        }

        if (st.includes("outside") || l.zone === "Outside Geofence" || (l.distance && l.distance > 200)) {
          outsideGeofence++;
        }

        if (l.face_verified === false || (l.verification_status && l.verification_status.includes("face_failed"))) {
          faceFailures++;
        }

        if (l.gps_verified === false || (l.verification_status && l.verification_status.includes("gps_failed"))) {
          gpsFailures++;
        }
      }
    });

    const totalLogsCount = Math.max(1, filteredLogs.length);
    const faceFailPercent = Math.round((faceFailures / totalLogsCount) * 100);
    const gpsFailPercent = Math.round((gpsFailures / totalLogsCount) * 100);

    return {
      checkedInToday,
      checkedOutToday,
      lateArrivals,
      outsideGeofence,
      faceFailPercent,
      gpsFailPercent
    };
  }, [filteredLogs]);

  // Section 5: Leave Analytics
  const leaveAnalytics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    const deptLeaveMap: { [dept: string]: number } = {};

    filteredLeaves.forEach(l => {
      const st = (l.status || "Pending").toLowerCase();
      if (st === "approved") approved++;
      else if (st === "rejected") rejected++;
      else pending++;

      const dept = l.department || "General";
      deptLeaveMap[dept] = (deptLeaveMap[dept] || 0) + 1;
    });

    const topDepts = Object.keys(deptLeaveMap)
      .map(d => ({ department: d, count: deptLeaveMap[d] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { pending, approved, rejected, topDepts };
  }, [filteredLeaves]);

  // Section 7: Geographical Analytics
  const geoAnalytics = useMemo(() => {
    const cityMap: { [city: string]: number } = {};
    const stateMap: { [state: string]: number } = {};

    filteredCompanies.forEach(c => {
      const city = c.city || "Mumbai";
      const state = c.state || "Maharashtra";
      cityMap[city] = (cityMap[city] || 0) + 1;
      stateMap[state] = (stateMap[state] || 0) + 1;
    });

    const cities = Object.keys(cityMap).map(city => ({ city, count: cityMap[city] })).sort((a, b) => b.count - a.count);
    const states = Object.keys(stateMap).map(state => ({ state, count: stateMap[state] })).sort((a, b) => b.count - a.count);

    return { cities, states };
  }, [filteredCompanies]);

  // Export handlers
  const handleExportCSV = () => {
    const csvHeader = ["Metric", "Value"];
    const rows = [
      ["Total Companies", metrics.totalCompanies],
      ["Active Companies", metrics.activeCompanies],
      ["Suspended Companies", metrics.suspendedCompanies],
      ["Trial Companies", metrics.trialCompanies],
      ["Paid Companies", metrics.paidCompanies],
      ["Total Employees", metrics.totalEmployees],
      ["Today Attendance %", `${metrics.todayAttendancePercent}%`],
      ["Monthly Revenue (MRR)", `₹${metrics.totalMRR}`],
      ["Annual Recurring Revenue (ARR)", `₹${metrics.totalARR}`],
      ["Average Revenue Per Company", `₹${metrics.arpc}`]
    ];

    const csvContent = [csvHeader.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presensic_bi_analytics_${new Date().toLocaleDateString('en-CA')}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const isEmptyState = companies.length === 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER & EXECUTIVE TOOLBAR */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Executive Business Intelligence</h1>
              <p className="text-xs text-slate-400 mt-0.5">Real-time platform telemetry, telemetry growth & founder metrics</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onAddCompany && (
            <button
              onClick={onAddCompany}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Company</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-2 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          )}

          <div className="relative group">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV / Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ANALYTICS VIEW TOGGLE TABS */}
      <div className="p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/60 flex flex-wrap items-center gap-1.5" id="analytics-view-toggles">
        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "company"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
          id="tab-company-analytics"
        >
          <Building2 className="w-4 h-4" />
          <span>Company Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "attendance"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
          id="tab-attendance-analytics"
        >
          <Activity className="w-4 h-4" />
          <span>Attendance Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("employee")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "employee"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
          id="tab-employee-analytics"
        >
          <Users className="w-4 h-4" />
          <span>Employee Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("revenue")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "revenue"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
          id="tab-revenue-analytics"
        >
          <IndianRupee className="w-4 h-4" />
          <span>Revenue Analytics</span>
        </button>
      </div>

      {/* SECTION 11: FILTERS & CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Dashboard Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Company Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Company:</span>
            <select
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Companies ({companies.length})</option>
              {companies.map(c => (
                <option key={`filter-comp-${c.id}`} value={c.id}>{c.org_name || `Org #${c.id}`}</option>
              ))}
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Plan:</span>
            <select
              value={selectedPlanFilter}
              onChange={e => setSelectedPlanFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter</option>
              <option value="basic">Basic</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="expired">Expired Trial</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Range:</span>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {isEmptyState ? (
        /* EMPTY STATE DISPLAY */
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No analytics available yet.</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Register companies and employees to begin accumulating real-time business intelligence metrics and interactive financial reporting.
          </p>
          {onAddCompany && (
            <button
              onClick={onAddCompany}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition cursor-pointer"
            >
              Add First Company
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============================================================== */}
          {/* TAB 1: COMPANY ANALYTICS                                       */}
          {/* ============================================================== */}
          {activeTab === "company" && (
            <div className="space-y-6 animate-fadeIn" id="view-company-analytics">
              {/* Company KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Companies</span>
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{metrics.totalCompanies}</div>
                  <span className="text-[11px] text-emerald-600 font-semibold">+{metrics.newCompsThisMonth} this month</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Active Orgs</span>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{metrics.activeCompanies}</div>
                  <span className="text-[11px] text-slate-400">Non-suspended</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Trials Active</span>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-600">{metrics.trialCompanies}</div>
                  <span className="text-[11px] text-slate-400">Days Remaining &gt; 0</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Expired Trials</span>
                    <Clock className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-rose-600">{metrics.expiredTrials}</div>
                  <span className="text-[11px] text-slate-400">Days Remaining &le; 0</span>
                </div>
              </div>

              {/* Company Charts & Data Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Plan Revenue Distribution Pie Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Revenue Distribution By Plan</h3>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenuePlanBreakdown.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {revenuePlanBreakdown.pieData.map((entry, index) => (
                            <Cell key={`revenue-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
                    {revenuePlanBreakdown.pieData.map((item, idx) => (
                      <div key={`plan-legend-${item.name}-${idx}`} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-semibold text-slate-700">{item.name} ({item.count})</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono">₹{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Organizations By Size Table */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Top Organizations By Size</h3>
                    <span className="text-xs text-slate-400">Total {filteredCompanies.length} Companies</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                          <th className="pb-2">Organization</th>
                          <th className="pb-2">Plan</th>
                          <th className="pb-2">Workforce</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {topCompanies.slice(0, 7).map(c => (
                          <tr key={`top-comp-${c.id}`} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 font-bold text-slate-900">
                              <div className="flex items-center space-x-1.5">
                                <span>{c.org_name}</span>
                                {isTestCompany(c) && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-extrabold bg-amber-100 text-amber-800 border border-amber-300 rounded uppercase">
                                    TEST
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-slate-400 font-normal">{c.city || 'Location N/A'}</span>
                            </td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-[10px]">
                                {c.selected_plan || 'Starter'}
                              </span>
                            </td>
                            <td className="py-2.5 font-bold text-slate-800">{c.employeeCount} Staff</td>
                            <td className="py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {c.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Geographical Distribution */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Geographical Distribution</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block mb-2">Top Cities</span>
                    <div className="space-y-2">
                      {geoAnalytics.cities.slice(0, 5).map(c => (
                        <div key={`city-${c.city}`} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                          <span className="font-semibold text-slate-800">{c.city}</span>
                          <span className="font-bold text-indigo-600">{c.count} orgs</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block mb-2">Top States</span>
                    <div className="space-y-2">
                      {geoAnalytics.states.slice(0, 5).map(s => (
                        <div key={`state-${s.state}`} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                          <span className="font-semibold text-slate-800">{s.state}</span>
                          <span className="font-bold text-indigo-600">{s.count} orgs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ATTENDANCE ANALYTICS                                    */}
          {/* ============================================================== */}
          {activeTab === "attendance" && (
            <div className="space-y-6 animate-fadeIn" id="view-attendance-analytics">
              {/* Attendance KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Today Att %</span>
                    <Activity className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{metrics.todayAttendancePercent}%</div>
                  <span className="text-[11px] text-slate-400">{metrics.todayCheckedInCount} checked in</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Checked In Today</span>
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-indigo-600">{employeeAnalytics.checkedInToday}</div>
                  <span className="text-[11px] text-emerald-600 font-semibold">Active shift logs</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Late Arrivals</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-600">{employeeAnalytics.lateArrivals}</div>
                  <span className="text-[11px] text-slate-400">After shift start</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Outside Geofence</span>
                    <MapPin className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-rose-600">{employeeAnalytics.outsideGeofence}</div>
                  <span className="text-[11px] text-rose-500">Distance flag triggered</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Face Match Rate</span>
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-indigo-600">{100 - employeeAnalytics.faceFailPercent}%</div>
                  <span className="text-[11px] text-slate-400">AI biometrics match</span>
                </div>
              </div>

              {/* Attendance & Verification Telemetry + Leave Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Verification & Security Telemetry</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] font-medium">Checked In Today</span>
                      <div className="text-xl font-bold text-slate-900">{employeeAnalytics.checkedInToday}</div>
                      <span className="text-[10px] text-emerald-600 font-semibold">Active shift logs</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] font-medium">Late Arrival Count</span>
                      <div className="text-xl font-bold text-amber-600">{employeeAnalytics.lateArrivals}</div>
                      <span className="text-[10px] text-slate-400">After shift start</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] font-medium">Outside Geofence Logs</span>
                      <div className="text-xl font-bold text-rose-600">{employeeAnalytics.outsideGeofence}</div>
                      <span className="text-[10px] text-rose-500">Distance flag triggered</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] font-medium">Face Match Rate</span>
                      <div className="text-xl font-bold text-indigo-600">{100 - employeeAnalytics.faceFailPercent}%</div>
                      <span className="text-[10px] text-slate-400">AI biometrics match</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Leave Request & Approvals Summary</h3>
                    <p className="text-xs text-slate-500">Cross-company leave applications telemetry across the current period filter.</p>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                        <span className="text-xs text-emerald-700 font-bold block">Approved</span>
                        <span className="text-2xl font-black text-emerald-800 font-mono mt-1 block">{leaveAnalytics.approved}</span>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <span className="text-xs text-amber-700 font-bold block">Pending</span>
                        <span className="text-2xl font-black text-amber-800 font-mono mt-1 block">{leaveAnalytics.pending}</span>
                      </div>
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                        <span className="text-xs text-rose-700 font-bold block">Rejected</span>
                        <span className="text-2xl font-black text-rose-800 font-mono mt-1 block">{leaveAnalytics.rejected}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center text-xs mt-4">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Leave Requests</span>
                      <span className="text-lg font-black text-white">{filteredLeaves.length} Records</span>
                    </div>
                    <span className="text-xs font-semibold text-indigo-300">Updated Real-time</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: EMPLOYEE ANALYTICS                                      */}
          {/* ============================================================== */}
          {activeTab === "employee" && (
            <div className="space-y-6 animate-fadeIn" id="view-employee-analytics">
              {/* Employee KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Workforce</span>
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{metrics.totalEmployees}</div>
                  <span className="text-[11px] text-indigo-600 font-semibold">{metrics.empGrowthRate}% growth rate</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Companies</span>
                    <Building2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{metrics.totalCompanies}</div>
                  <span className="text-[11px] text-slate-400">Registered organizations</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Active Orgs</span>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{metrics.activeCompanies}</div>
                  <span className="text-[11px] text-slate-400">Employing active staff</span>
                </div>
              </div>

              {/* Company & Employee Growth Chart + Per-company Workforce Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Company & Employee Growth</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyCompanyGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="companies" name="New Companies" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="employees" name="New Employees" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Per-Company Workforce Breakdown */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Workforce Distribution By Organization</h3>
                    <span className="text-xs text-slate-400">{filteredCompanies.length} Organizations</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                          <th className="pb-2">Organization</th>
                          <th className="pb-2">City</th>
                          <th className="pb-2 text-right">Workforce Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {topCompanies.map(c => (
                          <tr key={`emp-breakdown-${c.id}`} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 font-bold text-slate-900">{c.org_name}</td>
                            <td className="py-2.5 text-slate-500">{c.city || 'Location N/A'}</td>
                            <td className="py-2.5 text-right font-black text-indigo-600 font-mono">
                              {c.employeeCount} Staff
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: REVENUE ANALYTICS                                       */}
          {/* ============================================================== */}
          {activeTab === "revenue" && (
            <div className="space-y-6 animate-fadeIn" id="view-revenue-analytics">
              {/* Revenue KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">MRR</span>
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">₹{metrics.totalMRR.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-300">Monthly Recurring Revenue</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">ARR</span>
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">₹{metrics.totalARR.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-400">Annualized Run Rate</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Avg Revenue / Co (ARPC)</span>
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-indigo-600 font-mono">₹{metrics.arpc.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-400">Per subscriber average</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Paid Subscribers</span>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{metrics.paidCompanies}</div>
                  <span className="text-[11px] text-slate-400">Active paying accounts</span>
                </div>
              </div>

              {/* Revenue Trend & Projection Chart + Distribution Pie */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Revenue Trend & Projection</h3>
                      <p className="text-xs text-slate-500">Monthly recurring revenue calculated from active subscriber plans</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">ARPC</span>
                      <span className="text-sm font-black text-indigo-600 font-mono">₹{metrics.arpc.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyCompanyGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "MRR"]} />
                        <Area type="monotone" dataKey="revenue" name="MRR (₹)" stroke="#10b981" fill="#d1fae5" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Revenue Distribution By Plan</h3>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenuePlanBreakdown.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {revenuePlanBreakdown.pieData.map((entry, index) => (
                            <Cell key={`distribution-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
                    {revenuePlanBreakdown.pieData.map((item, idx) => (
                      <div key={`plan-legend-${item.name}-${idx}`} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-semibold text-slate-700">{item.name} ({item.count})</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono">₹{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
