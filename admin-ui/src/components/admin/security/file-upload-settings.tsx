'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck } from 'lucide-react';

export const FileUploadSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileCheck className="h-5 w-5" />
            <span>File Upload Security Settings</span>
            <Badge variant="outline">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Configure file upload security policies and restrictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            This settings panel will allow configuration of:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>• Maximum file sizes and upload limits</li>
            <li>• Allowed file types and MIME types</li>
            <li>• Malware scanning and quarantine</li>
            <li>• File validation and security checks</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};