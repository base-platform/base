'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database } from 'lucide-react';

export const AuditMonitoringSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Audit & Monitoring Settings</span>
            <Badge variant="outline">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Configure security logging and monitoring policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            This settings panel will allow configuration of:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>• Audit log retention policies</li>
            <li>• Security event notifications</li>
            <li>• Suspicious activity thresholds</li>
            <li>• Failed login monitoring</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};