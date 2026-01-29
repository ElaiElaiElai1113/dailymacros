import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface PdfOptions {
  filename?: string;
  scale?: number;
  useCORS?: boolean;
}

/**
 * Generate a PDF from a DOM element by capturing it as an image using html2canvas
 * and embedding it in a PDF using jsPDF.
 *
 * @param element - The DOM element to capture
 * @param options - Configuration options
 * @returns Promise that resolves when PDF is generated
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  options: PdfOptions = {}
): Promise<void> {
  const {
    filename = "download.pdf",
    scale = 2, // Higher scale = better quality
    useCORS = true,
  } = options;

  try {
    // Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale,
      useCORS,
      backgroundColor: "#ffffff",
      logging: false,
    } as any);

    // Get the canvas dimensions
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Create PDF with dimensions matching the element
    // Convert pixels to points (1px = 0.75 points at 96 DPI)
    const pdfWidth = imgWidth * 0.75;
    const pdfHeight = imgHeight * 0.75;

    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
      unit: "pt",
      compress: true,
    });

    // Add the image to the PDF
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    throw new Error("Failed to generate PDF. Please try again.");
  }
}

/**
 * Check if the current device is likely mobile (for UI decisions)
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Generate PDF and handle mobile-specific behavior
 * On mobile, may show a toast or different UX
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  options: PdfOptions = {}
): Promise<void> {
  const isMobile = isMobileDevice();

  if (isMobile) {
    // Mobile: show a brief loading indicator could be added here
    // For now, the browser will handle the download
  }

  await generatePdfFromElement(element, options);
}
