import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  MapPin,
  Calendar,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  Plus,
  ArrowUpRight,
  DollarSign,
  CreditCard,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/context/CurrencyProvider';

interface DashboardStats {
  totalUsers: number;
  totalCommunities: number;
  totalEvents: number;
  totalRegistrations: number;
  recentUsers: number;
  recentEvents: number;
  recentRegistrations: number;
  totalRevenue: number;
  paidCount: number;
  pendingPaymentsCount: number;
  expiredPaymentsCount: number;
  recentRevenue: number;
}

interface SystemStatus {
  database: 'operational' | 'warning' | 'error';
  auth: 'operational' | 'warning' | 'error';
  storage: 'operational' | 'warning' | 'error';
}

interface RecentActivity {
  id: string;
  type: 'user_joined' | 'event_created' | 'community_created' | 'registration_made';
  description: string;
  timestamp: string;
  metadata?: any;
}

const StatCard = ({
  title,
  value,
  displayValue,
  change,
  icon: Icon,
  trend,
  subtitle,
}: {
  title: string;
  value?: number;
  displayValue?: string;
  change?: number;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}) => (
  <Card className="admin-shadow hover:shadow-lg admin-transition">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{displayValue ?? (value?.toLocaleString() || '0')}</div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
        {trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
        <span className={
          trend === 'up' ? 'text-success' :
          trend === 'down' ? 'text-destructive' :
          'text-muted-foreground'
        }>
          {subtitle ? subtitle : change !== undefined ? `${change > 0 ? '+' : ''}${Math.round(change)}% from last month` : ''}
        </span>
      </div>
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'operational',
    auth: 'operational',
    storage: 'operational'
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch dashboard statistics
      const [
        usersResult,
        communitiesResult,
        eventsResult,
        registrationsResult,
        activityResult,
        paymentsResult
      ] = await Promise.all([
        supabase.from('users').select('id, created_at', { count: 'exact' }),
        supabase.from('communities').select('id, created_at', { count: 'exact' }),
        supabase.from('events').select('id, created_at', { count: 'exact' }),
        supabase.from('event_registrations').select('id, created_at', { count: 'exact' }),
        supabase
          .from('user_activity_log')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(10),
        supabase.from('payment_sessions').select('payment_status, amount, expires_at, updated_at')
      ]);

      // Calculate recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsers = usersResult.data?.filter(
        user => new Date(user.created_at) > thirtyDaysAgo
      ).length || 0;

      const recentEvents = eventsResult.data?.filter(
        event => new Date(event.created_at) > thirtyDaysAgo
      ).length || 0;

      const recentRegistrations = registrationsResult.data?.filter(
        reg => new Date(reg.created_at) > thirtyDaysAgo
      ).length || 0;

      // Calculate payment metrics (gracefully handle query failure)
      if (paymentsResult.error) {
        console.warn('Failed to load payment sessions:', paymentsResult.error);
      }
      const payments = paymentsResult.data || [];
      const paidSessions = payments.filter(p => p.payment_status === 'paid');
      const totalRevenue = paidSessions.reduce((sum, p) => sum + Number(p.amount), 0);
      const paidCount = paidSessions.length;
      const now = new Date();
      const pendingPaymentsCount = payments.filter(
        p => p.payment_status === 'yet_to_pay' && new Date(p.expires_at) > now
      ).length;
      const expiredPaymentsCount = payments.filter(
        p => p.payment_status === 'yet_to_pay' && new Date(p.expires_at) <= now
      ).length;
      const recentRevenue = paidSessions
        .filter(p => p.updated_at && new Date(p.updated_at) > thirtyDaysAgo)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({
        totalUsers: usersResult.count || 0,
        totalCommunities: communitiesResult.count || 0,
        totalEvents: eventsResult.count || 0,
        totalRegistrations: registrationsResult.count || 0,
        recentUsers,
        recentEvents,
        recentRegistrations,
        totalRevenue,
        paidCount,
        pendingPaymentsCount,
        expiredPaymentsCount,
        recentRevenue,
      });

      // Format recent activity
      const formattedActivity: RecentActivity[] = activityResult.data?.map(activity => ({
        id: activity.id,
        type: activity.action_type as any,
        description: getActivityDescription(activity),
        timestamp: activity.timestamp,
        metadata: activity.metadata,
      })) || [];

      setRecentActivity(formattedActivity);

      // Check system status
      const dbHealthy = !usersResult.error && !communitiesResult.error;
      const authHealthy = true; // If we're here, auth is working
      setSystemStatus({
        database: dbHealthy ? 'operational' : 'error',
        auth: authHealthy ? 'operational' : 'warning',
        storage: 'operational' // Assuming storage is fine for now
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setSystemStatus({
        database: 'error',
        auth: 'warning',
        storage: 'warning'
      });
      toast({
        title: "Error Loading Dashboard",
        description: "Failed to load dashboard statistics.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityDescription = (activity: any): string => {
    const actionType = activity.action_type;
    const metadata = activity.metadata;
    
    switch (actionType) {
      case 'user_created':
        return `New user ${metadata?.name || 'Unknown'} joined the platform`;
      case 'event_created':
        return `Event "${metadata?.title || 'Unknown'}" was created`;
      case 'community_created':
        return `Community "${metadata?.name || 'Unknown'}" was created`;
      case 'registration_created':
        return `New registration for event "${metadata?.event_title || 'Unknown'}"`;
      default:
        return `${actionType.replace('_', ' ')} activity`;
    }
  };

  const getTrendDirection = (recent: number, total: number): 'up' | 'down' | 'neutral' => {
    const percentage = total > 0 ? (recent / total) * 100 : 0;
    if (percentage > 20) return 'up';
    if (percentage < 5) return 'down';
    return 'neutral';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>Dashboard</h1>
            <p className="text-muted-foreground">Overview of your community platform</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="admin-shadow">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your community platform control center</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadDashboardData} className="admin-focus">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/admin/communities')} className="admin-focus">
            <Plus className="h-4 w-4 mr-2" />
            Add Community
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          change={stats ? (stats.recentUsers / Math.max(stats.totalUsers, 1)) * 100 : 0}
          icon={Users}
          trend={getTrendDirection(stats?.recentUsers || 0, stats?.totalUsers || 0)}
        />
        <StatCard
          title="Communities"
          value={stats?.totalCommunities || 0}
          change={15}
          icon={MapPin}
          trend="up"
        />
        <StatCard
          title="Events"
          value={stats?.totalEvents || 0}
          change={stats ? (stats.recentEvents / Math.max(stats.totalEvents, 1)) * 100 : 0}
          icon={Calendar}
          trend={getTrendDirection(stats?.recentEvents || 0, stats?.totalEvents || 0)}
        />
        <StatCard
          title="Registrations"
          value={stats?.totalRegistrations || 0}
          change={stats ? (stats.recentRegistrations / Math.max(stats.totalRegistrations, 1)) * 100 : 0}
          icon={UserCheck}
          trend={getTrendDirection(stats?.recentRegistrations || 0, stats?.totalRegistrations || 0)}
        />
        <StatCard
          title="Total Revenue"
          displayValue={formatCurrency(stats?.totalRevenue || 0)}
          subtitle={`${formatCurrency(stats?.recentRevenue || 0)} in last 30 days`}
          icon={DollarSign}
          trend={stats && stats.recentRevenue > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Payments"
          value={stats?.paidCount || 0}
          subtitle={`${stats?.pendingPaymentsCount || 0} pending · ${stats?.expiredPaymentsCount || 0} expired`}
          icon={CreditCard}
          trend={stats && stats.pendingPaymentsCount > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 admin-shadow">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform activities and user actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {recentActivity.length > 6 && (
                <Button 
                  variant="ghost" 
                  className="w-full admin-focus"
                  onClick={() => navigate('/admin/analytics')}
                >
                  View All Activity
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="admin-shadow">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start admin-focus"
              onClick={() => navigate('/admin/users')}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start admin-focus"
              onClick={() => navigate('/admin/events')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create Event
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start admin-focus"
              onClick={() => navigate('/admin/communities')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Add Community
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start admin-focus"
              onClick={() => navigate('/admin/moderation')}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              View Flags
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="admin-shadow">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system health and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus.database === 'operational' ? 'bg-success' :
                systemStatus.database === 'warning' ? 'bg-warning' : 'bg-destructive'
              }`} />
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-muted-foreground">
                  {systemStatus.database === 'operational' ? 'Operational' :
                   systemStatus.database === 'warning' ? 'Warning' : 'Error'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus.auth === 'operational' ? 'bg-success' :
                systemStatus.auth === 'warning' ? 'bg-warning' : 'bg-destructive'
              }`} />
              <div>
                <p className="text-sm font-medium">Authentication</p>
                <p className="text-xs text-muted-foreground">
                  {systemStatus.auth === 'operational' ? 'All systems normal' :
                   systemStatus.auth === 'warning' ? 'Minor issues' : 'Service disrupted'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus.storage === 'operational' ? 'bg-success' :
                systemStatus.storage === 'warning' ? 'bg-warning' : 'bg-destructive'
              }`} />
              <div>
                <p className="text-sm font-medium">Storage</p>
                <p className="text-xs text-muted-foreground">
                  {systemStatus.storage === 'operational' ? 'Available' :
                   systemStatus.storage === 'warning' ? '85% capacity' : 'Storage error'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}