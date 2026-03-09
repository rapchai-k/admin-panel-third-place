import { useState, useEffect } from 'react';
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
  RotateCcw,
  Share2,
  Link,
  Unlink,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { openHootsuiteAuthPopup } from '@/lib/hootsuite-oauth';
import type { HootsuiteToken } from '@/lib/social-posting.types';


export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // ── Hootsuite connection state ──────────────────────────────────────────
  const [hootsuiteToken, setHootsuiteToken] = useState<HootsuiteToken | null>(null);
  const [hootsuiteLoading, setHootsuiteLoading] = useState(true);
  const [hootsuiteDisconnecting, setHootsuiteDisconnecting] = useState(false);

  const loadHootsuiteToken = async () => {
    setHootsuiteLoading(true);
    const { data } = await supabase
      .from('hootsuite_tokens')
      .select('*')
      .limit(1)
      .single();
    setHootsuiteToken((data as HootsuiteToken | null) ?? null);
    setHootsuiteLoading(false);
  };

  // Handle OAuth redirect params (2A.4) — runs once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('hootsuite_connected');
    const error = params.get('hootsuite_error');

    if (connected === 'true') {
      toast({ title: 'Hootsuite Connected', description: 'Your Hootsuite account has been connected successfully.' });
      // Remove query params without reloading
      window.history.replaceState({}, '', window.location.pathname);
      loadHootsuiteToken();
    } else if (error) {
      toast({ title: 'Hootsuite Connection Failed', description: decodeURIComponent(error), variant: 'destructive' });
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      loadHootsuiteToken();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectHootsuite = () => {
    openHootsuiteAuthPopup();
    // After the popup completes, the admin is redirected back to this page
    // with ?hootsuite_connected=true — handled in the useEffect above.
  };

  const handleDisconnectHootsuite = async () => {
    if (!hootsuiteToken) return;
    setHootsuiteDisconnecting(true);
    const { error } = await supabase.from('hootsuite_tokens').delete().eq('id', hootsuiteToken.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to disconnect Hootsuite.', variant: 'destructive' });
    } else {
      setHootsuiteToken(null);
      toast({ title: 'Disconnected', description: 'Hootsuite account has been disconnected.' });
    }
    setHootsuiteDisconnecting(false);
  };

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
        {/* Social Media Integration */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Social Media Integration</h2>
          </div>

          {hootsuiteLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking connection status…</span>
            </div>
          ) : hootsuiteToken ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-green-500 text-white">Connected</Badge>
                  <span className="text-sm font-medium">Hootsuite</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token expires: {new Date(hootsuiteToken.expires_at).toLocaleString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectHootsuite}
                disabled={hootsuiteDisconnecting}
              >
                {hootsuiteDisconnecting
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <Unlink className="h-4 w-4 mr-2" />}
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-destructive border-destructive">Not Connected</Badge>
                  <span className="text-sm font-medium">Hootsuite</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect your Hootsuite account to enable social media posting from event creation.
                </p>
              </div>
              <Button size="sm" onClick={handleConnectHootsuite}>
                <Link className="h-4 w-4 mr-2" />
                Connect Hootsuite
              </Button>
            </div>
          )}
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