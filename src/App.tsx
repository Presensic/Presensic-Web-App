import React, { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import EmployeeDashboard from "./components/EmployeeDashboard";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("presensic_user");
      if (saved) return JSON.parse(saved);
    } catch {}

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <ErrorBoundary>
        <EmployeeDashboard 
          onLogOut={() => {
            localStorage.clear();
            setCurrentUser(null);
            window.location.reload();
          }}
          onLogout={() => {
            localStorage.clear();
            setCurrentUser(null);
            window.location.reload();
          }}
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
