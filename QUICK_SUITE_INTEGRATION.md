# Quick Suite Integration Guide

This guide explains how to integrate Amazon QuickSight's embedded chat experience into the Ask Pinnacle Chrome extension using AWS Cognito for authentication.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Side Panel                                              │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  <iframe src="https://quicksuite.yourco.com">   │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  Settings: Just ONE field - Quick Suite URL             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Hosted App (HTTPS)                                             │
│  https://quicksuite.yourcompany.com                             │
│                                                                 │
│  • Cognito authentication (SSO or email/password)              │
│  • QuickSight Embedding SDK                                    │
│  • All configuration is server-side                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend API (Lambda + API Gateway)                             │
│                                                                 │
│  POST /api/quicksight/embed-url                                │
│  • Validates Cognito JWT                                       │
│  • Maps user to QuickSight                                     │
│  • Returns embed URL                                           │
│                                                                 │
│  Configuration (environment variables):                         │
│  • QUICKSIGHT_TOPIC_ID - for curated Q&A                       │
│  • COGNITO_USER_POOL_ID                                        │
│  • ALLOWED_DOMAINS                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Amazon QuickSight                                              │
│  • GenerativeQnA experience                                    │
│  • Curated Q Topic                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Architecture?

| Previous Approach | New Approach |
|-------------------|--------------|
| 7+ settings in extension | 1 setting (URL) |
| Auth in extension + QuickSight | Auth only in hosted app |
| Config changes need extension update | Config is server-side |
| Complex for end users | Just enter URL and go |

## Quick Start

### For End Users

1. Open extension settings
2. Enter your Quick Suite URL (provided by IT)
3. Click "Open Quick Suite"
4. Sign in when prompted
5. Done!

### For Administrators

1. Deploy the backend API (see `server-templates/backend-api-example.py`)
2. Deploy the hosted app (see `server-templates/quicksuite-app.html`)
3. Configure Cognito user pool
4. Configure QuickSight topics and permissions
5. Distribute the hosted app URL to users

## Files

```
ChromePlugIn/
├── sidepanel.html          # Minimal - just loads iframe
├── sidepanel.js            # ~100 lines - loads URL from settings
├── popup.html              # Settings with ONE Quick Suite field
├── popup.js                # Simplified settings management
└── server-templates/
    ├── quicksuite-app.html     # Hosted app with Cognito + SDK
    └── backend-api-example.py  # FastAPI backend with Cognito JWT
```

## Deployment Guide

### 1. AWS Cognito Setup

```bash
# Create User Pool
aws cognito-idp create-user-pool \
  --pool-name QuickSuiteUsers \
  --auto-verified-attributes email \
  --username-attributes email

# Create App Client
aws cognito-idp create-user-pool-client \
  --user-pool-id YOUR_POOL_ID \
  --client-name QuickSuiteApp \
  --generate-secret \
  --supported-identity-providers COGNITO \
  --callback-urls https://quicksuite.yourcompany.com \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile
```

### 2. Backend Deployment

Using AWS SAM:

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  CognitoUserPoolId:
    Type: String
  QuickSightTopicId:
    Type: String

Resources:
  QuickSuiteApi:
    Type: AWS::Serverless::Function
    Properties:
      Handler: backend-api-example.lambda_handler
      Runtime: python3.11
      Environment:
        Variables:
          COGNITO_USER_POOL_ID: !Ref CognitoUserPoolId
          QUICKSIGHT_TOPIC_ID: !Ref QuickSightTopicId
```

### 3. QuickSight Configuration

1. Go to QuickSight Console > Manage QuickSight > Domains and Embedding
2. Add your hosted app domain: `https://quicksuite.yourcompany.com`
3. Create a Q Topic with curated data fields
4. Note the Topic ID for backend configuration

### 4. Hosted App Deployment

Deploy `quicksuite-app.html` to any static hosting:
- S3 + CloudFront
- Amplify Hosting
- Vercel/Netlify

Update the CONFIG object with your values:

```javascript
const CONFIG = {
  cognito: {
    userPoolId: 'us-east-1_XXXXXXXXX',
    userPoolClientId: 'xxxxxxxxxx',
    region: 'us-east-1'
  },
  api: {
    baseUrl: 'https://api.yourcompany.com'
  }
};
```

## Security

### Authentication Flow

```
User opens Side Panel
       │
       ▼
Hosted app checks for existing Cognito session
       │
       ├── Session exists → Load QuickSight
       │
       └── No session → Show login
              │
              ├── SSO → Redirect to Cognito Hosted UI
              │         → Return with auth code
              │         → Exchange for tokens
              │
              └── Email/Password → Cognito signIn
                                 → Get tokens
              │
              ▼
        Get embed URL from backend (with JWT)
              │
              ▼
        Backend validates JWT
        Maps user to QuickSight
        Returns signed embed URL
              │
              ▼
        Load QuickSight via SDK
```

### Security Features

- **HTTPS Only**: Extension validates all URLs are HTTPS
- **JWT Validation**: Backend validates Cognito tokens with public keys
- **Domain Allowlist**: QuickSight only serves embeds to allowed domains
- **No Credentials in Extension**: All secrets are server-side
- **Auto-provisioning**: Users created in QuickSight on first access

## Customization

### Using SSO (Identity Center, Okta, etc.)

1. Configure SAML/OIDC provider in Cognito
2. Update hosted app CONFIG:

```javascript
cognito: {
  identityProvider: 'YourIdPName',
  hostedUiDomain: 'your-app.auth.region.amazoncognito.com'
}
```

### Multiple Topics

Modify the backend to support topic selection:

```python
@app.post("/api/quicksight/embed-url")
async def get_embed_url(topic_id: str = None, user = Depends(get_current_user)):
    topic = topic_id or QUICKSIGHT_TOPIC_ID
    # ... generate URL with selected topic
```

### Custom Branding

Edit `quicksuite-app.html` styles to match your brand colors and logo.

## Troubleshooting

### "Domain not allowlisted"

1. Check QuickSight > Manage > Domains and Embedding
2. Ensure exact URL match (including https://)
3. Wait 5 minutes for changes to propagate

### "Token expired"

- Cognito tokens expire after 1 hour
- The hosted app should auto-refresh or re-prompt for login

### Side Panel shows "Setup Required"

- User hasn't configured Quick Suite URL in extension settings
- Check Settings tab for URL field

### QuickSight shows "Access Denied"

1. Verify user exists in QuickSight namespace
2. Check user has Reader or higher permissions
3. Verify Topic/Dashboard is shared with user

## Migration from Previous Version

If upgrading from the multi-field configuration:

1. Deploy the new backend and hosted app
2. Update extension (clears old settings)
3. Users just need to enter the new Quick Suite URL
4. All other configuration is now server-side
