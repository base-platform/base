"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, Clock, Save } from "lucide-react";

interface SessionSettings {
  duration: number;
  unit: 'minutes' | 'hours' | 'days';
  autoLogout: boolean;
}

export default function SettingsPage() {
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
    duration: 8,
    unit: 'hours',
    autoLogout: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('session_settings');
      if (stored) {
        setSessionSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Store settings locally
      localStorage.setItem('session_settings', JSON.stringify(sessionSettings));
      
      // Convert to milliseconds for token expiry
      const durationMs = getDurationInMs(sessionSettings.duration, sessionSettings.unit);
      localStorage.setItem('session_duration_ms', durationMs.toString());
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getDurationInMs = (duration: number, unit: string): number => {
    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000
    };
    return duration * multipliers[unit as keyof typeof multipliers];
  };

  const getDurationDisplay = (duration: number, unit: string): string => {
    const durationMs = getDurationInMs(duration, unit);
    const hours = Math.floor(durationMs / (60 * 60 * 1000));
    const minutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Session Management</CardTitle>
          </div>
          <CardDescription>
            Configure how long users stay logged in before being automatically logged out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Session Duration</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={365}
                value={sessionSettings.duration}
                onChange={(e) => 
                  setSessionSettings(prev => ({
                    ...prev,
                    duration: Math.max(1, parseInt(e.target.value) || 1)
                  }))
                }
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Time Unit</Label>
              <Select
                value={sessionSettings.unit}
                onValueChange={(value: 'minutes' | 'hours' | 'days') =>
                  setSessionSettings(prev => ({ ...prev, unit: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Session Length</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Users will be logged out after {getDurationDisplay(sessionSettings.duration, sessionSettings.unit)} of inactivity
                </p>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {getDurationDisplay(sessionSettings.duration, sessionSettings.unit)}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Recommendations</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>• For high-security environments: 1-2 hours</li>
                <li>• For development environments: 8-12 hours</li>
                <li>• For production environments: 4-8 hours</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Information</CardTitle>
          <CardDescription>
            Session management best practices and current status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm">Token Storage</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Secure HTTP-only cookies (recommended)
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm">Auto Refresh</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Tokens refresh automatically when active
              </p>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>• Settings are applied immediately after saving</p>
            <p>• Existing sessions will use the new duration on next login</p>
            <p>• Session data is stored securely in the browser</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}