# AI Project Defense Coach

An intelligent AI system to help students prepare for academic project defense presentations by simulating a real defense session with adaptive questioning and detailed feedback.

## Overview

AI Project Defense Coach is designed to help students practice for their academic project defense presentations. The system adapts to different academic levels (Bachelor's, Master's, PhD) and provides comprehensive feedback on technical accuracy, documentation alignment, presentation skills, and critical thinking.

## Features

- **Adaptive Defense Simulation**: Customizes questions based on academic level, technologies used, and project focus
- **Document Analysis**: Upload project documentation (PDF/DOCX/PPTX) for context-aware questioning
- **Real-time Voice Interaction**: Engage in natural conversations with the AI Defense Examiner
- **Comprehensive Evaluation**: Receive detailed feedback on various aspects of your defense
- **Progress Tracking**: Monitor improvement across multiple practice sessions
- **Implementation Suggestions**: Get actionable advice on improving your project

## Technology Stack

- Next.js 15.x (React 19)
- Firebase/Firestore (database)
- VAPI.ai (voice conversation)
- Google Gemini AI (analysis and feedback)
- Tailwind CSS (styling)
- TypeScript (type safety)

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- A Firebase account
- VAPI.ai account
- Google AI API key

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/ai-project-defense-coach.git
cd ai-project-defense-coach
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables by creating a `.env.local` file in the root directory with the following:

```
NEXT_PUBLIC_VAPI_WEB_TOKEN="your-vapi-token"
NEXT_PUBLIC_VAPI_WORKFLOW_ID="your-vapi-workflow-id"

GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-key"

NEXT_PUBLIC_BASE_URL="your-deployment-url/api/vapi/generate"

NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"

FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-client-email"
FIREBASE_PRIVATE_KEY="your-private-key"
```

4. Run the development server

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## Usage

1. **Create an account or log in** to access the dashboard
2. **Click "Start Defense Preparation"** to begin a new session
3. **Fill in your project details**:
   - Project title
   - Academic level (Bachelor's/Master's/PhD)
   - Technologies used
   - Theory/practical focus ratio
   - Upload project documentation (optional)
   - Number of questions
4. **Start the defense session** and answer questions verbally
5. **Receive comprehensive feedback** after completing the session
6. **Review areas for improvement** and suggestions for enhancement

## System Architecture

The AI Project Defense Coach follows this workflow:

1. **Initialization Phase**: Loads academic standards based on level
2. **Input Collection**: Gathers project details and documents
3. **Document Processing**: Analyzes files for context-aware questioning
4. **Adaptive Question Generation**: Creates relevant questions based on project focus
5. **Mock Defense Simulation**: Conducts live voice-based Q&A
6. **Feedback Generation**: Provides detailed evaluation and improvement suggestions
7. **Session Storage**: Tracks progress across multiple sessions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- VAPI.ai for voice conversation capabilities
- Google Gemini for AI analysis
- All contributors who have helped improve this project
