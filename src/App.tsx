import React, { useState, useEffect } from "react";
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

interface Props { children: React.ReactNode }
interface State { hasError: boolean, error: any }

class GlobalErrorBoundary extends React.Component<Props, State> {
  props!: Props;
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("App Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-slate-400 mb-6">{this.state.error?.toString()}</p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="bg-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500"
          >
            Clear Session & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Synchronously initialize currentUser state from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
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
  const [registerEmployeeCount, setRegisterEmployeeCount] = useState("");
  const [loginInitialTab, setLoginInitialTab] = useState<"employee" | "employer">("employee");
  const [employees, setEmployees] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    localStorage.setItem("presensic_current_view", currentView);
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

  const handleEnterDashboard = (rawRole: "employer" | "employee", userData?: any) => {
    const role = userData?.role || (userData?.isMasterAdmin ? "master_admin" : rawRole);
    const userPayload = { ...(userData || {}), role };

    localStorage.setItem("presensic_user", JSON.stringify(userPayload));
    setCurrentUser(userPayload);

    let targetView = "employee_dashboard";
    const isEmployer = role === 'employer' || (Boolean(userPayload.companyName) && role !== 'employee');
    if (isEmployer) {
      targetView = "employer_dashboard";
    } else if (role === "master_admin" || userData?.isMasterAdmin) {
      targetView = "master_admin";
    } else {
      targetView = (!userPayload.faceRegistered && !userPayload.face_registered) ? "face_registration" : "employee_dashboard";
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

  return (
    <GlobalErrorBoundary>
      {currentUser ? (
        <>
          {(currentUser.role === 'master_admin' || currentUser.isMasterAdmin) ? (
            <ErrorBoundary>
              <MasterAdminDashboard onLogOut={handleLogOut} user={currentUser} />
            </ErrorBoundary>
          ) : (currentUser.role === 'employer' || (currentUser.companyName && currentUser.role !== 'employee')) ? (
            <ErrorBoundary>
              <EmployerDashboard
                onLogOut={handleLogOut}
                onLogout={handleLogOut}
                user={currentUser}
                currentUser={currentUser}
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
          ) : !(currentUser.faceRegistered || currentUser.face_registered) ? (
            <FaceRegistration 
              onBack={() => { setCurrentView("home"); setCurrentUser(null); }}
              currentUser={currentUser}
              user={currentUser}
              onComplete={(res: any) => {
                if (res?.faceDetected || res?.skipped || res?.success) {
                  const updated = { ...currentUser, faceRegistered: true };
                  localStorage.setItem("presensic_user", JSON.stringify(updated));
                  setCurrentUser(updated);
                  setCurrentView("employee_dashboard");
                }
              }}
            />
          ) : (
            <EmployeeDashboard 
              onLogOut={handleLogOut}
              onLogout={handleLogOut}
              employeeUser={currentUser}
              user={currentUser}
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
          )}
        </>
      ) : (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
          <ErrorBoundary>
            {currentView === "login" ? (
              <LoginScreen
                initialTab={loginInitialTab}
                onBackToHome={() => setCurrentView("home")}
                onEnterDashboard={handleEnterDashboard}
                onLoginSuccess={handleLoginSuccess}
                employees={employees}
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
                initialEmployeeCount={registerEmployeeCount}
                onEnterDashboard={handleEnterDashboard}
                companies={companies}
                setCompanies={setCompanies}
              />
            )}
          </ErrorBoundary>
        </div>
      )}
    </GlobalErrorBoundary>
  );
}
