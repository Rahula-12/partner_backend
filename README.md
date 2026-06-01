# FCM Render Backend

## Setup

1. Place your Firebase service account file in the root directory:
   firebase-service-account.json

2. Install dependencies:

npm install

3. Run locally:

npm start

## Endpoints

POST /register-token

Body:
{
  "token": "FCM_DEVICE_TOKEN"
}

POST /send-notification

Sends:
"Riya agreed 😇."

GET /tokens

Returns registered token count.
