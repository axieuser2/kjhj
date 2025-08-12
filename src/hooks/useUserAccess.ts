import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserAccessStatus {
  user_id: string;
  trial_start_date: string;
  trial_end_date: string;
  trial_status: 'active' | 'expired' | 'converted_to_paid' | 'scheduled_for_deletion';
  deletion_scheduled_at: string | null;
  subscription_status: string | null;
  subscription_id: string | null;
  price_id: string | null;
  current_period_end: number | null;
  has_access: boolean;
  access_type: 'paid_subscription' | 'stripe_trial' | 'free_trial' | 'no_access';
  seconds_remaining: number;
  days_remaining: number;
}

export function useUserAccess() {
  const { user } = useAuth();
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAccessStatus(null);
      setLoading(false);
      return;
    }

    const fetchAccessStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('user_access_status')
          .select('*')
          .single();

        if (fetchError) {
          throw fetchError;
        }

        setAccessStatus(data);
      } catch (err) {
        console.error('Error fetching user access status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch access status');
        setAccessStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessStatus();

    // Set up real-time subscription for access status updates
    const subscription = supabase
      .channel('user_access_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_trials',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          fetchAccessStatus();
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'stripe_subscriptions'
        }, 
        () => {
          fetchAccessStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const hasAccess = accessStatus?.has_access || false;
  const isPaidUser = accessStatus?.access_type === 'paid_subscription';
  const isTrialing = accessStatus?.access_type === 'stripe_trial';
  const isFreeTrialing = accessStatus?.access_type === 'free_trial';
  const isProtected = isPaidUser || isTrialing || accessStatus?.trial_status === 'converted_to_paid';

  return {
    accessStatus,
    loading,
    error,
    hasAccess,
    isPaidUser,
    isTrialing,
    isFreeTrialing,
    isProtected,
    refetch: () => {
      if (user) {
        setLoading(true);
      }
    },
  };
}