import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { FichaEditPage } from "./pages/FichaEditPage";
import { FichaViewPage } from "./pages/FichaViewPage";
import { FichaWizard } from "./pages/FichaWizard";
import { LoginPage } from "./pages/LoginPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="app-shell">
        <p style={{ color: "#e8dcc8" }}>Carregando sessão…</p>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Rotas da SPA — espelhar no Lovable com os mesmos paths facilita migração. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/nova"
        element={
          <Protected>
            <FichaWizard />
          </Protected>
        }
      />
      <Route
        path="/ficha/:id/edit"
        element={
          <Protected>
            <FichaEditPage />
          </Protected>
        }
      />
      <Route
        path="/ficha/:id"
        element={
          <Protected>
            <FichaViewPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
