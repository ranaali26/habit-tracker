import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { setAuthToken } from "./api/authInterceptor";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import HabitsPage from "./pages/HabitsPage";
import HabitDetailPage from "./pages/HabitDetailPage";
import "./index.css";

const qc = new QueryClient();

function Protected({ children }: { children: React.ReactNode }) {
  const { accessToken, initializing } = useAuth();
  if (initializing) return <div style={{ padding: 24 }}>Loading session...</div>;
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthTokenSync() {
  const { accessToken, tryRestoreSession } = useAuth();

  React.useEffect(() => {
    tryRestoreSession();
  }, []);

  React.useEffect(() => {
    setAuthToken(accessToken);
  }, [accessToken]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <AuthTokenSync />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
            <Route path="/habits" element={<Protected><HabitsPage /></Protected>} />
            <Route path="/habits/:habitId" element={<Protected><HabitDetailPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);