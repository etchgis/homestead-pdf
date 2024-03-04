import fillPDF from "./lib/fillPDF.js";

//we need the json array and the destination from the cli params
const argv = process.argv.slice(2);
const [json, dest] = argv;

export default async function HomesteadPDF () {
  let data;

  try {
    data = JSON.parse(json);  
  } catch (error) {
    console.error('Error parsing JSON', error);
  }

  if (!data) {
    try {
      data = JSON.parse(decodeURIComponent(json));
    } catch (error) {
      console.error('Error parsing JSON II', error);
    }
  }
  
  const created = await fillPDF(data, dest);
  console.log({ created });
  return created;
}
