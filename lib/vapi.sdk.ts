import Vapi from "@vapi-ai/web";

// Create a custom extended VAPI client with enhanced error handling
class EnhancedVapi extends Vapi {
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private isReconnecting = false;

  constructor(token: string) {
    super(token);
    this.setupErrorListeners();
  }

  /**
   * Setup additional error listeners to improve error handling
   */
  private setupErrorListeners() {
    // Listen for connection/socket errors that might not be caught by the regular error handler
    this.on("error", (error) => {
      console.warn("VAPI error intercepted:", error);
      // Empty error objects are common with WebSocket issues
      if (error && Object.keys(error).length === 0) {
        console.warn(
          "Empty error object detected - likely a WebSocket disconnection"
        );
      }
    });
  }

  /**
   * Start a call with timeout protection and reconnection capability
   */
  async start(workflowId: string, options?: any): Promise<void> {
    // Clear any existing timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Reset reconnect state if this is a fresh call
    if (!this.isReconnecting) {
      this.reconnectAttempts = 0;
    }

    try {
      // Set a timeout to prevent hanging on connection issues
      this.connectionTimeout = setTimeout(() => {
        console.warn("VAPI connection timeout after 15 seconds");
        this.emit("error", new Error("Connection timeout"));
      }, 15000);

      // Start the call
      await super.start(workflowId, options);

      // Clear the timeout if successful
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      // Reset reconnection state on successful connection
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
    } catch (error) {
      // Clear timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      // Try to handle the error
      if (this.shouldAttemptReconnect(error)) {
        this.isReconnecting = true;
        this.reconnectAttempts++;

        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          console.log(
            `VAPI reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
          );

          // Wait 2 seconds before trying to reconnect
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Try to reconnect
          return this.start(workflowId, options);
        } else {
          console.error("VAPI max reconnection attempts reached");
          this.isReconnecting = false;
          throw new Error(
            "Failed to connect after maximum reconnection attempts"
          );
        }
      }

      // If not reconnecting or reconnection failed, rethrow the error
      throw error;
    }
  }

  /**
   * Safely stop the current call
   */
  stop(): void {
    try {
      // Clear any pending timeouts
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      // Reset reconnection state
      this.isReconnecting = false;
      this.reconnectAttempts = 0;

      // Call the parent stop method
      super.stop();
    } catch (error) {
      console.error("Error stopping VAPI call:", error);
      // Still reset state even if there was an error
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Determine if a reconnection attempt should be made based on the error
   */
  private shouldAttemptReconnect(error: any): boolean {
    // If there's no error or it's an empty object, it's likely a connection issue
    if (!error || Object.keys(error).length === 0) {
      return true;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Don't reconnect for API key or authentication errors
    if (
      errorMessage.includes("API key") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("unauthorized")
    ) {
      return false;
    }

    // Reconnect for connection, network, or transport errors
    return (
      errorMessage.includes("connection") ||
      errorMessage.includes("network") ||
      errorMessage.includes("transport") ||
      errorMessage.includes("Meeting has ended") ||
      errorMessage.includes("socket") ||
      errorMessage.includes("timeout")
    );
  }
}

// Create and export the enhanced VAPI instance
export const vapi = new EnhancedVapi(
  process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN || ""
);

// Export the VAPI types
export type { Message } from "@vapi-ai/web";
