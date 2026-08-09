import { Cpu, Cloud, Smartphone, Zap, CheckCircle2 } from "lucide-react";

export default function ZeroHardware() {
  return (
    <section
      id="zero-hardware"
      className="py-24 bg-slate-50 text-slate-800 relative overflow-hidden"
    >
      {/* Background blobs for visual interest */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-12 right-12 w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main highlight container card */}
        <div className="bg-white border border-brand-100 rounded-[32px] p-8 sm:p-12 lg:p-16 shadow-xl relative overflow-hidden">
          
          {/* Subtle grid accent background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,132,199,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />
          
          {/* Section banner ribbon */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-xs font-bold font-mono uppercase tracking-wider mb-6">
            <Zap className="h-3.5 w-3.5 text-brand-500" />
            <span>Core Business Differentiator</span>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left text column */}
            <div className="lg:col-span-7 text-left space-y-6">
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight text-slate-900 leading-tight">
                Zero Hardware. <br />
                <span className="bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent">
                  Zero Setup Cost.
                </span>
              </h2>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Traditional attendance systems require thousands of dollars in biometric wall scanners, physical ID card printers, and on-premise installation teams. 
              </p>

              <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-bold">
                Presensic replaces everything with a secure, cloud-hosted SaaS link. Employees check in using their own smartphones.
              </p>

              {/* Differentiating bullet points */}
              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-900">No Scanner Machine</h4>
                    <p className="text-xs text-slate-500 mt-0.5">No hardware maintenance, physical repairs, or terminal sync bugs.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-900">Distributed & Remote OK</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Perfect for delivery agents, field service engineers, and hybrid staff.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-900">10-Minute Setup</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Just register your company portal, upload employee emails, and begin.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-900">No Server Hosting</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Runs on modern, highly secure cloud databases. We handle backups.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right comparison graphic column */}
            <div className="lg:col-span-5 w-full flex flex-col gap-4">
              
              {/* Box 1: The Old Way (Crossed out) */}
              <div className="bg-slate-50 border border-red-200 rounded-2xl p-5 text-left relative overflow-hidden group">
                <div className="absolute right-4 top-4 h-6 w-6 rounded-full bg-red-100 border border-red-200 flex items-center justify-center font-bold text-red-600 text-xs select-none">
                  ✕
                </div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-3">
                  Traditional Biometrics
                </h4>
                <div className="space-y-1.5 text-slate-500 text-sm">
                  <p className="line-through flex items-center gap-1.5 text-slate-400">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full" /> Heavy fingerprint hardware (₹15,000+)
                  </p>
                  <p className="line-through flex items-center gap-1.5 text-slate-400">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full" /> Long installation and wiring times
                  </p>
                  <p className="line-through flex items-center gap-1.5 text-slate-400">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full" /> Manual CSV export/import into HR payroll
                  </p>
                </div>
              </div>

              {/* Box 2: The Presensic Way (Highlighted green) */}
              <div className="bg-gradient-to-r from-emerald-50/50 to-brand-50/50 border border-emerald-200 rounded-2xl p-6 text-left relative overflow-hidden shadow-xs">
                <div className="absolute right-4 top-4 h-7 w-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-sm select-none">
                  ✓
                </div>
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
                  <Cloud className="h-4 w-4 text-emerald-600" /> Cloud-Based SaaS Way
                </h4>
                <div className="space-y-2 text-slate-700 text-sm">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Use employee smartphones
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Zero installation & maintenance overhead
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Live dashboards synced instantly
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
