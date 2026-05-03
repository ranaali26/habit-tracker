import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("rana2@example.com");
  const [password, setPassword] = useState("ranapassword123");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: 360 }}>
        <h1 style={{ marginBottom: 12 }}>Login</h1>

        <form onSubmit={onLogin} style={{ display: "grid", gap: 8 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
          <button type="submit">Login</button>

          {error && <div style={{ color: "crimson" }}>{error}</div>}
        </form>
      </div>
    </div>
  );
}