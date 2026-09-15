import { Routes, Route } from "react-router-dom";
import EmailVerification from "./pages/email-verification";
import Contactmanager from "./pages/contactmanager";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Home from "./pages/home";
import { AuthProvider, useAuth } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Autobirthdaymessage from "./pages/auto_birthday_message";
import Campaigns from "./pages/campaigns";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return  <div className="flex justify-center items-center">
                             <img src="/svg-spinners--pulse-multiple.svg" alt="spinner" className="cursor-not-allowed " width={70}/>
                        </div>;

  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/email-verification" element={<EmailVerification />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/Contactmanager"
        element={
          <ProtectedRoute user={user}>
            <Contactmanager/>
          </ProtectedRoute>
        }
      />
      <Route
        path="/auto_birthday_message"
        element={
          <ProtectedRoute user={user}>
            <Autobirthdaymessage/>
          </ProtectedRoute>
        }
      />
      <Route
  path="/campaigns"
  element={
    <ProtectedRoute user={user}>
      <Campaigns />
    </ProtectedRoute>
  }
/>

      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}