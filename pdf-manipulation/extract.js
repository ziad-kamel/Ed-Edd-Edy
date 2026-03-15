const fs = require("fs");
const PDFParser = require("pdf2json");
const { PDFDocument, rgb } = require("pdf-lib");

async function extractText(inputPath, outputPath) {
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

    const s = textObjects.findIndex((obj) =>
      obj.text.includes("ﻂﻘﻓ ﻱﺭﻮﻓ ﻁﺎﺸﻨﻟ - ﻩﺂﺸﻨﻣ ﻰﻠﻋ (ﻲﺳﺪﻨﻫ/ﻲﻨﻓ) ﻒﺸﻛ ﺮﻳﺮﻘﺗ"),
    );
    const t = textObjects.findIndex((obj) => obj.text.includes("ﻒﺸﻜﻟﺍ ﺦﻳﺭﺎﺗ"));
    console.log(textObjects[s - 1]);
    console.log(textObjects[t]);
    console.log(textObjects[t + 1]);
  } catch (err) {
    console.error("Error:", err);
  }
}

extractText(
  "/home/zmk/Desktop/baileys/recived/مقهى الخيل الأبيض الراقي التجارية_2026-03-14_16-05-31.pdf",
  "output_boxed.pdf",
);
