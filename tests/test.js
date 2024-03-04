import fillPDF from "../lib/fillPDF.js";
import { existsSync, unlinkSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import sampleData from "../lib/sampleData.json" assert { type: "json" };
import { fieldMap } from "../lib/fieldMap.js";

(async () => {
  const fields = fieldMap();
  if (existsSync("test.pdf")) {
    unlinkSync("test.pdf");
  }

  if (existsSync("./tests/exports")) {
    const files = readdirSync("./tests/exports");
    files.forEach((file) => {
      unlinkSync(`./tests/exports/${file}`);
    });
  } else {
    mkdirSync("./tests/exports", { recursive: true });
  }

  const iterations = 15;
  for (let i = 1; i <= iterations; i++) {
    const clone = JSON.parse(JSON.stringify(sampleData));
    if (i === 15) {
      clone[0]["applicant_other_benefits"] = 1;
    } else {
      clone[0][`applicant_other_exemptions_${i}`] = 1;
    }
    const fieldName =
      i < 15
        ? fields.find((f) => f.field_db === `applicant_other_exemptions_${i}`)?.field_name
        : "applicant_other_benefits";
    const created = await fillPDF(clone, `./tests/exports/test-exemption-${i}-${fieldName}.pdf`);
    console.log({ created });
  }
})();
