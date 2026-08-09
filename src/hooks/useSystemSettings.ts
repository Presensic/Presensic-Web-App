import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';

export interface SystemSettings {
  id?: number;
  company_id: number | string;
  grace_period: number;
  allow_geo_bypass: boolean;
  strict_selfie_match: boolean;
  shift_start: string;
  shift_end: string;
  working_days: string[];
  email_alerts: boolean;
  whatsapp_alerts: boolean;
  daily_summary: boolean;
  notification_emails: string;
  company_name: string;
  timezone: string;
  logo_url: string;
  auto_logout_minutes: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SETTINGS: Omit<SystemSettings, 'company_id'> = {
  grace_period: 15,
  allow_geo_bypass: true,
  strict_selfie_match: true,
  shift_start: "09:00",
  shift_end: "18:00",
  working_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  email_alerts: true,
  whatsapp_alerts: true,
  daily_summary: true,
  notification_emails: "",
  company_name: "",
  timezone: "IST",
  logo_url: "",
  auto_logout_minutes: 30
};

// Global in-memory cache to ensure settings are fetched once and reused immediately
const settingsCache: Record<string, SystemSettings> = {};

/**
 * Dispatches a custom window event to broadcast settings updates across all mounted components.
 */
function broadcastSettingsUpdate(companyId: number | string, settings: SystemSettings) {
  const cacheKey = String(companyId);
  settingsCache[cacheKey] = settings;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('presensic_settings_updated', {
      detail: { companyId: cacheKey, settings }
    }));
  }
}

/**
 * Saves system settings to Supabase for a specific company_id.
 * Performs UPDATE if a row exists for company_id, or INSERT if it does not.
 */
export async function saveSystemSettings(
  companyId: number | string,
  settings: Partial<SystemSettings>
): Promise<{ data: SystemSettings | null; error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: new Error("Supabase client is not available") };
  }

  if (!companyId) {
    return { data: null, error: new Error("Company ID is required to save system settings") };
  }

  try {
    const cacheKey = String(companyId);
    // Check if row already exists for this company_id
    const { data: existing, error: fetchErr } = await supabase
      .from('system_settings')
      .select('id')
      .eq('company_id', companyId)
      .maybeSingle();

    if (fetchErr) {
      console.warn("Notice checking existing system settings:", fetchErr);
    }

    const payload = {
      company_id: companyId,
      grace_period: Number(settings.grace_period ?? 15),
      allow_geo_bypass: Boolean(settings.allow_geo_bypass),
      strict_selfie_match: Boolean(settings.strict_selfie_match),
      shift_start: settings.shift_start ? (settings.shift_start.length === 5 ? `${settings.shift_start}:00` : settings.shift_start) : "09:00:00",
      shift_end: settings.shift_end ? (settings.shift_end.length === 5 ? `${settings.shift_end}:00` : settings.shift_end) : "18:00:00",
      working_days: Array.isArray(settings.working_days) ? settings.working_days : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      email_alerts: Boolean(settings.email_alerts),
      whatsapp_alerts: Boolean(settings.whatsapp_alerts),
      daily_summary: Boolean(settings.daily_summary),
      notification_emails: settings.notification_emails ?? "",
      company_name: settings.company_name ?? "",
      timezone: settings.timezone ?? "IST",
      logo_url: settings.logo_url ?? "",
      auto_logout_minutes: Number(settings.auto_logout_minutes ?? 30),
      updated_at: new Date().toISOString()
    };

    let savedData: SystemSettings;

    if (existing && existing.id) {
      // UPDATE existing row
      const { data, error } = await supabase
        .from('system_settings')
        .update(payload)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      savedData = data as SystemSettings;
    } else {
      // INSERT new row
      const { data, error } = await supabase
        .from('system_settings')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      savedData = data as SystemSettings;
    }

    const normalized: SystemSettings = {
      ...savedData,
      shift_start: savedData.shift_start ? savedData.shift_start.slice(0, 5) : "09:00",
      shift_end: savedData.shift_end ? savedData.shift_end.slice(0, 5) : "18:00",
      working_days: Array.isArray(savedData.working_days) ? savedData.working_days : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    };

    broadcastSettingsUpdate(companyId, normalized);

    return { data: normalized, error: null };
  } catch (err: any) {
    console.error("Error in saveSystemSettings:", err);
    return { data: null, error: err instanceof Error ? err : new Error(err?.message || "Failed to save settings") };
  }
}

/**
 * Custom React Hook to load and manage system settings for a company.
 * Implements in-memory caching and real-time update listeners across modules.
 */
export function useSystemSettings(companyId?: number | string) {
  const cacheKey = companyId ? String(companyId) : "";
  const [settings, setSettingsState] = useState<SystemSettings | null>(() => {
    return cacheKey && settingsCache[cacheKey] ? settingsCache[cacheKey] : null;
  });
  const [loading, setLoading] = useState<boolean>(() => !cacheKey || !settingsCache[cacheKey]);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!companyId) {
      setSettingsState((prev) => prev || { company_id: '', ...DEFAULT_SETTINGS });
      setLoading(false);
      return;
    }

    const currentKey = String(companyId);
    if (!settingsCache[currentKey]) {
      setLoading(true);
    }
    setError(null);
    const supabase = getSupabase();

    if (!supabase) {
      setError("Supabase client is not available");
      setSettingsState((prev) => prev || { company_id: companyId, ...DEFAULT_SETTINGS });
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('system_settings')
        .select('*')
        .eq('company_id', companyId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        console.error("Supabase error fetching system_settings:", fetchErr);
        throw fetchErr;
      }

      if (data) {
        const normalized: SystemSettings = {
          ...data,
          shift_start: data.shift_start ? data.shift_start.slice(0, 5) : "09:00",
          shift_end: data.shift_end ? data.shift_end.slice(0, 5) : "18:00",
          working_days: Array.isArray(data.working_days) ? data.working_days : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        };
        settingsCache[currentKey] = normalized;
        setSettingsState(normalized);
      } else {
        const defaultInst: SystemSettings = {
          company_id: companyId,
          ...DEFAULT_SETTINGS
        };
        settingsCache[currentKey] = defaultInst;
        setSettingsState(defaultInst);
      }
    } catch (err: any) {
      console.error("Failed to load system settings:", err);
      const errMsg = err?.message || err?.details || "Failed to load system settings";
      setError(errMsg);
      setSettingsState((prev) => prev || { company_id: companyId, ...DEFAULT_SETTINGS });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      const currentKey = String(companyId);
      if (settingsCache[currentKey]) {
        setSettingsState(settingsCache[currentKey]);
        setLoading(false);
      }
      fetchSettings();
    } else {
      setSettingsState((prev) => prev || { company_id: '', ...DEFAULT_SETTINGS });
      setLoading(false);
    }
  }, [companyId, fetchSettings]);

  // Listen to broadcast settings updates from any component
  useEffect(() => {
    if (!companyId) return;
    const currentKey = String(companyId);

    const handleSettingsBroadcast = (e: Event) => {
      const customEv = e as CustomEvent<{ companyId: string; settings: SystemSettings }>;
      if (customEv.detail && String(customEv.detail.companyId) === currentKey) {
        setSettingsState(customEv.detail.settings);
      }
    };

    window.addEventListener('presensic_settings_updated', handleSettingsBroadcast);
    return () => {
      window.removeEventListener('presensic_settings_updated', handleSettingsBroadcast);
    };
  }, [companyId]);

  const setSettings = useCallback((updater: Partial<SystemSettings> | ((prev: SystemSettings | null) => SystemSettings | null)) => {
    setSettingsState((prev) => {
      let next: SystemSettings;
      if (typeof updater === 'function') {
        const result = updater(prev);
        if (!result) return prev;
        next = result;
      } else if (!prev) {
        next = {
          company_id: companyId || '',
          ...DEFAULT_SETTINGS,
          ...updater
        } as SystemSettings;
      } else {
        next = { ...prev, ...updater };
      }

      if (companyId) {
        settingsCache[String(companyId)] = next;
      }
      return next;
    });
  }, [companyId]);

  const saveSettings = useCallback(async (customSettings?: Partial<SystemSettings>) => {
    if (!companyId) {
      const err = new Error("No company ID available to save settings");
      setError(err.message);
      throw err;
    }

    const targetSettings = customSettings || settings || { company_id: companyId, ...DEFAULT_SETTINGS };

    // Optimistic state update
    const optimistic: SystemSettings = {
      company_id: companyId,
      ...DEFAULT_SETTINGS,
      ...targetSettings
    };
    settingsCache[String(companyId)] = optimistic;
    setSettingsState(optimistic);

    setSaving(true);
    setError(null);

    const { data, error: saveErr } = await saveSystemSettings(companyId, targetSettings);

    setSaving(false);

    if (saveErr) {
      setError(saveErr.message);
      throw saveErr;
    }

    if (data) {
      setSettingsState(data);
      return data;
    }
  }, [companyId, settings]);

  return {
    settings,
    loading,
    saving,
    error,
    setSettings,
    saveSettings,
    refreshSettings: fetchSettings
  };
}

/**
 * Custom React Hook to enforce Auto Logout based on systemSettings.auto_logout_minutes
 */
export function useAutoLogout(autoLogoutMinutes: number | undefined, onLogOut: () => void) {
  useEffect(() => {
    const minutes = autoLogoutMinutes ?? 30;
    if (minutes <= 0) return;

    let timer: any = null;

    const resetInactivityTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        console.log(`Auto logged out after ${minutes} minutes of inactivity.`);
        onLogOut();
      }, minutes * 60 * 1000);
    };

    resetInactivityTimer();

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }));

    return () => {
      if (timer) clearTimeout(timer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [autoLogoutMinutes, onLogOut]);
}

export interface EmployeeShiftSettings {
  shift_type: "fixed" | "flexible";
  shift_start: string;
  shift_end: string;
  grace_period: number;
}

export function parseEmployeeShiftSettings(department: string | undefined | null): EmployeeShiftSettings | null {
  if (!department) return null;
  try {
    const data = JSON.parse(department);
    if (data && typeof data === 'object' && 'shift_type' in data) {
      return data as EmployeeShiftSettings;
    }
  } catch (e) {
    // Not valid JSON, just a normal department string
  }
  return null;
}

export function extractDepartmentName(department: string | undefined | null): string {
  if (!department) return "Staff";
  try {
    const data = JSON.parse(department);
    if (data && typeof data === 'object' && 'department_name' in data) {
      return data.department_name || "Staff";
    }
  } catch (e) {
    // Normal string
  }
  return department || "Staff";
}

export function stringifyEmployeeShiftSettings(name: string, settings: EmployeeShiftSettings): string {
  return JSON.stringify({
    department_name: name,
    ...settings
  });
}

/**
 * Calculates whether a check-in is On-Time or Late using dynamic system settings.
 */
export function checkAttendanceStatus(
  checkInDate: Date,
  settings?: SystemSettings | EmployeeShiftSettings | null
): { isLate: boolean; lateMinutes: number; thresholdTimeStr: string } {
  const shiftStartStr = settings?.shift_start ?? "09:00";
  const gracePeriodMinutes = Number(settings?.grace_period ?? 15);

  const [sHours, sMinutes] = shiftStartStr.split(":").map(Number);
  const shiftStartInMinutes = (sHours || 9) * 60 + (sMinutes || 0);
  const lateThresholdMinutes = shiftStartInMinutes + gracePeriodMinutes;

  const checkInInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();

  const isLate = checkInInMinutes > lateThresholdMinutes;
  const lateMinutes = Math.max(0, checkInInMinutes - shiftStartInMinutes);

  const tHours = Math.floor(lateThresholdMinutes / 60) % 24;
  const tMins = lateThresholdMinutes % 60;
  const period = tHours >= 12 ? "PM" : "AM";
  const displayHours = tHours % 12 === 0 ? 12 : tHours % 12;
  const thresholdTimeStr = `${String(displayHours).padStart(2, "0")}:${String(tMins).padStart(2, "0")} ${period}`;

  return {
    isLate,
    lateMinutes,
    thresholdTimeStr
  };
}

/**
 * Checks if a given date falls on a configured working day.
 */
export function isWorkingDay(date: Date, settings?: SystemSettings | null): boolean {
  const workingDays = settings?.working_days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  return workingDays.includes(dayName);
}

