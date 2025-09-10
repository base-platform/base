'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lock, Shield, History, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecuritySettings } from '@/contexts/security-settings-context';
import { toast } from 'sonner';

interface PasswordPolicyFormData {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecial: boolean;
  passwordHistoryCount: number;
  passwordMaxAgeDays: number;
}

export const PasswordPolicySettings = () => {
  const { settings, definitions, updateSetting, isLoading } = useSecuritySettings();
  const [formData, setFormData] = useState<PasswordPolicyFormData>({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
    passwordHistoryCount: 5,
    passwordMaxAgeDays: 90,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const newFormData = {
        passwordMinLength: settings.passwordMinLength,
        passwordRequireUppercase: settings.passwordRequireUppercase,
        passwordRequireLowercase: settings.passwordRequireLowercase,
        passwordRequireNumbers: settings.passwordRequireNumbers,
        passwordRequireSpecial: settings.passwordRequireSpecial,
        passwordHistoryCount: settings.passwordHistoryCount,
        passwordMaxAgeDays: settings.passwordMaxAgeDays,
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [settings]);

  const getDefinition = (key: string) => {
    return definitions.find(def => def.key === key);
  };

  const handleInputChange = (key: keyof PasswordPolicyFormData, value: string | number | boolean) => {
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
    
    // Check if there are changes
    if (settings) {
      const hasChanged = Object.keys(newFormData).some(
        k => newFormData[k as keyof PasswordPolicyFormData] !== settings[k as keyof typeof settings]
      );
      setHasChanges(hasChanged);
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Validate numeric fields
    ['passwordMinLength', 'passwordHistoryCount', 'passwordMaxAgeDays'].forEach(key => {
      const value = formData[key as keyof PasswordPolicyFormData] as number;
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
        updateSetting('passwordMinLength', formData.passwordMinLength),
        updateSetting('passwordRequireUppercase', formData.passwordRequireUppercase),
        updateSetting('passwordRequireLowercase', formData.passwordRequireLowercase),
        updateSetting('passwordRequireNumbers', formData.passwordRequireNumbers),
        updateSetting('passwordRequireSpecial', formData.passwordRequireSpecial),
        updateSetting('passwordHistoryCount', formData.passwordHistoryCount),
        updateSetting('passwordMaxAgeDays', formData.passwordMaxAgeDays),
      ]);
      
      setHasChanges(false);
      toast.success('Password policy settings updated successfully');
    } catch (error) {
      console.error('Failed to save password policy settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData({
        passwordMinLength: settings.passwordMinLength,
        passwordRequireUppercase: settings.passwordRequireUppercase,
        passwordRequireLowercase: settings.passwordRequireLowercase,
        passwordRequireNumbers: settings.passwordRequireNumbers,
        passwordRequireSpecial: settings.passwordRequireSpecial,
        passwordHistoryCount: settings.passwordHistoryCount,
        passwordMaxAgeDays: settings.passwordMaxAgeDays,
      });
      setHasChanges(false);
    }
  };

  const getComplexityScore = (): number => {
    let score = 0;
    if (formData.passwordRequireUppercase) score += 1;
    if (formData.passwordRequireLowercase) score += 1;
    if (formData.passwordRequireNumbers) score += 1;
    if (formData.passwordRequireSpecial) score += 1;
    return score;
  };

  const getComplexityLevel = (): { level: string; color: string } => {
    const score = getComplexityScore();
    if (score === 4) return { level: 'Very High', color: 'bg-green-500' };
    if (score === 3) return { level: 'High', color: 'bg-blue-500' };
    if (score === 2) return { level: 'Medium', color: 'bg-yellow-500' };
    return { level: 'Low', color: 'bg-red-500' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const complexityLevel = getComplexityLevel();

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Lock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Min Length</p>
                <p className="text-2xl font-bold">{formData.passwordMinLength}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">characters</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${complexityLevel.color} rounded-lg`}>
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Complexity</p>
                <p className="text-lg font-bold">{complexityLevel.level}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{getComplexityScore()}/4 rules</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <History className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">History</p>
                <p className="text-2xl font-bold">{formData.passwordHistoryCount}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">passwords</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Max Age</p>
                <p className="text-2xl font-bold">{formData.passwordMaxAgeDays}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Basic Requirements</span>
            </CardTitle>
            <CardDescription>
              Define minimum password strength requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Minimum Length</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={formData.passwordMinLength}
                onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value) || 0)}
                placeholder="8"
                min={getDefinition('passwordMinLength')?.validation?.min}
                max={getDefinition('passwordMinLength')?.validation?.max}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Minimum number of characters (4-128)
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Character Requirements</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireUppercase">Require Uppercase Letters</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">At least one A-Z character</p>
                </div>
                <Switch
                  id="requireUppercase"
                  checked={formData.passwordRequireUppercase}
                  onCheckedChange={(checked) => handleInputChange('passwordRequireUppercase', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireLowercase">Require Lowercase Letters</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">At least one a-z character</p>
                </div>
                <Switch
                  id="requireLowercase"
                  checked={formData.passwordRequireLowercase}
                  onCheckedChange={(checked) => handleInputChange('passwordRequireLowercase', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireNumbers">Require Numbers</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">At least one 0-9 digit</p>
                </div>
                <Switch
                  id="requireNumbers"
                  checked={formData.passwordRequireNumbers}
                  onCheckedChange={(checked) => handleInputChange('passwordRequireNumbers', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireSpecial">Require Special Characters</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">At least one symbol (!@#$%^&*)</p>
                </div>
                <Switch
                  id="requireSpecial"
                  checked={formData.passwordRequireSpecial}
                  onCheckedChange={(checked) => handleInputChange('passwordRequireSpecial', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Advanced Settings</span>
            </CardTitle>
            <CardDescription>
              Configure password lifecycle and history tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="passwordHistoryCount">Password History</Label>
              <Input
                id="passwordHistoryCount"
                type="number"
                value={formData.passwordHistoryCount}
                onChange={(e) => handleInputChange('passwordHistoryCount', parseInt(e.target.value) || 0)}
                placeholder="5"
                min={getDefinition('passwordHistoryCount')?.validation?.min}
                max={getDefinition('passwordHistoryCount')?.validation?.max}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Number of previous passwords to remember (0-50)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordMaxAgeDays">Maximum Password Age</Label>
              <Input
                id="passwordMaxAgeDays"
                type="number"
                value={formData.passwordMaxAgeDays}
                onChange={(e) => handleInputChange('passwordMaxAgeDays', parseInt(e.target.value) || 0)}
                placeholder="90"
                min={getDefinition('passwordMaxAgeDays')?.validation?.min}
                max={getDefinition('passwordMaxAgeDays')?.validation?.max}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Days before password expires (0 = never expires, max 365)
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Password policy changes apply to new passwords only. Existing users will be prompted 
                to update their passwords on next login if they don't meet the new requirements.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <Badge variant="secondary">
                  Unsaved changes
                </Badge>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Current complexity: <span className="font-medium">{complexityLevel.level}</span>
              </div>
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