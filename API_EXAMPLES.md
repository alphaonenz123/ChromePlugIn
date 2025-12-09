# API Configuration Examples

This document provides examples for configuring different API endpoints with the Patient Management Chatbot Assistant.

## OpenAI API (Default)

### Configuration
- **API Endpoint**: `https://api.openai.com/v1/chat/completions`
- **API Key**: Your OpenAI API key from https://platform.openai.com/
- **Model Options**: 
  - `gpt-3.5-turbo` (recommended for cost-effectiveness)
  - `gpt-4` (higher quality, slower, more expensive)
  - `gpt-4-turbo` (faster GPT-4)

### Getting Started
1. Create an account at https://platform.openai.com/
2. Navigate to API keys section
3. Create a new API key
4. Copy the key and paste it in the extension settings

### Example Request Format
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant for a Patient Management System."
    },
    {
      "role": "user",
      "content": "How do I schedule an appointment?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

## Azure OpenAI Service

### Configuration
- **API Endpoint**: `https://YOUR-RESOURCE-NAME.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT-NAME/chat/completions?api-version=2023-05-15`
- **API Key**: Your Azure OpenAI API key
- **Model**: Use your deployment name

### Notes
- Replace `YOUR-RESOURCE-NAME` with your Azure resource name
- Replace `YOUR-DEPLOYMENT-NAME` with your model deployment name
- The extension's default format may need minor adjustments for Azure

## Local LLM (e.g., LM Studio, Ollama)

### LM Studio Configuration
- **API Endpoint**: `http://localhost:1234/v1/chat/completions`
- **API Key**: Usually not required (use "none" or leave empty if needed)
- **Model**: The model name you loaded in LM Studio

### Ollama Configuration
- **API Endpoint**: `http://localhost:11434/v1/chat/completions`
- **API Key**: Not required
- **Model**: Your loaded model (e.g., "llama2", "mistral")

### Example Setup
1. Install LM Studio or Ollama on your computer
2. Download and load a compatible model
3. Start the local server
4. Configure the extension with the local endpoint

## Custom API Endpoint

If you have your own API that follows the OpenAI chat format:

### Configuration
- **API Endpoint**: `https://your-api.example.com/chat`
- **API Key**: Your custom authentication key
- **Model**: Your model identifier

### Required API Format

Your API should accept POST requests with this structure:

**Request:**
```json
{
  "model": "your-model-name",
  "messages": [
    {
      "role": "system",
      "content": "System message"
    },
    {
      "role": "user",
      "content": "User message"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "The response from your chatbot"
      }
    }
  ]
}
```

## Anthropic Claude (Requires API Wrapper)

Claude API uses a different format. You'll need a wrapper service to convert between formats.

### Option 1: Use a Proxy Service
Create a simple proxy that converts Claude API format to OpenAI format.

### Option 2: Modify background.js
You can modify the `handleChatRequest` function in `background.js` to support Claude's native format.

## Google PaLM/Gemini API (Requires API Wrapper)

Similar to Claude, Google's APIs use different formats and would require either:
1. A conversion proxy service
2. Modifications to background.js

## Hugging Face Inference API

### Configuration
- **API Endpoint**: `https://api-inference.huggingface.co/models/YOUR-MODEL`
- **API Key**: Your Hugging Face API token
- **Model**: Specified in the endpoint URL

### Notes
- Requires adaptation of the request format in background.js
- Not all models support the chat completion format
- Free tier has rate limits

## API Best Practices

### Security
1. **Never commit API keys** to version control
2. **Use separate keys** for development and production
3. **Rotate keys regularly** for security
4. **Monitor usage** to detect unauthorized access
5. **Set spending limits** on pay-per-use APIs

### Performance
1. **Choose appropriate models** - Use lighter models for simple queries
2. **Set reasonable token limits** - Default is 500 tokens
3. **Implement caching** - For repeated queries (future enhancement)
4. **Monitor latency** - Switch models/providers if too slow

### Cost Management
1. **Track API usage** through your provider's dashboard
2. **Set up billing alerts** to avoid unexpected charges
3. **Use cheaper models** for testing and development
4. **Consider local models** for high-volume usage

## Testing Your API Configuration

### Manual Test
1. Open the extension
2. Go to Settings tab
3. Enter your configuration
4. Click "Test API Connection"
5. Look for success/failure message

### Chat Test
1. After configuration, switch to Chat tab
2. Send a simple message: "Hello"
3. Wait for response
4. Check for errors if no response

### Troubleshooting

#### Error: "API key not configured"
- Ensure you've saved settings after entering the API key
- Check that the API key field isn't empty

#### Error: "API request failed with status 401"
- Your API key is invalid or expired
- Check that you copied the key correctly

#### Error: "API request failed with status 429"
- You've hit rate limits
- Wait a moment and try again
- Consider upgrading your API plan

#### Error: "API request failed with status 500"
- Server error on the API provider side
- Try again later
- Check the provider's status page

#### No response / Timeout
- Check your internet connection
- Verify the API endpoint URL is correct
- The API server may be slow or down

## Extending API Support

To add support for additional API formats:

1. Edit `background.js`
2. Locate the `handleChatRequest` function
3. Add conditional logic based on API endpoint
4. Implement the specific API format
5. Handle the response format appropriately

Example:
```javascript
if (apiUrl.includes('your-api.com')) {
  // Custom API logic
  requestBody = {
    // Your custom format
  };
}
```

## Support

For API-specific issues:
- Check your API provider's documentation
- Review their status page for outages
- Contact their support team
- Check rate limits and quotas

For extension issues:
- Check the browser console for errors
- Review the INSTALLATION.md guide
- Check README.md for troubleshooting tips
