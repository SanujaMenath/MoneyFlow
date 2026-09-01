import React from "react";
import { LayoutDashboard, ArrowLeftRight, BarChart3, Settings, Users, User } from "lucide-react";

type TabName =
  "Dashboard" | "Transactions" | "Analytics" | "Settings" | "Collaboration" | "Profile";

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
}

const topMenuItems: { name: TabName; icon: React.ElementType; label: string }[] = [
  { name: "Dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { name: "Transactions", icon: ArrowLeftRight, label: "Transactions" },
  { name: "Analytics", icon: BarChart3, label: "Analytics" },
  { name: "Collaboration", icon: Users, label: "Collaboration" },
];

const NavBtn = ({
  name,
  icon: Icon,
  label,
  activeTab,
  setActiveTab,
}: {
  name: TabName;
  icon: React.ElementType;
  label: string;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
}) => {
  const isActive = activeTab === name;
  return (
    <button
      onClick={() => setActiveTab(name)}
      title={label}
      className={`
        group relative flex items-center justify-center lg:justify-start gap-3
        px-2 lg:px-3.5 py-2.5 rounded-xl transition-all duration-200 w-full
        ${
          isActive
            ? "bg-white/15 text-white shadow-inner"
            : "text-white/40 hover:text-white/80 hover:bg-white/8"
        }
      `}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 bg-white rounded-r-full" />
      )}

      <span
        className={`
          flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200
          ${
            isActive
              ? "bg-white/20 text-white"
              : "text-white/40 group-hover:text-white/70 group-hover:bg-white/10"
          }
        `}
      >
        <Icon size={17} />
      </span>

      <span
        className={`
          font-medium text-sm hidden lg:block tracking-wide transition-all duration-200
          ${isActive ? "text-white" : "text-white/50 group-hover:text-white/80"}
        `}
      >
        {label}
      </span>
    </button>
  );
};

const MainLayout = ({ children, activeTab, setActiveTab }: MainLayoutProps) => {
  return (
    <div className="h-screen flex bg-bg text-text-primary overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className="
          w-16 sm:w-18 lg:w-60 shrink-0
          flex flex-col
          bg-navy
          border-r border-white/6
          shadow-[4px_0_24px_rgba(0,0,0,0.18)]
          overflow-hidden transition-all duration-300
          relative
        "
      >
        {/* Subtle top-right highlight */}
        <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 opacity-[0.07] bg-[radial-gradient(circle_at_top_right,#93c5fd,transparent_70%)]" />

        {/*  Logo  */}
        <div className="flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 pt-6 pb-8">
          <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/20 shadow-md">
            <img
              src="/MoneyFLow_Logo.png"
              alt="MoneyFlow logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Wordmark */}
          <div className="hidden lg:flex flex-col leading-none">
            <span className="text-white font-bold text-base tracking-tight">MoneyFlow</span>
            <span className="text-white/30 text-[10px] font-medium tracking-widest uppercase mt-0.5">
              Finance
            </span>
          </div>
        </div>

        {/*  Section label  */}
        <p className="hidden lg:block text-white/25 text-[9px] font-bold uppercase tracking-[0.18em] px-4 mb-2">
          Menu
        </p>

        {/*  Top nav  */}
        <nav className="flex flex-col gap-1 px-2">
          {topMenuItems.map((item) => (
            <NavBtn
              key={item.name}
              name={item.name}
              icon={item.icon}
              label={item.label}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ))}
        </nav>

        {/*  Divider  */}
        <div className="mx-3 my-4 border-t border-white/8" />

        {/*  Settings */}
        <div className="mt-auto flex flex-col gap-1 px-2 pb-5">
          <p className="hidden lg:block text-white/25 text-[9px] font-bold uppercase tracking-[0.18em] px-2 mb-1">
            System
          </p>

          <NavBtn
            name="Profile"
            icon={User}
            label="Profile"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <NavBtn
            name="Settings"
            icon={Settings}
            label="Settings"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Version */}
          <div className="mt-3 flex justify-center lg:justify-start lg:px-2">
            <span className="text-white/20 text-[9px] font-semibold tracking-widest">
              <span className="hidden lg:inline">v1.5.0</span>
              <span className="lg:hidden">v1.5.0</span>
            </span>
          </div>
        </div>
      </aside>

      {/*  Main content  */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 lg:h-16 border-b border-border bg-card/90 backdrop-blur-sm flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Subtle page indicator dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-primary hidden sm:block" />
            <h2 className="font-semibold text-sm lg:text-base text-text-primary tracking-tight">
              {activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-text-secondary bg-bg border border-border px-3 py-1.5 rounded-lg font-medium">
              {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 bg-bg">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>

        {/* Footer */}
        <footer className="py-2.5 px-4 border-t border-white/6 bg-navy flex items-center justify-center gap-1.5 text-[10px] font-medium text-white/25 shrink-0 flex-wrap">
          <span className="">&copy; 2026 Sanuja Menath. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
