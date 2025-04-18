"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { defenseSchema } from "@/constants";

export async function createDefenseSession(params: CreateDefenseSessionParams) {
  try {
    const { userId, role, type, techstack, level, focusRatio } = params;

    // Validate required fields
    if (!userId) {
      console.error("Error: userId is required for creating a defense session");
      return { success: false, error: "userId is required" };
    }

    // Generate a list of questions based on the provided topic
    // This would ideally use the Google AI to generate project defense questions
    const questions = [
      `Explain the overall architecture of your ${role} project`,
      `What were the main technical challenges you faced while implementing ${
        techstack && techstack.length > 0
          ? techstack.join(", ")
          : "your technology stack"
      }?`,
      `How did you ensure the quality and reliability of your implementation?`,
      `Describe your methodology and research approach`,
      `How does your project compare to existing solutions in this domain?`,
      `What are the limitations of your current implementation?`,
      `How would you scale your solution for larger datasets or user bases?`,
      `What ethical considerations did you address in your project?`,
      `If you had more time, what would you improve in your project?`,
      `How did you balance the ${focusRatio} in your project development?`,
    ];

    // Create the defense session document with validated fields
    const sessionData = {
      userId: userId,
      role: role || "Project Defense", // Provide defaults for optional fields
      type: type || "Defense Session",
      techstack: techstack || [],
      level: level || "To be determined",
      focusRatio: focusRatio || "To be determined",
      questions: questions,
      finalized: true, // Mark as finalized so it appears in the dashboard
      createdAt: new Date().toISOString(),
    };

    // Add to Firebase
    const sessionRef = db.collection("interviews").doc();
    await sessionRef.set(sessionData);

    return { success: true, sessionId: sessionRef.id };
  } catch (error) {
    console.error("Error creating defense session:", error);
    return { success: false, error };
  }
}

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    // Get the full transcript formatted for analysis
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    // Get project details for context
    const defense = await db.collection("interviews").doc(interviewId).get();
    const defenseData = defense.data();

    // If there's no API key, show a warning
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.warn(
        "No Google Generative AI API key found - using simplified feedback"
      );

      // Create a simplified feedback object if the AI cannot be used
      const simpleFeedback = {
        interviewId: interviewId,
        userId: userId,
        totalScore: 75, // Default score
        categoryScores: [
          {
            name: "Technical Understanding",
            score: 75,
            comment:
              "The candidate demonstrated basic understanding of the technical concepts.",
          },
          {
            name: "Project Implementation",
            score: 70,
            comment: "The implementation aspects were adequately covered.",
          },
          {
            name: "Response Quality",
            score: 80,
            comment:
              "Responses were generally clear and addressed the questions.",
          },
        ],
        strengths: [
          "Able to explain the project fundamentals",
          "Shows enthusiasm for the subject matter",
          "Provided concrete examples when asked",
        ],
        areasForImprovement: [
          "Could improve on technical depth in responses",
          "Consider providing more implementation details",
          "Practice explaining complex concepts more clearly",
        ],
        finalAssessment:
          "The defense demonstration showed competency in the subject matter with room for improvement in technical depth. Continue developing expertise in implementation details and critical analysis.",
        documentGaps: [],
        implementationSuggestions: [],
        createdAt: new Date().toISOString(),
      };

      let feedbackRef;
      if (feedbackId) {
        feedbackRef = db.collection("feedback").doc(feedbackId);
      } else {
        feedbackRef = db.collection("feedback").doc();
      }
      await feedbackRef.set(simpleFeedback);
      return { success: true, feedbackId: feedbackRef.id };
    }

    // Use Gemini 2.0 Flash for comprehensive feedback
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: defenseSchema,
      prompt: `
        ANALYZE PROJECT DEFENSE PERFORMANCE
        ===================================
        As an academic defense evaluator, critically assess the student's defense performance using:
        
        1. Project Information:
          - Title: ${defenseData?.role || "Academic Project"}
          - Academic Level: ${defenseData?.level || "Graduate Level"}
          - Technologies Used: ${
            defenseData?.techstack?.join(", ") || "Various technologies"
          }
          - Type: ${defenseData?.type || "Project Defense"}
        
        2. Defense Transcript: 
        ${formattedTranscript}
        
        Evaluation Criteria (0-100):
        - **Technical Accuracy**: Understanding of ${
          defenseData?.techstack?.join(", ") || "relevant technologies"
        }, implementation challenges
        - **Documentation Alignment**: Consistency between defense answers and project documentation
        - **Response Structure**: Clarity in explaining complex concepts
        - **Critical Thinking**: Quality of responses to examiner challenges
        - **Time Management**: Efficiency and focus in responses
        
        Special Instructions:
        - Identify any discrepancies or gaps in technical explanations
        - Highlight 3-5 key strengths based on the defense transcript
        - Identify 3-5 areas for improvement based on ${
          defenseData?.level || "graduate"
        } standards
        - Be strict on methodology validation and implementation details
        - Assess critical thinking ability when challenged
        - Provide specific actionable suggestions for improving weak areas
        - Give concrete recommendations for enhancing implementation
        `,
      system: `
        ROLE: Senior Academic Defense Evaluator
        MANDATE: Maintain ${
          defenseData?.level || "graduate-level"
        } academic defense standards
        BEHAVIOR:
        - Critically evaluate technical explanations
        - Assess alignment with academic research methodology
        - Apply ${defenseData?.level || "graduate"} grading rubrics strictly
        - Identify gaps in project implementation understanding
        - Flag inconsistencies as areas for improvement
        - Provide constructive feedback with specific improvement actions
        OUTPUT: JSON scores with detailed justification
      `,
    });

    // Create the comprehensive feedback object
    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore || 75,
      categoryScores: object.categoryScores || [],
      strengths: object.strengths || [],
      areasForImprovement: object.areasForImprovement || [],
      finalAssessment:
        object.finalAssessment || "The defense was completed successfully.",
      documentGaps: object.documentGaps || [],
      implementationSuggestions: object.implementationSuggestions || [],
      createdAt: new Date().toISOString(),
    };

    // Store the feedback in Firestore
    let feedbackRef;
    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }
    await feedbackRef.set(feedback);

    // Update the interview record to mark feedback as generated
    await db.collection("interviews").doc(interviewId).update({
      hasFeedback: true,
      feedbackGenerated: new Date().toISOString(),
    });

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false, error };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function deleteDefenseSession(sessionId: string) {
  try {
    await db.collection("interviews").doc(sessionId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting defense session:", error);
    return { success: false, error };
  }
}

export async function deleteFeedback(feedbackId: string) {
  try {
    await db.collection("feedback").doc(feedbackId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return { success: false, error };
  }
}

export async function updateDefenseSession(params: {
  sessionId: string;
  data: Record<string, any>; // Use Record<string, any> to avoid type issues
}) {
  const { sessionId, data } = params;

  // Create a sanitized version of the data without undefined values
  const sanitizedData: Record<string, any> = {};

  // Only add defined values to the update
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      sanitizedData[key] = value;
    }
  });

  try {
    // Get existing session
    const sessionRef = db.collection("interviews").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return { success: false, error: "Session not found" };
    }

    // Only update if there are sanitized values
    if (Object.keys(sanitizedData).length > 0) {
      // Update the session with new data
      await sessionRef.update({
        ...sanitizedData,
        updatedAt: new Date().toISOString(),
      });
    }

    // Generate new questions if needed
    if (data.role && !data.questions) {
      const existingData = sessionDoc.data() || {};
      const techstack = data.techstack || existingData.techstack || [];
      const techstackStr =
        techstack.length > 0
          ? typeof techstack === "string"
            ? techstack
            : techstack.join(", ")
          : "your technologies";

      const focusStr =
        data.focusRatio || existingData.focusRatio || "theory/practice balance";

      // Generate questions based on updated info
      const questions = [
        `Explain the overall architecture of your ${data.role} project`,
        `What were the main technical challenges you faced while implementing ${techstackStr}?`,
        `How did you ensure the quality and reliability of your implementation?`,
        `Describe your methodology and research approach`,
        `How does your project compare to existing solutions in this domain?`,
        `What are the limitations of your current implementation?`,
        `How would you scale your solution for larger datasets or user bases?`,
        `What ethical considerations did you address in your project?`,
        `If you had more time, what would you improve in your project?`,
        `How did you balance the ${focusStr} in your project development?`,
      ];

      await sessionRef.update({ questions });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating defense session:", error);
    return { success: false, error };
  }
}
