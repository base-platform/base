'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';

export const ApiKeySettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>API Key Settings</span>
            <Badge variant="outline">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Configure API key lifecycle and rotation policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            This settings panel will allow configuration of:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>• Default API key expiration policies</li>
            <li>• Automatic rotation schedules</li>
            <li>• Maximum API keys per user</li>
            <li>• Rotation warning notifications</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};