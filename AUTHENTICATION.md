# Authentication Guide for Ask Pinnacle Chrome Extension

## Overview

The Ask Pinnacle Chrome Extension now supports authentication for protected endpoints. This allows you to securely access Quick Suite embedded chat and other authenticated backend services.

## Features

- **Session Management**: Secure token storage and automatic session expiration handling
- **Multiple Authentication Methods**: Login with username/password or direct token input
- **Status Indicators**: Visual feedback for authentication state in the header
- **Auto-Detection**: Automatic prompts when authentication is required
- **Secure Storage**: Credentials stored using Chrome's secure sync storage

## Getting Started

### 1. Configure Authentication Endpoint

1. Open the Ask Pinnacle extension popup
2. Click on the **Settings** tab
3. In the **Authentication** section, enter your backend endpoint URL
   - Example: `https://your-backend.example.com`
   - This should be the base URL of your authentication server

### 2. Login Methods

#### Method A: Username and Password

1. Enter your **Username** in the username field
2. Enter your **Password** in the password field
3. Click the **Login** button

The extension will:
- Send credentials to `{endpoint}/auth/login`
- Receive an authentication token
- Store the token securely
- Update the UI to show logged-in status

#### Method B: Direct Token Input

If you already have an authentication token:

1. Leave username and password fields empty
2. Enter your token in the **Or Provide Token Directly** field
3. Click the **Login** button

The token will be stored and used for subsequent API calls.

### 3. Authentication Status

The header shows your current authentication status:

- 🟢 **Green dot** + username: You are authenticated
- 🟡 **Yellow dot** + "Not Logged In": You are not authenticated

Additional status information is shown in the Settings tab:
- ✅ Authenticated: Shows username and session expiration time
- ❌ Not authenticated: Prompts you to login

## Using Quick Suite with Authentication

### Prerequisites

1. **Backend Service**: Your backend must provide:
   - `/auth/login` - Login endpoint (accepts username/password, returns token)
   - `/auth/check` - Authentication check endpoint (validates token)
   - Quick Suite embed URL endpoint (requires authentication)

2. **Configure Quick Suite**:
   - In Settings tab, enable "Use Quick Suite embedded chat"
   - Enter your Quick Suite embed URL endpoint
   - Optionally configure Agent ARN and Initial Query

### Authentication Flow

1. **Login First**: Authenticate using the Authentication section
2. **Load Quick Suite**: Enable Quick Suite in settings
3. **Automatic Auth**: The extension automatically includes your token when requesting the embed URL
4. **Session Handling**: If your session expires, you'll be prompted to login again

### What Happens When Not Authenticated

If you try to load Quick Suite without authentication:

- The Quick Suite status will show: "Authentication required. Please login in Settings"
- A "Go to Login" button will appear to take you to the authentication section
- The embed will not load until you successfully authenticate

## Backend API Requirements

Your backend service must implement the following endpoints:

### 1. Login Endpoint

**POST** `{endpoint}/auth/login`

**Request Body:**
```json
{
  "username": "your-username",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "your-jwt-token",
  "expiresIn": 86400,  // Optional: seconds until expiration
  "expiresAt": "2024-01-28T12:00:00Z"  // Optional: ISO timestamp
}
```

Alternatively, use these field names:
- `access_token` or `accessToken` instead of `token`

### 2. Authentication Check Endpoint

**GET** `{endpoint}/auth/check`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
- `200 OK`: Token is valid
- `401 Unauthorized`: Token is invalid or expired

### 3. Quick Suite Embed URL Endpoint

**POST** `{your-quicksuite-endpoint}`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "agentArn": "arn:aws:quicksight:...",  // Optional
  "initialQuery": "Summarize patient history"  // Optional
}
```

**Response:**
```json
{
  "url": "https://us-east-1.quicksight.aws.amazon.com/embed/..."
}
```

**Error Response:**
- `401 Unauthorized`: Token expired or invalid (extension will prompt re-login)
- `403 Forbidden`: Token valid but insufficient permissions

## Session Management

### Token Storage

- Tokens are stored in `chrome.storage.sync`
- Encrypted by Chrome's secure storage mechanism
- Synced across Chrome instances when signed in

### Session Expiration

The extension tracks token expiration and:
- Displays expiration time in Settings
- Automatically clears expired tokens
- Prompts for re-authentication when needed

### Logout

To logout:

1. Go to Settings tab
2. Click the **Logout** button
3. All authentication data is cleared from storage
4. UI updates to show logged-out status

## Security Best Practices

### For Users

1. **Never share your token**: Treat tokens like passwords
2. **Use HTTPS**: Only connect to HTTPS endpoints
3. **Logout when done**: Clear your session on shared computers
4. **Regular password changes**: Update credentials periodically

### For Backend Developers

1. **Short-lived tokens**: Use reasonable expiration times (e.g., 24 hours)
2. **HTTPS only**: Never accept authentication over HTTP
3. **Token validation**: Always validate tokens on the backend
4. **Rate limiting**: Implement rate limiting on login endpoints
5. **Audit logging**: Log authentication attempts and API usage
6. **CORS configuration**: Properly configure CORS headers
7. **Token rotation**: Support token refresh mechanisms

## Troubleshooting

### Login Fails

**Problem**: "Login failed" error message

**Solutions**:
1. Verify endpoint URL is correct and includes protocol (https://)
2. Check username and password are correct
3. Ensure backend is running and accessible
4. Check browser console for detailed error messages
5. Verify backend `/auth/login` endpoint is working

### Quick Suite Won't Load

**Problem**: "Authentication required" message

**Solutions**:
1. Login first in the Authentication section
2. Check that auth token hasn't expired
3. Click "Check Status" to verify authentication state
4. If expired, login again

### Session Expired

**Problem**: "Session expired. Please login again" message

**Solutions**:
1. Return to Settings tab
2. Re-enter credentials or token
3. Click Login button
4. Reload Quick Suite if needed

### Token Invalid

**Problem**: Authentication check fails even after login

**Solutions**:
1. Logout and login again
2. Verify backend `/auth/check` endpoint works
3. Check token format is correct (should be JWT or similar)
4. Ensure backend accepts `Authorization: Bearer {token}` header

### Backend Connection Issues

**Problem**: Cannot connect to backend

**Solutions**:
1. Check network connectivity
2. Verify endpoint URL is accessible
3. Check for CORS issues in browser console
4. Ensure backend allows Chrome extension origin
5. Verify SSL certificate is valid (for HTTPS)

## Advanced Configuration

### Custom Token Expiration

If your backend doesn't return `expiresIn` or `expiresAt`, the extension defaults to 24 hours. To change this, you can modify the code in `background.js`:

```javascript
// Default to 24 hours if not specified
authExpiry = Date.now() + (24 * 60 * 60 * 1000);
```

### Multiple Endpoints

You can switch between different authentication endpoints by changing the endpoint URL in Settings. The extension stores the last used endpoint.

### Token Format

The extension expects tokens to be sent as Bearer tokens:
```
Authorization: Bearer {your-token}
```

Ensure your backend accepts this format.

## Integration Examples

### Example: Node.js/Express Backend

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// Login endpoint
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Validate credentials (implement your logic)
  if (validateCredentials(username, password)) {
    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token: token,
      expiresIn: 86400
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Auth check endpoint
app.get('/auth/check', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(401);
  }
});

// Quick Suite embed URL endpoint
app.post('/quicksuite/embed-url', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    
    // Generate QuickSight embed URL
    const embedUrl = await generateQuickSightEmbedUrl(
      user.username,
      req.body.agentArn,
      req.body.initialQuery
    );
    
    res.json({ url: embedUrl });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

### Example: Python/Flask Backend

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime

app = Flask(__name__)
CORS(app)

SECRET_KEY = 'your-secret-key'

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # Validate credentials
    if validate_credentials(username, password):
        token = jwt.encode({
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'expiresIn': 86400
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/auth/check', methods=['GET'])
def check_auth():
    token = request.headers.get('Authorization', '').split(' ')[1]
    
    try:
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return '', 200
    except:
        return '', 401

@app.route('/quicksuite/embed-url', methods=['POST'])
def quicksuite_embed():
    token = request.headers.get('Authorization', '').split(' ')[1]
    
    try:
        user = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        data = request.get_json()
        
        # Generate QuickSight embed URL
        embed_url = generate_quicksight_embed_url(
            user['username'],
            data.get('agentArn'),
            data.get('initialQuery')
        )
        
        return jsonify({'url': embed_url})
    except:
        return jsonify({'error': 'Unauthorized'}), 401
```

## FAQs

**Q: Is my password stored in the extension?**
A: No. Only the authentication token is stored. Passwords are sent once to the backend and not retained.

**Q: Can I use the extension offline after logging in?**
A: The extension needs to validate tokens with the backend. Some features may work offline, but authentication requires internet connectivity.

**Q: How long does a session last?**
A: Session duration depends on your backend token expiration. The default is 24 hours, but your backend can configure this.

**Q: Can multiple users share the same extension?**
A: Each Chrome profile has separate storage. Different Chrome users will have separate authentication sessions.

**Q: What if I forget my password?**
A: Contact your backend administrator. The extension only authenticates; it doesn't manage user accounts.

**Q: Is authentication required for all features?**
A: No. Only Quick Suite embedded chat (and other protected endpoints) require authentication. Standard OpenAI chat works without authentication.

## Support

For issues related to:
- **Extension functionality**: Check browser console for errors and review this guide
- **Backend integration**: Contact your backend administrator
- **AWS QuickSight**: Refer to [AWS QuickSight documentation](https://docs.aws.amazon.com/quicksight/)

## Security Disclosure

If you discover a security vulnerability, please report it to the maintainers privately. Do not open a public issue.
