"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SessionWarning() {
  const { remainingSessionTime, logout, extendSession } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [formattedTime, setFormattedTime] = useState("");

  // Show warning when less than 2 minutes remain
  const showWarning = remainingSessionTime > 0 && remainingSessionTime < 2 * 60 * 1000 && !isDismissed;

  useEffect(() => {
    if (remainingSessionTime > 0) {
      const minutes = Math.floor(remainingSessionTime / (60 * 1000));
      const seconds = Math.floor((remainingSessionTime % (60 * 1000)) / 1000);
      
      if (minutes > 0) {
        setFormattedTime(`${minutes}m ${seconds}s`);
      } else {
        setFormattedTime(`${seconds}s`);
      }
    }
  }, [remainingSessionTime]);

  // Reset dismissed state when session time increases (user activity)
  useEffect(() => {
    if (remainingSessionTime > 3 * 60 * 1000) {
      setIsDismissed(false);
    }
  }, [remainingSessionTime]);

  if (!showWarning) return null;

  const isUrgent = remainingSessionTime < 1 * 60 * 1000; // Less than 1 minute

  return (
    <div className="fixed top-4 right-4 z-50 w-96">
      <Alert className={cn(
        "border-2",
        isUrgent 
          ? "border-red-500 bg-red-50 dark:bg-red-950" 
          : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            {isUrgent ? (
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <AlertDescription className={cn(
                "font-medium",
                isUrgent 
                  ? "text-red-800 dark:text-red-200" 
                  : "text-yellow-800 dark:text-yellow-200"
              )}>
                {isUrgent ? "Session Expiring Soon!" : "Session Warning"}
              </AlertDescription>
              <AlertDescription className={cn(
                "text-sm mt-1",
                isUrgent 
                  ? "text-red-700 dark:text-red-300" 
                  : "text-yellow-700 dark:text-yellow-300"
              )}>
                Your session will expire in <strong>{formattedTime}</strong>
              </AlertDescription>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    extendSession();
                    setIsDismissed(true);
                  }}
                  className="h-7 text-xs bg-white dark:bg-gray-800"
                >
                  Extend Session
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={logout}
                  className="h-7 text-xs bg-white dark:bg-gray-800"
                >
                  Logout Now
                </Button>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}