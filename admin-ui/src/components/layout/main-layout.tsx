"use client";

import { Sidebar } from "./sidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SessionWarning } from "@/components/ui/session-warning";
import { usePathname } from "next/navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  
  // Don't show sidebar for login page
  const isLoginPage = pathname === '/login';
  
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar 
          onCollapsedChange={setSidebarCollapsed}
        />
        <main
          className={cn(
            "transition-all duration-300",
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-64",
            "pt-16 lg:pt-0"
          )}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
        <SessionWarning />
      </div>
    </AuthGuard>
  );
}