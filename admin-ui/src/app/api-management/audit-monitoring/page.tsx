"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  AlertCircle,
  Save,
  RefreshCw,
  FileText,
  Activity,
  Shield,
  Database,
  Clock,
  Filter,
  Download,
  Trash2,
  Info,
  Loader2
} from "lucide-react";

interface AuditSetting {
  key: string;
  value: any;
  type: string;
  description: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export default function AuditMonitoringPage() {
  const [settings, setSettings] = useState<Record<string, AuditSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("logging");
  const [modifiedSettings, setModifiedSettings] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAuditSettings();
  }, []);

  const loadAuditSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch audit & monitoring related settings
      const settingsRes = await apiClient.axios.get('/admin/security-settings/category/audit_monitoring');
      
      // Transform settings into a map for easier access
      const settingsMap: Record<string, AuditSetting> = {};
      settingsRes.data.forEach((setting: any) => {
        settingsMap[setting.key] = setting;
      });
      setSettings(settingsMap);

    } catch (error: any) {
      console.error('Failed to load audit settings:', error);
      toast.error('Failed to load audit settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value
      }
    }));
    setModifiedSettings(prev => new Set(prev).add(key));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Prepare only modified settings
      const updates: Record<string, any> = {};
      modifiedSettings.forEach(key => {
        if (settings[key]) {
          updates[key] = settings[key].value;
        }
      });

      await apiClient.axios.put('/admin/security-settings', {
        settings: updates
      });

      toast.success('Audit settings saved successfully');
      setModifiedSettings(new Set());
      
      // Reload to get latest values
      await loadAuditSettings();
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const renderSettingInput = (setting: AuditSetting) => {
    const { key, value, type, description, validation } = setting;

    switch (type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={key}>{description}</Label>
            </div>
            <Switch
              id={key}
              checked={value}
              onCheckedChange={(checked) => handleSettingChange(key, checked)}
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={key}>{description}</Label>
            <Input
              id={key}
              type="number"
              value={value}
              onChange={(e) => handleSettingChange(key, parseInt(e.target.value))}
              min={validation?.min}
              max={validation?.max}
            />
            {validation && (
              <p className="text-xs text-muted-foreground">
                {validation.min !== undefined && `Min: ${validation.min}`}
                {validation.max !== undefined && ` Max: ${validation.max}`}
              </p>
            )}
          </div>
        );

      case 'string':
        if (validation?.enum) {
          return (
            <div className="space-y-2">
              <Label htmlFor={key}>{description}</Label>
              <Select value={value} onValueChange={(val) => handleSettingChange(key, val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {validation.enum.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <Label htmlFor={key}>{description}</Label>
            <Input
              id={key}
              value={value}
              onChange={(e) => handleSettingChange(key, e.target.value)}
            />
          </div>
        );

      case 'array':
        return (
          <div className="space-y-2">
            <Label htmlFor={key}>{description}</Label>
            <Input
              id={key}
              value={Array.isArray(value) ? value.join(', ') : ''}
              onChange={(e) => 
                handleSettingChange(
                  key, 
                  e.target.value.split(',').map(s => s.trim()).filter(s => s)
                )
              }
              placeholder="Comma-separated values"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              Audit & Monitoring
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure audit logging, monitoring, and security event tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadAuditSettings}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving || modifiedSettings.size === 0}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes ({modifiedSettings.size})
            </Button>
          </div>
        </div>
      </div>

      {/* Alert for unsaved changes */}
      {modifiedSettings.size > 0 && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {modifiedSettings.size} unsaved changes. Don't forget to save before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Audit Log Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log Configuration
            </CardTitle>
            <CardDescription>
              Configure how audit logs are collected, stored, and retained
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="logging">Logging</TabsTrigger>
                <TabsTrigger value="retention">Retention</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>

              <TabsContent value="logging" className="space-y-6 mt-6">
                <div className="space-y-4">
                  {Object.entries(settings)
                    .filter(([key]) => key.includes('auditLog') && !key.includes('Retention'))
                    .map(([key, setting]) => (
                      <div key={key} className="relative">
                        {renderSettingInput(setting)}
                        {modifiedSettings.has(key) && (
                          <Badge className="absolute -top-2 -right-2" variant="secondary">
                            Modified
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="retention" className="space-y-6 mt-6">
                <div className="space-y-4">
                  {Object.entries(settings)
                    .filter(([key]) => key.includes('Retention') || key.includes('retention'))
                    .map(([key, setting]) => (
                      <div key={key} className="relative">
                        {renderSettingInput(setting)}
                        {modifiedSettings.has(key) && (
                          <Badge className="absolute -top-2 -right-2" variant="secondary">
                            Modified
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-6 mt-6">
                <div className="space-y-4">
                  {Object.entries(settings)
                    .filter(([key]) => key.includes('alert') || key.includes('Alert') || key.includes('monitoring'))
                    .map(([key, setting]) => (
                      <div key={key} className="relative">
                        {renderSettingInput(setting)}
                        {modifiedSettings.has(key) && (
                          <Badge className="absolute -top-2 -right-2" variant="secondary">
                            Modified
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Monitoring Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitoring Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Audit Logging</p>
                    <p className="text-xs text-muted-foreground">
                      {settings.auditLogEnabled?.value ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${settings.auditLogEnabled?.value ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Security Monitoring</p>
                    <p className="text-xs text-muted-foreground">
                      {settings.securityMonitoringEnabled?.value ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${settings.securityMonitoringEnabled?.value ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Alert System</p>
                    <p className="text-xs text-muted-foreground">
                      {settings.alertsEnabled?.value ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${settings.alertsEnabled?.value ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About Audit & Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Audit logging and monitoring help you track security events, user activities, and system changes.
              </p>
              <p>
                Configure retention policies to comply with regulatory requirements and manage storage efficiently.
              </p>
              <p>
                Set up alerts to be notified of suspicious activities or security incidents in real-time.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">Compliance Ready</Badge>
                <Badge variant="secondary">Real-time Monitoring</Badge>
                <Badge variant="secondary">Automated Alerts</Badge>
                <Badge variant="secondary">Secure Storage</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}