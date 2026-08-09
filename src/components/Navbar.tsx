import React, { useState, useEffect, MouseEvent } from "react";
import { Menu, X, Camera, Shield } from "lucide-react";
import { motion } from "motion/react";

interface NavbarProps {
  onOpenModal: () => void;
  onLogIn: () => void;
}

export default function Navbar({ onOpenModal, onLogIn }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor page scroll to style the header dynamically
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll handler
  const handleScrollTo = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      // Offset for sticky header
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
    setIsOpen(false);
  };

  const navItems = [
    { label: "How It Works", target: "how-it-works" },
    { label: "Zero Hardware", target: "zero-hardware" },
    { label: "Pricing", target: "pricing" },
    { label: "Contact Us", target: "contact-us" }
  ];

  return (
    <header
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 backdrop-blur-md border-b border-slate-200/80 py-3 shadow-sm"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <a
            href="#"
            onClick={(e) => handleScrollTo(e, "hero")}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/10 group-hover:scale-105 transition-all">
              <Camera className="h-5 w-5" />
              <div className="absolute -bottom-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-white flex items-center justify-center border border-slate-100">
                <Shield className="h-2.5 w-2.5 text-emerald-500" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold font-display tracking-tight text-brand-900 leading-none">
                Presensic
              </span>
              <span className="text-[10px] text-brand-700 font-mono tracking-widest uppercase">
                Secured Attendance
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center lg:gap-4 xl:gap-8">
            {navItems.map((item) => (
              <a
                key={`desktop-nav-${item.target}`}
                href={`#${item.target}`}
                onClick={(e) => handleScrollTo(e, item.target)}
                className="text-sm font-medium text-slate-600 hover:text-brand-600 hover:underline transition-colors cursor-pointer whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Action Button & Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onLogIn();
                setIsOpen(false);
              }}
              className="hidden sm:inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold font-display py-2.5 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Log In
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onOpenModal();
                setIsOpen(false);
              }}
              className="hidden sm:inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold font-display py-2.5 px-3 md:px-4 rounded-xl shadow-lg shadow-brand-500/15 transition-all cursor-pointer whitespace-nowrap"
            >
              Start Free Trial
            </motion.button>

            {/* Mobile/Tablet Hamburger Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100 focus:outline-none transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 animate-fadeIn">
          <div className="px-4 pt-2 pb-6 space-y-1.5">
            {navItems.map((item) => (
              <a
                key={`mobile-nav-${item.target}`}
                href={`#${item.target}`}
                onClick={(e) => handleScrollTo(e, item.target)}
                className="block px-3 py-2.5 rounded-xl text-base font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 px-3 flex flex-col gap-2">
              <button
                onClick={() => {
                  onLogIn();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-display font-bold py-3 px-4 rounded-xl active:scale-98 transition-all cursor-pointer"
              >
                Log In to Workspace
              </button>
              <button
                onClick={() => {
                  onOpenModal();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-display font-bold py-3 px-4 rounded-xl shadow-md active:scale-98 transition-all cursor-pointer"
              >
                Start Your 3-Day Free Trial
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
