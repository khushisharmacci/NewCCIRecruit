import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import ChatHeaderIcon from "./ChatHeaderIcon";
import { useEventReminders } from "@/hooks/useEventReminders";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

const navigate = useNavigate();
const location = useLocation();

const { user } = useAuth();

console.log("LAYOUT USER", user);
console.log("CURRENT PATH", location.pathname);

  useEventReminders();

  useEffect(() => {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}, []);

  useEffect(() => {
    if (user && user.account_status === "pending_approval") {
      navigate("/pending", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        user={user}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b flex items-center justify-between px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <GlobalSearch />
          <ChatHeaderIcon />
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}