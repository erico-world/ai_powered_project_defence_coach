/**
 * Client-side document processor for extracting text from academic documents
 * Implements text extraction without requiring Firebase Storage
 */

import LZString from "lz-string";
import { sha256 } from "js-sha256";

// Maximum file size in bytes (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Allowed file types
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
];

export interface ProcessedDocument {
  text: string;
  metadata: {
    hash: string;
    compressed: string;
    filename: string;
    fileType: string;
    chunks: string[];
    pageCount?: number;
    wordCount: number;
  };
  success: boolean;
  error?: string;
}

/**
 * Process a document file client-side to extract text
 */
export async function processDocument(file: File): Promise<ProcessedDocument> {
  try {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        text: "",
        metadata: {
          hash: "",
          compressed: "",
          filename: file.name,
          fileType: file.type,
          chunks: [],
          wordCount: 0,
        },
        success: false,
        error: "File is too large. Please upload a file less than 5MB.",
      };
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        text: "",
        metadata: {
          hash: "",
          compressed: "",
          filename: file.name,
          fileType: file.type,
          chunks: [],
          wordCount: 0,
        },
        success: false,
        error:
          "Unsupported file type. Please upload a PDF, DOCX, or PPTX file.",
      };
    }

    // Extract text based on file type
    let extractedText = "";

    try {
      console.log(`Extracting text from ${file.type} file: ${file.name}`);

      if (file.type === "application/pdf") {
        extractedText = await extractTextFromPDF(file);
      } else if (file.type.includes("wordprocessingml.document")) {
        extractedText = await extractTextFromDOCX(file);
      } else if (file.type.includes("presentationml.presentation")) {
        extractedText = await extractTextFromPPTX(file);
      }

      // Check if text extraction was successful
      if (!extractedText || extractedText.trim().length === 0) {
        console.warn(`No text extracted from file: ${file.name}`);
        extractedText = `[No text could be extracted from ${file.name}. The file might be scanned or contain only images.]`;
      }
    } catch (extractionError) {
      console.error("Error during text extraction:", extractionError);
      // Provide fallback text
      extractedText = `[Error extracting text from ${file.name}: ${
        extractionError instanceof Error
          ? extractionError.message
          : "Unknown extraction error"
      }]`;
    }

    // Optimize text
    const optimizedText = optimizeText(extractedText);
    const wordCount = countWords(optimizedText);
    const textHash = sha256(optimizedText);
    const compressedText = LZString.compressToUTF16(optimizedText);
    const chunks = splitIntoChunks(optimizedText, 1500);

    return {
      text: optimizedText,
      metadata: {
        hash: textHash,
        compressed: compressedText,
        filename: file.name,
        fileType: file.type,
        chunks: chunks,
        wordCount: wordCount,
      },
      success: true,
    };
  } catch (error) {
    console.error("Error processing document:", error);
    return {
      text: "",
      metadata: {
        hash: "",
        compressed: "",
        filename: file.name,
        fileType: file.type,
        chunks: [],
        wordCount: 0,
      },
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error processing document",
    };
  }
}

/**
 * Extract text from PDF using PDF.js
 * This requires PDF.js to be loaded in the client
 */
async function extractTextFromPDF(file: File): Promise<string> {
  // Dynamic import of PDF.js using a more compatible path
  try {
    // Using the non-worker version to avoid canvas issues on Vercel
    const pdfjsLib = await import("pdfjs-dist/webpack");

    // Don't set the worker source in browser environment to avoid issues
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }

    return new Promise<string>(async (resolve) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let text = "";

        // Extract text from each page
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          // Use a safer approach that doesn't rely on specific types
          let pageText = "";
          if (content && content.items) {
            // Convert each item to string safely, using type guards
            pageText = content.items
              .map((item: unknown) => {
                // Check if the item has a str property
                if (
                  typeof item === "object" &&
                  item !== null &&
                  "str" in item
                ) {
                  return (item as { str: string }).str;
                }
                return "";
              })
              .join(" ");
          }

          text += pageText + "\n\n";
        }

        resolve(text);
      } catch (error) {
        console.error("Error extracting PDF text:", error);
        // Don't reject, provide empty text instead to continue the process
        resolve("[PDF text extraction failed]");
      }
    });
  } catch (importError) {
    console.error("Error importing PDF.js:", importError);
    return "[PDF library could not be loaded]";
  }
}

/**
 * Extract text from DOCX using mammoth.js
 */
async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Dynamic import of mammoth.js
    const mammoth = await import("mammoth");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error("Error extracting DOCX text:", error);
      return "[DOCX text extraction failed]";
    }
  } catch (importError) {
    console.error("Error importing mammoth.js:", importError);
    return "[DOCX extraction library could not be loaded]";
  }
}

/**
 * Extract text from PPTX
 * Since we don't have a direct library for PPTX extraction in the browser,
 * we'll use a basic approach with JSZip to extract xml content
 */
async function extractTextFromPPTX(file: File): Promise<string> {
  try {
    // Dynamic import of JSZip
    const JSZip = (await import("jszip")).default;

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // PPTX files store slide content in ppt/slides/slide*.xml
    const slideRegex = /ppt\/slides\/slide[0-9]+\.xml/;
    const slideFiles = Object.keys(zip.files).filter((name) =>
      slideRegex.test(name)
    );

    let allText = "";

    // Extract text from each slide
    for (const slideFile of slideFiles) {
      const content = await zip.files[slideFile].async("string");

      // Simple regex to extract text from XML tags
      // This is a basic approach and won't handle all cases perfectly
      const textMatches = content.match(/<a:t>(.+?)<\/a:t>/g) || [];
      const slideText = textMatches
        .map((match) => match.replace(/<a:t>|<\/a:t>/g, ""))
        .join(" ");

      allText += slideText + "\n\n";
    }

    return allText || "[No text found in PPTX file]";
  } catch (error) {
    console.error("Error extracting PPTX text:", error);
    return "[PPTX text extraction failed]";
  }
}

/**
 * Optimize text by removing extra whitespace and normalizing
 */
function optimizeText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n\s*/g, "\n").trim();
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Split text into chunks of approximately maxTokens
 * This is a simple implementation that uses spaces as token boundaries
 */
function splitIntoChunks(text: string, maxTokens: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  for (const word of words) {
    if (currentChunk.length >= maxTokens) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
    }
    currentChunk.push(word);
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}
