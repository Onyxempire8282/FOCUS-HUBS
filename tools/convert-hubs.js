import fs from "fs";
import path from "path";
import XLSX from "xlsx";

console.clear();

const workbookPath = path.join(process.cwd(), "Update Hub List.xlsx");
const outputPath = path.join(process.cwd(), "data", "hubs-data.js");

const clean = (value) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalize = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function findHeaderRow(rows) {
  return rows.findIndex((row) => {
    const text = row.map(normalize).join(" ");
    return text.includes("hub") && text.includes("address");
  });
}

function findColumn(headers, words, fallback = -1) {
  return headers.findIndex((header) => {
    const text = normalize(header);
    return words.some((word) => text.includes(word));
  }) ?? fallback;
}

function getColumn(headers, words, fallback = -1) {
  const index = findColumn(headers, words, fallback);
  return index >= 0 ? index : fallback;
}

function extractCity(text) {
  const match = clean(text).match(/([A-Za-z .'-]+),\s*NC\b/i);
  return match ? clean(match[1]) : "";
}

function buildSearch(hub) {
  return normalize([
    hub.id,
    hub.olt,
    hub.hub,
    hub.hubNumber,
    hub.address,
    hub.city,
    hub.development,
    hub.cabinet,
    hub.pairs,
    hub.siteTitle
  ].join(" "));
}

if (!fs.existsSync(workbookPath)) {
  console.error("Update Hub List.xlsx was not found.");
  process.exit(1);
}

console.log("=================================");
console.log("       FIND MY HUB");
console.log("     Hub Converter v1");
console.log("=================================\n");

console.log("Reading workbook...\n");

const workbook = XLSX.readFile(workbookPath);
const hubs = [];

workbook.SheetNames.forEach((sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) return;

  const titleText =
    rows
      .slice(0, headerIndex)
      .flat()
      .map(clean)
      .filter(Boolean)
      .join(" ") || sheetName;

  const headers = rows[headerIndex].map(clean);

  const hubCol = getColumn(headers, ["hub"], 0);
  const addressCol = getColumn(headers, ["address"], 1);
  const developmentCol = getColumn(headers, ["development"], -1);
  const cabinetCol = getColumn(headers, ["cabinet", "capacity"], -1);
  const pairCol = getColumn(headers, ["pair"], -1);

  rows.slice(headerIndex + 1).forEach((row) => {
    const rawHub = clean(row[hubCol]);
    const address = clean(row[addressCol]);

    if (!rawHub) return;
    if (normalize(rawHub) === "hub") return;
    if (!address) return;

    const hubNumber = (rawHub.match(/\d+/) || [rawHub])[0];
    const hubLabel = rawHub.toUpperCase().startsWith("HUB")
      ? rawHub.toUpperCase()
      : `HUB ${hubNumber}`;

    const hub = {
      id: `${sheetName}-${hubNumber}`,
      olt: sheetName,
      hub: hubLabel,
      hubNumber,
      address,
      city: extractCity(titleText),
      development: developmentCol >= 0 ? clean(row[developmentCol]) : "",
      cabinet: cabinetCol >= 0 ? clean(row[cabinetCol]) : "",
      pairs: pairCol >= 0 ? clean(row[pairCol]) : "",
      siteTitle: titleText
    };

    hub.search = buildSearch(hub);
    hub.mapsQuery = clean([
      hub.address,
      hub.city,
      "NC",
      hub.olt
    ].filter(Boolean).join(" "));

    hubs.push(hub);
  });
});

const output = `window.FOCUS_HUBS = ${JSON.stringify(hubs, null, 2)};\n`;

fs.writeFileSync(outputPath, output, "utf8");

console.log(`Worksheets found: ${workbook.SheetNames.length}`);
console.log(`Hubs imported: ${hubs.length}`);
console.log(`Saved: data/hubs-data.js`);
console.log("\nDone.");