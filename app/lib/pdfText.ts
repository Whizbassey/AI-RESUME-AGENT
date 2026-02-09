export async function extractTextFromPDF(blob: Blob): Promise<string> {
  if (typeof window === "undefined") return "";

  // Import pdf.js
  const pdfjsLib = await import("pdfjs-dist");

  // ✅ Correct worker setup for v5.x
  const workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  // Read the file as ArrayBuffer
  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

  const pdf = await loadingTask.promise;

  let textContent = "";

  // Loop through each page and extract text
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    textContent += text.items.map((item: any) => item.str).join(" ");
  }

  return textContent;
}
