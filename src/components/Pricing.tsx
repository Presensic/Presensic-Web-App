import { useState } from "react";
import { Check, Info, Sparkles, Building2, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface PricingProps {
  onOpenModal: (employeeCount?: string) => void;
}

export default function Pricing({ onOpenModal }: PricingProps) {
  // States for toggling monthly/annual billing for Basic and Starter individually
  const [basicBilling, setBasicBilling] = useState<"monthly" | "annual">("monthly");
  const [starterBilling, setStarterBilling] = useState<"monthly" | "annual">("monthly");

  const basicFeatures = [
    "Selfie check-in with location verification",
    "Real-time GPS Geo-tagging proof",
    "Admin web portal dashboard",
    "Timesheet export to Excel/CSV",
    "1 Admin account & basic email support",
  ];

  const starterFeatures = [
    "Everything in Basic included",
    "GPS Geo-fencing strict block boundaries",
    "Anti-spoof facial selfie verification",
    "Dynamic reports with audit logging",
    "WhatsApp & Email instant shift alerts",
    "₹45/month per additional user over 50",
  ];

  const enterpriseFeatures = [
    "Everything in Starter included",
    "Unlimited active users & admins",
    "Custom HRMS & API system integration",
    "Priority SLA & dedicated onboarding",
    "Custom reporting & enterprise dashboard",
    "On-demand face-matching model tuning",
  ];

  return (
    <section
      id="pricing"
      className="py-24 bg-slate-50 text-slate-800 relative overflow-hidden"
    >
      {/* Background visual glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold font-mono tracking-widest text-brand-600 uppercase">
            Pricing Plans
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-slate-900">
            Simple, Transparent Pricing
          </h2>
          <p className="text-base text-slate-600">
            No long term contracts. Choose the plan that perfectly matches your workforce scale.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          
          {/* CARD 1: Basic Plan */}
          <div className="relative bg-white border border-slate-200/80 rounded-[24px] p-8 flex flex-col justify-between hover:border-slate-300 transition-all shadow-md">
            
            {/* 5-Day Free Trial Ribbon */}
            <div className="absolute top-4 left-4 right-4 bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold font-mono py-1 px-3 rounded-full text-center tracking-wider shadow-xs">
              5-Day Free Trial — No Credit Card Required
            </div>

            <div className="pt-8 text-left">
              <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">
                Basic Plan
              </span>
              <h3 className="text-2xl font-bold font-display text-slate-900 mt-1">Basic</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed min-h-[36px]">
                For teams under 10 users. Standard attendance with location tags.
              </p>

              {/* Monthly/Annual Toggle directly inside card */}
              <div className="mt-6 flex items-center justify-between p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setBasicBilling("monthly")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold font-display cursor-pointer transition-all ${
                    basicBilling === "monthly" ? "bg-brand-600 text-white shadow" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Bill Monthly
                </button>
                <button
                  onClick={() => setBasicBilling("annual")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold font-display cursor-pointer transition-all ${
                    basicBilling === "annual" ? "bg-brand-600 text-white shadow" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Bill Annually
                </button>
              </div>

              {/* Price display */}
              <div className="mt-6 flex flex-col items-start justify-center">
                {basicBilling === "monthly" ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-950 tracking-tight">₹599</span>
                      <span className="text-sm font-medium text-slate-500">/ month</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">Billed monthly (Cancel anytime)</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-950 tracking-tight">₹4,999</span>
                      <span className="text-sm font-medium text-slate-500">/ year</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono font-semibold mt-1 flex items-center gap-1">
                      ★ Save over 3 months (effective ₹416/month)
                    </span>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="my-6 h-[1px] bg-slate-200/60" />

              {/* Features List */}
              <ul className="space-y-3.5">
                {basicFeatures.map((feat, idx) => (
                  <li key={`basic-feat-${idx}`} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-normal">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenModal("Under 10")}
                className="block w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold font-display text-xs text-center transition-all cursor-pointer shadow-xs"
              >
                Start Free Trial
              </motion.button>
            </div>

          </div>


          {/* CARD 2: Starter Plan (Most Popular) */}
          <div className="relative bg-white border-2 border-brand-500 rounded-[24px] p-8 flex flex-col justify-between hover:scale-[1.02] transition-all shadow-xl shadow-brand-500/5">
            
            {/* Popular Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-[10px] font-bold font-mono tracking-widest px-4 py-1 rounded-full uppercase shadow">
              Most Popular
            </div>

            {/* 5-Day Free Trial Ribbon */}
            <div className="absolute top-4 left-4 right-4 bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold font-mono py-1 px-3 rounded-full text-center tracking-wider shadow-xs">
              5-Day Free Trial — No Credit Card Required
            </div>

            <div className="pt-8 text-left">
              <span className="text-xs font-bold font-mono tracking-widest text-brand-600 uppercase flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Growth Teams
              </span>
              <h3 className="text-2xl font-bold font-display text-slate-900 mt-1">Starter</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed min-h-[36px]">
                Up to 50 users included. Advanced anti-spoof checks and geo-fenced boundaries.
              </p>

              {/* Monthly/Annual Toggle directly inside card */}
              <div className="mt-6 flex items-center justify-between p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setStarterBilling("monthly")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold font-display cursor-pointer transition-all ${
                    starterBilling === "monthly" ? "bg-brand-600 text-white shadow" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Bill Monthly
                </button>
                <button
                  onClick={() => setStarterBilling("annual")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold font-display cursor-pointer transition-all ${
                    starterBilling === "annual" ? "bg-brand-600 text-white shadow" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Bill Annually
                </button>
              </div>

              {/* Price display */}
              <div className="mt-6 flex flex-col items-start justify-center">
                {starterBilling === "monthly" ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-950 tracking-tight">₹1,499</span>
                      <span className="text-sm font-medium text-slate-500">/ month</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">Billed monthly (Cancel anytime)</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-950 tracking-tight">₹12,999</span>
                      <span className="text-sm font-medium text-slate-500">/ year</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono font-semibold mt-1 flex items-center gap-1">
                      ★ Save over 3 months (effective ₹1083/month)
                    </span>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="my-6 h-[1px] bg-slate-200/60" />

              {/* Features List */}
              <ul className="space-y-3.5">
                {starterFeatures.map((feat, idx) => (
                  <li key={`starter-feat-${idx}`} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-normal">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenModal("10–50")}
                className="block w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold font-display text-xs text-center transition-all cursor-pointer shadow-md"
              >
                Start Free Trial
              </motion.button>
            </div>

          </div>


          {/* CARD 3: Enterprise Plan */}
          <div className="relative bg-white border border-slate-200/80 rounded-[24px] p-8 flex flex-col justify-between hover:border-slate-300 transition-all shadow-md">
            
            {/* 5-Day Free Trial Ribbon */}
            <div className="absolute top-4 left-4 right-4 bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold font-mono py-1 px-3 rounded-full text-center tracking-wider shadow-xs">
              5-Day Free Trial — No Credit Card Required
            </div>

            <div className="pt-8 text-left">
              <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-brand-600" /> Large Scales
              </span>
              <h3 className="text-2xl font-bold font-display text-slate-900 mt-1">Enterprise</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed min-h-[36px]">
                Unlimited users. Custom integrations, dedicated support onboarding & premium SLA.
              </p>

              {/* Fake Toggle for layout symmetry */}
              <div className="mt-6 flex items-center justify-between p-1.5 bg-slate-100 rounded-xl border border-slate-200 opacity-65 select-none">
                <button disabled className="flex-1 text-center py-1.5 rounded-lg text-xs font-bold font-display text-slate-500">
                  Corporate Tier
                </button>
              </div>

              {/* Price display */}
              <div className="mt-6 flex flex-col items-start justify-center">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-950 tracking-tight">Custom Pricing</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1">Tailored for large, multi-site workforces (they have to contact sales)</span>
              </div>

              {/* Divider */}
              <div className="my-6 h-[1px] bg-slate-200/60" />

              {/* Features List */}
              <ul className="space-y-3.5">
                {enterpriseFeatures.map((feat, idx) => (
                  <li key={`enterprise-feat-${idx}`} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-normal">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open(`https://wa.me/918104468397?text=${encodeURIComponent("Hi Presensic team, I'm interested in the Enterprise plan for my organization. Please share more details.")}`, "_blank")}
                className="block w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold font-display text-xs text-center transition-all cursor-pointer shadow-xs"
              >
                Talk to Sales
              </motion.button>
            </div>

          </div>

        </div>

        {/* Pricing Help Notice */}
        <p className="text-xs text-slate-500 mt-12 flex items-center justify-center gap-1">
          <Info className="h-3.5 w-3.5 text-brand-600" />
          <span>Have specific API sync or custom HRMS requirements? Let us know in the contact form below.</span>
        </p>

      </div>
    </section>
  );
}
