# Testing Trial Cleanup System

## Overview
This system automatically deletes accounts after 7 days if users don't upgrade to a paid plan.

## How It Works
1. **Trial Creation**: When a user signs up, a 7-day trial is automatically created
2. **Trial Monitoring**: The system tracks trial expiration dates
3. **Grace Period**: After trial expires, users get 1 day grace period
4. **Automatic Deletion**: After grace period, accounts are automatically deleted from both Supabase and Axie Studio

## Manual Testing Commands

### 1. Test Trial Cleanup Function
```bash
# This simulates the automated cleanup process
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/trial-cleanup" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Check Trial Status for Current User
```bash
# Replace YOUR_AUTH_TOKEN with actual token from browser
curl -X GET "https://othsnnoncnerjogvwjgc.supabase.co/rest/v1/user_trial_info?select=*" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90aHNubm9uY25lcmpvZ3Z3amdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTY1NDcsImV4cCI6MjA2NzczMjU0N30.bAYQm2q_LH6xCMXrPsObht6pmFbz966MU-g7v1SRzrE"
```

### 3. Manually Expire a Trial (for testing)
```bash
# This would normally be done by the system automatically
# Replace USER_ID with actual user ID
curl -X PATCH "https://othsnnoncnerjogvwjgc.supabase.co/rest/v1/user_trials?user_id=eq.USER_ID" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trial_end_date": "2025-01-01T00:00:00Z",
    "trial_status": "expired"
  }'
```

### 4. Test Account Creation (Axie Studio)
```bash
# Replace YOUR_AUTH_TOKEN with actual token
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/axie-studio-account" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "action": "create",
    "password": "testpassword123"
  }'
```

### 5. Test Account Deletion (Axie Studio)
```bash
# Replace YOUR_AUTH_TOKEN with actual token
curl -X DELETE "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/axie-studio-account" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## Production Setup

### Automated Cleanup (Recommended)
Set up a cron job or scheduled task to call the trial cleanup function daily:

```bash
# Daily at 2 AM UTC
0 2 * * * curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/trial-cleanup"
```

### Database Functions Available
- `check_expired_trials()`: Marks expired trials and schedules deletions
- `get_users_for_deletion()`: Returns users ready for deletion
- `mark_trial_converted(user_id)`: Marks trial as converted when user subscribes

## Trial Lifecycle
1. **Day 0**: User signs up → Trial starts (7 days)
2. **Day 7**: Trial expires → Status changes to "expired"
3. **Day 8**: Grace period ends → Status changes to "scheduled_for_deletion"
4. **Day 8+**: Cleanup function deletes account from both systems

## Important Notes
- Users who upgrade to paid plans are automatically marked as "converted_to_paid"
- Deletion removes accounts from both Supabase and Axie Studio
- The system prevents accidental deletion of paying customers
- All deletions are logged for audit purposes