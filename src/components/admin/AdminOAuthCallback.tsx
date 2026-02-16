import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AdminOAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);

        // Handle PKCE (code) flow first
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            console.error('OAuth code exchange error:', error);
            toast({ title: 'Authentication Error', description: error.message, variant: 'destructive' });
            navigate('/admin/login', { replace: true });
            return;
          }
          // Clean up URL hash to avoid leaving tokens in the address bar
          window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`);
          navigate('/admin/dashboard', { replace: true });
          return;
        }

        // Handle implicit flow with tokens in URL hash
        if (url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token') || undefined;
          const refreshToken = hashParams.get('refresh_token') || undefined;

          if (accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken!,
            });
            if (error) {
              console.error('Set session from hash error:', error);
              toast({ title: 'Authentication Error', description: error.message, variant: 'destructive' });
              navigate('/admin/login', { replace: true });
              return;
            }
            // Clean up URL hash to avoid leaving tokens in the address bar
            window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`);
            navigate('/admin/dashboard', { replace: true });
            return;
          }
        }

        // Fallback: check for existing session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('OAuth callback error:', error);
          toast({ title: 'Authentication Error', description: error.message, variant: 'destructive' });
          navigate('/admin/login', { replace: true });
          return;
        }

        if (data.session) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          toast({ title: 'Authentication Failed', description: 'No valid session found. Please try again.', variant: 'destructive' });
          navigate('/admin/login', { replace: true });
        }
      } catch (err) {
        console.error('Unexpected error during OAuth callback:', err);
        toast({ title: 'Authentication Error', description: 'An unexpected error occurred during authentication.', variant: 'destructive' });
        navigate('/admin/login', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-pulse">
          <Shield className="h-8 w-8 mx-auto mb-4 text-primary" />
        </div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}