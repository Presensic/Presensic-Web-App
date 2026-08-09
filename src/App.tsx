import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import ZeroHardware from "./components/ZeroHardware";
import Pricing from "./components/Pricing";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import FaceRegistration from "./components/FaceRegistration";
import RegistrationModal from "./components/RegistrationModal";
import EmployerDashboard from "./components/EmployerDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import MasterAdminDashboard from "./components/MasterAdminDashboard";
import LoginScreen from "./components/LoginScreen";

export default function App() {
  // 1. Read stored session synchronously on initial mount so reloads preserve login state
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

  useEffect(() => {
    if (currentView) {
      localStorage.setItem("presensic_current_view", currentView);
    }
  }, [currentView]);

  const handleLoginSuccess = (userData: any) => {
    const userPayload = userData?.role ? userData : { ...userData, role: 'employee' };
    localStorage.setItem("presensic_user", JSON.stringify(userPayload));
    setCurrentUser(userPayload);
    
    const isEmployer = userPayload.role === 'employer' || (Boolean(userPayload.companyName) && userPayload.role !== 'employee');
    const targetView = isEmployer
      ? 'employer_dashboard' 
      : ((userPayload.faceRegistered || userPayload.face_registered) ? 'employee_dashboard' : 'face_registration');
      
    localStorage.setItem("presensic_current_view", targetView);
    setCurrentView(targetView);
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("presensic_user");
    localStorage.removeItem("presensic_current_view");
    setCurrentView("home");
  };

  // 2. RENDER ROUTING: If a user exists in session, NEVER fall back to LandingPage
  if (currentUser) {
    if (currentUser.role === 'master_admin' || currentUser.isMasterAdmin) {
      return (
        <ErrorBoundary>
          <MasterAdminDashboard onLogOut={handleLogOut} user={currentUser} />
        </ErrorBoundary>
      );
    }

    if (currentUser.role === 'employer' || (currentUser.companyName && currentUser.role !== 'employee')) {
      return (
        <ErrorBoundary>
          <EmployerDashboard onLogOut={handleLogOut} onLogout={handleLogOut} user={currentUser} currentUser={currentUser} />
        </ErrorBoundary>
      );
    }

    // Employee Flow
    const isFaceRegistered = Boolean(currentUser.faceRegistered || currentUser.face_registered);
    if (!isFaceRegistered && currentView === 'face_registration') {
      return (
        <ErrorBoundary>
          <FaceRegistration 
            onBack={handleLogOut}
            currentUser={currentUser}
            user={currentUser}
            onComplete={(res: any) => {
              const updated = { ...currentUser, faceRegistered: true, face_registered: true };
              localStorage.setItem("presensic_user", JSON.stringify(updated));
              setCurrentUser(updated);
              setCurrentView("employee_dashboard");
            }}
          />
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary>
        <EmployeeDashboard 
          onLogOut={handleLogOut}
          onLogout={handleLogOut}
          employeeUser={currentUser}
          user={currentUser}
          setEmployeeUser={setCurrentUser}
        />
      </ErrorBoundary>
    );
  }

  // 3. Render Landing / Login ONLY when currentUser is strictly null
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">
      <ErrorBoundary>
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
      </ErrorBoundary>
    </div>
  );
}
