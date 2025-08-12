import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { getProductByPriceId } from '../stripe-config';

export interface UserSubscription {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: 'not_started' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  product_name?: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          // Add product name if we have a price_id
          const product = data.price_id ? getProductByPriceId(data.price_id) : null;
          setSubscription({
            ...data,
            product_name: product?.name,
          });

          // Sync subscription status to ensure trial protection
          if (data.subscription_status === 'active' || data.subscription_status === 'trialing') {
            try {
              await supabase.rpc('sync_subscription_status');
              await supabase.rpc('protect_paying_customers');
            } catch (error) {
              console.error('Failed to sync subscription status:', error);
            }
          }
        } else {
          setSubscription(null);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const hasActiveSubscription = subscription?.subscription_status === 'active';
  const isTrialing = subscription?.subscription_status === 'trialing';
  const isPastDue = subscription?.subscription_status === 'past_due';
  const isCanceled = subscription?.subscription_status === 'canceled';

  return {
    subscription,
    loading,
    error,
    hasActiveSubscription,
    isTrialing,
    isPastDue,
    isCanceled,
    refetch: () => {
      if (user) {
        // Trigger a re-fetch by updating the effect dependency
        setLoading(true);
      }
    },
  };
}