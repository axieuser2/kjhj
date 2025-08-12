# Testing Account Management with curl

## Prerequisites
First, you need to get an authentication token by signing up or logging in through the app.

## 1. Create Account Test

```bash
# Replace YOUR_AUTH_TOKEN with actual token from browser dev tools or login response
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/axie-studio-account" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "action": "create",
    "password": "testpassword123"
  }'
```

## 2. Delete Account Test

```bash
# Replace YOUR_AUTH_TOKEN with actual token from browser dev tools or login response
curl -X DELETE "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/axie-studio-account" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## 3. Alternative Delete with POST

```bash
# Replace YOUR_AUTH_TOKEN with actual token from browser dev tools or login response
curl -X POST "https://othsnnoncnerjogvwjgc.supabase.co/functions/v1/axie-studio-account" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "action": "delete"
  }'
```

## How to Get Your Auth Token

1. Open the app in your browser
2. Sign up or log in
3. Open browser dev tools (F12)
4. Go to Application/Storage tab
5. Look for Supabase session data or check Network tab for API calls
6. Copy the access_token from the session

## Test Stripe Checkout

```bash
# Replace YOUR_AUTH_TOKEN with actual token
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

## Direct Axie Studio API Test (using your API key)

```bash
# Test direct API access to Axie Studio
curl -X GET "https://axiestudio-axiestudio-ttefi.ondigitalocean.app/api/v1/users/" \
  -H "x-api-key: sk-Sikhas4RX3o5P_MqILi5hUyUdNWhA07n0w3Vuy5AYNM"
```