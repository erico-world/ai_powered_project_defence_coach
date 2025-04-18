/**
 * VAPI Gemini Connector
 * This file provides functions to connect VAPI with the Gemini AI examination functionality
 */

/**
 * Sends the current conversation state to the Gemini AI examiner and returns the response
 * @param session The current session information
 * @param message The latest user message
 * @param previousMessages Previous messages in the conversation
 * @returns Promise with the AI examiner's response
 */
export async function getGeminiExaminerResponse(
  session: {
    projectTitle?: string;
    academicLevel?: string;
    technologies?: string;
    questions?: string;
    sessionId: string;
    projectContext?: string;
  },
  message: string,
  previousMessages: { role: string; content: string }[]
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
  const apiUrl = `${baseUrl.replace("/generate", "")}/examination`;

  console.log("Sending request to Gemini AI examiner with context:");
  console.log("- Project Title:", session.projectTitle || "Not specified");
  console.log("- Academic Level:", session.academicLevel || "Not specified");
  console.log("- Technologies:", session.technologies || "Not specified");
  console.log("- Session ID:", session.sessionId);
  console.log(
    "- Project Context Length:",
    session.projectContext
      ? `${session.projectContext.length} chars`
      : "No context available"
  );
  console.log(
    "- Question Count:",
    session.questions
      ? session.questions.split("\n").filter((q) => q.trim().length > 0).length
      : 0
  );
  console.log("- Previous Messages:", previousMessages.length);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectTitle: session.projectTitle || "Academic Project",
        academicLevel: session.academicLevel || "Graduate Level",
        technologies: session.technologies || "",
        questions: session.questions || "",
        sessionId: session.sessionId,
        message,
        previousMessages,
        projectContext: session.projectContext || "",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error response:", errorData);
      throw new Error(`API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error connecting to Gemini AI examiner:", error);
    return "I apologize, but I encountered an issue with the examination system. Please try again or contact support if the problem persists.";
  }
}

/**
 * Utility function to determine if the current VAPI session should use Gemini AI
 * @param variableValues The VAPI workflow variable values
 * @returns boolean indicating if Gemini AI should be used
 */
export function shouldUseGeminiExaminer(variableValues: any) {
  return (
    variableValues?.useGeminiForExamination === true &&
    variableValues?.phase === "examination"
  );
}

/**
 * Handles integration between VAPI and Gemini AI
 * This can be used in the VAPI workflow to connect to our custom AI examiner
 */
export const vapiGeminiIntegration = {
  getExaminerResponse: getGeminiExaminerResponse,
  shouldUseGemini: shouldUseGeminiExaminer,
};
