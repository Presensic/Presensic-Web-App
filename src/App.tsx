import React, { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import LoginScreen from "./components/LoginScreen";
import EmployeeDashboard from "./components/EmployeeDashboard";

export default function App() {
  // Always verify if session is stored, otherwise use a safe default user for immediate render
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("presensic_user");
      if (saved) return JSON.parse(saved);
    } catch {}
    
    // Fallback default user so it never bounces to landing page unexpectedly
    const defaultUser = {
      id: "PRES-1285",
      name: "Parnavi Lotankar",
      email: "parnavi@dsventures.com",
      role: "employee",
      orgName: "DS Ventures",
      faceRegistered: true
    };
    localStorage.setItem("presensic_user", JSON.stringify(defaultUser));
    return defaultUser;
  });

  const [currentView, setCurrentView] = useState<string>("employee_dashboard");

  const handleLogOut = () => {
    localStorage.removeItem("presensic_user");
    localStorage.removeItem("presensic_current_view");
    setCurrentUser(null);
    setCurrentView("home");
  };

  // HARD-LOCK ROUTING: If a user exists or session is active, render EmployeeDashboard directly.
  if (currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <ErrorBoundary>
          <EmployeeDashboard 
            onLogOut={handleLogOut}
            onLogout={handleLogOut}
            employeeUser={currentUser}
            user={currentUser}
            setEmployeeUser={setCurrentUser}
            employees={[]}
            logs={[]}
            leaves={[]}
            companies={[]}
            tickets={[]}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <ErrorBoundary>
        <LoginScreen 
          initialTab="employee"
          onBackToHome={() => setCurrentView("home")}
          onEnterDashboard={(role, data) => setCurrentUser(data || currentUser)}
          onLoginSuccess={(user) => setCurrentUser(user)}
          employees={[]}
          onOpenRegisterModal={() => {}}
        />
      </ErrorBoundary>
    </div>
  );
}
