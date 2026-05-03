import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { setAuthToken } from "@/api/authInterceptor";

import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import TasksPage from "@/pages/TasksPage";
import HabitsPage from "@/pages/HabitsPage";
import HabitDetailPage from "@/pages/HabitDetailPage";
import "./index.css";

const qc = new QueryClient();

function Protected({ children }: { children: React.ReactNode }) {
  const { accessToken, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading session...</p>
      </div>
    );
  }
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
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected — wrapped in Layout (sidebar) */}
            <Route
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/habits/:habitId" element={<HabitDetailPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);