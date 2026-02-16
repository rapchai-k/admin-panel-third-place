import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user has admin role
          setTimeout(async () => {
            try {
              // Validate session before making DB calls
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              if (!currentSession) {
                setIsAdmin(false);
                return;
              }

              const { data: isAdminResult, error } = await supabase
                .rpc('is_admin', { _user_id: session.user.id });

              if (!error && isAdminResult === true) {
                setIsAdmin(true);
              } else {
                setIsAdmin(false);
                if (event === 'SIGNED_IN') {
                  toast({
                    title: "Access Denied",
                    description: "Admin privileges required to access this panel.",
                    variant: "destructive",
                  });
                }
              }
            } catch (error) {
              console.error('Error checking admin status:', error);
              setIsAdmin(false);
              
              // Handle session expiry
              if (error instanceof Error && error.message.includes('JWT')) {
                toast({
                  title: "Session Expired",
                  description: "Please sign in again.",
                  variant: "destructive",
                });
                setUser(null);
                setSession(null);
              }
            }
          }, 0);
        } else {
          setIsAdmin(false);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first to ensure UI updates even if logout fails
      setIsAdmin(false);
      setUser(null);
      setSession(null);
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('Supabase sign out error:', error);
        // Don't show error for session not found - user is already logged out
        if (!error.message.includes('session_not_found') && !error.message.includes('Session not found')) {
          toast({
            title: "Sign Out Warning",
            description: "Logged out locally. Some session data may persist.",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Ensure local state is cleared even on error
      setIsAdmin(false);
      setUser(null);
      setSession(null);
      
      toast({
        title: "Signed Out",
        description: "Logged out locally due to error.",
      });
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isAdmin,
    signIn,
    signOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}