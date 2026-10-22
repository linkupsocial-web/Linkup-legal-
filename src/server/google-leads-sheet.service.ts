import "server-only";

import { google } from "googleapis";

type LeadSheetPayload = {
  requestId?: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  serviceTitle: string;
  eventId?: string;
  agent?: string;
  status?: string;
  submittedAt?: string;
};

const GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL = (process.env.GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL ?? "").trim();
const GOOGLE_LEADS_PRIVATE_KEY = normalizePrivateKey(process.env.GOOGLE_LEADS_PRIVATE_KEY ?? "");
const GOOGLE_LEADS_SHEET_ID = (process.env.GOOGLE_LEADS_SHEET_ID ?? "").trim();
const GOOGLE_LEADS_SHEET_NAME = (process.env.GOOGLE_LEADS_SHEET_NAME ?? "").trim();
const GOOGLE_LEADS_SHEET_GID = (process.env.GOOGLE_LEADS_SHEET_GID ?? "").trim();
const GOOGLE_LEADS_SHEET_RANGE = (process.env.GOOGLE_LEADS_SHEET_RANGE ?? "").trim();
const DEFAULT_APPEND_HEADERS = ["ID", "Name", "Phone", "Email", "Service", "Notes", "Status", "Agent", "Date"];

function normalizePrivateKey(value: string): string {
  let key = value.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith("`") && key.endsWith("`"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}

function hasPrivateKeyShape(value: string): boolean {
  return value.includes("-----BEGIN PRIVATE KEY-----") && value.includes("-----END PRIVATE KEY-----");
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseSheetTitleFromRange(range: string): string {
  const rawTitle = range.split("!")[0]?.trim() ?? "";
  if (!rawTitle) return "";

  return rawTitle.replace(/^'/, "").replace(/'$/, "").replace(/''/g, "'");
}

function formatSheetTitleForRange(title: string): string {
  const escaped = title.replace(/'/g, "''");
  return /[\s!:'"]/u.test(title) ? `'${escaped}'` : escaped;
}

async function buildGoogleSheetsClient() {
  if (!GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL || !GOOGLE_LEADS_PRIVATE_KEY || !GOOGLE_LEADS_SHEET_ID) {
    return null;
  }

  if (!hasPrivateKeyShape(GOOGLE_LEADS_PRIVATE_KEY)) {
    console.error("Google Sheets service account private key is not in PEM format.", {
      hasServiceAccountEmail: Boolean(GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL),
      hasLeadSheetId: Boolean(GOOGLE_LEADS_SHEET_ID),
    });
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_LEADS_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

async function resolveLeadSheetTitle() {
  if (GOOGLE_LEADS_SHEET_GID) {
    const sheetsClient = await buildGoogleSheetsClient();
    if (!sheetsClient) return null;

    const metadata = await sheetsClient.spreadsheets.get({
      spreadsheetId: GOOGLE_LEADS_SHEET_ID,
      fields: "sheets(properties(sheetId,title))",
    });

    const sheets = metadata.data.sheets ?? [];
    const matchedSheet = sheets.find((sheet) => String(sheet.properties?.sheetId ?? "") === GOOGLE_LEADS_SHEET_GID);
    if (matchedSheet?.properties?.title) {
      return matchedSheet.properties.title;
    }

    const availableSheets = sheets
      .map((sheet) => `${sheet.properties?.title ?? "Untitled"} (${sheet.properties?.sheetId ?? "unknown"})`)
      .join(", ");

    throw new Error(
      `Lead sheet GID ${GOOGLE_LEADS_SHEET_GID} was not found in spreadsheet ${GOOGLE_LEADS_SHEET_ID}. Available sheets: ${availableSheets || "none"}`
    );
  }

  const titleFromRange = parseSheetTitleFromRange(GOOGLE_LEADS_SHEET_RANGE);
  if (titleFromRange) return titleFromRange;

  if (GOOGLE_LEADS_SHEET_NAME) return GOOGLE_LEADS_SHEET_NAME;

  return null;
}

async function resolveLeadAppendRange() {
  const title = await resolveLeadSheetTitle();
  if (title) {
    return `${formatSheetTitleForRange(title)}!A:Z`;
  }

  if (GOOGLE_LEADS_SHEET_RANGE) return GOOGLE_LEADS_SHEET_RANGE;

  return null;
}

function getLeadCellValue(
  header: string,
  payload: Required<Pick<LeadSheetPayload, "status" | "submittedAt">> & LeadSheetPayload
) {
  const key = normalizeKey(header);

  if (["id", "requestid", "leadid", "submissionid"].includes(key)) return payload.requestId ?? payload.eventId ?? "";
  if (["timestamp", "submittedat", "createdat", "date", "datetime"].includes(key)) return payload.submittedAt;
  if (["name", "customername", "fullname"].includes(key)) return payload.name;
  if (["phone", "phonenumber", "mobile", "mobileno", "contact", "contactnumber"].includes(key)) return payload.phone;
  if (["email", "mail"].includes(key)) return payload.email;
  if (["notes", "message", "remark", "remarks", "comment", "comments"].includes(key)) return payload.notes;
  if (["service", "servicetitle", "servicename", "requestfor"].includes(key)) return payload.serviceTitle;
  if (key === "status") return payload.status;
  if (["agent", "assignedagent", "agentname"].includes(key)) return payload.agent ?? "";
  if (key === "eventid") return payload.eventId ?? "";

  return "";
}

function buildLeadRow(headers: string[], payload: LeadSheetPayload) {
  const normalizedPayload = {
    ...payload,
    status: payload.status ?? "new",
    agent: payload.agent ?? "",
    submittedAt: payload.submittedAt ?? new Date().toISOString(),
  };

  if (headers.length === 0 || headers.every((header) => !header.trim())) {
    return [
      normalizedPayload.requestId ?? normalizedPayload.eventId ?? "",
      normalizedPayload.name,
      normalizedPayload.phone,
      normalizedPayload.email,
      normalizedPayload.serviceTitle,
      normalizedPayload.notes,
      normalizedPayload.status,
      normalizedPayload.agent,
      normalizedPayload.submittedAt,
    ];
  }

  return headers.map((header) => getLeadCellValue(header, normalizedPayload));
}

export function isGoogleLeadSheetConfigured() {
  return Boolean(
    GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL &&
      GOOGLE_LEADS_PRIVATE_KEY &&
      GOOGLE_LEADS_SHEET_ID &&
      (GOOGLE_LEADS_SHEET_RANGE || GOOGLE_LEADS_SHEET_NAME || GOOGLE_LEADS_SHEET_GID)
  );
}

export async function persistLeadToGoogleSheet(payload: LeadSheetPayload) {
  if (!isGoogleLeadSheetConfigured()) {
    console.info("lead_sheet_not_configured", {
      configuredCredentials: Boolean(GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL && GOOGLE_LEADS_PRIVATE_KEY),
      configuredSheetId: Boolean(GOOGLE_LEADS_SHEET_ID),
      configuredTarget: Boolean(GOOGLE_LEADS_SHEET_RANGE || GOOGLE_LEADS_SHEET_NAME || GOOGLE_LEADS_SHEET_GID),
      eventId: payload.eventId ?? payload.requestId,
    });

    return { ok: true, skipped: true as const };
  }

  const sheetsClient = await buildGoogleSheetsClient();
  const appendRange = await resolveLeadAppendRange();

  if (!sheetsClient || !appendRange) {
    throw new Error("Google Sheets lead storage is configured, but the target sheet could not be resolved.");
  }

  const sheetTitle = parseSheetTitleFromRange(appendRange) || (await resolveLeadSheetTitle()) || GOOGLE_LEADS_SHEET_NAME;

  const headerResponse = sheetTitle
    ? await sheetsClient.spreadsheets.values.get({
        spreadsheetId: GOOGLE_LEADS_SHEET_ID,
        range: `${formatSheetTitleForRange(sheetTitle)}!A1:Z1`,
      })
    : null;

  const headers = headerResponse?.data.values?.[0]?.map((cell) => String(cell ?? "").trim()) ?? DEFAULT_APPEND_HEADERS;
  const row = buildLeadRow(headers, payload);

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: GOOGLE_LEADS_SHEET_ID,
    range: appendRange,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  console.info("lead_sheet_append_success", {
    eventId: payload.eventId,
    appendRange,
  });

  return { ok: true, skipped: false as const };
}
