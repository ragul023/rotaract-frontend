import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import ViewerPage from "./pages/ViewerPage";
import TeamPage from "./pages/TeamPage";
import TeamPaymentPage from "./pages/TeamPaymentPage";
import RegistrationAdminPage from "./pages/RegistrationAdminPage";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/team-registration" element={<TeamPaymentPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route
            path="/admin/registrations"
            element={<RegistrationAdminPage />}
          />
          <Route path="/viewer" element={<ViewerPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
