import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import ZeroHardware from "./components/ZeroHardware";
import Pricing from "./components/Pricing";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";
import RegistrationModal from "./components/RegistrationModal";
import LoginScreen from "./components/LoginScreen";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('presensic_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<string>(() => {
    return localStorage.getItem("presensic_current_view") || "home";
  });

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [loginInitialTab, setLoginInitialTab] = useState<"employee" | "employer">("employee");

  const handleLoginSuccess = (userData: any) => {
    const userPayload = userData?.role ? userData : { ...userData, role: 'employee' };
    localStorage.setItem("presensic_user", JSON.stringify(userPayload));
    localStorage.setItem("presensic_current_view", "dashboard_active");
    setCurrentUser(userPayload);
    setCurrentView("dashboard_active");
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("presensic_user");
    localStorage.removeItem("presensic_current_view");
    setCurrentView("home");
  };

  // IF USER IS LOGGED IN, RENDER THIS DIRECT SECURE SCREEN (NO CRASHES, NO RELOADS)
  if (currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-white">Login Successful!</h1>
          <p className="text-slate-300 text-sm">
            Welcome, <strong className="text-indigo-400">{currentUser.name || currentUser.id}</strong>
          </p>
          <div className="p-3 bg-slate-900/60 rounded-xl text-xs text-slate-400 text-left space-y-1 font-mono">
            <div><strong>ID:</strong> {currentUser.id}</div>
            <div><strong>Role:</strong> {currentUser.role}</div>
            <div><strong>Org:</strong> {currentUser.orgName || 'Presensic'}</div>
          </div>
          <button
            onClick={handleLogOut}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // LANDING PAGE RENDER
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">
      {currentView === "login" ? (
        <LoginScreen
          initialTab={loginInitialTab}
          onBackToHome={() => setCurrentView("home")}
          onEnterDashboard={(role, data) => handleLoginSuccess(data)}
          onLoginSuccess={handleLoginSuccess}
          employees={[]}
          onOpenRegisterModal={() => { setCurrentView("home"); setIsRegisterModalOpen(true); }}
        />
      ) : (
        <>
          <Navbar onLogIn={() => { setLoginInitialTab("employee"); setCurrentView("login"); }} onOpenModal={() => setIsRegisterModalOpen(true)} />
          <main>
            <Hero onLogIn={() => { setLoginInitialTab("employee"); setCurrentView("login"); }} onOpenModal={() => setIsRegisterModalOpen(true)} />
            <HowItWorks />
            <ZeroHardware />
            <Pricing onOpenModal={() => setIsRegisterModalOpen(true)} />
            <ContactForm />
          </main>
          <Footer />
        </>
      )}

      {isRegisterModalOpen && (
        <RegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          initialEmployeeCount=""
          onEnterDashboard={(role, data) => handleLoginSuccess(data)}
          companies={[]}
          setCompanies={() => {}}
        />
      )}
    </div>
  );
}
