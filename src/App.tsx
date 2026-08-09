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
  // Synchronously restore user from localStorage
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('presensic_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<string>(() => {
    const savedView = localStorage.getItem("presensic_current_view");
    const savedUser = localStorage.getItem("presensic_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.role === 'employer' || parsed.companyName) return 'employer_dashboard';
      if (parsed.role === 'master_admin' || parsed.isMasterAdmin) return 'master_admin';
      return (parsed.faceRegistered || parsed.face_registered) ? 'employee_dashboard' : 'face_registration';
    }
    return savedView || "home";
  });

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [loginInitialTab, setLoginInitialTab] = useState<"employee" | "employer">("employee");

  // Shared state containers with default empty array fallbacks to prevent runtime crashes
  const [employees, setEmployees] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (currentView) {
      localStorage.setItem("presensic_current_view", currentView);
    }
  }, [currentView]);

  const handleLoginSuccess = (userData: any) => {
    const userPayload = userData?.role ? userData : { ...userData, role: 'employee' };
    localStorage.setItem("presensic_user", JSON.stringify(userPayload));
    
    const isEmployer = userPayload.role === 'employer' || (Boolean(userPayload.companyName) && userPayload.role !== 'employee');
    const targetView = isEmployer
      ? 'employer_dashboard' 
      : ((userPayload.faceRegistered || userPayload.face_registered) ? 'employee_dashboard' : 'face_registration');
      
    localStorage.setItem("presensic_current_view", targetView);
    setCurrentUser(userPayload);
    setCurrentView(targetView);
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("presensic_user");
    localStorage.removeItem("presensic_current_view");
    setCurrentView("home");
  };

  // ==========================================
  // ROUTE GUARD 1: LOGGED-IN USERS ONLY
  // ==========================================
  if (currentUser) {
    // Master Admin Dashboard
    if (currentUser.role === 'master_admin' || currentUser.isMasterAdmin || currentView === 'master_admin') {
      return (
        <ErrorBoundary>
          <MasterAdminDashboard onLogOut={handleLogOut} user={currentUser} />
        </ErrorBoundary>
      );
    }

    // Employer Dashboard
    if (currentUser.role === 'employer' || (currentUser.companyName && currentUser.role !== 'employee') || currentView === 'employer_dashboard') {
      return (
        <ErrorBoundary>
          <EmployerDashboard 
            onLogOut={handleLogOut} 
            onLogout={handleLogOut} 
            user={currentUser} 
            currentUser={currentUser}
            employees={employees || []}
            setEmployees={setEmployees}
            logs={logs || []}
            setLogs={setLogs}
            leaves={leaves || []}
            setLeaves={setLeaves}
            companies={companies || []}
            setCompanies={setCompanies}
            tickets={tickets || []}
            setTickets={setTickets}
          />
        </ErrorBoundary>
      );
    }

    // Employee Flow: Face Registration vs Employee Dashboard
    const isFaceRegistered = Boolean(currentUser.faceRegistered || currentUser.face_registered);

    if (!isFaceRegistered && currentView === 'face_registration') {
      return (
        <ErrorBoundary>
          <FaceRegistration 
            onBack={handleLogOut}
            onComplete={(res: any) => {
              const updated = { ...currentUser, faceRegistered: true, face_registered: true };
              localStorage.setItem("presensic_user", JSON.stringify(updated));
              localStorage.setItem("presensic_current_view", "employee_dashboard");
              setCurrentUser(updated);
              setCurrentView("employee_dashboard");
            }}
            currentUser={currentUser}
            user={currentUser}
            employeeUser={currentUser}
          />
        </ErrorBoundary>
      );
    }

    // Default Logged-In Fallback: Render Employee Dashboard (AI Studio Clock / Check In UI)
    return (
      <ErrorBoundary>
        <EmployeeDashboard 
          onLogOut={handleLogOut}
          onLogout={handleLogOut}
          employeeUser={currentUser}
          user={currentUser}
          setEmployeeUser={setCurrentUser}
          employees={employees || []}
          setEmployees={setEmployees}
          logs={logs || []}
          setLogs={setLogs}
          leaves={leaves || []}
          setLeaves={setLeaves}
          companies={companies || []}
          tickets={tickets || []}
          setTickets={setTickets}
        />
      </ErrorBoundary>
    );
  }

  // ==========================================
  // ROUTE GUARD 2: UNAUTHENTICATED (PUBLIC)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">
      <ErrorBoundary>
        {currentView === "login" ? (
          <LoginScreen
            initialTab={loginInitialTab}
            onBackToHome={() => setCurrentView("home")}
            onEnterDashboard={(role, data) => handleLoginSuccess(data)}
            onLoginSuccess={handleLoginSuccess}
            employees={employees || []}
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
            companies={companies || []}
            setCompanies={setCompanies}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
