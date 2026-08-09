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
      const saved = localStorage.getItem('presensic_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("presensic_current_view");
      return saved || "home";
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

  const handleLoginSuccess = (userData: any) => {
    localStorage.setItem("presensic_user", JSON.stringify(userData));
    setCurrentUser(userData);
    const targetView = userData.faceRegistered ? 'employee_dashboard' : 'face_registration';
    localStorage.setItem("presensic_current_view", targetView);
    setCurrentView(targetView);
  };

  const handleEnterDashboard = (rawRole: "employer" | "employee", userData?: any) => {
    const role = userData?.role || (userData?.isMasterAdmin ? "master_admin" : rawRole);
    const userPayload = { ...(userData || {}), role };

    localStorage.setItem("presensic_user", JSON.stringify(userPayload));
    setCurrentUser(userPayload);

    let targetView = "employee_dashboard";
    if (role === "employer") {
      targetView = "employer_dashboard";
    } else if (role === "master_admin" || userData?.isMasterAdmin) {
      targetView = "master_admin";
    } else {
      setEmployeeUser(userPayload);
      targetView = userPayload.faceRegistered === false ? "face_registration" : "employee_dashboard";
    }
    
    localStorage.setItem("presensic_current_view", targetView);
    setCurrentView(targetView);
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("presensic_user");
    localStorage.removeItem("presensic_current_view");
    setCurrentView("home");
  };

  // Render logic
  if (currentUser && currentUser.id) {
    if (currentUser.role === 'employer') {
        return (
          <ErrorBoundary>
            <EmployerDashboard
              onLogOut={handleLogOut}
              user={currentUser}
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
          </ErrorBoundary>
        );
    }
    if (currentUser.role === 'master_admin') {
        return (
          <ErrorBoundary>
            <MasterAdminDashboard onLogOut={handleLogOut} user={currentUser} />
          </ErrorBoundary>
        );
    }
    if (!currentUser.faceRegistered) {
      return (
        <FaceRegistration 
          onBack={() => { setCurrentView("home"); setCurrentUser(null); }}
          currentUser={currentUser}
          onComplete={(res: any) => {
            if (res?.faceDetected || res?.skipped) {
              setCurrentUser({...currentUser, faceRegistered: true});
              setCurrentView("employee_dashboard");
            }
          }}
        />
      );
    }
    return (
      <EmployeeDashboard 
        onLogOut={handleLogOut}
        employeeUser={currentUser}
        setEmployeeUser={setCurrentUser}
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
    );
  }

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
            onLoginSuccess={handleLoginSuccess}
            employees={employees}
            onOpenRegisterModal={() => { setCurrentView("home"); setIsRegisterModalOpen(true); }}
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
