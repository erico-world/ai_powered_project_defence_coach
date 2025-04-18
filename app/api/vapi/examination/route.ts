import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

/**
 * API route for the Gemini AI-powered examination phase
 * This handles requests from the VAPI workflow when useGeminiForExamination is true
 */
export async function POST(request: NextRequest) {
  try {
    // Extract data from the request
    const requestData = await request.json();
    const {
      projectTitle,
      academicLevel,
      technologies,
      questions,
      sessionId,
      message,
      previousMessages,
      projectContext,
    } = requestData;

    console.log("Examination API called with:", {
      sessionId,
      projectTitle: projectTitle || "Not provided",
      academicLevel: academicLevel || "Not provided",
      messageLength: message?.length || 0,
      previousMessagesCount: previousMessages?.length || 0,
      hasQuestions: Boolean(questions),
      hasProjectContext: Boolean(projectContext),
    });

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Format previous messages for context if available
    const conversationHistory = previousMessages
      ? previousMessages
          .map((msg: any) => `${msg.role}: ${msg.content}`)
          .join("\n")
      : "";

    // Generate basic context if project context is missing
    const fallbackContext = `This is a defense examination for a ${
      academicLevel || "graduate"
    } level project titled "${
      projectTitle || "Academic Project"
    }". The project involves ${technologies || "various technologies"}.`;

    // Prepare the examination context
    let examinationContext = `
    # PROJECT DEFENSE EXAMINATION CONTEXT
    
    ## Project Information:
    - Project Title: ${projectTitle || "Academic Project"}
    - Academic Level: ${academicLevel || "Master's"}
    - Technologies Used: ${technologies || "Various technologies"}
    
    ## Examination Context:
    ${projectContext || fallbackContext}
    
    ## Questions to Cover:
    ${
      questions ||
      "Ask questions about the project implementation, methodology, and technical decisions."
    }
    
    ## Previous Conversation:
    ${conversationHistory}
    
    ## Current Student Message:
    ${message || ""}
    `;

    console.log("Generating examination response with Gemini AI...");

    // Generate the examiner's response
    const examinationResponse = await generateText({
      model: google("gemini-2.0-flash-001", {
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      }),
      prompt: examinationContext,
      system: `
        You are an academic project defense examiner conducting an oral examination.
        Your task is to critically evaluate the student's understanding of their project.
        
        Follow these guidelines:
        1. Ask challenging follow-up questions based on the student's responses
        2. Probe deeper when answers lack technical depth
        3. Evaluate whether the student demonstrates mastery of the technologies mentioned
        4. Maintain a professional but demanding examination tone
        5. Focus on one topic at a time before moving to the next question
        6. Identify inconsistencies or gaps in understanding
        7. Acknowledge good answers before moving on
        
        The examination questions have been provided, but you can add your own followup questions.
        Do not generate feedback during the examination; that happens after the session ends.
      `,
      temperature: 0.7,
    });

    console.log("Gemini AI response generated successfully");
    return NextResponse.json({ response: examinationResponse });
  } catch (error) {
    console.error("Error in Gemini AI examination:", error);
    return NextResponse.json(
      { error: "Failed to generate examination response" },
      { status: 500 }
    );
  }
}

// Handle options requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
