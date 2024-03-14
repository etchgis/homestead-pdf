import * as fs from "fs";

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import fillPDF from "./lib/fillPDF.js";
import path from "path";

dotenv.config();
const DEBUG = process.env.DEBUG ? true : false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const [id] = argv;
if (DEBUG) console.log({ id, __dirname });

(async () => {
  try {
    const data = process.env.DEV
      ? JSON.parse(fs.readFileSync(path.join(__dirname, "lib/sampleData.json")))
      : JSON.parse(
          JSON.parse(fs.readFileSync(`c:/inetpub/internal/homestead-admin/applications/${id}.json`))
        );
    if (DEBUG) console.log({ data });
    const created = await fillPDF(data, process.env.DESTDIR);
    console.log({ created });
    if (created && !process.env.DEV) {
      const DESTDIR = process.env.DESTDIR || "c:/inetpub/internal/homestead-admin/applications";
      fs.unlinkSync(path.join(DESTDIR, `${id}.json`));
    }
  } catch (error) {
    console.error(error.toString());
    const timestamp = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
    fs.appendFileSync(
      path.join(__dirname, "error-log.log"),
      "\n" + timestamp + ": " + error.toString(),
      "utf8"
    );
  }
})();
