import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import ZeroHardware from "./components/ZeroHardware";
import Pricing from "./components/Pricing";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";
import { LeaveRequest } from "./types";
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
      const savedUser = localStorage.getItem("presensic_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  
  console.log('Current User on Render:', currentUser);

  // Force render check for logged-in users is handled by the initializer below
  
  const [currentView, setCurrentView] = useState<
    "home" | "login" | "employer_dashboard" | "employee_dashboard" | "master_admin" | "face_registration"
  >(() => {
    try {
      if (currentUser) {
        if (currentUser.role === "employer") return "employer_dashboard";
        if (currentUser.role === "master_admin") return "master_admin";
        if (currentUser.role === "employee") {
          return currentUser.faceRegistered === false ? "face_registration" : "employee_dashboard";
        }
      }
      const savedView = localStorage.getItem("presensic_current_view");
      return (savedView as any) || "home";
    } catch {
      return "home";
    }
  });

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerEmployeeCount, setRegisterEmployeeCount] = useState("");
  const [loginInitialTab, setLoginInitialTab] = useState<"employee" | "employer">("employee");
  const [employeeUser, setEmployeeUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    localStorage.setItem("presensic_current_view", currentView);
  }, [currentView]);

  useEffect(() => {
    if (!currentUser) {
      setCurrentView("home");
    }
  }, [currentUser]);

  const handleEnterDashboard = (rawRole: "employer" | "employee", userData?: any) => {
    const role = userData?.role || (userData?.isMasterAdmin ? "master_admin" : rawRole);
    const userPayload = { ...(userData || {}), role };

    setCurrentUser(userPayload);
    localStorage.setItem("presensic_user", JSON.stringify(userPayload));

    if (role === "employer") {
      setCurrentView("employer_dashboard");
    } else if (role === "master_admin" || userData?.isMasterAdmin) {
      setCurrentView("master_admin");
    } else {
      setEmployeeUser(userPayload);
      if (userPayload.faceRegistered === false) {
        setCurrentView("face_registration");
      } else {
        setCurrentView("employee_dashboard");
      }
    }
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("presensic_user");
    localStorage.removeItem("presensic_current_view");
    setCurrentView("home");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <ErrorBoundary>
        {currentView === "home" && (
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

        {currentView === "login" && (
          <LoginScreen
            initialTab={loginInitialTab}
            onBackToHome={() => setCurrentView("home")}
            onEnterDashboard={handleEnterDashboard}
            employees={employees}
            onOpenRegisterModal={() => { setCurrentView("home"); setIsRegisterModalOpen(true); }}
          />
        )}

        {currentView === "employer_dashboard" && (
          <EmployerDashboard
            onLogOut={handleLogOut}
            employees={employees}
            setEmployees={setEmployees}
            logs={logs}
            setLogs={setLogs}
            leaves={leaves}
            setLeaves={setLeaves}
            companies={companies}
            setCompanies={setCompanies}
            tickets={tickets}
            setTickets={setTickets}
          />
        )}

        {currentView === "employee_dashboard" && (
          <EmployeeDashboard
            onLogOut={handleLogOut}
            employeeUser={employeeUser}
            setEmployeeUser={setEmployeeUser}
            employees={employees}
            setEmployees={setEmployees}
            logs={logs}
            setLogs={setLogs}
            leaves={leaves}
            setLeaves={setLeaves}
            companies={companies}
            tickets={tickets}
            setTickets={setTickets}
          />
        )}

        {currentView === "master_admin" && <MasterAdminDashboard onLogOut={handleLogOut} />}

        {currentView === "face_registration" && (
          <FaceRegistration
            onBack={() => setCurrentView("employee_dashboard")}
            employeeName={employeeUser?.name || "Employee"}
            onComplete={(res) => {
              if (res?.faceDetected) {
                setCurrentView("employee_dashboard");
              } else if (res?.skipped) {
                setCurrentView("employee_dashboard");
              }
            }}
          />
        )}

        {isRegisterModalOpen && (
          <RegistrationModal
            isOpen={isRegisterModalOpen}
            onClose={() => setIsRegisterModalOpen(false)}
            initialEmployeeCount={registerEmployeeCount}
            onEnterDashboard={handleEnterDashboard}
            companies={companies}
            setCompanies={setCompanies}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
