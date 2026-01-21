# Amazon Quick Suite (QuickSight) Embedded Chat Integration

This document outlines the recommended way to integrate **Amazon Quick Suite Embedded Chat** as the **default agent** inside Ask Pinnacle, plus alternatives if you need more control or cross-agent orchestration.

## Recommendation: Use Quick Suite Embedded Chat as the Default Agent

**Why this is the best fit**
- **Default agent with native visuals**: Quick Suite Embedded Chat provides a managed AI assistant that can render charts/tables directly in the chat UI.
- **Fastest path to production**: You get a consistent, AWS-managed chat experience without custom visualization work.
- **Least regression risk**: You keep the current Ask Pinnacle chat UX and only replace the chat panel container with a Quick Suite embed.

### High-level flow
1. **Chrome extension** requests an embed URL from a **backend service** (Lambda/API).
2. Backend calls `GenerateEmbedUrlForRegisteredUser` for the Quick Suite Chat experience.
3. Extension loads the URL with the **QuickSight Embedding SDK** and renders the chat in a container.

## Chrome Extension Implementation Plan

### 1) Backend (required)
Chrome extensions cannot call AWS APIs with credentials directly. Create a small backend (Lambda + API Gateway is typical) to:
- Validate the current user/session.
- Call `GenerateEmbedUrlForRegisteredUser`.
- Return a short-lived **embed URL** to the extension.

**Expected response shape**
```json
{
  "url": "https://..."
}
```

**Pseudo flow**
```
Extension -> /embed-url (your backend)
Backend -> QuickSight GenerateEmbedUrlForRegisteredUser
Backend -> returns { url }
Extension -> QuickSight SDK renders embedded chat
```

### 2) Frontend (extension)
Use the QuickSight Embedding SDK (v2.11+). Render chat inside the existing Ask Pinnacle chat container.

**Example**
```javascript
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';

const embedQuickSuiteChat = async (embedUrl) => {
  const embeddingContext = await createEmbeddingContext();
  await embeddingContext.embedChat(
    {
      url: embedUrl,
      container: '#chat-container',
      height: '600px',
      width: '400px',
    },
    {
      fixedAgentArn: 'arn:aws:quicksight:region:account:agent/agent-id',
    }
  );
};
```

### 3) Chrome extension manifest CSP changes
QuickSuite is hosted on AWS domains and must be allowlisted in the extension CSP.

```json
"host_permissions": [
  "https://*.quicksight.aws.amazon.com/*",
  "https://YOUR_BACKEND_ENDPOINT/*"
],
"content_security_policy": {
  "extension_pages": "frame-src https://*.quicksight.aws.amazon.com/;"
}
```

> Note: You must also allowlist the extension ID in the QuickSight embedding settings (Manage QuickSight > Domains and Embedding).

### 4) Ask Pinnacle settings wiring (implemented)
The extension settings now include:
- **Enable Quick Suite** toggle to switch the chat tab into embedded mode.
- **Embed URL endpoint** that the extension POSTs to with `{ agentArn, initialQuery }`.
- **Optional agent ARN** and **initial query** inputs.

When enabled, Ask Pinnacle hides the built-in chat UI and loads the Quick Suite iframe with the URL returned by your backend.

## Optional: Bedrock Agent Gateway (Recommended if you need cross-agent tools)

If Ask Pinnacle must orchestrate **multiple tools** (e.g., EHR retrieval, policy lookup, or knowledge base search), then using a **Bedrock Agent Gateway** gives you controlled tool routing while still embedding Quick Suite as the default UI.

### Best-of-both worlds setup
- **Quick Suite Embedded Chat** remains the default UI.
- Quick Suite connects to **Bedrock Agent Gateway** as an MCP client.
- The Gateway exposes your other tools/agents via OpenAPI schemas.

**Benefits**
- Quick Suite handles chat UI + data insight visuals.
- Gateway provides a secure tool bus for non-QuickSight actions.
- Ask Pinnacle keeps one default agent with access to many capabilities.

## When to avoid Quick Suite Embedded Chat
If you need a **fully custom chat UI** (custom bubbles, native React UI, or bespoke charts), then Quick Suite won’t work because it must be embedded via iframe. In that case:
- Build a custom UI in the extension.
- Use **Bedrock Agent** (InvokeAgent) for the underlying reasoning.
- Bring your own visualization (D3/Chart.js).

## Suggested rollout plan
1. **Phase 1**: Add Quick Suite as the default agent in Ask Pinnacle’s chat panel.
2. **Phase 2**: Add Bedrock Agent Gateway only if cross-agent orchestration is required.
3. **Phase 3**: Keep the existing OpenAI-compatible chat as a fallback when the embed URL is unavailable.
