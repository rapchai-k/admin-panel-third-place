import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  BarChart3,
  Users,
  MapPin,
  Calendar,
  MessageSquare,
  UserCheck,
  CreditCard,
  Flag,
  TrendingUp,
  Settings,
  Shield,
  LogOut,
  User,
  Moon,
  Sun,
  Bell,
  CheckCheck,
} from 'lucide-react';
import { useAdminAuth } from './AdminAuthProvider';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';

// ── Notification types & helpers ────────────────────────────────────
interface ActivityNotification {
  id: string;
  action_type: string;
  target_type: string;
  metadata: Record<string, any> | null;
  timestamp: string;
}

const LAST_READ_KEY = 'admin_notif_last_read';

function notifLabel(n: ActivityNotification): string {
  const meta = n.metadata as Record<string, any> | null;
  switch (n.action_type) {
    case 'user_created':
      return `New user: ${meta?.name || 'Unknown'}`;
    case 'event_created':
      return `Event created: ${meta?.title || 'Untitled'}`;
    case 'community_created':
      return `Community created: ${meta?.name || 'Untitled'}`;
    case 'registration_created':
      return `Registration for ${meta?.event_title || 'an event'}`;
    case 'user_banned':
      return `User banned: ${meta?.name || 'Unknown'}`;
    case 'user_unbanned':
      return `User unbanned: ${meta?.name || 'Unknown'}`;
    case 'flag_created':
      return `New flag: ${meta?.reason || 'Content flagged'}`;
    default:
      return n.action_type.replace(/_/g, ' ');
  }
}

function notifTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const navigationItems = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', url: '/admin/dashboard', icon: BarChart3 },
      { title: 'Analytics', url: '/admin/analytics', icon: TrendingUp },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Communities', url: '/admin/communities', icon: MapPin },
      { title: 'Events', url: '/admin/events', icon: Calendar },
      { title: 'Users', url: '/admin/users', icon: Users },
      { title: 'Discussions', url: '/admin/discussions', icon: MessageSquare },
      { title: 'Registrations', url: '/admin/registrations', icon: UserCheck },
      { title: 'Payments', url: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Moderation',
    items: [
      { title: 'Flagged Content', url: '/admin/moderation', icon: Flag },
      { title: 'Settings', url: '/admin/settings', icon: Settings },
    ],
  },
];

function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={`${collapsed ? 'w-16' : 'w-64'} bg-admin-sidebar border-r border-admin-sidebar-accent`}>
      <SidebarContent className="bg-admin-sidebar">
        {/* Logo */}
        <div className="p-4 border-b border-admin-sidebar-accent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-admin-sidebar-foreground">Admin Panel</h2>
                <p className="text-xs text-admin-sidebar-muted">MyThirdPlace</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {navigationItems.map((group) => (
          <SidebarGroup key={group.title}>
            {!collapsed && (
              <SidebarGroupLabel className="text-admin-sidebar-muted font-medium">
                {group.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      className={`
                        w-full justify-start admin-transition
                        ${isActive(item.url) 
                          ? 'bg-admin-sidebar-accent text-primary' 
                          : 'text-admin-sidebar-foreground hover:bg-admin-sidebar-accent/50'
                        }
                      `}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

function AdminHeader() {
  const { user, signOut } = useAdminAuth();
  const { theme, setTheme } = useTheme();

  // ── Notification state ──────────────────────────────────────────
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [lastRead, setLastRead] = useState<string>(
    () => localStorage.getItem(LAST_READ_KEY) || '1970-01-01T00:00:00Z',
  );
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('user_activity_log')
      .select('id, action_type, target_type, metadata, timestamp')
      .order('timestamp', { ascending: false })
      .limit(15);
    if (data) setNotifications(data as unknown as ActivityNotification[]);
  }, []);

  useEffect(() => {
    loadNotifications();
    // Refresh every 60 s while tab is open
    const id = setInterval(loadNotifications, 60_000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  const unreadCount = notifications.filter(
    (n) => new Date(n.timestamp) > new Date(lastRead),
  ).length;

  const markAllRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_READ_KEY, now);
    setLastRead(now);
  };

  // Auto-mark read when popover opens
  useEffect(() => {
    if (notifOpen && unreadCount > 0) {
      // small delay so user can see the list flash "new" before marking
      const t = setTimeout(markAllRead, 2000);
      return () => clearTimeout(t);
    }
  }, [notifOpen, unreadCount]);

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 admin-shadow">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="font-semibold">Admin Control Panel</h1>
          <p className="text-sm text-muted-foreground">Manage your community platform</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="admin-focus"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications Popover */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="relative admin-focus">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" /> Mark read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
              ) : (
                notifications.map((n) => {
                  const isUnread = new Date(n.timestamp) > new Date(lastRead);
                  return (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-sm ${isUnread ? 'bg-primary/5' : ''}`}
                    >
                      <p className={`${isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                        {notifLabel(n)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notifTimeAgo(n.timestamp)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 admin-focus">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.name || user?.email || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              System Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}