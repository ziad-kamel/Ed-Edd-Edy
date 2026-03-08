const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const { execSync } = require("child_process");
const path = require("path");

async function redactPDF(inputPath, outputPath) {
  console.log(`Analyzing ${inputPath} to extract and redact text objects...`);

  try {
    // 2. Load with pdf-lib to draw
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const scale = 12;

    // --- YOUR HARDCODED BOXES ---
    const rectWid = 220;
    const rectHeight = 45;

    firstPage.drawRectangle({
      x: 4,
      y: height - rectHeight - 70,
      width: rectWid,
      height: rectHeight,
      borderColor: rgb(1, 0, 0),
      color: rgb(0.467, 0.765, 0.663),
      opacity: 1,
    });

    firstPage.drawRectangle({
      x: 125,
      y: 201,
      width: rectWid + 65,
      height: 15,
      borderColor: rgb(1, 0, 0),
      color: rgb(0.941, 0.941, 0.941),
      opacity: 1,
    });

    firstPage.drawRectangle({
      x: 125,
      y: 180,
      width: rectWid + 65,
      height: 15,
      borderColor: rgb(1, 0, 0),
      color: rgb(0.976, 0.976, 0.976),
      opacity: 1,
    });

    // --- RASTERIZATION STEP ---
    const tempPdf = path.join(
      path.dirname(outputPath),
      `temp_${Date.now()}.pdf`,
    );
    const tempPngPrefix = path.join(
      path.dirname(outputPath),
      `temp_${Date.now()}`,
    );

    // Save current state as intermediate PDF
    const intermediateBytes = await pdfDoc.save();
    fs.writeFileSync(tempPdf, intermediateBytes);

    console.log("Flattening PDF to image (Rasterizing)...");
    try {
      execSync(`pdftoppm -png -singlefile -r 300 ${tempPdf} ${tempPngPrefix}`);
      const tempPng = `${tempPngPrefix}.png`;

      const flattenedDoc = await PDFDocument.create();
      const pngBytes = fs.readFileSync(tempPng);
      const embeddedPng = await flattenedDoc.embedPng(pngBytes);

      const newPage = flattenedDoc.addPage([width, height]);
      newPage.drawImage(embeddedPng, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });

      const finalPdfBytes = await flattenedDoc.save();
      fs.writeFileSync(outputPath, finalPdfBytes);
      console.log(`Success! Rasterized PDF saved to: ${outputPath}`);

      // Clean up temp files
      if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
      if (fs.existsSync(tempPng)) fs.unlinkSync(tempPng);
    } catch (err) {
      console.error(
        "Rasterization failed. Check if 'pdftoppm' is installed.",
        err,
      );
      fs.writeFileSync(outputPath, intermediateBytes);
      if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
    }
  } catch (err) {
    console.error("Error during redaction:", err);
    throw err;
  }
}

module.exports = { redactPDF };
