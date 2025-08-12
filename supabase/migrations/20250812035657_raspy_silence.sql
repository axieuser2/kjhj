/*
  # Disable Email Confirmation

  1. Configuration Changes
    - Disables email confirmation requirement for new user signups
    - Allows users to sign in immediately after registration
    - Maintains security while improving user experience

  2. Security Notes
    - Users can access the application immediately after signup
    - Email verification is disabled to streamline onboarding
    - Authentication still requires valid email and password
*/

-- Disable email confirmation for new signups
UPDATE auth.config 
SET email_confirm = false 
WHERE true;

-- Alternative approach if the above doesn't work
INSERT INTO auth.config (email_confirm) 
VALUES (false) 
ON CONFLICT DO NOTHING;