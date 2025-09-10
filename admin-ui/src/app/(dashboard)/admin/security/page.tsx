'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Key, 
  Lock, 
  FileCheck, 
  Users, 
  Clock, 
  Database,
  Settings as SettingsIcon,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { RateLimitingSettings } from '@/components/admin/security/rate-limiting-settings';
import { SessionSecuritySettings } from '@/components/admin/security/session-security-settings';
import { PasswordPolicySettings } from '@/components/admin/security/password-policy-settings';
import { AccountLockoutSettings } from '@/components/admin/security/account-lockout-settings';
import { FileUploadSettings } from '@/components/admin/security/file-upload-settings';
import { MfaSettings } from '@/components/admin/security/mfa-settings';
import { ApiKeySettings } from '@/components/admin/security/api-key-settings';
import { AuditMonitoringSettings } from '@/components/admin/security/audit-monitoring-settings';
import { SecuritySettingsProvider } from '@/contexts/security-settings-context';
import { toast } from 'sonner';

const securityCategories = [
  {
    id: 'rate_limiting',
    name: 'Rate Limiting',
    description: 'Configure API request rate limits and throttling',
    icon: Clock,
    color: 'bg-blue-500',
  },
  {
    id: 'session_security',
    name: 'Session Security',
    description: 'Manage user sessions and device trust',
    icon: Shield,
    color: 'bg-green-500',
  },
  {
    id: 'password_policy',
    name: 'Password Policy',
    description: 'Set password complexity and lifecycle rules',
    icon: Lock,
    color: 'bg-purple-500',
  },
  {
    id: 'account_lockout',
    name: 'Account Lockout',
    description: 'Configure account lockout after failed logins',
    icon: Users,
    color: 'bg-red-500',
  },
  {
    id: 'file_upload',
    name: 'File Upload',
    description: 'Security settings for file uploads',
    icon: FileCheck,
    color: 'bg-orange-500',
  },
  {
    id: 'mfa',
    name: 'Multi-Factor Auth',
    description: 'Configure MFA and 2FA settings',
    icon: Key,
    color: 'bg-indigo-500',
  },
  {
    id: 'api_keys',
    name: 'API Keys',
    description: 'API key lifecycle and rotation settings',
    icon: SettingsIcon,
    color: 'bg-cyan-500',
  },
  {
    id: 'audit_monitoring',
    name: 'Audit & Monitoring',
    description: 'Logging and security monitoring configuration',
    icon: Database,
    color: 'bg-pink-500',
  },
];

export default function SecuritySettingsPage() {
  const [activeTab, setActiveTab] = useState('rate_limiting');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportSettings = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/v1/admin/security-settings/export/json', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Settings exported successfully');
    } catch (error) {
      toast.error('Failed to export settings');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/v1/admin/security-settings/import/json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Import failed');

      const result = await response.json();
      toast.success(result.message);

      // Refresh the page to show updated settings
      window.location.reload();
    } catch (error) {
      toast.error('Failed to import settings');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const renderSettingsComponent = (categoryId: string) => {
    switch (categoryId) {
      case 'rate_limiting':
        return <RateLimitingSettings />;
      case 'session_security':
        return <SessionSecuritySettings />;
      case 'password_policy':
        return <PasswordPolicySettings />;
      case 'account_lockout':
        return <AccountLockoutSettings />;
      case 'file_upload':
        return <FileUploadSettings />;
      case 'mfa':
        return <MfaSettings />;
      case 'api_keys':
        return <ApiKeySettings />;
      case 'audit_monitoring':
        return <AuditMonitoringSettings />;
      default:
        return <div>Settings component not implemented</div>;
    }
  };

  return (
    <SecuritySettingsProvider>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Security Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Configure comprehensive security settings for your API platform
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleExportSettings}
                disabled={isExporting}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isImporting}
                />
                <Button
                  variant="outline"
                  disabled={isImporting}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>{isImporting ? 'Importing...' : 'Import'}</span>
                </Button>
              </div>
            </div>
          </div>
          
          <Separator className="mt-6" />
        </div>

        {/* Settings Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {securityCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeTab === category.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setActiveTab(category.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${category.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{category.name}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            {securityCategories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="text-xs px-2"
              >
                {category.name.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {securityCategories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${category.color} text-white`}>
                      <category.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{category.name} Settings</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSettingsComponent(category.id)}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </SecuritySettingsProvider>
  );
}