import assert from "node:assert/strict";
import { parseCrmServiceImportRecord } from "./crm-service-csv";

const disabled = parseCrmServiceImportRecord({ Title: "Disabled Registration", Status: "Disabled" });
assert.equal(disabled?.status, "disabled");
assert.equal(disabled?.id, undefined);

assert.equal(parseCrmServiceImportRecord({ Title: "Active Filing", Status: "Active" })?.status, "available");
assert.equal(parseCrmServiceImportRecord({ Title: "Coming Soon License", Status: "Coming Soon" })?.status, "coming-soon");

const csvContent = parseCrmServiceImportRecord({
  Title: "CSV Content",
  ID: "legacy-sheet-id",
  Image: "/services/placeholders/csv-content.svg",
  Features: "Document review\nDocument review\nFiling guidance",
  "Required Documents": "PAN Card|PAN Card|Address proof",
});

assert.equal(csvContent?.id, "legacy-sheet-id");
assert.equal(csvContent?.image, "/services/placeholders/csv-content.svg");
assert.deepEqual(csvContent?.features, ["Document review", "Filing guidance"]);
assert.deepEqual(csvContent?.requiredDocuments, ["PAN Card", "Address proof"]);

console.log("CRM service CSV parsing: OK");
