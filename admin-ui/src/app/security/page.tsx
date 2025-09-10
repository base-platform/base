"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  Shield,
  Key,
  Lock,
  Users,
  FileCheck,
  AlertCircle,
  Save,
  RefreshCw,
  Clock,
  Upload,
  ShieldCheck,
  Loader2,
  Info,
  AlertTriangle,
  CheckCircle,
  Zap,
  BookOpen
} from "lucide-react";

interface SecuritySetting {
  key: string;
  value: any;
  category: string;
  type: string;
  description: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon?: any;
}

const categoryIcons: Record<string, any> = {
  rate_limiting: Shield,
  session_security: Clock,
  password_policy: Key,
  account_lockout: Lock,
  file_upload: Upload,
  mfa: ShieldCheck,
  api_keys: Key,
  audit_logging: FileCheck,
  audit_monitoring: FileCheck,
  cors_config: Shield
};

const categoryRecommendations: Record<string, { title: string; items: string[]; warning?: string }> = {
  rate_limiting: {
    title: "Recommended Settings",
    items: [
      "Production API: 100-500 requests/minute",
      "Authentication endpoints: 5-20 requests/15 minutes",
      "Public endpoints: 10-50 requests/minute",
      "Admin endpoints: 50-200 requests/minute"
    ],
    warning: "Setting limits too low may impact legitimate users. Monitor your API usage patterns before adjusting."
  },
  session_security: {
    title: "Best Practices",
    items: [
      "High-security apps: 1-2 hours session timeout",
      "Standard apps: 4-8 hours session timeout",
      "Development: 8-24 hours session timeout",
      "Limit concurrent sessions to prevent account sharing"
    ],
    warning: "Shorter sessions improve security but may frustrate users. Balance security with user experience."
  },
  password_policy: {
    title: "Security Standards",
    items: [
      "Minimum length: 8-12 characters recommended",
      "Require mix of uppercase, lowercase, numbers, and symbols",
      "Password history: Track last 5-10 passwords",
      "Force password change every 60-90 days for sensitive systems"
    ],
    warning: "Overly complex requirements may lead users to write down passwords or use predictable patterns."
  },
  account_lockout: {
    title: "Protection Guidelines",
    items: [
      "Lock after 3-5 failed attempts",
      "Lockout duration: 15-30 minutes",
      "Permanent lockout after 10+ attempts in 24 hours",
      "Implement CAPTCHA after 2 failed attempts"
    ],
    warning: "Aggressive lockout policies can be exploited for denial-of-service attacks against legitimate users."
  },
  file_upload: {
    title: "Security Measures",
    items: [
      "Max file size: 5-10MB for documents, 2-5MB for images",
      "Scan all uploads for malware",
      "Restrict file types to necessary formats only",
      "Store uploads outside web root directory"
    ],
    warning: "Always validate file content, not just extensions. Implement virus scanning for production environments."
  },
  mfa: {
    title: "MFA Best Practices",
    items: [
      "Require MFA for all admin accounts",
      "Provide 10 backup codes per user",
      "Allow 30-60 second time window for TOTP",
      "Trust devices for 30 days maximum"
    ],
    warning: "Always provide backup authentication methods. Users may lose access to their MFA devices."
  },
  api_keys: {
    title: "API Key Management",
    items: [
      "Rotate keys every 90-365 days",
      "Warn users 30 days before expiration",
      "Implement per-key rate limiting",
      "Use separate keys for different environments"
    ],
    warning: "Never expose API keys in client-side code or public repositories. Rotate immediately if compromised."
  },
  audit_monitoring: {
    title: "Compliance & Monitoring",
    items: [
      "Retain audit logs for 90-365 days",
      "Log all authentication events",
      "Monitor failed login patterns",
      "Alert on suspicious activities immediately"
    ],
    warning: "Ensure compliance with data retention regulations in your jurisdiction (GDPR, CCPA, etc.)."
  }
};

const categoryTips: Record<string, { icon: any; type: 'info' | 'warning' | 'success'; message: string }[]> = {
  rate_limiting: [
    { icon: Zap, type: 'info', message: 'Rate limits are applied per IP address or user token' },
    { icon: AlertTriangle, type: 'warning', message: 'Monitor for legitimate users hitting limits frequently' }
  ],
  session_security: [
    { icon: Clock, type: 'info', message: 'Sessions are automatically extended on user activity' },
    { icon: CheckCircle, type: 'success', message: 'Device fingerprinting helps prevent session hijacking' }
  ],
  password_policy: [
    { icon: Key, type: 'info', message: 'Passwords are hashed using bcrypt with salt rounds' },
    { icon: AlertTriangle, type: 'warning', message: 'Changing policy does not affect existing passwords' }
  ],
  account_lockout: [
    { icon: Lock, type: 'info', message: 'Lockouts are tracked per IP and email address' },
    { icon: CheckCircle, type: 'success', message: 'Admin accounts can unlock users manually' }
  ],
  file_upload: [
    { icon: Upload, type: 'info', message: 'Files are quarantined before virus scanning completes' },
    { icon: AlertTriangle, type: 'warning', message: 'Large file limits may impact server performance' }
  ],
  mfa: [
    { icon: ShieldCheck, type: 'info', message: 'TOTP codes are compatible with Google Authenticator' },
    { icon: CheckCircle, type: 'success', message: 'Backup codes are single-use and encrypted' }
  ],
  api_keys: [
    { icon: Key, type: 'info', message: 'API keys are hashed and cannot be retrieved after creation' },
    { icon: AlertTriangle, type: 'warning', message: 'Deleted keys are immediately invalidated' }
  ],
  audit_monitoring: [
    { icon: FileCheck, type: 'info', message: 'Audit logs are tamper-proof and timestamped' },
    { icon: CheckCircle, type: 'success', message: 'Logs can be exported for compliance reporting' }
  ]
};

export default function SecurityPage() {
  const [settings, setSettings] = useState<Record<string, SecuritySetting>>({});
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("rate_limiting");
  const [modifiedSettings, setModifiedSettings] = useState<Set<string>>(new Set());
  const [retryCount, setRetryCount] = useState(0);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async (currentRetryCount = 0) => {
    try {
      setLoading(true);
      setLastLoadTime(Date.now());
      
      // Fetch categories first
      const categoriesRes = await apiClient.axios.get('/admin/security-settings/categories');
      setCategories(categoriesRes.data);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch definitions
      const definitionsRes = await apiClient.axios.get('/admin/security-settings/definitions');
      
      // Another small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch current values
      const valuesRes = await apiClient.axios.get('/admin/security-settings/all');
      
      // Combine definitions with current values
      const settingsMap: Record<string, SecuritySetting> = {};
      definitionsRes.data.forEach((definition: any) => {
        settingsMap[definition.key] = {
          key: definition.key,
          value: valuesRes.data[definition.key] !== undefined 
            ? valuesRes.data[definition.key] 
            : definition.defaultValue,
          category: definition.category,
          type: definition.type,
          description: definition.description,
          validation: definition.validation
        };
      });
      setSettings(settingsMap);

      // Set the first available category as active tab if current tab doesn't exist
      if (categoriesRes.data.length > 0 && !categoriesRes.data.find((c: any) => c.id === activeTab)) {
        setActiveTab(categoriesRes.data[0].id);
      }
      
      // Reset retry count on success
      setRetryCount(0);
      setLoading(false);

    } catch (error: any) {
      console.error('Failed to load security settings:', error);
      
      // More specific error messages
      if (error.response?.status === 429) {
        // Rate limited - retry with exponential backoff
        const maxRetries = 3;
        if (currentRetryCount < maxRetries) {
          const nextRetryCount = currentRetryCount + 1;
          const retryDelay = Math.min(1000 * Math.pow(2, currentRetryCount), 16000); // 1s, 2s, 4s, 8s, 16s max
          
          setRetryCount(nextRetryCount);
          toast.warning(`Rate limited. Retrying in ${retryDelay/1000} seconds... (Attempt ${nextRetryCount}/${maxRetries})`);
          
          // Use setTimeout with the updated retry count
          setTimeout(() => {
            loadSecuritySettings(nextRetryCount);
          }, retryDelay);
        } else {
          setLoading(false);
          setRetryCount(0);
          toast.error('Too many requests. Please wait a minute and try refreshing the page.');
        }
      } else {
        setLoading(false);
        if (error.response?.status === 403) {
          toast.error('Admin access required to view security settings');
        } else {
          toast.error(error.response?.data?.message || 'Failed to load security settings');
        }
      }
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

      toast.success('Security settings saved successfully');
      setModifiedSettings(new Set());
      
      // Reload to get latest values
      await loadSecuritySettings();
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async (category: string) => {
    try {
      const categorySettings = Object.entries(settings)
        .filter(([_, setting]) => setting.category === category)
        .map(([key]) => key);

      for (const key of categorySettings) {
        await apiClient.axios.post(`/admin/security-settings/${key}/reset`);
      }

      toast.success('Settings reset to defaults');
      await loadSecuritySettings();
    } catch (error: any) {
      console.error('Failed to reset settings:', error);
      toast.error('Failed to reset settings');
    }
  };

  const renderSettingInput = (setting: SecuritySetting) => {
    const { key, value, type, description, validation } = setting;

    switch (type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={key}>{description}</Label>
              {validation && (
                <p className="text-xs text-muted-foreground">
                  {validation.min && `Min: ${validation.min}`}
                  {validation.max && ` Max: ${validation.max}`}
                </p>
              )}
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
            <p className="text-xs text-muted-foreground">
              Enter comma-separated values
            </p>
          </div>
        );

      default:
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
    }
  };

  const getSecurityLevel = (category: string): { level: 'high' | 'medium' | 'low'; color: string; text: string } => {
    const categorySettings = Object.entries(settings)
      .filter(([_, setting]) => setting.category === category);
    
    // Simple heuristic based on common security settings
    let score = 0;
    let maxScore = 0;
    
    categorySettings.forEach(([key, setting]) => {
      maxScore += 1;
      if (key.includes('min') || key.includes('Min')) {
        score += setting.value >= (setting.validation?.min || 0) * 0.7 ? 1 : 0;
      } else if (key.includes('max') || key.includes('Max')) {
        score += setting.value <= (setting.validation?.max || 1000) * 0.5 ? 1 : 0;
      } else if (typeof setting.value === 'boolean') {
        score += setting.value ? 1 : 0;
      }
    });
    
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 50;
    
    if (percentage >= 70) return { level: 'high', color: 'text-green-600', text: 'High Security' };
    if (percentage >= 40) return { level: 'medium', color: 'text-yellow-600', text: 'Medium Security' };
    return { level: 'low', color: 'text-red-600', text: 'Low Security' };
  };

  const renderCategorySettings = (category: string) => {
    const categorySettings = Object.entries(settings)
      .filter(([_, setting]) => setting.category === category)
      .map(([key, setting]) => ({ ...setting, key }));

    if (categorySettings.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No settings available for this category
        </div>
      );
    }

    const securityLevel = getSecurityLevel(category);

    return (
      <>
        {/* Security Level Indicator */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${securityLevel.color}`} />
            <span className="text-sm font-medium">Current Security Level:</span>
            <Badge className={securityLevel.color === 'text-green-600' ? 'bg-green-100 text-green-800' :
                            securityLevel.color === 'text-yellow-600' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}>
              {securityLevel.text}
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          {categorySettings.map((setting) => (
            <div key={setting.key} className="relative">
              {renderSettingInput(setting)}
              {modifiedSettings.has(setting.key) && (
                <Badge className="absolute -top-2 -right-2" variant="secondary">
                  Modified
                </Badge>
              )}
            </div>
          ))}
        </div>
      </>
    );
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
              <Shield className="h-8 w-8" />
              Security Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure runtime security settings for your application
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => loadSecuritySettings()}
              disabled={loading || Date.now() - lastLoadTime < 2000}
              title={loading ? "Loading..." : Date.now() - lastLoadTime < 2000 ? "Please wait before refreshing" : "Refresh settings"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
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

      {/* Settings Tabs */}
      {categories.length > 0 ? (
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid mb-6 ${
              categories.length <= 4 ? 'grid-cols-2 lg:grid-cols-4' :
              categories.length <= 6 ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' :
              'grid-cols-2 lg:grid-cols-4 xl:grid-cols-8'
            }`}>
              {categories.map((category) => {
                const Icon = categoryIcons[category.id] || Shield;
                return (
                  <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    <span className="hidden lg:inline text-xs">{category.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {categories.map((category) => {
              const Icon = categoryIcons[category.id] || Shield;
              return (
                <TabsContent key={category.id} value={category.id} className="space-y-6">
                  {/* Main Settings Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          {category.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetToDefaults(category.id)}
                        >
                          Reset to Defaults
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        {category.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {renderCategorySettings(category.id)}
                      
                      {/* Quick Tips */}
                      {categoryTips[category.id] && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Info className="h-4 w-4" />
                              Quick Tips
                            </h4>
                            <div className="space-y-2">
                              {categoryTips[category.id].map((tip, index) => {
                                const TipIcon = tip.icon;
                                return (
                                  <Alert 
                                    key={index} 
                                    className={
                                      tip.type === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                                      tip.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                                      'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                    }
                                  >
                                    <TipIcon className={`h-4 w-4 ${
                                      tip.type === 'warning' ? 'text-yellow-600' :
                                      tip.type === 'success' ? 'text-green-600' :
                                      'text-blue-600'
                                    }`} />
                                    <AlertDescription className="text-sm">
                                      {tip.message}
                                    </AlertDescription>
                                  </Alert>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recommendations Card */}
                  {categoryRecommendations[category.id] && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <BookOpen className="h-5 w-5" />
                          {categoryRecommendations[category.id].title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryRecommendations[category.id].items.map((item, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">{item}</span>
                            </div>
                          ))}
                        </div>
                        
                        {categoryRecommendations[category.id].warning && (
                          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertDescription>
                              <strong>Important:</strong> {categoryRecommendations[category.id].warning}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Environment-specific Guide */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="h-5 w-5" />
                        Environment Configuration Guide
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                          <h5 className="font-semibold text-sm mb-2 text-green-800 dark:text-green-300">Development</h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Relaxed settings for easier testing and debugging. Longer sessions, higher rate limits.
                          </p>
                        </div>
                        <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                          <h5 className="font-semibold text-sm mb-2 text-yellow-800 dark:text-yellow-300">Staging</h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Production-like settings for testing. Moderate restrictions, full logging enabled.
                          </p>
                        </div>
                        <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                          <h5 className="font-semibold text-sm mb-2 text-red-800 dark:text-red-300">Production</h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Strictest settings for maximum security. Short sessions, tight rate limits, all protections enabled.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No security settings available</p>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              These settings control various security aspects of your application at runtime.
              Changes take effect immediately after saving.
            </p>
            <p>
              All settings are stored in the database and can be modified without restarting the application.
              Default values are used if a setting is not configured.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary">Database-backed</Badge>
              <Badge variant="secondary">Runtime configurable</Badge>
              <Badge variant="secondary">Cached for performance</Badge>
              <Badge variant="secondary">Audit logged</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}