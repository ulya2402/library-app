import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Dashboard from "@/pages/Dashboard";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import { useAuthStore } from "@/store/useAuthStore";

function RouteHandler() {
  const location = useLocation();
  const { user } = useAuthStore();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function NavigationLayout() {
  const location = useLocation();
  const { user } = useAuthStore();
  
  if (location.pathname === "/dashboard" || user) {
    return null;
  }

  return (
    <div className="fixed top-0 w-full p-4 flex justify-center sm:justify-end gap-4 z-50 pointer-events-none">
      <div className="pointer-events-auto bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-gray-200 flex gap-1 text-sm font-bold">
        <Link 
          to="/" 
          className={`px-5 py-2 rounded-full transition-all duration-300 ${location.pathname === "/" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"}`}
        >
          Login
        </Link>
        <Link 
          to="/register" 
          className={`px-5 py-2 rounded-full transition-all duration-300 ${location.pathname === "/register" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"}`}
        >
          Register
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigationLayout />
      <RouteHandler />
    </BrowserRouter>
  );
}