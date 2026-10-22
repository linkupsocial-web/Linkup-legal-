import assert from "node:assert/strict";
import Module from "node:module";

const moduleLoader = Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const originalLoad = moduleLoader._load;
const originalEnvironment = {
  clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  sheetName: process.env.GOOGLE_SHEET_Name,
};

const calls: Array<{ method: string; input: Record<string, unknown> }> = [];
const sheetsClient = {
  spreadsheets: {
    get: async (input: Record<string, unknown>) => {
      calls.push({ method: "spreadsheets.get", input });
      return { data: { sheets: [{ properties: { title: "Ads Landing Leads" } }] } };
    },
    values: {
      get: async (input: Record<string, unknown>) => {
        calls.push({ method: "values.get", input });
        return {
          data: {
            values: [[
              "Timestamp", "Full Name", "Mobile Number", "Email", "City", "Selected Service", "Landing Page", "Lead Source",
              "UTM Source", "UTM Medium", "UTM Campaign", "UTM Content", "UTM Term", "gclid", "fbclid", "Requirement",
            ]],
          },
        };
      },
      update: async (input: Record<string, unknown>) => {
        calls.push({ method: "values.update", input });
        return { data: {} };
      },
      append: async (input: Record<string, unknown>) => {
        calls.push({ method: "values.append", input });
        return { data: {} };
      },
    },
  },
};

class GoogleAuth {
  constructor(readonly options: unknown) {}
}

moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "server-only") return {};
  if (request === "googleapis") {
    return {
      google: {
        auth: { GoogleAuth },
        sheets: () => sheetsClient,
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

const lead = {
  timestamp: "2026-01-01T00:00:00.000Z",
  fullName: "Test User",
  phone: "+919876543210",
  email: "test@example.com",
  city: "Pune",
  selectedService: "GST Registration",
  landingPage: "gst-registration",
  leadSource: "landing_page:gst-registration",
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "test",
  utmContent: "",
  utmTerm: "",
  gclid: "",
  fbclid: "",
  requirement: "Test requirement",
};

function restoreEnvironment() {
  if (originalEnvironment.clientEmail === undefined) delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  else process.env.GOOGLE_SHEETS_CLIENT_EMAIL = originalEnvironment.clientEmail;
  if (originalEnvironment.privateKey === undefined) delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  else process.env.GOOGLE_SHEETS_PRIVATE_KEY = originalEnvironment.privateKey;
  if (originalEnvironment.spreadsheetId === undefined) delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  else process.env.GOOGLE_SHEETS_SPREADSHEET_ID = originalEnvironment.spreadsheetId;
  if (originalEnvironment.sheetName === undefined) delete process.env.GOOGLE_SHEET_Name;
  else process.env.GOOGLE_SHEET_Name = originalEnvironment.sheetName;
}

async function main() {
  try {
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL = "landing@example.iam.gserviceaccount.com";
    process.env.GOOGLE_SHEETS_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----";
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "landing-sheet-id";
    process.env.GOOGLE_SHEET_Name = "Ads Landing Leads";

    const { submitLandingLeadToGoogleSheet, verifyLandingGoogleSheetAccess } = await import("./landing-google-sheets.service.js");
    await verifyLandingGoogleSheetAccess();
    await submitLandingLeadToGoogleSheet(lead);

    const append = calls.find((call) => call.method === "values.append");
    assert.ok(append);
    assert.equal(append.input.spreadsheetId, "landing-sheet-id");
    assert.equal(append.input.range, "'Ads Landing Leads'!A:AZ");
    assert.deepEqual((append.input.requestBody as { values: string[][] }).values[0], Object.values(lead));
  } finally {
    restoreEnvironment();
    moduleLoader._load = originalLoad;
  }

  console.log("landing Google Sheets delivery: OK");
}

void main().catch((error) => {
  restoreEnvironment();
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});
