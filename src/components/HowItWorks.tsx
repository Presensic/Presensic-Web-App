import { STEPS } from "../data/landingData";
import { MapPin, Camera, RefreshCw, Clock, CheckCircle, ShieldAlert } from "lucide-react";

// Helper function to render correct Lucide icon
const getStepIcon = (iconName: string) => {
  switch (iconName) {
    case "MapPin":
      return <MapPin className="h-6 w-6 text-brand-600" />;
    case "Camera":
      return <Camera className="h-6 w-6 text-brand-600" />;
    case "RefreshCw":
      return <RefreshCw className="h-6 w-6 text-brand-600" />;
    case "Clock":
      return <Clock className="h-6 w-6 text-brand-600" />;
    default:
      return <Camera className="h-6 w-6 text-brand-600" />;
  }
};

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 bg-white border-y border-slate-100 text-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold font-mono tracking-widest text-brand-600 uppercase">
            3-Step Flow (plus Clock-Out)
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-slate-900">
            How Presensic Works
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Presensic automates location checks and verification inside a fast, lightweight mobile loop. Here's exactly how it works for your distributed team.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-14 left-16 right-16 h-[2px] bg-slate-100 z-0" />

          {STEPS.map((step, index) => (
            <div 
              key={`step-${step.number}`}
              className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-xs group hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 transition-all"
            >
              {/* Number and Icon Header */}
              <div className="flex items-center justify-between w-full mb-6">
                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                  {getStepIcon(step.iconName)}
                </div>
                <span className="text-4xl font-extrabold font-display text-slate-200 tracking-tight group-hover:text-brand-200 transition-all select-none">
                  0{step.number}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold font-display text-slate-900 mb-2 leading-tight">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}

        </div>

        {/* Highlighted Emphasize Banner */}
        <div className="mt-16 bg-gradient-to-r from-brand-50 via-sky-50 to-brand-50 rounded-2xl border border-brand-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white border border-brand-200 rounded-xl text-brand-600 shrink-0 shadow-xs">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="text-lg font-bold font-display text-brand-900">
                100% Fully Transparent Record System
              </h4>
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                Both employees and managers share access to the exact same visual check-in proof, GPS coordinates, and server timestamp on their respective dashboards. This builds absolute trust and resolves scheduling disputes automatically.
              </p>
            </div>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold uppercase shrink-0">
            Trust Verified
          </div>
        </div>

      </div>
    </section>
  );
}
