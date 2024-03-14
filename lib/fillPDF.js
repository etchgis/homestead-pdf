import * as fs from "fs";

import { PDFDocument, createPDFAcroFields } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";

import { fieldMap as createFieldMap } from "./fieldMap.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const writer = (val) => {
  console.log(val);
  const timestamp = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
  fs.appendFileSync(path.join(__dirname, "node-log.log"), "\n" + timestamp + ": " + val, "utf8");
};
/**
 * TODO map the marital status to the correct checkbox
 * @param {*} pdfURL
 * @param {*} data
 * @returns
 */

const megeApplicants = (inputArray) => {
  // writer("mergeApplicants called");
  if (inputArray.length === 0) return {};

  const applicant =
    inputArray.length === 1 ? inputArray[0] : inputArray.find((e) => !e?.applicant_coapp);
  // writer(!!applicant);
  const coApplicant =
    inputArray.length === 1 ? {} : inputArray.find((e) => e?.applicant_coapp) || {};
  // writer(coApplicant);
  if (inputArray.length > 1) {
    Object.keys(coApplicant).forEach((key) => {
      coApplicant[`co${key}`] = coApplicant[key];
      delete coApplicant[key];
    });
  }
  return { ...applicant, ...coApplicant };
};

export default async function fillPDF(inputArray, destdir) {
  // writer("fillPDF called");
  const DEBUG = process.env.DEBUG ? true : false;
  // writer({ DEBUG });
  try {
    const data = megeApplicants(inputArray);
    //const data = inputArray[0];
    // writer({ data });

    //NOTE map coapp exemptions to main exemptions since only one can be checked
    const exemptionsN = 15;
    for (let i = 1; i <= exemptionsN; i++) {
      if (i === 15) {
        if (data["coapplicant_other_benefits"]) {
          data["applicant_other_benefits"] = 1;
        }
      } else {
        if (data[`coapplicant_other_exemptions_${i}`]) {
          data[`applicant_other_exemptions_${i}`] = 1;
        }
      }
    }

    //NOTE original URL "https://floridarevenue.com/property/documents/dr501.pdf";
    const formPdfBytes = readFileSync(path.join(__dirname, "dr501.pdf"));
    // writer("loaded pdf");
    const pdfDoc = await PDFDocument.load(formPdfBytes);
    // writer("read pdf");

    const form = pdfDoc.getForm();

    const fields = form.getFields();

    // write the field names into the field so we know what they are
    fields.forEach((field) => {
      try {
        field.setFontSize(8);
        // field.setText(field.getName());
        // console.log({ field: field.getName(), type: field.constructor.name });
      } catch (error) {
        return;
      }
    });

    //----[STATE]--------------------------------
    let initialDropdown = false;
    let initialSignature = false;
    //-------------------------------------------

    //NOTE homestead exemption NEW
    const homesteadExemption = form.getCheckBox("homestead exemption");
    homesteadExemption.check();

    //NOTE marital status
    const separatedBox = form.createCheckBox("marital.status.separated");
    separatedBox.addToPage(pdfDoc.getPage(0), {
      x: 350,
      y: 496.2,
      width: 9,
      height: 9,
    });
    pdfDoc.getPage(0).drawText("Separated", { x: 362, y: 498, size: 9 });
    if (data.applicant_marital === "P") separatedBox.check();
    separatedBox.enableReadOnly();

    const k = form.getCheckBox("marital status").acroField.Kids();

    k.array.forEach((_, i) => {
      const clickableCheckbox = form.createCheckBox("marital status-" + i);
      const status = ["S", "M", "D", "W"];
      const maritalStatus = data.applicant_marital;
      if (maritalStatus === status[i]) clickableCheckbox.check();
      const x = [148.2, 192, 240, 293.2];
      clickableCheckbox.addToPage(pdfDoc.getPage(0), {
        x: x[i],
        y: 496.2,
        width: 9,
        height: 9,
      });
    });

    //NOTE residency other radio buttons mark with X
    const residencyOtherY = 636;
    if (data.applicant_residency_other === 1) {
      pdfDoc.getPage(0).drawText("X", { x: 345, y: residencyOtherY, size: 10 });
    }
    if (data.applicant_residency_other === 0) {
      pdfDoc.getPage(0).drawText("X", { x: 379, y: residencyOtherY, size: 10 });
    }
    if (data.coapplicant_residency_other === 1) {
      pdfDoc.getPage(0).drawText("X", { x: 493, y: residencyOtherY, size: 10 });
    }
    if (data.coapplicant_residency_other === 0) {
      pdfDoc.getPage(0).drawText("X", { x: 527, y: residencyOtherY, size: 10 });
    }

    //NOTE previous homestead
    if (data.applicant_previous_homestead === 1 || data.coapplicant_previous_homestead === 1) {
      const prevHomestead = form.getCheckBox("undefined_5");
      prevHomestead.check();
    }
    if (data.applicant_previous_homestead === 0 && data.coapplicant_previous_homestead === 0) {
      const prevHomestead = form.getCheckBox("undefined_6");
      prevHomestead.check();
    }

    //NOTE previous address
    const prevAddress = form.getTextField("Previous address");
    if (data.applicant_previous_homestead_address || data.coapplicant_previous_homestead_address) {
      prevAddress.setText(
        data.applicant_previous_homestead_address || data.coapplicant_previous_homestead_address
      );
    }
    if (
      (!data.applicant_previous_homestead_address &&
        !data.coapplicant_previous_homestead_address &&
        data.applicant_previous_address) ||
      data.coapplicant_previous_address
    ) {
      prevAddress.setText(data.applicant_previous_address || data.coapplicant_previous_address);
    }

    //NOTE loop through the rest of the fields
    const fieldMap = createFieldMap();
    fieldMap.forEach((field) => {
      const pdfField = fields.find((f) => f.getName() === field.field_name);
      if (!pdfField && DEBUG) {
        console.log(`Field ${field.field_name} not found`);
        return;
      }
      if (field.field_name === "Previous address") return;
      // console.log(`Field ${field.field_name} found`);
      const fieldType = pdfField.constructor.name;

      // console.log({ fieldType });

      //DEBUG
      const rawValue =
        data[field.field_db] === 0 ? data[field.field_db] : data[field.field_db] || "";
      let value = field?.fn ? field.fn(rawValue) : rawValue;

      if (field.field_db === "application_parcel" && data?.application_pid) {
        value = value + " | " + data.application_pid;
      }

      switch (fieldType) {
        case "PDFTextField":
          pdfField.setFontSize(8);
          if (
            field.field_name.includes("IRS") ||
            field.field_name.includes("dateBank") ||
            field.field_name.includes("owners") ||
            field.field_name.includes("Date of deed") ||
            field.field_name.includes("Book")
          ) {
            pdfField.setFontSize(7);
          }
          if (DEBUG) console.log({ value });
          pdfField.setText(value ? value.toString() : "");
          break;
        case "PDFCheckBox":
          if (DEBUG) console.log(field.field_name);
          if (!field.field_name.includes("undefined")) {
            if (value === 1) {
              pdfField.check();
              pdfField.enableReadOnly();
            }
          }
          break;
        case "PDFRadioGroup":
          if (DEBUG) console.log("Radio group found!");
          break;
        case "PDFDropdown":
          if (initialDropdown) break;
          pdfField.setOptions(["Putnam"]);
          pdfField.select("Putnam");
          initialDropdown = true;
          break;
        case "PDFSignature":
          if (DEBUG) console.log("Signature field found!");
          const page = pdfDoc.getPage(1);
          if (initialSignature) {
            page.drawText(data?.coapplicant_signature || "", { x: 325, y: 180, size: 12 });
            break;
          }
          page.drawText(data?.applicant_signature || "", { x: 50, y: 180, size: 12 });
          initialSignature = true;
          break;
        default:
          if (DEBUG) console.log(`Field type ${fieldType} not recognized`);
          pdfField.setTextSize(8);

          pdfField.setText(value.toString());
          break;
      }
    });

    try {
      fields.forEach((field) => {
        field.enableReadOnly();
      });
    } catch (error) {
      console.error(error);
    }
    form.flatten();
    const file = await pdfDoc.save();
    // writer("saved");

    //i want the date to be YYYY-MM-DD
    const DESTDIR = destdir || "c:/inetpub/internal/homestead-admin/applications";
    //const formattedDate = date.split("/")[2] + "-" + date.split("/")[0] + "-" + date.split("/")[1];
    const _date = new Date();
    const formattedDate = _date.toISOString().split("T")[0];
    const destination = path.join(
      DESTDIR,
      "homestead-" + formattedDate + "-" + data?.application_serial + ".pdf"
    );
    writeFileSync(destination, file);
    writer(destination);
    return destination;
  } catch (error) {
    console.error(error.toString());
    const timestamp = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
    fs.appendFileSync(
      path.join(__dirname, "error-log.log"),
      "\n" + timestamp + ": " + error.toString(),
      "utf8"
    );
    return false;
  }
}
