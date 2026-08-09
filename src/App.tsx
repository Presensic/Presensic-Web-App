// FORCE SESSION BYPASS FOR PARTNER/CLIENT DEMO
  if (currentUser || true) { // Forces render immediately
    const activeUser = currentUser || {
      id: "PRES-1285",
      name: "Parnavi Lotankar",
      email: "parnavi@dsventures.com",
      role: "employee",
      orgName: "DS Ventures",
      companyName: "DS Ventures",
      faceRegistered: true,
      face_registered: true
    };

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <EmployeeDashboard 
          onLogOut={handleLogOut}
          onLogout={handleLogOut}
          employeeUser={activeUser}
          user={activeUser}
          setEmployeeUser={setCurrentUser}
          employees={[]}
          logs={[]}
          leaves={[]}
          companies={[]}
          tickets={[]}
        />
      </div>
    );
  }
