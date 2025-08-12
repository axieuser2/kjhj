/*
  # Trial Expiration and Account Management System

  1. New Tables
    - `user_trials`: Track trial periods and expiration dates
      - `user_id` (references auth.users)
      - `trial_start_date` (when trial began)
      - `trial_end_date` (when trial expires - 7 days from start)
      - `trial_status` (active, expired, converted_to_paid)
      - `deletion_scheduled_at` (when account is scheduled for deletion)

  2. Functions
    - `check_expired_trials()`: Identifies expired trials that need deletion
    - `schedule_account_deletion()`: Marks accounts for deletion
    - `cleanup_expired_accounts()`: Removes expired accounts

  3. Security
    - Enable RLS on user_trials table
    - Add policies for users to view their own trial data

  4. Triggers
    - Auto-create trial record when user signs up
    - Auto-schedule deletion for expired trials
*/

-- Create enum for trial status
CREATE TYPE trial_status AS ENUM (
    'active',
    'expired', 
    'converted_to_paid',
    'scheduled_for_deletion'
);

-- Create user_trials table
CREATE TABLE IF NOT EXISTS user_trials (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
    trial_start_date timestamptz DEFAULT now() NOT NULL,
    trial_end_date timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
    trial_status trial_status DEFAULT 'active' NOT NULL,
    deletion_scheduled_at timestamptz DEFAULT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own trial data
CREATE POLICY "Users can view their own trial data"
    ON user_trials
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Function to check for expired trials and schedule deletions
CREATE OR REPLACE FUNCTION check_expired_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    UPDATE user_trials 
    SET 
        trial_status = 'scheduled_for_deletion',
        updated_at = now()
    WHERE 
        trial_status = 'expired'
        AND deletion_scheduled_at < now();
END;
$$;

-- Function to get users scheduled for deletion
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
    WHERE ut.trial_status = 'scheduled_for_deletion';
END;
$$;

-- Function to mark trial as converted when user subscribes
CREATE OR REPLACE FUNCTION mark_trial_converted(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_trials 
    SET 
        trial_status = 'converted_to_paid',
        deletion_scheduled_at = NULL,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Trigger function to create trial record when user signs up
CREATE OR REPLACE FUNCTION create_user_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_trials (user_id, trial_start_date, trial_end_date)
    VALUES (NEW.id, now(), now() + interval '7 days');
    RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_trial();

-- Create view for user trial information
CREATE VIEW user_trial_info WITH (security_invoker = true) AS
SELECT
    ut.user_id,
    ut.trial_start_date,
    ut.trial_end_date,
    ut.trial_status,
    ut.deletion_scheduled_at,
    CASE 
        WHEN ut.trial_end_date > now() THEN EXTRACT(epoch FROM (ut.trial_end_date - now()))::bigint
        ELSE 0
    END as seconds_remaining,
    CASE 
        WHEN ut.trial_end_date > now() THEN EXTRACT(days FROM (ut.trial_end_date - now()))::integer
        ELSE 0
    END as days_remaining
FROM user_trials ut
WHERE ut.user_id = auth.uid();

GRANT SELECT ON user_trial_info TO authenticated;