/**
 * Client-side question generator using Gemini AI
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export interface QuestionGenerationParams {
  academicLevel: string;
  projectTitle: string;
  technologies: string[];
  focusRatio?: string;
  documentText: string;
  questionCount?: number;
}

export async function generateQuestionsFromDocument(
  params: QuestionGenerationParams
): Promise<string[]> {
  const {
    academicLevel = "Master's",
    projectTitle = "Project Defense",
    technologies = [],
    focusRatio = "40% technical, 30% methodology, 20% alternatives, 10% ethics",
    documentText,
    questionCount = 10,
  } = params;

  try {
    // Check if API key is configured
    if (!process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY) {
      console.warn(
        "Google Generative AI API key is missing - using fallback questions"
      );
      return getFallbackQuestions(
        academicLevel,
        projectTitle,
        technologies.join(", ")
      );
    }

    // If document text is too large, we'll need to truncate it
    // Gemini can handle ~30k tokens, but we'll be conservative
    const maxLength = 7000; // Conservative character limit
    const truncatedText =
      documentText.length > maxLength
        ? documentText.substring(0, maxLength) + "... [truncated for length]"
        : documentText;

    const techString =
      technologies.length > 0 ? technologies.join(", ") : "Not specified";

    const promptText = `
    Generate ${questionCount} challenging and specific questions for a ${academicLevel} level defense of the project described below.
    
    DOCUMENT CONTEXT:
    ${truncatedText}
    
    Project Title: ${projectTitle}
    Technologies: ${techString}
    Focus: ${focusRatio}
    
    Rules:
    1. 40% questions must reference specific sections
    2. 30% challenge methodology
    3. 20% probe alternatives
    4. 10% ethics/scalability
    
    The questions should be specific to the content in the document, referencing actual technologies, methods, and concepts mentioned.
    Each question should be challenging but fair for a ${academicLevel} level student.
    
    FORMAT: Return only the list of ${questionCount} questions, one per line, without numbering or additional text.
    `;

    try {
      // Try with explicit API key from env var to avoid load API key error
      const result = await generateText({
        model: google("gemini-1.5-flash", {
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY,
        }),
        prompt: promptText,
        temperature: 0.3,
        topK: 40,
      });

      const questionsText = String(result);

      // Split the text into individual questions
      const questionsList = questionsText
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0 && q.endsWith("?"));

      // If we don't have enough questions or the generation failed,
      // return a set of generic fallback questions
      if (questionsList.length < 5) {
        console.warn(
          "Generated fewer than 5 valid questions, using fallback questions"
        );
        return getFallbackQuestions(academicLevel, projectTitle, techString);
      }

      return questionsList;
    } catch (innerError: any) {
      // Handle API-specific errors
      console.error(
        "API error in question generation:",
        innerError?.message || innerError
      );
      if (innerError?.message?.includes("API key")) {
        console.error(
          "API key error detected - check your GOOGLE_GENERATIVE_AI_API_KEY environment variable"
        );
      }
      // Return fallback questions on any generation error
      return getFallbackQuestions(academicLevel, projectTitle, techString);
    }
  } catch (error: any) {
    console.error("Error in question generation:", error?.message || error);
    return getFallbackQuestions(
      academicLevel,
      projectTitle,
      technologies.join(", ")
    );
  }
}

/**
 * Generate generic fallback questions if the AI generation fails
 */
function getFallbackQuestions(
  academicLevel: string,
  projectTitle: string,
  technologies: string
): string[] {
  console.log("Using fallback questions for", projectTitle);
  return [
    `Explain the overall architecture of your ${projectTitle} project.`,
    `What were the main technical challenges you faced while working with ${technologies}?`,
    `How did you ensure the quality and reliability of your implementation?`,
    `Describe your methodology and research approach in detail.`,
    `How does your project compare to existing solutions in this domain?`,
    `What are the limitations of your current implementation?`,
    `How would you scale your solution for larger datasets or user bases?`,
    `What ethical considerations did you address in your project?`,
    `If you had more time and resources, what would you improve in your project?`,
    `How did you balance theoretical concepts and practical implementation in your ${academicLevel}-level project?`,
  ];
}
