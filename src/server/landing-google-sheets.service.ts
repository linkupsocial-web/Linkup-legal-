import "server-only";

import { google } from "googleapis";

const LANDING_SHEET_HEADERS = [
  "Timestamp",
  "Full Name",
  "Phone",
  "Email",
  "City",
  "Selected Service",
  "Landing Page",
  "Lead Source",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Content",
  "UTM Term",
  "gclid",
  "fbclid",
  "Requirement",
] as const;

export type LandingGoogleSheetLead = {
  timestamp: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  selectedService: string;
  landingPage: string;
  leadSource: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  gclid: string;
  fbclid: string;
  requirement?: string;
};

type LandingSheetConfig = {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  sheetName: string;
};

export class LandingGoogleSheetsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LandingGoogleSheetsError";
  }
}

function normalizePrivateKey(value: string): string {
  let key = value.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith("\`") && key.endsWith("\`"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}

function getLandingSheetConfig(): LandingSheetConfig {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim() ?? "";
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? "");
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() ?? "";
  const sheetName = (process.env.GOOGLE_SHEET_Name ?? process.env.GOOGLE_SHEETS_SHEET_NAME ?? "").trim();

  if (!clientEmail || !privateKey || !spreadsheetId || !sheetName) {
    throw new LandingGoogleSheetsError("Lead submissions are temporarily unavailable. Please try again shortly.");
  }

  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----")) {
    throw new LandingGoogleSheetsError("Lead submissions are temporarily unavailable. Please try again shortly.");
  }

  return { clientEmail, privateKey, spreadsheetId, sheetName };
}

function formatSheetTitleForRange(title: string): string {
  const escaped = title.replace(/'/g, "''");
  return /[\s!:'"]/u.test(title) ? "'" + escaped + "'" : escaped;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getCellValue(header: string, lead: LandingGoogleSheetLead): string {
  const key = normalizeHeader(header);
  if (["timestamp", "submittedat", "createdat", "date", "datetime"].includes(key)) return lead.timestamp;
  if (["fullname", "name", "customername"].includes(key)) return lead.fullName;
  if (["phone", "phoneno", "phonenumber", "mobile", "mobileno", "mobilenumber", "mobilephone", "contact", "contactnumber", "whatsappnumber"].includes(key)) return lead.phone;
  if (["email", "mail"].includes(key)) return lead.email;
  if (["city", "location"].includes(key)) return lead.city;
  if (["selectedservice", "service", "servicetitle", "servicename"].includes(key)) return lead.selectedService;
  if (["landingpage", "landingpagepath"].includes(key)) return lead.landingPage;
  if (["leadsource", "source"].includes(key)) return lead.leadSource;
  if (key === "utmsource") return lead.utmSource;
  if (key === "utmmedium") return lead.utmMedium;
  if (key === "utmcampaign") return lead.utmCampaign;
  if (key === "utmcontent") return lead.utmContent;
  if (key === "utmterm") return lead.utmTerm;
  if (key === "gclid") return lead.gclid;
  if (key === "fbclid") return lead.fbclid;
  if (["requirement", "notes", "message", "remarks", "comment"].includes(key)) return lead.requirement ?? "";
  return "";
}

function getGoogleApiErrorDetails(error: unknown) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const response = typeof record.response === "object" && record.response !== null
    ? (record.response as Record<string, unknown>)
    : {};

  return {
    errorName: error instanceof Error ? error.name : "UnknownError",
    code: typeof record.code === "number" || typeof record.code === "string" ? record.code : null,
    status: typeof response.status === "number" ? response.status : null,
  };
}

async function getLandingSheetsClient(config: LandingSheetConfig) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function verifyLandingGoogleSheetAccess() {
  try {
    const config = getLandingSheetConfig();
    const sheets = await getLandingSheetsClient(config);
    const response = await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
      fields: "sheets(properties(title))",
    });
    const sheetExists = (response.data.sheets ?? []).some((sheet) => sheet.properties?.title === config.sheetName);

    if (!sheetExists) {
      throw new LandingGoogleSheetsError("The configured landing sheet tab could not be found.");
    }
  } catch (error) {
    if (error instanceof LandingGoogleSheetsError) throw error;
    console.error("landing_google_sheet_access_check_failed", getGoogleApiErrorDetails(error));
    throw new LandingGoogleSheetsError("Lead submissions are temporarily unavailable. Please try again shortly.");
  }
}

export async function submitLandingLeadToGoogleSheet(lead: LandingGoogleSheetLead) {
  try {
    const config = getLandingSheetConfig();
    const sheets = await getLandingSheetsClient(config);
    const rangeTitle = formatSheetTitleForRange(config.sheetName);
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: rangeTitle + "!A1:AZ1",
    });
    let headers = headerResponse.data.values?.[0]?.map((cell) => String(cell ?? "").trim()) ?? [];

    if (headers.length === 0 || headers.every((header) => !header)) {
      headers = [...LANDING_SHEET_HEADERS];
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: rangeTitle + "!A1:P1",
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: rangeTitle + "!A:AZ",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [headers.map((header) => getCellValue(header, lead))],
      },
    });
  } catch (error) {
    if (error instanceof LandingGoogleSheetsError) throw error;
    console.error("landing_google_sheet_append_failed", getGoogleApiErrorDetails(error));
    throw new LandingGoogleSheetsError("We could not submit your request. Please try again.");
  }
}
