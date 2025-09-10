'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Shield, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecuritySettings } from '@/contexts/security-settings-context';
import { toast } from 'sonner';

interface RateLimitFormData {
  rateLimitDefault: number;
  rateLimitWindowMs: number;
  rateLimitBurst: number;
  rateLimitMaxRules: number;
}

export const RateLimitingSettings = () => {
  const { settings, definitions, updateSetting, isLoading } = useSecuritySettings();
  const [formData, setFormData] = useState<RateLimitFormData>({
    rateLimitDefault: 100,
    rateLimitWindowMs: 60000,
    rateLimitBurst: 20,
    rateLimitMaxRules: 50,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const newFormData = {
        rateLimitDefault: settings.rateLimitDefault,
        rateLimitWindowMs: settings.rateLimitWindowMs,
        rateLimitBurst: settings.rateLimitBurst,
        rateLimitMaxRules: settings.rateLimitMaxRules,
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [settings]);

  const getDefinition = (key: string) => {
    return definitions.find(def => def.key === key);
  };

  const handleInputChange = (key: keyof RateLimitFormData, value: string) => {
    const numericValue = parseInt(value) || 0;
    const newFormData = { ...formData, [key]: numericValue };
    setFormData(newFormData);
    
    // Check if there are changes
    if (settings) {
      const hasChanged = Object.keys(newFormData).some(
        k => newFormData[k as keyof RateLimitFormData] !== settings[k as keyof typeof settings]
      );
      setHasChanges(hasChanged);
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    Object.entries(formData).forEach(([key, value]) => {
      const definition = getDefinition(key);
      if (definition?.validation) {
        const { min, max } = definition.validation;
        
        if (min !== undefined && value < min) {
          errors.push(`${key} must be at least ${min}`);
        }
        if (max !== undefined && value > max) {
          errors.push(`${key} must be at most ${max}`);
        }
      }
    });

    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(`Validation errors: ${errors.join(', ')}`);
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        updateSetting('rateLimitDefault', formData.rateLimitDefault),
        updateSetting('rateLimitWindowMs', formData.rateLimitWindowMs),
        updateSetting('rateLimitBurst', formData.rateLimitBurst),
        updateSetting('rateLimitMaxRules', formData.rateLimitMaxRules),
      ]);
      
      setHasChanges(false);
      toast.success('Rate limiting settings updated successfully');
    } catch (error) {
      console.error('Failed to save rate limiting settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData({
        rateLimitDefault: settings.rateLimitDefault,
        rateLimitWindowMs: settings.rateLimitWindowMs,
        rateLimitBurst: settings.rateLimitBurst,
        rateLimitMaxRules: settings.rateLimitMaxRules,
      });
      setHasChanges(false);
    }
  };

  const formatWindowDisplay = (windowMs: number): string => {
    const seconds = windowMs / 1000;
    if (seconds < 60) return `${seconds}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes}m`;
    const hours = minutes / 60;
    return `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Default Limit</p>
                <p className="text-2xl font-bold">{formData.rateLimitDefault}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">req/min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Burst Limit</p>
                <p className="text-2xl font-bold">{formData.rateLimitBurst}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">short-term</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Time Window</p>
                <p className="text-2xl font-bold">{formatWindowDisplay(formData.rateLimitWindowMs)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Rate Limiting Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure default rate limits that will apply to all API endpoints unless overridden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="rateLimitDefault">Default Rate Limit</Label>
              <Input
                id="rateLimitDefault"
                type="number"
                value={formData.rateLimitDefault}
                onChange={(e) => handleInputChange('rateLimitDefault', e.target.value)}
                placeholder="100"
                min={getDefinition('rateLimitDefault')?.validation?.min}
                max={getDefinition('rateLimitDefault')?.validation?.max}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Maximum requests per minute per user (1-10,000)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rateLimitWindowMs">Time Window (ms)</Label>
              <Input
                id="rateLimitWindowMs"
                type="number"
                value={formData.rateLimitWindowMs}
                onChange={(e) => handleInputChange('rateLimitWindowMs', e.target.value)}
                placeholder="60000"
                min={getDefinition('rateLimitWindowMs')?.validation?.min}
                max={getDefinition('rateLimitWindowMs')?.validation?.max}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Time window for rate limiting in milliseconds (1000ms - 1 hour)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rateLimitBurst">Burst Limit</Label>
              <Input
                id="rateLimitBurst"
                type="number"
                value={formData.rateLimitBurst}
                onChange={(e) => handleInputChange('rateLimitBurst', e.target.value)}
                placeholder="20"
                min={getDefinition('rateLimitBurst')?.validation?.min}
                max={getDefinition('rateLimitBurst')?.validation?.max}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Short-term burst allowance for quick consecutive requests (1-1,000)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rateLimitMaxRules">Max Custom Rules</Label>
              <Input
                id="rateLimitMaxRules"
                type="number"
                value={formData.rateLimitMaxRules}
                onChange={(e) => handleInputChange('rateLimitMaxRules', e.target.value)}
                placeholder="50"
                min={getDefinition('rateLimitMaxRules')?.validation?.min}
                max={getDefinition('rateLimitMaxRules')?.validation?.max}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Maximum custom rate limit rules per user (1-1,000)
              </p>
            </div>
          </div>

          {/* Impact Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Rate limiting changes take effect immediately. Very low limits may impact API usability.
              Consider gradual adjustments and monitor API performance after changes.
            </AlertDescription>
          </Alert>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <Badge variant="secondary">
                  Unsaved changes
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};