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

  // State arrays to prevent component crashes
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

  // 1. ACTIVE LOGGED-IN SESSION
  if (currentUser) {
    // MASTER ADMIN
    if (currentUser.role === 'master_admin' || currentUser.isMasterAdmin) {
      return (
        <ErrorBoundary>
          <MasterAdminDashboard onLogOut={handleLogOut} user={currentUser} />
        </ErrorBoundary>
      );
    }

    // EMPLOYER PORTAL
    if (currentUser.role === 'employer' || (currentUser.companyName && currentUser.role !== 'employee')) {
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

    // EMPLOYEE PORTAL FLOW
    const isFaceRegistered = Boolean(currentUser.faceRegistered || currentUser.face_registered);

    if (!isFaceRegistered && currentView === 'face_registration') {
      return (
        <ErrorBoundary>
          <FaceRegistration 
            onBack={handleLogOut}
            onComplete={(res: any) => {
              const updated = { ...currentUser, faceRegistered: true, face_registered: true };
              localStorage.setItem("presensic_user", JSON.stringify(updated));
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

    // RENDER YOUR REAL EMPLOYEE DASHBOARD (CHECK-IN / CLOCK UI)
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

  // 2. LANDING / LOGIN VIEW
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
