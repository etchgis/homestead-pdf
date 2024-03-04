import fillPDF from "../lib/fillPDF.js";

import sampleData from "../lib/sampleData.json" assert { type: "json" };


(async () => {
  const created = await fillPDF(sampleData);
  console.log({ created });
})();
