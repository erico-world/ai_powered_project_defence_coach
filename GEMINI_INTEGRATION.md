# Gemini AI Integration for Defense Examination

This guide explains how to set up and configure the Gemini AI examination functionality for the AI Project Defense Coach.

## Prerequisites

- A Google Cloud Platform account with the Vertex AI API enabled
- A Google Generative AI API key
- VAPI account with workflow capabilities

## Configuration Steps

### 1. Set Up Environment Variables

Ensure the following environment variables are set in your `.env.local` file:

```bash
# Google Gemini AI API Key
GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key"

# VAPI Configuration
NEXT_PUBLIC_VAPI_WEB_TOKEN="your-vapi-web-token"
NEXT_PUBLIC_VAPI_WORKFLOW_ID="your-vapi-workflow-id"

# API Base URL (for local development use http://localhost:3000/api/vapi)
NEXT_PUBLIC_BASE_URL="https://your-domain.com/api/vapi/generate"
```

### 2. Configure VAPI Workflow

You need to update your VAPI workflow to include the Gemini AI integration. In your VAPI workflow editor:

1. Add a conditional branch to check if Gemini AI should be used:

   - Add a condition like: `input.variableValues.useGeminiForExamination === true && input.variableValues.phase === 'examination'`

2. For the Gemini path, add an HTTP request to your API:

   - URL: `{{BASE_URL}}/examination` (replace BASE_URL with your domain)
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "projectTitle": "{{input.variableValues.projectTitle}}",
       "academicLevel": "{{input.variableValues.academicLevel}}",
       "technologies": "{{input.variableValues.technologies}}",
       "questions": "{{input.variableValues.questions}}",
       "sessionId": "{{input.variableValues.sessionId}}",
       "message": "{{input.transcript}}",
       "previousMessages": "{{conversation.messages}}",
       "projectContext": "{{input.variableValues.projectContext}}"
     }
     ```

3. Parse the response and continue the conversation with the Gemini AI response.

### 3. Testing the Integration

To test if your Gemini AI integration is working:

1. Start a defense preparation session and complete it
2. Begin the examination phase with the "Start Examination" button
3. Check the browser console for logs related to Gemini AI
4. Verify that the AI examiner's responses match the style specified in the examination API

## Troubleshooting

Common issues and solutions:

1. **API Key errors**: Ensure your `GOOGLE_GENERATIVE_AI_API_KEY` is correctly set and has not expired

2. **CORS issues**: If you encounter CORS errors, ensure your API routes have the proper CORS headers:

   ```typescript
   headers: {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Methods': 'POST, OPTIONS',
     'Access-Control-Allow-Headers': 'Content-Type, Authorization',
   }
   ```

3. **Workflow not triggering Gemini**: Verify the `useGeminiForExamination` flag is correctly set to `true` in the Agent.tsx file when starting an examination session

## Feedback Generation

After completing the examination phase, the feedback is generated using Gemini AI with the following process:

1. The transcript from the session is formatted and sent to Gemini AI
2. Project context information is included for better evaluation
3. The AI generates scores, strengths, improvement areas, and suggestions
4. This data is stored in Firestore and displayed on the feedback page

For issues with feedback generation, check the browser console for errors related to the `createFeedback` function.
