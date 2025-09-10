'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export const SessionSecuritySettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Session Security Settings</span>
            <Badge variant="outline">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Configure session management, device trust, and concurrent session limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            This settings panel will allow configuration of:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>• Session TTL and inactivity timeouts</li>
            <li>• Maximum concurrent sessions per user</li>
            <li>• Device trust duration</li>
            <li>• Session monitoring and alerts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};