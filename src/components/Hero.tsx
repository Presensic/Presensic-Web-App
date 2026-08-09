import { ArrowRight, Play, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface HeroProps {
  onOpenModal: () => void;
  onLogIn: () => void;
}

export default function Hero({ onOpenModal, onLogIn }: HeroProps) {
  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen pt-32 pb-24 flex items-center justify-center overflow-hidden bg-gradient-to-b from-brand-50 via-white to-slate-50 text-slate-800"
    >
      {/* Background Decorative Blobs */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-24 right-10 w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
      
      {/* Mesh lines pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,132,199,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col items-center">
          
          {/* Main Hero Content */}
          <div className="flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
            
            {/* Promo Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-xs font-semibold font-mono">
              <Sparkles className="h-3 w-3 text-brand-500" />
              <span>Next-Gen Workforce Attendance SaaS</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight text-slate-900 leading-tight">
              Verify Workforce Location <br />
              <span className="bg-gradient-to-r from-brand-700 via-brand-500 to-sky-600 bg-clip-text text-transparent">
                Instantly with a Selfie
              </span>
            </h1>

            {/* Subheadline (Literal explanation based on request) */}
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
              Presensic uses biometric selfie verification paired with GPS geo-tagging and geo-fencing for real-time employee attendance tracking—completely secure and fraud-proof.
            </p>

            {/* Quick trust metrics */}
            <div className="flex flex-wrap justify-center gap-6 py-2 text-sm text-slate-500 w-full">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>No Hardware Needed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Anti-Spoofing AI</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Geo-fenced Bounds</span>
              </div>
            </div>

            {/* Call To Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenModal()}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold font-display text-base shadow-lg shadow-brand-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                Start Your 3-Day Free Trial
                <ArrowRight className="h-4 w-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleScrollTo("how-it-works")}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold font-display text-base transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-slate-800 text-slate-800" />
                See How It Works
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLogIn}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold font-display text-base transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                Log In
              </motion.button>
            </div>
          </div>
      </div>
    </section>
  );
}
