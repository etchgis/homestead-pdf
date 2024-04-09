import { readFileSync, writeFileSync } from "fs";

import { jsPDF } from "jspdf";

(async () => {
  const logo = readFileSync("logo.jpg");
  const img = new Image();
  img.src = "assets/sample.png";

  // const formPdfBytes = readFileSync("./test.pdf");
  // const pdfDoc = await PDFDocument.load(formPdfBytes);
  const pdf = new jsPDF();
  pdf.loadFile("test.pdf");
  pdf.addImage(img, "png", 10, 78, 12, 15);
  pdf.save("converted.pdf");
})();
