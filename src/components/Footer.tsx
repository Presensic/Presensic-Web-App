import React, { MouseEvent } from "react";
import { Camera, Shield, Phone, Mail, Globe, MapPin } from "lucide-react";

// Social media URLs - easy to customize and swap
const SOCIAL_LINKS = {
  facebook: "#",
  instagram: "#",
  x: "#",
  linkedin: "#",
  youtube: "#",
  whatsapp: "https://wa.me/918104468397",
};

// Custom inline SVG icons for perfect, modern branding logos
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

const WhatsappIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

export default function Footer() {
  const socialPlatforms = [
    { name: "Facebook", url: SOCIAL_LINKS.facebook, icon: <FacebookIcon /> },
    { name: "Instagram", url: SOCIAL_LINKS.instagram, icon: <InstagramIcon /> },
    { name: "X", url: SOCIAL_LINKS.x, icon: <XIcon /> },
    { name: "LinkedIn", url: SOCIAL_LINKS.linkedin, icon: <LinkedinIcon /> },
    { name: "YouTube", url: SOCIAL_LINKS.youtube, icon: <YoutubeIcon /> },
    { name: "WhatsApp", url: SOCIAL_LINKS.whatsapp, icon: <WhatsappIcon /> },
  ];

  const handleScrollTo = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
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
    <footer className="bg-slate-50 text-slate-800 pt-16 pb-12 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-slate-200/60">
          
          {/* Logo & Info Block */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white shadow-md">
                <Camera className="h-5 w-5" />
                <div className="absolute -bottom-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-white flex items-center justify-center border border-slate-150">
                  <Shield className="h-2.5 w-2.5 text-emerald-500" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold font-display tracking-tight text-slate-900 leading-none">
                  Presensic
                </span>
                <span className="block text-[10px] text-brand-700 font-mono tracking-widest uppercase">
                  SaaS Workforce Verification
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
              Presensic uses biometric selfie verification paired with GPS geo-tagging and geo-fencing for real-time employee attendance tracking—completely secure and fraud-proof.
            </p>

            <div className="pt-2 text-slate-500 text-[10px] font-mono">
              © {new Date().getFullYear()} Presensic Inc. All rights reserved.
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="lg:col-span-3 text-left space-y-4">
            <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-500">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleScrollTo(e, "how-it-works")}
                  className="hover:text-brand-600 transition-colors cursor-pointer"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#zero-hardware"
                  onClick={(e) => handleScrollTo(e, "zero-hardware")}
                  className="hover:text-brand-600 transition-colors cursor-pointer"
                >
                  Zero Hardware
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(e) => handleScrollTo(e, "pricing")}
                  className="hover:text-brand-600 transition-colors cursor-pointer"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#contact-us"
                  onClick={(e) => handleScrollTo(e, "contact-us")}
                  className="hover:text-brand-600 transition-colors cursor-pointer"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contacts & Support Column */}
          <div className="lg:col-span-5 text-left space-y-4">
            <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-500">
              Support & Inquiries
            </h4>
            
            <div className="space-y-3.5 text-xs text-slate-700">
              
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="text-[10px] text-slate-500 font-mono">EMAIL DIRECT</p>
                  <a href="mailto:presensic@gmail.com" className="hover:text-brand-600 hover:underline">
                    presensic@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                <div className="leading-snug space-y-1">
                  <p className="text-[10px] text-slate-500 font-mono">SUPPORT DIRECT PHONES</p>
                  <div className="space-y-0.5 font-bold text-slate-900">
                    <p className="hover:text-brand-600 transition-colors">+91-90486-18039</p>
                    <p className="hover:text-brand-600 transition-colors">+91-81044-68397</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                <div className="leading-snug text-slate-600">
                  <p className="text-[10px] text-slate-500 font-mono">LOCATIONS</p>
                  <span>India Operations Hub & Hybrid Teams</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="text-center sm:text-left">
            Designed with professional precision. Cloud host status: <span className="text-emerald-600 font-mono font-bold">100% Active</span>
          </p>
          
          {/* Social Brand Icons */}
          <div className="flex flex-row flex-nowrap items-center justify-center sm:justify-end gap-1.5 xs:gap-2 sm:gap-3">
            {socialPlatforms.map((platform, idx) => (
              <a 
                key={`footer-social-${platform.name}-${idx}`}
                href={platform.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-slate-200/50 hover:bg-slate-200 hover:scale-105 hover:shadow-xs text-slate-600 hover:text-brand-600 transition-all cursor-pointer border border-slate-300/20 shrink-0"
                aria-label={platform.name}
              >
                <span className="scale-90 sm:scale-100 flex items-center justify-center shrink-0">
                  {platform.icon}
                </span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
