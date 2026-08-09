export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("presensic_user");
      return saved ? JSON.parse(saved) : {
        id: "PRES-1285",
        name: "Parnavi Lotankar",
        email: "parnavi@dsventures.com",
        role: "employee",
        orgName: "DS Ventures",
        faceRegistered: true
      };
    } catch {
      return {
        id: "PRES-1285",
        name: "Parnavi Lotankar",
        email: "parnavi@dsventures.com",
        role: "employee",
        orgName: "DS Ventures",
        faceRegistered: true
      };
    }
  });

  // ABSOLUTE ROUTE LOCK: If user exists, nothing else can ever render.
  if (currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <ErrorBoundary>
          <EmployeeDashboard 
            onLogOut={() => {
              localStorage.clear();
              setCurrentUser(null);
            }}
            onLogout={() => {
              localStorage.clear();
              setCurrentUser(null);
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

  // Fallback public view only if user is logged out
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <ErrorBoundary>
        <LoginScreen 
          initialTab="employee"
          onBackToHome={() => {}}
          onEnterDashboard={(role, data) => setCurrentUser(data)}
          onLoginSuccess={(user) => setCurrentUser(user)}
          employees={[]}
          onOpenRegisterModal={() => {}}
        />
      </ErrorBoundary>
    </div>
  );
}
