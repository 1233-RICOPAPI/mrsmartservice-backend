declare module 'pdfkit' {
  interface PDFDocumentOptions {
    margin?: number;
  }
  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    on(event: 'data' | 'end' | 'error', cb: (chunk?: Buffer) => void): this;
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, options?: { align?: string; continued?: boolean }): this;
    text(text: string, x: number, y: number, options?: { align?: string; continued?: boolean }): this;
    moveDown(n?: number): this;
    addPage(): this;
    end(): void;
    y: number;
  }
  export default PDFDocument;
}
