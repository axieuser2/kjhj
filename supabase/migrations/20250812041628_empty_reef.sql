/*
  # Strengthen User Integration Between Supabase, Stripe, and Axie Studio

  1. Enhanced Functions
    - `sync_subscription_status()`: Ensures trial status matches subscription status
    - `protect_paying_customers()`: Prevents deletion of users with active subscriptions
    - `get_user_access_level()`: Determines user's current access level

  2. Improved Triggers
    - Auto-update trial status when subscription changes
    - Prevent accidental deletion of paying customers

  3. Enhanced Views
    - `user_access_status`: Complete view of user's access rights
    - Better integration between trial and subscription data

  4. Safety Measures
    - Multiple checks to prevent paying customer deletion
    - Automatic trial conversion when subscription becomes active
*/

-- Enhanced function to sync subscription status with trial status
CREATE OR REPLACE FUNCTION sync_subscription_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mark trials as converted for users with active subscriptions
    UPDATE user_trials 
    SET 
        trial_status = 'converted_to_paid',
        deletion_scheduled_at = NULL,
        updated_at = now()
    WHERE user_id IN (
        SELECT DISTINCT c.user_id 
        FROM stripe_customers c
        JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
        WHERE s.status IN ('active', 'trialing') 
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
    AND trial_status NOT IN ('converted_to_paid');

    -- Update expired trials that haven't been converted to paid
    UPDATE user_trials 
    SET 
        trial_status = 'expired',
        deletion_scheduled_at = now() + interval '1 day',
        updated_at = now()
    WHERE 
        trial_end_date < now() 
        AND trial_status = 'active'
        AND user_id NOT IN (
            SELECT DISTINCT c.user_id 
            FROM stripe_customers c
            JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
            WHERE s.status IN ('active', 'trialing') 
            AND s.deleted_at IS NULL
            AND c.deleted_at IS NULL
        );
        
    -- Schedule deletion for accounts that have been expired for more than 1 day
    -- BUT ONLY if they don't have active subscriptions
    UPDATE user_trials 
    SET 
        trial_status = 'scheduled_for_deletion',
        updated_at = now()
    WHERE 
        trial_status = 'expired'
        AND deletion_scheduled_at < now()
        AND user_id NOT IN (
            SELECT DISTINCT c.user_id 
            FROM stripe_customers c
            JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
            WHERE s.status IN ('active', 'trialing') 
            AND s.deleted_at IS NULL
            AND c.deleted_at IS NULL
        );
END;
$$;

-- Enhanced function to protect paying customers from deletion
CREATE OR REPLACE FUNCTION protect_paying_customers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove deletion scheduling for any user who has an active subscription
    UPDATE user_trials 
    SET 
        trial_status = 'converted_to_paid',
        deletion_scheduled_at = NULL,
        updated_at = now()
    WHERE user_id IN (
        SELECT DISTINCT c.user_id 
        FROM stripe_customers c
        JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
        WHERE s.status IN ('active', 'trialing') 
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
    AND trial_status IN ('expired', 'scheduled_for_deletion');
END;
$$;

-- Function to get user's current access level
CREATE OR REPLACE FUNCTION get_user_access_level(p_user_id uuid)
RETURNS TABLE(
    has_access boolean,
    access_type text,
    subscription_status text,
    trial_status text,
    days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN s.status IN ('active', 'trialing') THEN true
            WHEN ut.trial_status = 'active' AND ut.trial_end_date > now() THEN true
            ELSE false
        END as has_access,
        CASE 
            WHEN s.status = 'active' THEN 'paid_subscription'
            WHEN s.status = 'trialing' THEN 'stripe_trial'
            WHEN ut.trial_status = 'active' AND ut.trial_end_date > now() THEN 'free_trial'
            ELSE 'no_access'
        END as access_type,
        COALESCE(s.status::text, 'none') as subscription_status,
        ut.trial_status::text,
        CASE 
            WHEN ut.trial_end_date > now() THEN EXTRACT(days FROM (ut.trial_end_date - now()))::integer
            ELSE 0
        END as days_remaining
    FROM user_trials ut
    LEFT JOIN stripe_customers c ON ut.user_id = c.user_id AND c.deleted_at IS NULL
    LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id AND s.deleted_at IS NULL
    WHERE ut.user_id = p_user_id;
END;
$$;

-- Enhanced function to safely get users for deletion (with multiple safety checks)
CREATE OR REPLACE FUNCTION get_users_for_deletion()
RETURNS TABLE(user_id uuid, email text, trial_end_date timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ut.user_id,
        au.email,
        ut.trial_end_date
    FROM user_trials ut
    JOIN auth.users au ON ut.user_id = au.id
    WHERE ut.trial_status = 'scheduled_for_deletion'
    -- SAFETY CHECK: Ensure no active subscription exists
    AND ut.user_id NOT IN (
        SELECT DISTINCT c.user_id 
        FROM stripe_customers c
        JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
        WHERE s.status IN ('active', 'trialing') 
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
    -- SAFETY CHECK: Ensure trial has actually expired
    AND ut.trial_end_date < now() - interval '1 day';
END;
$$;

-- Enhanced check_expired_trials function with better safety
CREATE OR REPLACE FUNCTION check_expired_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First, protect any paying customers
    PERFORM protect_paying_customers();
    
    -- Then sync subscription status
    PERFORM sync_subscription_status();
    
    -- Log the operation
    RAISE NOTICE 'Trial cleanup completed at %', now();
END;
$$;

-- Create enhanced user access status view
CREATE OR REPLACE VIEW user_access_status WITH (security_invoker = true) AS
SELECT
    ut.user_id,
    ut.trial_start_date,
    ut.trial_end_date,
    ut.trial_status,
    ut.deletion_scheduled_at,
    s.status as subscription_status,
    s.subscription_id,
    s.price_id,
    s.current_period_end,
    CASE 
        WHEN s.status IN ('active', 'trialing') THEN true
        WHEN ut.trial_status = 'active' AND ut.trial_end_date > now() THEN true
        ELSE false
    END as has_access,
    CASE 
        WHEN s.status = 'active' THEN 'paid_subscription'
        WHEN s.status = 'trialing' THEN 'stripe_trial'
        WHEN ut.trial_status = 'active' AND ut.trial_end_date > now() THEN 'free_trial'
        ELSE 'no_access'
    END as access_type,
    CASE 
        WHEN ut.trial_end_date > now() THEN EXTRACT(epoch FROM (ut.trial_end_date - now()))::bigint
        ELSE 0
    END as seconds_remaining,
    CASE 
        WHEN ut.trial_end_date > now() THEN EXTRACT(days FROM (ut.trial_end_date - now()))::integer
        ELSE 0
    END as days_remaining
FROM user_trials ut
LEFT JOIN stripe_customers c ON ut.user_id = c.user_id AND c.deleted_at IS NULL
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id AND s.deleted_at IS NULL
WHERE ut.user_id = auth.uid();

GRANT SELECT ON user_access_status TO authenticated;

-- Trigger to automatically sync when subscription status changes
CREATE OR REPLACE FUNCTION on_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If subscription becomes active or trialing, protect the user
    IF NEW.status IN ('active', 'trialing') THEN
        UPDATE user_trials 
        SET 
            trial_status = 'converted_to_paid',
            deletion_scheduled_at = NULL,
            updated_at = now()
        WHERE user_id = (
            SELECT user_id 
            FROM stripe_customers 
            WHERE customer_id = NEW.customer_id 
            AND deleted_at IS NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for subscription changes
DROP TRIGGER IF EXISTS on_stripe_subscription_change ON stripe_subscriptions;
CREATE TRIGGER on_stripe_subscription_change
    AFTER INSERT OR UPDATE ON stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION on_subscription_change();

-- Function to manually verify user protection status
CREATE OR REPLACE FUNCTION verify_user_protection(p_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    email text,
    is_protected boolean,
    protection_reason text,
    trial_status text,
    subscription_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email,
        CASE 
            WHEN s.status IN ('active', 'trialing') THEN true
            WHEN ut.trial_status = 'converted_to_paid' THEN true
            ELSE false
        END as is_protected,
        CASE 
            WHEN s.status = 'active' THEN 'Active paid subscription'
            WHEN s.status = 'trialing' THEN 'Stripe trial period'
            WHEN ut.trial_status = 'converted_to_paid' THEN 'Previously converted to paid'
            ELSE 'No protection - eligible for deletion'
        END as protection_reason,
        ut.trial_status::text,
        COALESCE(s.status::text, 'none') as subscription_status
    FROM auth.users au
    LEFT JOIN user_trials ut ON au.id = ut.user_id
    LEFT JOIN stripe_customers c ON au.id = c.user_id AND c.deleted_at IS NULL
    LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id AND s.deleted_at IS NULL
    WHERE au.id = p_user_id;
END;
$$;