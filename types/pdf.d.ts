declare module "pdfjs-dist/webpack" {
  interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  interface PDFPageProxy {
    getTextContent(): Promise<PDFTextContent>;
  }

  interface PDFTextContent {
    items: PDFTextItem[];
  }

  interface PDFTextItem {
    str: string;
    [key: string]: unknown;
  }

  interface GetDocumentParameters {
    data: ArrayBuffer;
    [key: string]: unknown;
  }

  interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export function getDocument(
    params: GetDocumentParameters
  ): PDFDocumentLoadingTask;

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export const version: string;
}
