"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Database,
  Code2,
  Key,
  Shield,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Gauge,
  FileJson,
  FileText,
  FunctionSquare,
  User,
  LogOut,
  Users,
  UserPlus,
  AlertCircle,
  UserCheck,
  BookOpen,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

interface MenuItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "APIs",
    icon: Database,
    children: [
      { name: "API Builder", href: "/entities/builder", icon: Code2 },
      { name: "API Explorer", href: "/api-management/explorer", icon: Rocket },
      { name: "OpenAPI Docs", href: "/api-docs", icon: FileJson },
    ],
  },
  {
    name: "Functions",
    href: "/functions",
    icon: FunctionSquare,
  },
  {
    name: "User Management",
    icon: Users,
    children: [
      { name: "All Users", href: "/users", icon: Users },
      { name: "Invite User", href: "/users/invite", icon: UserPlus },
      { name: "Role Management", href: "/users/roles", icon: UserCheck },
    ],
  },
  {
    name: "API Management",
    icon: Key,
    children: [
      { name: "Rate Limits", href: "/api-management/rate-limits", icon: Gauge },
      { name: "API Keys", href: "/api/keys", icon: Key },
      { name: "Audit & Monitoring", href: "/api-management/audit-monitoring", icon: AlertCircle },
    ],
  },
  {
    name: "Security",
    href: "/security",
    icon: Shield,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={cn(
              "flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isCollapsed ? "justify-center" : "justify-between",
              depth > 0 && !isCollapsed && "ml-4"
            )}
          >
            <div className={cn(
              "flex items-center",
              isCollapsed ? "justify-center w-full" : "gap-3"
            )}>
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </div>
            {!isCollapsed && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>
          {isExpanded && !isCollapsed && (
            <div className="ml-2 mt-1 space-y-1">
              {item.children?.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href || "#"}
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
          isCollapsed ? "justify-center" : "gap-3",
          depth > 0 && !isCollapsed && "ml-6",
          isActive(item.href)
            ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            : "hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-900 shadow-md"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-40",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <h1 className="text-lg font-semibold">API Platform</h1>
          )}
          <button
            onClick={() => {
              const newCollapsed = !isCollapsed;
              setIsCollapsed(newCollapsed);
              onCollapsedChange?.(newCollapsed);
            }}
            className="hidden lg:block p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-8rem)]">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="flex items-center justify-center w-full p-2 mb-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={user?.email || 'User Profile'}
              >
                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={logout}
                className="flex items-center justify-center w-full p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}