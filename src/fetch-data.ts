import { DOMParser } from "@xmldom/xmldom";
import { Currency, CurrencyTable, isCurrency } from "./currency";

const EURO_FX_REF =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

function getAllCurrencies(doc: Document): {
  time: string;
  data: CurrencyTable;
} {
  const cubes = doc.getElementsByTagName("Cube");
  let currencies: CurrencyTable = { EUR: 1 };
  let time = "";

  for (let i = 0; i < cubes.length; i++) {
    const cube = cubes[i];
    if (cube.hasAttribute("time")) time = cube.getAttribute("time");

    if (cube.hasAttribute("currency") && cube.hasAttribute("rate")) {
      const currency = cube.getAttribute("currency");
      if (isCurrency(currency)) {
        currencies[currency as Currency] = parseFloat(
          cube.getAttribute("rate")
        );
      }
    }
  }

  return { time, data: currencies };
}

(async () => {
  try {
    const result = await fetch(EURO_FX_REF, {
      signal: AbortSignal.timeout(5000),
    });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(await result.text());
    const currencies = getAllCurrencies(xmlDoc);
    console.log(JSON.stringify(currencies));
  } catch (err) {
    console.error(`Error: type: ${err.name}, message: ${err.message}`);
  }
})();
