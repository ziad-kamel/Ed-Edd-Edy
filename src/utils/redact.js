const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const { execSync } = require("child_process");
const path = require("path");
const PDFParser = require("pdf2json");

async function redactPDF(inputPath, outputPath) {
  console.log(`Analyzing ${inputPath} and converting to image...`);

  // 1. Extract Text Data to find coordinates
  const pdfParser = new PDFParser();
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

    // Find indices for target rows
    const s = textObjects.findIndex((obj) =>
      obj.text.includes("ﻂﻘﻓ ﻱﺭﻮﻓ ﻁﺎﺸﻨﻟ - ﻩﺂﺸﻨﻣ ﻰﻠﻋ (ﻲﺳﺪﻨﻫ/ﻲﻨﻓ) ﻒﺸﻛ ﺮﻳﺮﻘﺗ"),
    );
    const t = textObjects.findIndex((obj) => obj.text.includes("ﻒﺸﻜﻟﺍ ﺦﻳﺭﺎﺗ"));

    // Extract Y values dynamically
    // greenishX comes from the line above 'ﻂﻘﻓ ﻱﺭﻮﻓ ﻁﺎﺸﻨﻟ...'
    const greenishY = textObjects[s - 1].y;
    // greyishX comes from 'ﻒﺸﻜﻟﺍ ﺦﻳﺭﺎﺗ'
    const greyishY = textObjects[t].y;
    // lightGreyishX comes from the line below 'ﻒﺸﻜﻟﺍ ﺦﻳﺭﺎﺗ'
    const lightGreyishY = textObjects[t + 1].y;

    console.log(
      `Detected coordinates: Greenish=${greenishY}, Greyish=${greyishY}, LightGreyish=${lightGreyishY}`,
    );

    // 2. Load the original PDF to get size for rasterization
    const originalPdfBytes = fs.readFileSync(inputPath);
    const originalDoc = await PDFDocument.load(originalPdfBytes);
    const pages = originalDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // 3. Rasterization (Convert original file to PNG)
    const tempPrefix = path.join(
      path.dirname(outputPath),
      `temp_${Date.now()}`,
    );
    const tempPng = `${tempPrefix}.png`;

    console.log("Flattening original PDF to single image (Rasterizing)...");
    try {
      execSync(
        `pdftoppm -png -singlefile -r 300 "${inputPath}" "${tempPrefix}"`,
      );

      // 4. Create a brand new PDF document
      const newPdf = await PDFDocument.create();
      const pngBytes = fs.readFileSync(tempPng);
      const embeddedPng = await newPdf.embedPng(pngBytes);

      const newPage = newPdf.addPage([width, height]);

      // 5. Draw the rasterized page as a background image
      newPage.drawImage(embeddedPng, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });

      // 6. DRAW BOXES ON TOP OF THE IMAGE
      const scale = 16;

      // Greenish Header Box
      newPage.drawRectangle({
        x: 0,
        y: height - (greenishY + 1) * scale,
        width: 220,
        height: 90,
        color: rgb(0.467, 0.765, 0.663),
        opacity: 1,
      });

      // Greyish details
      newPage.drawRectangle({
        x: 0,
        y: height - (greyishY + 1) * scale,
        width: width,
        height: 15,
        color: rgb(0.941, 0.941, 0.941),
        opacity: 1,
      });

      // Light grey details
      newPage.drawRectangle({
        x: 0,
        y: height - (lightGreyishY + 1) * scale,
        width: width,
        height: 15,
        color: rgb(0.976, 0.976, 0.976),
        opacity: 1,
      });

      // 7. Save the final PDF
      const finalPdfBytes = await newPdf.save();
      fs.writeFileSync(outputPath, finalPdfBytes);
      console.log(`Success! Redacted & Flattened PDF saved to: ${outputPath}`);

      // Final cleanup
      if (fs.existsSync(tempPng)) fs.unlinkSync(tempPng);
    } catch (err) {
      console.error("Rasterization flow failed.", err);
      throw err;
    }
  } catch (err) {
    console.error("Error during redaction processing:", err);
    throw err;
  }
}

module.exports = { redactPDF };
