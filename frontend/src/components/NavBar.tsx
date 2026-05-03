import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function NavBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, padding: 16, borderBottom: "1px solid #ddd" }}>
      <Link to="/">Dashboard</Link>
      <Link to="/tasks">Tasks</Link>
      <Link to="/habits">Habits</Link>
      <div style={{ flex: 1 }} />
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}