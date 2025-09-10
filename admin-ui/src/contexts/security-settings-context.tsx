'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';

export interface SecuritySettingDefinition {
  key: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue: any;
  description: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
    required?: boolean;
  };
  isPublic?: boolean;
}

export interface SecuritySettings {
  // Rate Limiting
  rateLimitDefault: number;
  rateLimitWindowMs: number;
  rateLimitBurst: number;
  rateLimitMaxRules: number;

  // Session Security
  sessionTtlHours: number;
  maxConcurrentSessions: number;
  deviceTrustDays: number;
  sessionInactivityMinutes: number;

  // Password Policies
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecial: boolean;
  passwordHistoryCount: number;
  passwordMaxAgeDays: number;

  // Account Lockout
  lockoutMaxAttempts: number;
  lockoutDurationMinutes: number;
  lockoutResetHours: number;
  lockoutPermanentThreshold: number;

  // File Upload Security
  fileUploadMaxSize: number;
  fileUploadMaxFiles: number;
  fileUploadAllowedMimes: string[];
  fileUploadAllowedExtensions: string[];
  fileUploadScanMalware: boolean;
  fileUploadQuarantineSuspicious: boolean;

  // MFA Settings
  mfaBackupCodeCount: number;
  mfaTotpWindow: number;
  mfaRequiredForAdmin: boolean;
  mfaTrustedDeviceDays: number;

  // API Key Settings
  apiKeyDefaultExpirationDays: number;
  apiKeyRotationWarningDays: number;
  apiKeyAutoRotationEnabled: boolean;
  apiKeyMaxPerUser: number;

  // Audit & Monitoring
  auditLogRetentionDays: number;
  securityEventNotifications: boolean;
  suspiciousActivityThreshold: number;
  failedLoginNotificationThreshold: number;
}

interface SecuritySettingsContextType {
  settings: SecuritySettings | null;
  definitions: SecuritySettingDefinition[];
  isLoading: boolean;
  error: string | null;
  updateSetting: (key: string, value: any) => Promise<void>;
  bulkUpdateSettings: (settings: Record<string, any>) => Promise<void>;
  resetSetting: (key: string) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SecuritySettingsContext = createContext<SecuritySettingsContextType | undefined>(undefined);

export const useSecuritySettings = () => {
  const context = useContext(SecuritySettingsContext);
  if (context === undefined) {
    throw new Error('useSecuritySettings must be used within a SecuritySettingsProvider');
  }
  return context;
};

interface SecuritySettingsProviderProps {
  children: ReactNode;
}

export const SecuritySettingsProvider = ({ children }: SecuritySettingsProviderProps) => {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [definitions, setDefinitions] = useState<SecuritySettingDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`/api/v1${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [settingsData, definitionsData] = await Promise.all([
        apiCall('/admin/security-settings/all'),
        apiCall('/admin/security-settings/definitions'),
      ]);

      setSettings(settingsData);
      setDefinitions(definitionsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      await apiCall(`/admin/security-settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });

      // Update local state
      setSettings(prev => prev ? { ...prev, [key]: value } : null);
      toast.success('Setting updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update setting';
      toast.error(errorMessage);
      throw err;
    }
  };

  const bulkUpdateSettings = async (settingsToUpdate: Record<string, any>) => {
    try {
      const result = await apiCall('/admin/security-settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsToUpdate }),
      });

      // Update local state
      setSettings(prev => prev ? { ...prev, ...settingsToUpdate } : null);
      
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.updated.length} settings updated, ${result.errors.length} failed`);
      } else {
        toast.success(`${result.updated.length} settings updated successfully`);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      toast.error(errorMessage);
      throw err;
    }
  };

  const resetSetting = async (key: string) => {
    try {
      const result = await apiCall(`/admin/security-settings/${key}/reset`, {
        method: 'POST',
      });

      // Update local state with default value
      const definition = definitions.find(def => def.key === key);
      if (definition) {
        setSettings(prev => prev ? { ...prev, [key]: definition.defaultValue } : null);
      }

      toast.success(`Setting '${key}' reset to default value`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset setting';
      toast.error(errorMessage);
      throw err;
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const contextValue: SecuritySettingsContextType = {
    settings,
    definitions,
    isLoading,
    error,
    updateSetting,
    bulkUpdateSettings,
    resetSetting,
    refreshSettings,
  };

  return (
    <SecuritySettingsContext.Provider value={contextValue}>
      {children}
    </SecuritySettingsContext.Provider>
  );
};