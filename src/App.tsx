export default function App() {
  // FORCE LOAD SESSION OR INJECT DEFAULT USER IMMEDIATELY
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const forcedUser = {
      id: "PRES-1285",
      name: "Parnavi Lotankar",
      email: "parnavi@dsventures.com",
      role: "employee",
      orgName: "DS Ventures",
      faceRegistered: true
    };
    
    try {
      const saved = localStorage.getItem("presensic_user");
      return saved ? JSON.parse(saved) : forcedUser;
    } catch {
      return forcedUser;
    }
  });
