import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import {
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Save,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // General Settings
  const [platformName, setPlatformName] = useState('Community Platform');
  const [platformDescription, setPlatformDescription] = useState('Connect, engage, and grow your community');
  const [supportEmail, setSupportEmail] = useState('support@platform.com');
  const [maxFileSize, setMaxFileSize] = useState('10');
  const [timezone, setTimezone] = useState('UTC');

  // Feature Toggles
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(true);
  const [moderationEnabled, setModerationEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);


  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    // Reset to defaults
    setPlatformName('Community Platform');
    setPlatformDescription('Connect, engage, and grow your community');
    setSupportEmail('support@platform.com');
    setMaxFileSize('10');
    setTimezone('UTC');
    setRegistrationEnabled(true);
    setEmailVerificationRequired(true);
    setModerationEnabled(true);
    setAnalyticsEnabled(true);
    setEmailNotifications(true);
    setPushNotifications(true);
    setSmsNotifications(false);

    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Settings
          </h1>
          <p className="text-muted-foreground">Configure platform settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">General Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder="Enter platform name"
              />
            </div>
            <div>
              <Label htmlFor="platformDescription">Platform Description</Label>
              <Textarea
                id="platformDescription"
                value={platformDescription}
                onChange={(e) => setPlatformDescription(e.target.value)}
                placeholder="Enter platform description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@platform.com"
              />
            </div>
            <div>
              <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                value={maxFileSize}
                onChange={(e) => setMaxFileSize(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <Label htmlFor="timezone">Default Timezone</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="UTC"
              />
            </div>
          </div>
        </Card>



        {/* Feature Toggles */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Feature Toggles</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="registration">User Registration</Label>
                <p className="text-sm text-muted-foreground">Allow new users to register</p>
              </div>
              <Switch
                id="registration"
                checked={registrationEnabled}
                onCheckedChange={setRegistrationEnabled}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailVerification">Email Verification</Label>
                <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
              </div>
              <Switch
                id="emailVerification"
                checked={emailVerificationRequired}
                onCheckedChange={setEmailVerificationRequired}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="moderation">Content Moderation</Label>
                <p className="text-sm text-muted-foreground">Enable automated content moderation</p>
              </div>
              <Switch
                id="moderation"
                checked={moderationEnabled}
                onCheckedChange={setModerationEnabled}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="analytics">Analytics Tracking</Label>
                <p className="text-sm text-muted-foreground">Collect user analytics and metrics</p>
              </div>
              <Switch
                id="analytics"
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Notification Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifs">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send notifications via email</p>
              </div>
              <Switch
                id="emailNotifs"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pushNotifs">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Send browser push notifications</p>
              </div>
              <Switch
                id="pushNotifs"
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smsNotifs">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
              </div>
              <Switch
                id="smsNotifs"
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">System Status</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center">
            <Badge variant="default" className="mb-2">Online</Badge>
            <p className="text-sm text-muted-foreground">Database</p>
          </div>
          <div className="text-center">
            <Badge variant="default" className="mb-2">Active</Badge>
            <p className="text-sm text-muted-foreground">Authentication</p>
          </div>
          <div className="text-center">
            <Badge variant="default" className="mb-2">Running</Badge>
            <p className="text-sm text-muted-foreground">Email Service</p>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="mb-2">Inactive</Badge>
            <p className="text-sm text-muted-foreground">SMS Service</p>
          </div>
        </div>
      </Card>
    </div>
  );
}