"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DefenseSessions from "@/components/DefenseSessions";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import {
  createDefenseSession,
  createFeedback,
  updateDefenseSession,
  getInterviewsByUserId,
} from "@/lib/actions/general.action";
import { processDocument } from "@/lib/document-processor";
import { generateQuestionsFromDocument } from "@/lib/question-generator";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
  ERROR = "ERROR",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface Message {
  type: "transcript" | "function_call" | "function_call_result" | "json";
  role?: string;
  transcriptType?: string;
  transcript?: string;
  json?: string;
  // Add other properties that might be in the message
}

interface ProjectInfo {
  title?: string;
  academicLevel?: string;
  technologies?: string[];
  focusRatio?: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isReconnecting, setIsReconnecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    interviewId || ""
  );

  // Add state to track if we're transitioning between sessions
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  // Add a state to track extracted questions from document
  const [extractedQuestions, setExtractedQuestions] = useState<string[]>([]);
  // Track if we're in a retry attempt
  const [isRetryAttempt, setIsRetryAttempt] = useState<boolean>(false);
  // Track if the VAPI service is available
  const [isVapiAvailable, setIsVapiAvailable] = useState<boolean>(true);

  // State for project defense form
  const [showForm, setShowForm] = useState(type === "generate");
  const [submittingForm, setSubmittingForm] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileProcessed, setFileProcessed] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Add session phase tracking
  const [sessionPhase, setSessionPhase] = useState<
    "preparation" | "examination"
  >(type === "generate" ? "preparation" : "examination");
  const [readyForFeedback, setReadyForFeedback] = useState<boolean>(false);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 3;
  const reconnectAttemptsRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [userSessions, setUserSessions] = useState<Interview[]>([]);

  // Check VAPI initialization
  useEffect(() => {
    const checkVapiAvailability = async () => {
      if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
        console.error("VAPI Web Token is missing");
        setIsVapiAvailable(false);
        setErrorMessage("VAPI configuration error: API token is missing");
        return;
      }

      if (!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID) {
        console.error("VAPI Workflow ID is missing");
        setIsVapiAvailable(false);
        setErrorMessage("VAPI configuration error: Workflow ID is missing");
        return;
      }

      // The VAPI SDK should be properly initialized
      if (!vapi) {
        console.error("VAPI SDK initialization failed");
        setIsVapiAvailable(false);
        setErrorMessage("VAPI service initialization failed");
        return;
      }

      setIsVapiAvailable(true);
    };

    checkVapiAvailability();
  }, []);

  useEffect(() => {
    const fetchUserSessions = async () => {
      if (userId) {
        try {
          const sessions = await getInterviewsByUserId(userId);
          if (sessions) {
            setUserSessions(sessions);
          }
        } catch (error) {
          console.error("Failed to fetch user sessions:", error);
        }
      }
    };

    fetchUserSessions();
  }, [userId]);

  const handleGenerateFeedback = async (messages: SavedMessage[]) => {
    if (messages.length < 3) {
      console.log("Not enough messages for feedback");
      toast.error("Not enough conversation data to generate feedback");
      router.push("/");
      return;
    }

    console.log("Generating feedback");
    try {
      const { success, feedbackId: id } = await createFeedback({
        interviewId: currentSessionId,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        toast.success("Feedback generated successfully!");
        router.push(`/interview/${currentSessionId}/feedback`);
      } else {
        console.error("Error saving feedback");
        toast.error("Failed to save feedback. Returning to dashboard.");
        router.push("/");
      }
    } catch (error) {
      console.error("Error in feedback generation:", error);
      toast.error("An error occurred while generating feedback");
      router.push("/");
    }
  };

  const onProjectInfoReceived = async (message: Message) => {
    if (message.type === "json" && currentSessionId && message.json) {
      try {
        // Parse the JSON data
        const projectInfo = JSON.parse(message.json) as ProjectInfo;

        // Log the project info
        console.log("Project info received:", projectInfo);

        // Only proceed if we have some information
        if (projectInfo) {
          // Prepare data for update with proper type casting
          const updateData: Record<string, unknown> = {};

          if (projectInfo.title) {
            updateData.role = projectInfo.title;
          }

          if (projectInfo.academicLevel) {
            updateData.level = projectInfo.academicLevel;
            updateData.type = `${projectInfo.academicLevel} Defense`;
          }

          if (
            projectInfo.technologies &&
            Array.isArray(projectInfo.technologies)
          ) {
            updateData.techstack = projectInfo.technologies;
          }

          if (projectInfo.focusRatio) {
            updateData.focusRatio = projectInfo.focusRatio;
          }

          // Add timestamp to ensure it's saved with latest data
          updateData.updatedAt = new Date().toISOString();

          // Ensure we mark this as finalized
          updateData.finalized = true;

          // Only update if we have some data
          if (Object.keys(updateData).length > 0) {
            console.log("Updating defense session with data:", updateData);

            // Update the session with the gathered information
            const result = await updateDefenseSession({
              sessionId: currentSessionId,
              data: updateData,
            });

            if (result.success) {
              // Fetch the updated session to ensure our UI can reflect the changes
              try {
                const sessions = await getInterviewsByUserId(userId!);
                if (sessions) {
                  setUserSessions(sessions);
                }
              } catch (fetchError) {
                console.error("Failed to refresh sessions:", fetchError);
              }

              // Add a confirmation message to the conversation
              const summaryMessage: SavedMessage = {
                role: "system" as const,
                content: `Project information updated: ${Object.keys(updateData)
                  .filter((key) => key !== "updatedAt" && key !== "finalized")
                  .join(", ")}`,
              };
              setMessages((prev) => [...prev, summaryMessage]);
            } else {
              console.error("Failed to update defense session:", result.error);
            }
          }
        }
      } catch (error) {
        console.error("Error processing project information:", error);
      }
    }
  };

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
      setErrorMessage("");
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
    };

    const onCallEnd = async () => {
      console.log("Call ended normally");
      setCallStatus(CallStatus.FINISHED);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;

      if (sessionPhase === "preparation") {
        // First session ended (preparation phase)
        setSessionPhase("examination");
        toast.success("Project preparation phase completed!");

        // Mark this session as having completed preparation phase in Firebase
        try {
          console.log("Updating session preparation status:", currentSessionId);
          const updateResult = await updateDefenseSession({
            sessionId: currentSessionId,
            data: {
              status: "Ready for examination",
              updatedAt: new Date().toISOString(),
            },
          });

          if (!updateResult.success) {
            console.error(
              "Failed to update session preparation status:",
              updateResult.error
            );
          }
        } catch (error) {
          console.error("Error updating preparation status:", error);
        }

        // Add system message to indicate phase transition
        const phaseTransitionMessage: SavedMessage = {
          role: "system",
          content:
            "Project preparation completed. Now starting the defense examination with the Gemini AI examiner.",
        };
        setMessages((prev) => [...prev, phaseTransitionMessage]);

        // Set transitioning state
        setIsTransitioning(true);

        // Fetch the updated session data before starting examination
        if (userId && currentSessionId) {
          try {
            // Refresh user sessions to get the updated title and other information
            const sessions = await getInterviewsByUserId(userId);
            if (sessions) {
              setUserSessions(sessions);

              // Update the current session data in the UI
              const currentSession = sessions.find(
                (session) => session.id === currentSessionId
              );
              if (currentSession) {
                console.log("Updated session data:", currentSession);
                // Retrieve questions from the updated session to use in examination phase
                if (
                  currentSession.questions &&
                  currentSession.questions.length > 0
                ) {
                  setExtractedQuestions(currentSession.questions);
                }
              }
            }
          } catch (error) {
            console.error(
              "Failed to refresh session data after preparation:",
              error
            );
          }
        }

        // Add a small delay to ensure state updates are processed
        setTimeout(async () => {
          // Automatically start the examination phase
          try {
            console.log(
              "Automatically starting examination phase with Gemini AI"
            );
            await handleCall(); // This will now use sessionPhase = "examination"
          } catch (error) {
            console.error("Failed to auto-start examination phase:", error);
            toast.error(
              "Failed to start examination. Please try again manually."
            );

            // Add guidance message for manual restart
            const manualRestartMessage: SavedMessage = {
              role: "system",
              content:
                "Please click the 'Start Defense' button to begin the examination phase with the Gemini AI examiner.",
            };
            setMessages((prev) => [...prev, manualRestartMessage]);
          }
        }, 2000);
      } else if (sessionPhase === "examination" && readyForFeedback) {
        // Second session ended (examination phase) and ready for feedback
        // Only generate feedback if we have enough messages
        if (messages.length >= 3 && currentSessionId) {
          // Add small delay to ensure all messages are processed
          setTimeout(() => {
            handleGenerateFeedback(messages);
          }, 1500);
        } else {
          toast.warning(
            "The session was too short to generate meaningful feedback"
          );
          router.push("/");
        }
      } else {
        // Examination phase but not ready for feedback yet
        toast.info("Defense examination session ended");
        setReadyForFeedback(true);
        router.push("/");
      }
    };

    const onMessage = (message: Message) => {
      console.log("Received message:", message);
      if (message.type === "transcript" && message.transcriptType === "final") {
        const role =
          message.role === "user"
            ? "user"
            : message.role === "assistant"
            ? "assistant"
            : "system";

        const newMessage: SavedMessage = {
          role: role as "user" | "system" | "assistant",
          content: message.transcript || "",
        };

        // Add message with animation effect
        setMessages((prev) => [...prev, newMessage]);
      } else if (message.type === "json") {
        // Handle JSON messages which might contain project information
        onProjectInfoReceived(message);
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: Error) => {
      console.error("VAPI Error:", error);
      // Handle empty error objects
      const errorMsg =
        error && error.message ? error.message : "Unknown connection error";
      setErrorMessage(`Session error: ${errorMsg}`);
      setCallStatus(CallStatus.ERROR);

      // Categorize errors for better handling
      const isConnectionError =
        errorMsg.includes("connection") ||
        errorMsg.includes("ended") ||
        errorMsg.includes("transport") ||
        errorMsg.includes("network") ||
        errorMsg.includes("Meeting has ended") ||
        errorMsg === "Unknown connection error"; // Handle empty error objects

      const isAPIKeyError =
        errorMsg.includes("API key") ||
        errorMsg.includes("authentication") ||
        errorMsg.includes("GOOGLE_GENERATIVE_AI_API_KEY");

      // Show a toast message with more specific information
      if (isAPIKeyError) {
        toast.error(
          "API Key Error: The Google API key is missing or invalid. Please contact support."
        );
        // No need to retry for API key errors
        router.push("/");
        return;
      } else if (isConnectionError) {
        if (sessionPhase === "preparation" && !isTransitioning) {
          toast.error("Preparation session disconnected. Please try again.");
        } else if (sessionPhase === "examination" && !isRetryAttempt) {
          toast.error(
            "Defense session disconnected. Attempting to reconnect..."
          );
        } else {
          toast.error(
            `Connection error: ${errorMsg}. Attempting to reconnect...`
          );
        }
      } else {
        toast.error(`Defense session error: ${errorMsg}`);
      }

      // Handle reconnection for connection-related errors
      if (isConnectionError) {
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          setIsReconnecting(true);
          reconnectAttemptsRef.current += 1;
          setIsRetryAttempt(true);
          toast.info(
            `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );

          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          // Attempt to reconnect after a delay
          reconnectTimeoutRef.current = setTimeout(() => {
            handleCall();
            setIsReconnecting(false);
          }, 5000); // 5 second delay before reconnection
        } else {
          toast.warning("Maximum reconnection attempts reached");
          // If max reconnection attempts reached, return to dashboard
          // Do NOT generate feedback on connection errors
          toast.info("Please try again later when connection is more stable");
          router.push("/");
        }
      } else {
        // For non-connection errors, proceed with feedback generation if possible
        // Only in examination phase and if we have enough data
        if (
          sessionPhase === "examination" &&
          readyForFeedback &&
          messages.length >= 3 &&
          currentSessionId
        ) {
          handleGenerateFeedback(messages);
        } else {
          toast.error("Session error occurred. Please try again later.");
          router.push("/");
        }
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);

      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [messages, currentSessionId, type, router, handleGenerateFeedback]);

  useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setFileProcessed(false);

    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check file size - max 5MB
      if (file.size > 5 * 1024 * 1024) {
        setFileError(
          "File size exceeds 5MB limit. Please upload a smaller file."
        );
        return;
      }

      // Check file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
      if (!allowedTypes.includes(file.type)) {
        setFileError(
          "File type not supported. Please upload a PDF, DOCX, or PPTX file."
        );
        return;
      }

      setProjectFile(file);
      setFileProcessing(true);

      // Process the file to extract text
      processDocument(file)
        .then((result) => {
          setFileProcessing(false);
          if (result.success) {
            setFileProcessed(true);
            // Log file information
            console.log(
              `File processed: ${file.name}, size: ${Math.round(
                file.size / 1024
              )}KB, type: ${file.type}`
            );
            console.log(`Words extracted: ${result.metadata.wordCount}`);
          } else {
            setFileError(result.error || "Failed to process file");
          }
        })
        .catch((error) => {
          setFileProcessing(false);
          setFileError(
            error instanceof Error
              ? error.message
              : "Unknown error processing file"
          );
        });
    }
  };

  const handleSubmitDefenseInfo = async () => {
    try {
      // Check if VAPI is available before proceeding
      if (!isVapiAvailable) {
        toast.error(
          "Voice AI service is not available. Please check configuration."
        );
        return;
      }

      setSubmittingForm(true);

      // Validate user ID
      if (!userId) {
        console.error(
          "User ID is undefined. Cannot create session without a user ID."
        );
        toast.error("Authentication error. Please try logging in again.");
        setSubmittingForm(false);
        return;
      }

      // Variables for document processing
      let fileName = "";
      let fileType = "";
      let extractedText = "";
      let customQuestions: string[] = [];

      if (projectFile) {
        try {
          // Log file information for debugging
          console.log(
            `Processing file: ${projectFile.name}, ${Math.round(
              projectFile.size / 1024
            )}KB, ${projectFile.type}`
          );

          // Process the document client-side
          const processResult = await processDocument(projectFile);

          fileName = projectFile.name;
          fileType = projectFile.type;

          // If document processing succeeded, use the extracted text
          if (processResult.success && processResult.text) {
            extractedText = processResult.text;
            console.log(
              "Extracted text from file (preview):",
              extractedText.substring(0, 200) + "..."
            );

            // Generate custom questions based on the document content
            toast.info("Analyzing your document and generating questions...");
            customQuestions = await generateQuestionsFromDocument({
              academicLevel: "Master's", // Default academic level, will be updated later
              projectTitle: "Project Defense", // Default title, will be updated later
              technologies: [],
              documentText: extractedText,
            });

            // Store extracted questions for later use
            setExtractedQuestions(customQuestions);

            console.log(
              "Generated questions based on document:",
              customQuestions
            );
          } else {
            console.warn(
              "Failed to extract text from file:",
              processResult.error
            );
            toast.warning(
              "Could not analyze your document, but continuing with session."
            );
          }
        } catch (error) {
          console.error("Error processing file:", error);
          toast.error(
            `Document processing error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          toast.warning("Continuing with session without document analysis");
        }
      } else {
        toast.info(
          "No file uploaded. The AI coach will gather project information during the session."
        );
      }

      // Create a defense session in Firebase first with more descriptive default values
      const { success, sessionId } = await createDefenseSession({
        userId: userId,
        role: fileName
          ? fileName.replace(/\.(pdf|docx|pptx)$/i, "")
          : "Project Defense", // Use filename as initial title if available
        type: "Defense Session",
        techstack: [],
        level: "To be determined during preparation",
        focusRatio: "To be determined during preparation",
        // Pass custom questions if available
        questions: customQuestions.length > 0 ? customQuestions : undefined,
      });

      if (!success || !sessionId) {
        toast.error("Failed to create defense session");
        setSubmittingForm(false);
        return;
      }

      // Store the new session ID
      setCurrentSessionId(sessionId);

      // Show confirmation and summary
      const summaryMessage: SavedMessage = {
        role: "system" as const,
        content: extractedText
          ? `Defense session prepared with document analysis. Generated ${customQuestions.length} custom questions based on your document. Starting your defense preparation...`
          : `Defense session prepared. Starting your defense preparation...`,
      };
      setMessages([summaryMessage]);

      // Add system message to indicate prep phase is starting
      const prepPhaseMessage: SavedMessage = {
        role: "system",
        content:
          "Starting project preparation phase. The AI coach will gather information about your project to prepare for your defense examination. This information will be used by the Gemini AI examiner in the next phase.",
      };
      setMessages([prepPhaseMessage]);

      // Hide the form and show the defense interface
      setCallStatus(CallStatus.CONNECTING);
      setShowForm(false);

      // Launch the VAPI session with proper initialization
      try {
        // Make sure VAPI workflow ID exists
        if (!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID) {
          throw new Error("VAPI workflow ID is missing");
        }

        // Our enhanced VAPI SDK handles errors and reconnection internally
        await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID, {
          variableValues: {
            username: userName,
            userid: userId,
            sessionId: sessionId,
            projectFile: {
              name: fileName || "No file provided",
              type: fileType || "none",
              extractedText: extractedText || "No text extracted",
              customQuestions:
                customQuestions.length > 0 ? customQuestions.join("\n") : "",
            },
            // Specify preparation phase
            phase: "preparation",
            // Add flag to indicate this is for gathering info, not examination
            isExaminer: false,
            isPrepPhase: true,
            // Do not use Gemini AI for preparation, only for examination
            useGeminiForExamination: false,
            hasDocumentContext: extractedText ? true : false,
          },
        });
      } catch (error) {
        console.error("Error starting VAPI session:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Handle common error cases
        if (
          errorMessage.includes("API key") ||
          errorMessage.includes("authentication")
        ) {
          toast.error("API key configuration error. Please contact support.");
        } else if (errorMessage.includes("timeout")) {
          toast.error("Connection timeout. Please try again later.");
        } else {
          toast.error("Failed to start defense preparation session");
        }

        setSubmittingForm(false);
        setCallStatus(CallStatus.ERROR);
      }
    } catch (error) {
      console.error("Error submitting defense info:", error);
      toast.error("Failed to start defense session");
      setSubmittingForm(false);
    }
  };

  const handleCall = async () => {
    if (type === "generate") {
      setShowForm(true);
    } else {
      // Check if VAPI is available before trying to start a call
      if (!isVapiAvailable) {
        setErrorMessage(
          "VAPI service is not available. Please check configuration."
        );
        setCallStatus(CallStatus.ERROR);
        toast.error("Cannot start session: Voice AI service is not available");
        return;
      }

      try {
        setCallStatus(CallStatus.CONNECTING);
        setErrorMessage(""); // Clear any previous errors
        setIsRetryAttempt(true); // Mark this as a retry attempt

        // Fetch the latest session data if we're in examination phase
        let projectTitle = "Project Defense";
        let academicLevel = "";
        let technologies: string[] = [];
        let sessionContext = "";

        if (
          sessionPhase === "examination" &&
          userId &&
          currentSessionId &&
          !isRetryAttempt
        ) {
          try {
            console.log("Fetching latest session data for examination phase");
            const sessions = await getInterviewsByUserId(userId);
            if (sessions) {
              // Find the current session
              const currentSession = sessions.find(
                (session) => session.id === currentSessionId
              );
              if (currentSession) {
                console.log("Current session for examination:", currentSession);

                // Update local state with session data
                if (
                  currentSession.questions &&
                  currentSession.questions.length > 0
                ) {
                  setExtractedQuestions(currentSession.questions);
                }

                // Capture session information for Gemini context
                if (
                  currentSession.role &&
                  currentSession.role !== "Project Defense"
                ) {
                  projectTitle = currentSession.role;
                }

                if (currentSession.level) {
                  academicLevel = currentSession.level;
                }

                if (
                  currentSession.techstack &&
                  Array.isArray(currentSession.techstack)
                ) {
                  technologies = currentSession.techstack;
                }

                // Build context string for Gemini AI
                sessionContext = `Project Title: ${projectTitle}\n`;
                sessionContext += academicLevel
                  ? `Academic Level: ${academicLevel}\n`
                  : "";
                sessionContext +=
                  technologies.length > 0
                    ? `Technologies: ${technologies.join(", ")}\n`
                    : "";

                // Add a message showing the project title
                const projectInfoMessage: SavedMessage = {
                  role: "system",
                  content: `Beginning defense examination for project: "${projectTitle}"`,
                };
                setMessages((prev) => [...prev, projectInfoMessage]);
              }
            }
          } catch (error) {
            console.error("Error fetching current session data:", error);
          }
        }

        // Format questions based on source
        let formattedQuestions = "";
        // Use extracted questions if available (for examination phase after document upload)
        if (sessionPhase === "examination" && extractedQuestions.length > 0) {
          formattedQuestions = extractedQuestions
            .map((question) => `- ${question}`)
            .join("\n");
          console.log(
            "Using extracted questions for examination:",
            formattedQuestions
          );
        }
        // Otherwise use questions from props
        else if (questions && questions.length > 0) {
          formattedQuestions = questions
            .map((question) => `- ${question}`)
            .join("\n");
          console.log(
            "Using props questions for examination:",
            formattedQuestions
          );
        }
        // Set fallback if no questions available
        else {
          const fallbackQuestions = [
            "Explain the overall architecture of your project.",
            "What were the main technical challenges you faced?",
            "How did you ensure the quality of your implementation?",
            "Describe your methodology approach in detail.",
            "What are the limitations of your current implementation?",
          ];
          formattedQuestions = fallbackQuestions
            .map((question) => `- ${question}`)
            .join("\n");
          console.log("Using fallback questions:", formattedQuestions);
        }

        // Reset reconnection attempts
        reconnectAttemptsRef.current = 0;

        // Check if VAPI workflow ID is available
        if (!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID) {
          throw new Error(
            "VAPI workflow ID is missing. Please check your environment configuration."
          );
        }

        // Create a system message informing the user what's happening
        if (sessionPhase === "examination") {
          const examinerInfo: SavedMessage = {
            role: "system",
            content:
              "Starting your project defense examination. The AI examiner will ask you questions about your project based on the information provided. Please answer verbally when prompted.",
          };

          // Add a message to the conversation to inform the user
          setMessages((prev) => [...prev, examinerInfo]);
        }

        // Our enhanced VAPI SDK now handles timeouts and reconnection internally
        await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID, {
          variableValues: {
            questions: formattedQuestions,
            sessionId: currentSessionId || interviewId, // Use current session ID if available
            username: userName,
            userid: userId,
            // Specify the session phase for the VAPI workflow
            phase: sessionPhase,
            // Reset transitioning flag
            isTransitioning: false,
            // Add a flag to tell the AI to be an examiner in examination phase
            isExaminer: sessionPhase === "examination",
            // IMPORTANT: Specify that Gemini AI should be used for examination phase
            useGeminiForExamination: sessionPhase === "examination",
            // Add a flag for whether this has document context
            hasDocumentContext: extractedQuestions.length > 0,
            // Add project context information
            projectContext: sessionContext,
            projectTitle: projectTitle,
            academicLevel: academicLevel,
            technologies: technologies.join(", "),
            // Add the document text from the project file if available
            documentText:
              sessionPhase === "examination" && extractedQuestions.length > 0
                ? "Document analysis has been performed and questions have been extracted."
                : "",
          },
        });

        // Reset transition state after successful connection
        setIsTransitioning(false);
      } catch (error) {
        console.error("Error starting call:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        setCallStatus(CallStatus.ERROR);

        // Provide a user-friendly error message
        if (
          errorMessage.includes("API key") ||
          errorMessage.includes("authentication")
        ) {
          setErrorMessage("API key error: " + errorMessage);
          toast.error("API key configuration error. Please contact support.");
        } else if (errorMessage.includes("timeout")) {
          setErrorMessage(
            "Connection timeout. The service is taking too long to respond."
          );
          toast.error("Connection timeout. Please try again later.");
        } else if (errorMessage.includes("maximum reconnection attempts")) {
          setErrorMessage(
            "Could not establish a stable connection after multiple attempts."
          );
          toast.error(
            "Failed to connect after multiple attempts. Please try again later."
          );
        } else {
          setErrorMessage("Failed to start defense session: " + errorMessage);
          toast.error("Failed to connect to defense examiner");
        }
      }
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    setIsReconnecting(false);
    reconnectAttemptsRef.current = 0;
    try {
      vapi.stop();
    } catch (error) {
      console.error("Error stopping VAPI:", error);
    }
  };

  return (
    <>
      {!isVapiAvailable && (
        <div className="bg-red-600 text-white p-4 mb-4 rounded-lg">
          <p className="font-bold">Voice AI Service Not Available</p>
          <p className="text-sm">
            The defense coach requires voice AI configuration. Please check VAPI
            configuration settings or contact support.
          </p>
        </div>
      )}

      {showForm ? (
        <div className="form-container p-6 border rounded-lg">
          <h3 className="mb-4">Project Defense Information</h3>

          <div className="grid grid-cols-1 gap-4">
            <div className="form-group file-upload-container">
              <label
                htmlFor="projectFile"
                className="block text-sm font-medium mb-1"
              >
                Project Documentation
              </label>
              <input
                id="projectFile"
                type="file"
                ref={fileInputRef}
                className="w-full p-2 border rounded-md"
                accept=".pdf,.docx,.pptx"
                onChange={handleFileChange}
                title="Upload project documentation"
                disabled={submittingForm || fileProcessing}
              />

              {fileProcessing && (
                <div className="mt-2">
                  <div className="file-upload-progress"></div>
                  <p className="text-xs text-blue-600 mt-1">
                    Processing document...
                  </p>
                </div>
              )}

              {fileProcessed && !fileError && (
                <p className="text-xs text-green-600 mt-1">
                  Document processed successfully. Ready for defense session.
                </p>
              )}

              {fileError && (
                <p className="text-xs text-red-600 mt-1">{fileError}</p>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Accept PDF, DOCX, PPTX (max 5MB)
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              className="btn-primary"
              onClick={handleSubmitDefenseInfo}
              disabled={submittingForm || fileProcessing}
            >
              {submittingForm
                ? "Setting up defense..."
                : "Start Defense Session"}
            </button>
          </div>
        </div>
      ) : (
        <div className="call-container">
          <div className="call-view">
            {/* AI Defense Examiner Card */}
            <div className="card-interviewer">
              <div className="avatar">
                <Image
                  src="/ai-avatar.png"
                  alt="profile-image"
                  width={65}
                  height={54}
                  className="object-cover"
                />
                {isSpeaking && <span className="animate-speak" />}
              </div>
              <h3>AI Defense Examiner</h3>
            </div>

            {/* User Profile Card */}
            <div className="card-border">
              <div className="card-content">
                <Image
                  src="/user-avatar.png"
                  alt="profile-image"
                  width={539}
                  height={539}
                  className="rounded-full object-cover size-[120px]"
                />
                <h3>{userName}</h3>
              </div>
            </div>
          </div>

          <div
            id="message-container"
            className="message-container max-h-96 overflow-y-auto mt-6 w-full p-4"
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 my-10">
                Your conversation will appear here...
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`message ${
                    message.role
                  } p-3 mb-3 rounded-lg animate-fadeIn ${
                    message.role === "user"
                      ? "bg-blue-900/20 ml-auto"
                      : message.role === "assistant"
                      ? "bg-purple-900/20"
                      : "bg-gray-800/40"
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    maxWidth: "85%",
                  }}
                >
                  <p className="mb-1 font-semibold text-sm opacity-80">
                    {message.role === "user"
                      ? "You"
                      : message.role === "assistant"
                      ? "AI Coach"
                      : "System"}
                    :
                  </p>
                  <div className="message-content whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {messages.length > 0 && <div ref={messagesEndRef} />}
          </div>

          {errorMessage && (
            <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <p>{errorMessage}</p>
              {isReconnecting && (
                <p className="text-sm mt-2">
                  Attempting to reconnect... ({reconnectAttemptsRef.current}/
                  {maxReconnectAttempts})
                </p>
              )}
            </div>
          )}

          <div className="w-full flex justify-center mt-4">
            {callStatus !== CallStatus.ACTIVE ? (
              <button
                className={cn(
                  "relative btn-call",
                  callStatus === CallStatus.ERROR &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
                onClick={() => handleCall()}
                disabled={
                  callStatus === CallStatus.CONNECTING || isReconnecting
                }
              >
                <span
                  className={cn(
                    "absolute animate-ping rounded-full opacity-75",
                    callStatus === CallStatus.CONNECTING || isReconnecting
                      ? ""
                      : "hidden"
                  )}
                />
                <span className="relative">
                  {isReconnecting
                    ? "Reconnecting..."
                    : callStatus === CallStatus.INACTIVE ||
                      callStatus === CallStatus.FINISHED
                    ? "Start Session"
                    : callStatus === CallStatus.ERROR
                    ? "Retry Session"
                    : ". . ."}
                </span>
              </button>
            ) : (
              <button
                className="btn-disconnect"
                onClick={() => handleDisconnect()}
              >
                End
              </button>
            )}
          </div>
        </div>
      )}
      {userSessions.length > 0 &&
        callStatus !== CallStatus.ACTIVE &&
        callStatus !== CallStatus.CONNECTING && (
          <div className="w-full">
            <h2 className="font-bold text-3xl mt-10 mb-6">
              Your Defense Sessions
            </h2>
            <DefenseSessions sessions={userSessions} userId={userId || ""} />
          </div>
        )}
    </>
  );
};

export default Agent;
