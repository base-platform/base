'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export const AccountLockoutSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Account Lockout Settings</span>
            <Badge variant="outline">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Configure account lockout policies after failed login attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            This settings panel will allow configuration of:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>• Maximum failed login attempts</li>
            <li>• Lockout duration and escalation</li>
            <li>• Account reset policies</li>
            <li>• Permanent lockout thresholds</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};