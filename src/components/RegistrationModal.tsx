import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Camera, 
  Building2, 
  Users, 
  Briefcase, 
  UserCheck, 
  Upload, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
  Navigation,
  RefreshCw,
  Loader2,
  Target,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getSupabase } from "../lib/supabase";

interface RegistrationModalProps {
  key?: string;
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeCount: string; // "Under 10" | "10–50" | "50+" | ""
  onEnterDashboard?: (role: "employer" | "employee", userData?: any) => void;
  companies?: any[];
  setCompanies?: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function RegistrationModal({
  isOpen,
  onClose,
  initialEmployeeCount,
  onEnterDashboard,
  companies,
  setCompanies
}: RegistrationModalProps) {
  // Form fields
  const [fullName, setFullName] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role] = useState<"employer" | "employee">("employer");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"Basic" | "Starter" | "Enterprise">("Starter");
  
  // Employer conditional fields (Password)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Geolocation
  const [officeLat, setOfficeLat] = useState<number | null>(null);
  const [officeLng, setOfficeLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCaptureLocation = () => {
    setIsCapturing(true);
    setAuthError(null);
    
    if (!navigator.geolocation) {
      setAuthError("Geolocation is not supported by your browser.");
      setIsCapturing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setOfficeLat(latitude);
        setOfficeLng(longitude);
        setAccuracy(acc);
        setLocationCaptured(true);
        setIsCapturing(false);
        
        if (errors.location) {
          setErrors(prev => {
            const copy = { ...prev };
            delete copy.location;
            return copy;
          });
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        let errorMsg = "Failed to capture location.";
        if (err.code === 1) errorMsg = "Location permission denied. Please enable location access.";
        else if (err.code === 2) errorMsg = "Location unavailable. Check your GPS signal.";
        else if (err.code === 3) errorMsg = "Location request timed out.";
        setAuthError(errorMsg);
        setIsCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Statuses
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Safeguard: lock/unlock body scroll when registration modal is open/closed
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset errors and submission status
      setErrors({});
      setIsSuccess(false);
      setIsSubmitting(false);
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, initialEmployeeCount]);

  if (!isOpen) return null;

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = "Full Name is required";
    
    if (!whatsApp.trim()) {
      newErrors.whatsApp = "WhatsApp Number is required";
    } else {
      // Basic phone format checks
      const cleaned = whatsApp.replace(/\D/g, "");
      if (cleaned.length < 8) {
        newErrors.whatsApp = "Please enter a valid phone number (at least 8 digits)";
      }
    }

    if (!orgName.trim()) newErrors.orgName = "Company/Organization Name is required";

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!officeLat || !officeLng) {
      newErrors.location = "Office location confirmation is required for geofencing setup";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setAuthError(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Save organization to Supabase
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error("Database connection failed. Please check your network or configuration.");
      }

      // Check if organization already exists
      const normalizedWhatsApp = whatsApp.replace(/\D/g, "");
      const whatsappSuffix = normalizedWhatsApp.length >= 10 ? normalizedWhatsApp.slice(-10) : normalizedWhatsApp;
      
      const { data: allOrgs, error: checkError } = await supabase
        .from('companies')
        .select('id, whatsapp, password, full_name');

      const existingOrg = allOrgs?.find(org => {
        const dbNormalized = (org.whatsapp || "").replace(/\D/g, "");
        const dbSuffix = dbNormalized.length >= 10 ? dbNormalized.slice(-10) : dbNormalized;
        return dbSuffix === whatsappSuffix && whatsappSuffix.length >= 8;
      });

      if (existingOrg) {
        // If password matches, we can treat it as a successful registration/login
        if (existingOrg.password?.trim() === password.trim()) {
          console.log("Existing organization found with matching password, logging in...");
          
          // Trigger the dashboard entry
          if (onEnterDashboard) {
            onEnterDashboard("employer", {
              name: fullName || existingOrg.full_name || orgName,
              email: whatsApp,
              whatsApp: whatsApp,
              orgName: orgName,
              designation: "Admin",
              plan: selectedPlan
            });
          }
          onClose();
          return;
        }
        
        throw new Error("This WhatsApp number is already registered with a different password. Please log in using the correct password or use another number.");
      }

      const newOrg = {
        full_name: fullName,
        whatsapp: whatsApp,
        org_name: orgName,
        password, // In a real app, this MUST be hashed before storage!
        role,
        billing_cycle: billingCycle,
        selected_plan: selectedPlan,
        latitude: officeLat,
        longitude: officeLng,
        created_at: new Date().toISOString()
      };

      console.log("Supabase company registration insert - data to insert:", newOrg);
      const { data, error } = await supabase.from('companies').insert([newOrg]).select().single();
      console.log("Supabase company registration insert - response:", { data, error });
      
      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error("Registration failed in database. Please try again.");
      }

      // Automatically create the first geofence anchor
      if (data && data.id) {
        await supabase.from('geofence_anchors').insert({
          company_id: data.id,
          name: orgName ? `${orgName.trim()} Head Office` : "Main Office",
          latitude: officeLat,
          longitude: officeLng,
          radius_meters: 150 // Default radius 150m
        });
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Add company to CRM list if setCompanies exists
      if (setCompanies) {
        const newCompany = {
          id: `COMP-${Math.floor(100 + Math.random() * 900)}`,
          name: orgName,
          contact: fullName,
          email: whatsApp,
          status: "Trial Active",
          color: "amber",
          plan: selectedPlan,
          employees: 0,
          mrr: (() => {
            if (selectedPlan === "Basic") return billingCycle === "monthly" ? 599 : 4999 / 12;
            if (selectedPlan === "Starter") return billingCycle === "monthly" ? 1499 : 12999 / 12;
            return 0; // Enterprise is Custom
          })(),
          registeredAt: new Date().toISOString()
        };
        setCompanies(prev => [...prev, newCompany]);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setAuthError(err.message || "Registration failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop with exit animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      {/* Modal Card with pop animation */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto relative z-10 flex flex-col scrollbar-thin"
        id="registration-modal-card"
      >
        
        {/* Header - Sticky top for layout stability */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-xs">
              <Camera className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 leading-none">
                Create Your Presensic Account
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">
                SaaS Verification • 3-Day Free Trial
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content body */}
        <div className="p-6 sm:p-8 flex-1">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="registration-form"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                
                {/* Manual Registration Message */}
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                  <div className="space-y-0.5 text-left">
                    <p className="text-xs font-bold font-display text-slate-800 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-brand-600" /> Secure Registration
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Enter your details manually to create your secure organization portal.
                    </p>
                    {authError && (
                      <p className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {authError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Elements */}
                <form onSubmit={handleSubmit} className="space-y-5 text-left">
                  
                  {/* Row 1: Name and Email */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="modal-name" className="text-xs font-bold text-slate-700 font-display flex items-center gap-1">
                        Full Name <span className="text-brand-600">*</span>
                      </label>
                      <input
                        id="modal-name"
                        type="text"
                        placeholder="e.g. John Doe"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (errors.fullName) {
                            setErrors(prev => {
                              const copy = { ...prev };
                              delete copy.fullName;
                              return copy;
                            });
                          }
                        }}
                        className={`w-full bg-white border ${errors.fullName ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-200 focus:border-brand-500 focus:ring-brand-200"} rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-xs`}
                      />
                      {errors.fullName && <p className="text-[10px] text-red-500 font-medium flex items-center gap-0.5 mt-0.5"><AlertCircle className="h-3 w-3 shrink-0" /> {errors.fullName}</p>}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="modal-whatsapp" className="text-xs font-bold text-slate-700 font-display flex items-center gap-1">
                        WhatsApp Number <span className="text-brand-600">*</span>
                      </label>
                      <input
                        id="modal-whatsapp"
                        type="tel"
                        placeholder="e.g. +91-98765-43210"
                        value={whatsApp}
                        onChange={(e) => {
                          setWhatsApp(e.target.value);
                          if (errors.whatsApp) {
                            setErrors(prev => {
                              const copy = { ...prev };
                              delete copy.whatsApp;
                              return copy;
                            });
                          }
                        }}
                        className={`w-full bg-white border ${errors.whatsApp ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-200 focus:border-brand-500 focus:ring-brand-200"} rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-xs`}
                      />
                      {errors.whatsApp && <p className="text-[10px] text-red-500 font-medium flex items-center gap-0.5 mt-0.5"><AlertCircle className="h-3 w-3 shrink-0" /> {errors.whatsApp}</p>}
                    </div>
                  </div>

                  {/* Row 2: Organization Name */}
                  <div className="space-y-1">
                    <label htmlFor="modal-org-name" className="text-xs font-bold text-slate-700 font-display flex items-center gap-1">
                      Company Name <span className="text-brand-600">*</span>
                    </label>
                    <input
                      id="modal-org-name"
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={orgName}
                      onChange={(e) => {
                        setOrgName(e.target.value);
                        if (errors.orgName) {
                          setErrors(prev => {
                            const copy = { ...prev };
                            delete copy.orgName;
                            return copy;
                          });
                        }
                      }}
                      className={`w-full bg-white border ${errors.orgName ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-200 focus:border-brand-500 focus:ring-brand-200"} rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-xs`}
                    />
                    {errors.orgName && <p className="text-[10px] text-red-500 font-medium flex items-center gap-0.5 mt-0.5"><AlertCircle className="h-3 w-3 shrink-0" /> {errors.orgName}</p>}
                  </div>

                  {/* Password Fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="modal-password" className="text-xs font-bold text-slate-700 font-display flex items-center gap-1">
                        Create Password <span className="text-brand-600">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          id="modal-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min. 8 characters"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) {
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.password;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full bg-white border ${errors.password ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-200 focus:border-brand-500 focus:ring-brand-200"} rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-xs`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-[10px] text-red-500 font-medium flex items-center gap-0.5 mt-0.5"><AlertCircle className="h-3 w-3 shrink-0" /> {errors.password}</p>}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="modal-confirm-password" className="text-xs font-bold text-slate-700 font-display flex items-center gap-1">
                        Confirm Password <span className="text-brand-600">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          id="modal-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errors.confirmPassword) {
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.confirmPassword;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full bg-white border ${errors.confirmPassword || (confirmPassword.length > 0 && confirmPassword !== password) ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-200 focus:border-brand-500 focus:ring-brand-200"} rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-xs`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {(errors.confirmPassword || (confirmPassword.length > 0 && confirmPassword !== password)) && (
                        <p className="text-[10px] text-red-500 font-medium flex items-center gap-0.5 mt-0.5"><AlertCircle className="h-3 w-3 shrink-0" /> {errors.confirmPassword || "Passwords do not match"}</p>
                      )}
                    </div>
                  </div>


                  {/* Combined Plan & Billing Selector */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Select Plan <span className="text-brand-600">*</span>
                    </label>
                    <select
                      value={`${selectedPlan}|${billingCycle}`}
                      onChange={(e) => {
                        const [plan, cycle] = e.target.value.split("|");
                        setSelectedPlan(plan as any);
                        setBillingCycle(cycle as any);
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:bg-white text-xs font-medium text-slate-900 rounded-xl outline-none transition-all cursor-pointer appearance-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                    >
                      <option value="Basic|monthly">Basic – Monthly (₹599/month, Up to 10 users)</option>
                      <option value="Basic|annually">Basic – Annually (₹4999/year, Up to 10 users)</option>
                      <option value="Starter|monthly">Starter – Monthly (₹1499/month, Up to 50 users)</option>
                      <option value="Starter|annually">Starter – Annually (₹12,999/year, Up to 50 users)</option>
                      <option value="Enterprise|monthly">Enterprise – Monthly (Custom Pricing, Unlimited users)</option>
                      <option value="Enterprise|annually">Enterprise – Annually (Custom Pricing, Unlimited users)</option>
                    </select>
                  </div>

                  {/* Office Location Picker */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Official Office Location <span className="text-brand-600">*</span>
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Capture your exact office coordinates for geofencing security.
                      </p>
                    </div>

                    {!locationCaptured ? (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={handleCaptureLocation}
                        disabled={isCapturing}
                        className="w-full bg-blue-50/50 text-blue-600 p-6 rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-400 transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-50"
                      >
                        <div className={`h-12 w-12 ${isCapturing ? 'bg-blue-200 animate-pulse' : 'bg-blue-100'} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Target className={`h-6 w-6 ${isCapturing ? 'animate-spin' : ''}`} />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-sm">Capture My Office Location</p>
                          <p className="text-[10px] text-blue-500 font-medium">{isCapturing ? 'Reading GPS...' : 'Uses high-accuracy geolocation'}</p>
                        </div>
                      </motion.button>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">Captured Coordinates</p>
                              <p className="text-sm font-bold text-slate-800 tabular-nums">
                                {officeLat?.toFixed(6)}, {officeLng?.toFixed(6)}
                              </p>
                            </div>
                          </div>
                          <motion.button 
                            whileHover={{ rotate: 15 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={handleCaptureLocation}
                            disabled={isCapturing}
                            className="h-9 w-9 bg-white text-slate-400 hover:text-brand-600 rounded-xl flex items-center justify-center shadow-xs border border-slate-200/60 transition-all hover:border-brand-200 disabled:opacity-50"
                            title="Recapture"
                          >
                            <RotateCcw className={`h-4 w-4 ${isCapturing ? 'animate-spin' : ''}`} />
                          </motion.button>
                        </div>

                        {accuracy !== null && (
                          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200/60 w-fit">
                            <div className={`h-1.5 w-1.5 rounded-full ${accuracy < 30 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <p className="text-[10px] font-bold text-slate-500">
                              Accuracy: <span className="text-slate-700">{accuracy.toFixed(1)}m</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {errors.location && (
                      <p className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                        <AlertCircle className="h-3 w-3 shrink-0" /> {errors.location}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-100">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={isSubmitting || !locationCaptured}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold font-display text-sm py-3 px-4 rounded-xl shadow-lg shadow-brand-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Provisioning Security Workspace...
                        </>
                      ) : (
                        <>
                          Register & Start Free Trial
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </motion.button>
                    
                    <p className="text-[10px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
                      <Lock className="h-3 w-3 text-slate-400" /> Secure 256-bit encrypted SSL onboarding line
                    </p>
                  </div>

                </form>

              </motion.div>
            ) : (
              
              /* Successful Submission/Confirmation State screen */
              <motion.div
                key="registration-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-12 flex flex-col items-center text-center space-y-5"
              >
                <div className="h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-md">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">
                    Welcome to Presensic!
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md">
                    Hi <span className="font-bold text-brand-700">{fullName}</span>, your secure organization tenant space has been successfully provisioned.
                  </p>
                </div>

                {/* Compilation Box with Details */}
                <div className="w-full max-w-md bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left space-y-3 shadow-xs">
                  <div className="flex justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">PARAMETER</span>
                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">VALUE</span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-display text-slate-800">
                    <span className="text-slate-500">Registered Organization</span>
                    <span className="font-bold">{orgName}</span>
                  </div>

                  <div className="flex justify-between text-xs font-display text-slate-800">
                    <span className="text-slate-500">Workforce Account Role</span>
                    <span className="font-bold capitalize">{role} Account</span>
                  </div>

                  <div className="flex justify-between text-xs font-display text-slate-800">
                    <span className="text-slate-500">Account WhatsApp</span>
                    <span className="font-mono text-[11px] font-bold">{whatsApp}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200/50 rounded-xl text-xs text-emerald-800 font-display max-w-sm">
                  We have dispatched onboarding credentials and quick GPS setup tools to your WhatsApp.
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (onEnterDashboard) {
                      onEnterDashboard(role, {
                        name: fullName,
                        whatsApp: whatsApp,
                        orgName: orgName,
                        designation: "Admin",
                        plan: selectedPlan
                      });
                    }
                    onClose();
                  }}
                  className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold font-display text-xs transition-all shadow-md cursor-pointer"
                >
                  Enter Workspace Dashboard
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </motion.div>
  );
}
