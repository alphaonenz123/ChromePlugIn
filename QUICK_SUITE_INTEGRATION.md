# Amazon Quick Suite (QuickSight) Embedded Chat Integration

**Note**: This extension now includes **authentication support** for protected Quick Suite endpoints. See [AUTHENTICATION.md](AUTHENTICATION.md) for complete authentication setup instructions.

This document outlines the recommended way to integrate **Amazon Quick Suite Embedded Chat** as the **default agent** inside Ask Pinnacle, plus alternatives if you need more control or cross-agent orchestration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Chrome Extension                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   Popup     │    │ Side Panel  │    │   Background Service    │  │
│  │  (popup.*)  │    │(sidepanel.*)│    │    (background.js)      │  │
│  └──────┬──────┘    └──────┬──────┘    └───────────┬─────────────┘  │
│         │                  │                       │                 │
│         └──────────────────┴───────────────────────┘                 │
│                            │                                         │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 HTTPS Wrapper Page (Recommended)                     │
│            https://your-domain.com/quicksight-wrapper.html          │
│                                                                      │
│    Uses QuickSight Embedding SDK to render chat experience          │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Backend                                  │
│                  (Lambda + API Gateway)                              │
│                                                                      │
│  POST /auth/login        → JWT token                                │
│  GET  /auth/check        → Validate token                           │
│  POST /quicksuite/embed-url → Generate QuickSight embed URL         │
│                                                                      │
│  Calls AWS QuickSight API:                                          │
│  - GenerateEmbedUrlForRegisteredUser                                │
│  - ExperienceConfiguration.GenerativeQnA.InitialTopicId             │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Amazon QuickSight                                 │
│                                                                      │
│  *.quicksight.aws.amazon.com                                        │
│  Embedded Generative Q&A Chat Experience                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Recommendation: Use HTTPS Wrapper Architecture

**Why this is required for Chrome extensions:**

1. **Domain Allowlisting**: AWS QuickSight requires domains to be allowlisted in "Manage QuickSight > Domains and Embedding". The `chrome-extension://` protocol is **not accepted**.

2. **Cookie Partitioning**: Chrome 115+ partitions cookies by top-level site, which can break session handling when embedding directly.

3. **Security**: The wrapper approach provides an additional security layer and enables use of the QuickSight Embedding SDK.

### The Solution

1. **Host an HTTPS wrapper page** on your domain (template provided in `server-templates/quicksight-wrapper.html`)
2. **Allowlist this domain** in QuickSight Console (Manage QuickSight > Domains and Embedding)
3. **Configure the extension** to route embeds through this wrapper page

## Implementation Details

### 1) Backend API (Required)

Chrome extensions cannot call AWS APIs with credentials directly. Your backend must:

- **Authenticate users** and provide session tokens
- Validate the current user/session
- Call `GenerateEmbedUrlForRegisteredUser` with proper experience configuration
- Return a short-lived **embed URL** to the extension

**Required Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Authenticate user, return JWT token |
| `/auth/check` | GET | Validate token (Bearer auth) |
| `/quicksuite/embed-url` | POST | Generate QuickSight embed URL |
| `/quicksuite/topics` | GET | (Optional) List available Q Topics |

**Request Body for `/quicksuite/embed-url`:**

```json
{
  "agentArn": "arn:aws:quicksight:region:account:agent/agent-id",
  "initialQuery": "Summarize patient history",
  "topicId": "your-curated-topic-id"
}
```

**Response:**

```json
{
  "url": "https://us-east-1.quicksight.aws.amazon.com/embed/..."
}
```

**Backend Python Example (boto3):**

```python
import boto3

client = boto3.client('quicksight')

response = client.generate_embed_url_for_registered_user(
    AwsAccountId='123456789012',
    UserArn='arn:aws:quicksight:us-east-1:123456789012:user/default/TargetUser',
    SessionLifetimeInMinutes=60,
    AllowedDomains=['https://your-wrapper-domain.com'],
    ExperienceConfiguration={
        'GenerativeQnA': {
            'InitialTopicId': 'YOUR_TOPIC_ID'  # Curated Q Topic
        }
    }
)

embed_url = response['EmbedUrl']
```

See `server-templates/backend-api-example.py` for a complete Flask/Lambda example.

### 2) HTTPS Wrapper Page

Host the provided template at `server-templates/quicksight-wrapper.html` on your HTTPS domain.

**Key Features:**
- Uses QuickSight Embedding SDK v2.7.0
- Validates embed URL is from QuickSight domain
- Supports GenerativeQnA and Dashboard experiences
- Handles resize and error events

**Example Wrapper URL Flow:**

```
Extension → https://your-domain.com/quicksight-wrapper.html
            ?embedUrl=https%3A%2F%2Fus-east-1.quicksight.aws.amazon.com%2Fembed%2F...
```

### 3) Chrome Extension Configuration

**manifest.json (already configured):**

```json
{
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; frame-src https://*.quicksight.aws.amazon.com/ https:;"
  }
}
```

**Settings in Extension:**

| Setting | Description |
|---------|-------------|
| Enable Quick Suite | Toggle to use embedded chat |
| Embed URL Endpoint | Your backend URL (must be HTTPS) |
| Topic ID | QuickSight Q Topic ID for curated experience |
| Agent ARN | (Optional) Specific QuickSight agent |
| Initial Query | (Optional) Starting question |
| Use HTTPS Wrapper | Enable wrapper approach (recommended) |
| Wrapper URL | Your hosted wrapper page URL |

### 4) Side Panel (Recommended for Chat)

The extension now supports Chrome's Side Panel API, which provides a **persistent chat experience** that stays open while browsing.

**Benefits over Popup:**
- Chat session persists across page navigations
- No loss of context when clicking elsewhere
- Better UX for conversational interfaces

**To open the Side Panel:**
- Click "Open Side Panel Chat" in extension settings, or
- Right-click extension icon → "Open side panel"

## Security Features

### HTTPS Enforcement
All endpoints must use HTTPS. The extension validates:
- Backend endpoint URL
- Wrapper URL (if enabled)
- Returned QuickSight embed URL

### URL Domain Validation
Embed URLs are validated using strict regex pattern:
```javascript
const pattern = /^([a-z0-9-]+\.)?quicksight\.aws\.amazon\.com$/;
```

This prevents subdomain attacks like `attacker.quicksight.aws.amazon.com.evil.com`.

### Token Management
- Tokens stored in `chrome.storage.sync` (encrypted by browser)
- Automatic expiration checking
- 401/403 responses trigger token invalidation and re-authentication prompt

## Curating the Q&A Experience

To ensure the chat is "curated" to your specific data:

1. **Create a Q Topic** in QuickSight (Data > Topics)
2. **Curate the data:**
   - Exclude irrelevant fields
   - Rename columns to friendly names
   - Add named entities and synonyms
3. **Verify answers** using "Reviewed Answers" feature
4. **Configure the Topic ID** in extension settings

## Embedding Method Comparison

| Method | Pros | Cons |
|--------|------|------|
| **HTTPS Wrapper** (Recommended) | Works with AWS allowlist, SDK support, event callbacks | Requires hosting |
| **Direct Iframe** | Simpler setup | May fail domain restrictions, no SDK events |

## Files Structure

```
ChromePlugIn/
├── sidepanel.html          # Persistent chat panel
├── sidepanel.js            # Side panel logic
├── sidepanel.css           # Side panel styles
├── popup.html              # Extension popup (updated)
├── popup.js                # Popup logic (updated)
├── background.js           # Service worker (updated)
├── manifest.json           # Manifest v3 (updated)
└── server-templates/
    ├── quicksight-wrapper.html   # HTTPS wrapper template
    └── backend-api-example.py    # Backend API example
```

## Troubleshooting

### "Domain not allowlisted" Error
1. Go to QuickSight Console > Manage QuickSight > Domains and Embedding
2. Add your wrapper domain (e.g., `https://your-domain.com`)
3. Save changes (may take a few minutes to propagate)

### Side Panel Not Opening
- Requires Chrome 114+
- Ensure `sidePanel` permission is in manifest.json
- Try right-clicking extension icon → "Open side panel"

### Authentication Errors
- Check that your backend returns proper JWT format
- Verify token expiration handling
- Check browser console for `[Auth]` prefixed logs

### Embed URL Not Loading
- Check browser console for `[Quick Suite]` logs
- Verify HTTPS is used for all URLs
- Ensure QuickSight user has proper permissions

## Version History

### 1.1.0
- Added Side Panel support for persistent chat
- Added HTTPS wrapper architecture
- Added Topic ID support for curated Q&A
- Added HTTPS validation for all endpoints
- Improved URL validation security

### 1.0.0
- Initial Quick Suite integration
- Authentication support
- Basic iframe embedding
