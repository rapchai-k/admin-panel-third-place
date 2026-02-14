import React from 'react';
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
} from 'lucide-react';
import { useAdminAuth } from './AdminAuthProvider';
import { useTheme } from 'next-themes';

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

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative admin-focus">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs">
            3
          </Badge>
        </Button>

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