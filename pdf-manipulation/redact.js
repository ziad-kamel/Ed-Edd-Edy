const fs = require("fs");
const PDFParser = require("pdf2json");
const { PDFDocument, rgb } = require("pdf-lib");

async function redactPDF(inputPath, outputPath) {
  console.log(`Analyzing ${inputPath} to extract and redact text objects...`);

  const pdfParser = new PDFParser();

  // 1. Extract Text Data
  const getPDFData = () =>
    new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData) =>
        reject(errData.parserError),
      );
      pdfParser.on("pdfParser_dataReady", (pdfData) => resolve(pdfData));
      pdfParser.loadPDF(inputPath);
    });

  try {
    const pdfData = await getPDFData();
    const pageData = pdfData.Pages[0];

    // Convert all text items to objects
    const textObjects = pageData.Texts.map((t) => ({
      text: decodeURIComponent(t.R[0].T),
      x: t.x,
      y: t.y,
      w: t.w,
    }));

    // Filter to specific targets (or change this to include all if desired)
    const filteredObjects = textObjects.filter(
      (obj) => obj.text === ":ﻝﺍﻮﺠﻟﺍ ﻢﻗﺭ",
    );

    console.log(`Found ${filteredObjects.length} objects to redact.`);

    // 2. Load with pdf-lib to draw
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // pdf2json units are typically 1/12th of an inch or roughly scaled.
    // We'll calculate a scale factor based on the PDF points vs pdf2json units.
    const scaleX = 12;
    const scaleY = 12;

    // pdf2json vs pdf-lib conversion constants
    // pdf2json units are roughly 1/12th of an inch (1 unit = 12 points)
    const scale = 12;

    filteredObjects.forEach((obj) => {
      console.log(
        `Drawing box around: "${obj.text}" at x:${obj.x}, y:${obj.y}`,
      );

      // 1. Convert Width and Height to points
      const rectW = obj.w * scale;
      const rectH = 15; // Standard height for a single line

      // 2. CONVERSION LOGIC (Top-Left Origin to Bottom-Left Origin)

      // Starting point is (obj.x, obj.y)
      // Extend LEFT: rectX = (x * 12) - width
      const rectX = obj.x * scale;

      // Extend UP: In pdf-lib, the 'y' coordinate IS the bottom.
      // So height - (y * 12) gives us the anchor point, and drawRectangle grows UP by 'height'.
      const rectY = height - obj.y * scale;

      //   firstPage.drawRectangle({
      //     x: rectX,
      //     y: rectY,
      //     width: rectW,
      //     height: rectH,
      //     borderColor: rgb(1, 0, 0),
      //     borderWidth: 1,
      //     color: rgb(1, 1, 0), // Yellow fill for verification
      //     opacity: 0.4,
      //   });
    });
    const rectWid = 220;
    const rectHeight = 45;
    firstPage.drawRectangle({
      x: 4,
      y: height - rectHeight - 70,
      width: rectWid,
      height: rectHeight,
      borderColor: rgb(1, 0, 0),
      //   borderWidth: 1,
      color: rgb(0.467, 0.765, 0.663), // Converted from #77c3a9 (119, 195, 169)
      opacity: 1,
    });

    firstPage.drawRectangle({
      x: 125,
      y: 201,
      width: rectWid + 65,
      height: 15,
      borderColor: rgb(1, 0, 0),
      //   borderWidth: 1,
      color: rgb(0.941, 0.941, 0.941), // Converted from #F9F9F9 (249, 249, 249)
      opacity: 1,
    });
    firstPage.drawRectangle({
      x: 125,
      y: 180,
      width: rectWid + 65,
      height: 15,
      borderColor: rgb(1, 0, 0),
      //   borderWidth: 1,
      color: rgb(0.976, 0.976, 0.976), // Converted from #77c3a9 (119, 195, 169)
      opacity: 1,
    });
    // --- RASTERIZATION STEP ---
    const { execSync } = require("child_process");
    const tempPdf = "temp_step1.pdf";
    const tempPngPrefix = "temp_step2"; // pdftoppm adds .png or -1.png

    // Save current state as intermediate PDF
    const intermediateBytes = await pdfDoc.save();
    fs.writeFileSync(tempPdf, intermediateBytes);

    console.log("Flattening PDF to image (Rasterizing)...");
    try {
      // -r 300 is high resolution for printing quality
      // -singlefile ensures it creates temp_step2.png correctly
      execSync(`pdftoppm -png -singlefile -r 300 ${tempPdf} ${tempPngPrefix}`);
      const tempPng = `${tempPngPrefix}.png`;

      // 4. Create a fresh PDF and embed the PNG
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
      fs.unlinkSync(tempPdf);
      fs.unlinkSync(tempPng);
    } catch (err) {
      console.error(
        "Rasterization failed. Check if 'pdftoppm' is installed.",
        err,
      );
      // Fallback: save at least the unrasterized version
      fs.writeFileSync(outputPath, intermediateBytes);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

// Run the function
redactPDF("m.pdf", "output_boxed.pdf");
