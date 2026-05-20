import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Bell, Menu, X, LogOut, GraduationCap,
  User, ChevronRight
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { getAnnouncements } from "../lib/api";

interface MenuItem {
  icon: ReactNode;
  label: string;
  value: string;
  badge?: number;
}

interface DashboardLayoutProps {
  children: ReactNode;
  menuItems: MenuItem[];
  userRole: string;
  userName?: string;
  activeSection: string;
  onSectionChange: (section: string) => void;
  notifications?: { title: string; desc: string; time: string; read: boolean }[];
}

export function DashboardLayout({
  children,
  menuItems,
  userRole,
  userName = "John Doe",
  activeSection,
  onSectionChange,
  notifications = [],
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // signOut() already handles all fallbacks internally; nothing to do here.
    } finally {
      // Hard redirect ensures a completely fresh page load so no stale
      // React state or cached Supabase session can bounce the user back.
      window.location.replace("/login");
    }
  };

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("read_announcements") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    getAnnouncements()
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          setAnnouncements(res);
        }
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const notifs = announcements.map((ann) => ({
    id: ann.id,
    title: ann.title,
    desc: ann.content,
    time: ann.date || "",
    read: readIds.includes(ann.id)
  }));
  const unreadCount = notifs.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id];
      setReadIds(newReadIds);
      localStorage.setItem("read_announcements", JSON.stringify(newReadIds));
    }
  };

  const handleMarkAllRead = () => {
    const allIds = announcements.map(ann => ann.id);
    setReadIds(allIds);
    localStorage.setItem("read_announcements", JSON.stringify(allIds));
  };

  const roleColors: Record<string, string> = {
    student: "bg-blue-600",
    company: "bg-green-600",
    admin: "bg-purple-600",
    coordinator: "bg-purple-600",
  };

  const roleBg = roleColors[userRole.toLowerCase()] || "bg-blue-600";

  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-background">
        {/* Top Navbar */}
        <nav className="bg-card border-b border-border fixed top-0 left-0 right-0 z-40 h-16 shadow-sm">
          <div className="px-4 h-full flex items-center justify-between">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-primary rounded-lg p-1.5">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="font-semibold text-foreground text-sm leading-none block">PSU OJT Portal</span>
                  <span className="text-xs text-muted-foreground leading-none">Pampanga State University</span>
                </div>
              </Link>
            </div>

            {/* Center: Search Removed */}

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              {/* Notifications */}
              <div className="relative">
                <button
                  className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={(e) => { e.stopPropagation(); setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); }}
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsNotificationsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-[70]">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                          <h3 className="font-semibold text-sm">Notifications</h3>
                          <span 
                            className="text-xs text-primary cursor-pointer hover:underline"
                            onClick={handleMarkAllRead}
                          >
                            Mark all read
                          </span>
                        </div>
                      <div className="max-h-72 overflow-y-auto">
                          {notifs.map((n, i) => (
                            <div 
                              key={i} 
                              onClick={() => n.id && handleMarkAsRead(n.id)}
                              className={`p-4 hover:bg-muted/50 border-b border-border last:border-0 cursor-pointer transition-colors ${!n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                            >
                              <div className="flex gap-3">
                                <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                <div>
                                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                      <div className="p-3 text-center border-t border-border">
                        <button className="text-xs text-primary hover:underline" onClick={() => { onSectionChange("notifications"); setIsNotificationsOpen(false); }}>
                          View All Notifications
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

               {/* Dark Mode Removed */}

              {/* Profile */}
              <div className="relative">
                <button
                  className={`h-9 w-9 rounded-full ${roleBg} text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity`}
                  onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); }}
                >
                  {initials}
                </button>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-[70]">
                      <div className="p-4 border-b border-border">
                        <p className="font-semibold text-sm">{userName}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{userRole}</p>
                      </div>
                      <div className="p-2">
                        <button className="flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors gap-2" onClick={() => { onSectionChange("profile"); setIsProfileOpen(false); }}>
                          <User className="h-4 w-4 text-muted-foreground" /> Profile
                        </button>
                        <div className="border-t border-border my-1" />
                        <button className="flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-red-50 text-red-600 transition-colors gap-2" onClick={() => { setIsProfileOpen(false); handleSignOut(); }}>
                          <LogOut className="h-4 w-4" /> Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar */}
        <aside className={`fixed top-16 left-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 z-40 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          {/* User Info */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full ${roleBg} text-white font-semibold flex items-center justify-center text-sm`}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-white truncate">{userName}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {menuItems.map((item, i) => {
              const isActive = activeSection === item.value;
              return (
                <button
                  key={i}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
                    isActive
                      ? "bg-black/30 text-sidebar-foreground font-medium shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => { onSectionChange(item.value); setIsSidebarOpen(false); }}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {(() => {
                    const badgeCount = item.value === "announcements" ? unreadCount : item.badge;
                    if (badgeCount && badgeCount > 0) {
                      return (
                        <span className="bg-red-500 text-white text-[10px] rounded-full h-5 px-1.5 flex items-center justify-center font-semibold min-w-5">
                          {badgeCount}
                        </span>
                      );
                    }
                    if (isActive) {
                      return <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/70" />;
                    }
                    return null;
                  })()}
                </button>
              );
            })}
          </nav>

          {/* Bottom logout */}
          <div className="p-3 border-t border-sidebar-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-red-500/20 hover:text-red-300 transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="pt-16 lg:pl-64 min-h-screen bg-background">
          <div className="p-6">{children}</div>
        </main>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}
      </div>
    </div>
  );
}