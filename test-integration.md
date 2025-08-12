# Testing Supabase-Stripe-AxieStudio Integration

## Integration Flow Verification

### 1. User Signup Flow
```bash
# Test complete signup flow
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/auth/v1/signup" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90aHNubm9uY25lcmpvZ3Z3amdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTY1NDcsImV4cCI6MjA2NzczMjU0N30.bAYQm2q_LH6xCMXrPsObht6pmFbz966MU-g7v1SRzrE" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### 2. Verify User Protection Status
```bash
# Check if user is protected from deletion
# Replace USER_ID with actual user ID
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/rest/v1/rpc/verify_user_protection" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90aHNubm9uY25lcmpvZ3Z3amdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTY1NDcsImV4cCI6MjA2NzczMjU0N30.bAYQm2q_LH6xCMXrPsObht6pmFbz966MU-g7v1SRzrE" \
  -H "Content-Type: application/json" \
  -d '{"p_user_id": "USER_ID_HERE"}'
```

### 3. Test Subscription Creation and Protection
```bash
# Create Stripe checkout session
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/stripe-checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "price_id": "price_1Rv4rDBacFXEnBmNDMrhMqOH",
    "mode": "subscription",
    "success_url": "http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
    "cancel_url": "http://localhost:5173/products"
  }'
```

### 4. Force Sync User Status (After Subscription)
```bash
# Manually trigger protection sync
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/rest/v1/rpc/protect_paying_customers" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### 5. Test Trial Cleanup (Should Skip Protected Users)
```bash
# Run cleanup - should protect paying customers
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/trial-cleanup" \
  -H "Content-Type: application/json"
```

## Key Integration Points

### User ID Mapping
- **Supabase User ID** → `auth.users.id`
- **Stripe Customer ID** → `stripe_customers.customer_id` (linked via `user_id`)
- **Axie Studio Account** → Created using Supabase user email

### Protection Mechanisms
1. **Subscription Status Check**: Users with `active` or `trialing` Stripe subscriptions are protected
2. **Trial Status Sync**: When subscription becomes active, trial status changes to `converted_to_paid`
3. **Multiple Safety Checks**: Before deletion, system verifies no active subscription exists
4. **Real-time Updates**: Changes in subscription status immediately update trial protection

### Access Control Flow
```
User Signs Up → Trial Created (7 days) → Axie Studio Account Created
     ↓
User Upgrades → Stripe Subscription Active → Trial Status = "converted_to_paid"
     ↓
Protection Active → Account Safe from Deletion → Permanent Axie Studio Access
```

### Critical Functions
- `sync_subscription_status()`: Keeps trial and subscription data in sync
- `protect_paying_customers()`: Prevents deletion of users with active subscriptions
- `verify_user_protection()`: Checks if user is safe from deletion
- `get_user_access_level()`: Determines current access rights

## Testing Checklist

- [ ] User signup creates trial and Axie Studio account
- [ ] User can access Axie Studio during trial
- [ ] Subscription upgrade protects user from deletion
- [ ] Trial cleanup skips users with active subscriptions
- [ ] Real-time status updates work correctly
- [ ] User access status reflects current subscription state