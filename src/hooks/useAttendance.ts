import { useState, useEffect, useMemo } from "react";
import { getSupabase } from "../lib/supabase";
import { 
  AttendanceLog, 
  getLogDate, 
  isCheckInLog, 
  isCheckOutLog 
} from "../utils/attendance";

export function useAttendance(employeeUser: any, currentEmployeeInDb: any, fetchTrigger: number = 0) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    if (!employeeUser?.id && !currentEmployeeInDb?.id && !employeeUser?.name) return;
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const targetDbId = String(currentEmployeeInDb?.id || '').toLowerCase().trim();
      const targetUserId = String(employeeUser?.id || '').toLowerCase().trim();
      const targetDbName = String(currentEmployeeInDb?.name || '').toLowerCase().trim();
      const targetUserName = String(employeeUser?.name || '').toLowerCase().trim();

      const { data: allLogs, error: fetchError } = await supabase
        .from("attendance_logs")
        .select("*")
        .order("id", { ascending: false });

      if (fetchError) throw fetchError;

      if (allLogs) {
        // Filter for this specific employee using same robust logic as before
        const empLogs = allLogs.filter((l: any) => {
          const logEmpId = String(l.employee_id || '').toLowerCase().trim();
          const logEmpName = String(l.employee_name || l.employee || '').toLowerCase().trim();

          if (targetDbId && logEmpId === targetDbId) return true;
          if (targetUserId && logEmpId === targetUserId) return true;
          if (targetDbName && logEmpName === targetDbName) return true;
          if (targetUserName && logEmpName === targetUserName) return true;
          
          return false;
        });

        // Dedup logic (similar to what was in EmployeeDashboard)
        const uniqueLogsMap = new Map();
        for (const l of empLogs) {
          const rawTime = l.created_at || l.location_timestamp || (l.time && !l.time.includes("AM") && !l.time.includes("PM") ? l.time : null);
          const timeKey = rawTime ? new Date(rawTime).getTime() : Date.now();
          const approxTimeBucket = Math.floor(timeKey / 3000);
          const typeKey = (l.method || l.attendance_type || "").toLowerCase().includes("out") ? "out" : "in";
          const compositeKey = `${l.employee_id}_${approxTimeBucket}_${typeKey}`;
          
          if (!uniqueLogsMap.has(compositeKey)) {
            uniqueLogsMap.set(compositeKey, l);
          }
        }

        const mappedLogs: AttendanceLog[] = Array.from(uniqueLogsMap.values()).map((l: any) => ({
          id: `LOG-${l.id}`,
          employee_id: l.employee_id,
          employee: l.employee_name || l.employee || "Employee",
          role: l.role,
          zone: l.zone || "Field Location",
          time: (l.created_at || l.location_timestamp) 
            ? new Date(l.created_at || l.location_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) 
            : (l.time || "—"),
          date: (l.created_at || l.location_timestamp) 
            ? new Date(l.created_at || l.location_timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) 
            : (l.date || "Today"),
          fullTimestamp: l.created_at || l.location_timestamp || new Date().toISOString(),
          status: (l.status === "failed" || l.face_verified === false) ? "failed" : (l.status === "warning" ? "warning" : "verified"),
          is_test: l.is_test || (l.method && l.method.includes("[TEST]")) || false,
          gpsAccuracy: l.gps_accuracy || "—",
          coordinates: l.coordinates || "—",
          distance: l.distance || "—",
          faceVerification: l.face_verified === false ? "Failed" : (l.face_verified === true ? "Verified" : (l.method?.toLowerCase().includes("face") ? "Verified" : "—")),
          method: l.method || "Biometric Check-In",
          attendance_type: l.attendance_type || ((l.method || "").toLowerCase().includes("out") ? "Check Out" : "Check In"),
          avatar: l.avatar
        }));

        setLogs(mappedLogs);
      }
      setError(null);
    } catch (err: any) {
      console.warn("Notice: Error fetching attendance logs:", err?.message || err);
      setError(err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [employeeUser?.id, currentEmployeeInDb?.id, employeeUser?.name, fetchTrigger]);

  // Real-time subscription
  useEffect(() => {
    const targetId = currentEmployeeInDb?.id || employeeUser?.id;
    if (!targetId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`attendance-realtime-${targetId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_logs',
        filter: `employee_id=eq.${targetId}`
      }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeUser?.id, currentEmployeeInDb?.id]);

  const todayLogs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

    return logs.filter(log => {
      const logDate = getLogDate(log).getTime();
      return logDate >= startOfToday && logDate < endOfToday && !log.is_test;
    });
  }, [logs]);

  const todayLogsChrono = useMemo(() => {
    return [...todayLogs].sort((a, b) => getLogDate(a).getTime() - getLogDate(b).getTime());
  }, [todayLogs]);

  return {
    logs,
    todayLogs,
    todayLogsChrono,
    isLoading,
    error,
    setLogs,
    refresh: fetchLogs
  };
}
