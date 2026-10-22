import { google, type sheets_v4 } from "googleapis";
import { normalizeRequestStatus, type RequestStatus } from "./request-status";

export type { RequestStatus } from "./request-status";

export interface CrmRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  service: string;
  price: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  agentNote: string;
  assignedAgentUsername: string;
  assignedAgentDisplayName: string;
}

type CreateCrmRequestInput = Omit<
  CrmRequest,
  "id" | "status" | "createdAt" | "updatedAt" | "agentNote" | "assignedAgentUsername" | "assignedAgentDisplayName" | "price"
> &
  Partial<Pick<CrmRequest, "id" | "price">>;

type UpdateCrmRequestPatch = Partial<
  Pick<CrmRequest, "status" | "agentNote" | "assignedAgentUsername" | "assignedAgentDisplayName">
>;

export type StoredCrmRequest = CrmRequest & {
  sheetRowNumber: number;
};

type SheetContext = {
  client: sheets_v4.Sheets;
  title: string;
};

const CRM_HEADERS = ["ID", "Name", "Phone", "Email", "Service", "Price", "Notes", "Status", "Agent", "Date", "Agent Note", "Updated At"];

const GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL = (process.env.GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL ?? "").trim();
const GOOGLE_LEADS_PRIVATE_KEY = normalizePrivateKey(process.env.GOOGLE_LEADS_PRIVATE_KEY ?? "");
const GOOGLE_LEADS_SHEET_ID = (process.env.GOOGLE_LEADS_SHEET_ID ?? "").trim();
const GOOGLE_LEADS_SHEET_NAME = (process.env.GOOGLE_LEADS_SHEET_NAME ?? "").trim();
const GOOGLE_LEADS_SHEET_GID = (process.env.GOOGLE_LEADS_SHEET_GID ?? "").trim();
const GOOGLE_LEADS_SHEET_RANGE = (process.env.GOOGLE_LEADS_SHEET_RANGE ?? "").trim();
const IST_OFFSET_MINUTES = 330;
const SHEET_METADATA_CACHE_TTL_MS = 5 * 60 * 1000;

const g = globalThis as typeof globalThis & {
  _crmRequests?: CrmRequest[];
  _crmSheetClient?: sheets_v4.Sheets | null;
  _crmSheetTitleCache?: { title: string; expiresAt: number };
  _crmSheetHeadersCache?: Map<string, { headers: string[]; expiresAt: number }>;
};
if (!g._crmRequests) g._crmRequests = [];
if (!g._crmSheetHeadersCache) g._crmSheetHeadersCache = new Map();
const fallbackStore: CrmRequest[] = g._crmRequests;

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

function formatSheetTitleForRange(title: string): string {
  const escaped = title.replace(/'/g, "''");
  return /[\s!:'"]/u.test(title) ? `'${escaped}'` : escaped;
}

function parseSheetTitleFromRange(range: string): string {
  const rawTitle = range.split("!")[0]?.trim() ?? "";
  if (!rawTitle) return "";

  return rawTitle.replace(/^'/, "").replace(/'$/, "").replace(/''/g, "'");
}

function formatOffsetTimestamp(date: Date, offsetMinutes: number): string {
  const offsetMs = offsetMinutes * 60 * 1000;
  const shifted = new Date(date.getTime() + offsetMs);

  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  const seconds = String(shifted.getUTCSeconds()).padStart(2, "0");
  const milliseconds = String(shifted.getUTCMilliseconds()).padStart(3, "0");
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetMins = String(absoluteOffset % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${sign}${offsetHours}:${offsetMins}`;
}

function toIstTimestamp(date: Date = new Date()): string {
  return formatOffsetTimestamp(date, IST_OFFSET_MINUTES);
}

function getField(record: Record<string, string>, aliases: string[]): string {
  const normalizedRecord = Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});

  for (const alias of aliases) {
    const value = normalizedRecord[normalizeKey(alias)];
    if (value !== undefined) return value;
  }

  return "";
}

function normalizeTimestamp(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return toIstTimestamp(parsed);
}

function parseAmount(value: string, fallback = 0): number {
  const cleaned = value.replace(/,/g, "");
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return fallback;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toRequestStatus(value: string): RequestStatus {
  return normalizeRequestStatus(value);
}

function createRequestId() {
  return `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function isGoogleCrmSheetConfigured() {
  return Boolean(
    GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL &&
      GOOGLE_LEADS_PRIVATE_KEY &&
      GOOGLE_LEADS_SHEET_ID &&
      (GOOGLE_LEADS_SHEET_GID || GOOGLE_LEADS_SHEET_NAME || GOOGLE_LEADS_SHEET_RANGE)
  );
}

export function isGoogleCrmSheetPersistenceReady() {
  return isGoogleCrmSheetConfigured() && hasPrivateKeyShape(GOOGLE_LEADS_PRIVATE_KEY);
}

async function buildGoogleSheetsClient() {
  if (!isGoogleCrmSheetConfigured()) {
    return null;
  }

  if (g._crmSheetClient) {
    return g._crmSheetClient;
  }

  if (!hasPrivateKeyShape(GOOGLE_LEADS_PRIVATE_KEY)) {
    console.error("CRM Google Sheets private key is not in PEM format.", {
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

  g._crmSheetClient = google.sheets({ version: "v4", auth });
  return g._crmSheetClient;
}

async function resolveSheetTitle(client: sheets_v4.Sheets) {
  const cachedTitle = g._crmSheetTitleCache;
  if (cachedTitle && cachedTitle.expiresAt > Date.now()) {
    return cachedTitle.title;
  }

  if (!client) return null;

  if (GOOGLE_LEADS_SHEET_GID) {
    const metadata = await client.spreadsheets.get({
      spreadsheetId: GOOGLE_LEADS_SHEET_ID,
      fields: "sheets(properties(sheetId,title))",
    });

    const sheets = metadata.data.sheets ?? [];
    const matchedSheet = sheets.find((sheet) => String(sheet.properties?.sheetId ?? "") === GOOGLE_LEADS_SHEET_GID);
    if (matchedSheet?.properties?.title) {
      g._crmSheetTitleCache = {
        title: matchedSheet.properties.title,
        expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
      };
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
  if (titleFromRange) {
    g._crmSheetTitleCache = {
      title: titleFromRange,
      expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
    };
    return titleFromRange;
  }
  if (GOOGLE_LEADS_SHEET_NAME) {
    g._crmSheetTitleCache = {
      title: GOOGLE_LEADS_SHEET_NAME,
      expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
    };
    return GOOGLE_LEADS_SHEET_NAME;
  }

  return null;
}

async function getSheetContext() {
  const client = await buildGoogleSheetsClient();
  if (!client) return null;

  const title = await resolveSheetTitle(client);
  if (!title) {
    throw new Error("CRM Google Sheet is configured, but the target sheet could not be resolved.");
  }

  return { client, title };
}

async function readSheetHeaders(client: sheets_v4.Sheets, title: string) {
  const response = await client.spreadsheets.values.get({
    spreadsheetId: GOOGLE_LEADS_SHEET_ID,
    range: `${formatSheetTitleForRange(title)}!A1:Z1`,
  });

  return response.data.values?.[0]?.map((cell) => String(cell ?? "").trim()) ?? [];
}

async function ensureCrmHeaders(client: sheets_v4.Sheets, title: string) {
  const cacheKey = `${GOOGLE_LEADS_SHEET_ID}:${title}`;
  const cachedHeaders = g._crmSheetHeadersCache?.get(cacheKey);
  const existingHeaders =
    cachedHeaders && cachedHeaders.expiresAt > Date.now()
      ? cachedHeaders.headers
      : await readSheetHeaders(client, title);
  const normalizedExisting = existingHeaders.map((header) => normalizeKey(header));
  const missingHeaders = CRM_HEADERS.filter((header) => !normalizedExisting.includes(normalizeKey(header)));

  if (missingHeaders.length === 0 && existingHeaders.length > 0) {
    g._crmSheetHeadersCache?.set(cacheKey, {
      headers: existingHeaders,
      expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
    });
    return existingHeaders;
  }

  const nextHeaders =
    existingHeaders.length > 0 ? [...existingHeaders, ...missingHeaders] : [...CRM_HEADERS];

  await client.spreadsheets.values.update({
    spreadsheetId: GOOGLE_LEADS_SHEET_ID,
    range: `${formatSheetTitleForRange(title)}!A1:Z1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [nextHeaders],
    },
  });

  g._crmSheetHeadersCache?.set(cacheKey, {
    headers: nextHeaders,
    expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
  });
  return nextHeaders;
}

function mapRowToCrmRequest(headers: string[], row: string[], rowNumber: number): StoredCrmRequest | null {
  const record = headers.reduce<Record<string, string>>((acc, header, index) => {
    if (header.trim()) {
      acc[header] = String(row[index] ?? "").trim();
    }
    return acc;
  }, {});

  const id = getField(record, ["ID", "Request ID", "Lead ID"]);
  const service = getField(record, ["Service", "Service Title", "Service Name"]);

  if (!id || !service) return null;

  const fallbackDate = new Date().toISOString();
  const createdAt = normalizeTimestamp(getField(record, ["Date", "Created At", "Timestamp"]), fallbackDate);
  const updatedAt = normalizeTimestamp(getField(record, ["Updated At", "Last Updated"]), createdAt);
  const assignedAgentUsername = getField(record, ["Agent", "Assigned Agent", "Assigned Agent Username"]);

  return {
    id,
    name: getField(record, ["Name", "Customer Name"]),
    phone: getField(record, ["Phone", "Phone Number", "Mobile"]),
    email: getField(record, ["Email", "Mail"]),
    notes: getField(record, ["Notes", "Customer Notes"]),
    service,
    price: parseAmount(getField(record, ["Price", "Amount", "Amount Due", "Service Price"])),
    status: toRequestStatus(getField(record, ["Status"])),
    createdAt,
    updatedAt,
    agentNote: getField(record, ["Agent Note", "CRM Note", "Internal Note"]),
    assignedAgentUsername,
    assignedAgentDisplayName: getField(record, ["Assigned Agent Display Name"]),
    sheetRowNumber: rowNumber,
  };
}

function buildSheetRow(headers: string[], request: CrmRequest) {
  return headers.map((header) => {
    const key = normalizeKey(header);

    if (["id", "requestid", "leadid", "submissionid"].includes(key)) return request.id;
    if (["name", "customername", "fullname"].includes(key)) return request.name;
    if (["phone", "phonenumber", "mobile", "mobileno", "contact", "contactnumber"].includes(key)) return request.phone;
    if (["email", "mail"].includes(key)) return request.email;
    if (["service", "servicetitle", "servicename", "requestfor"].includes(key)) return request.service;
    if (["price", "amount", "amountdue", "serviceprice", "fee"].includes(key)) return String(request.price ?? 0);
    if (["notes", "customernotes"].includes(key)) return request.notes;
    if (key === "status") return request.status;
    if (["agent", "assignedagent", "assignedagentusername"].includes(key)) return request.assignedAgentUsername;
    if (["date", "createdat", "timestamp", "submittedat"].includes(key)) return request.createdAt;
    if (["agentnote", "crmnote", "internalnote"].includes(key)) return request.agentNote;
    if (["updatedat", "lastupdated"].includes(key)) return request.updatedAt;
    if (["assignedagentdisplayname"].includes(key)) return request.assignedAgentDisplayName;

    return "";
  });
}

function stripStorageFields(request: StoredCrmRequest): CrmRequest {
  return {
    id: request.id,
    name: request.name,
    phone: request.phone,
    email: request.email,
    notes: request.notes,
    service: request.service,
    price: request.price,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    agentNote: request.agentNote,
    assignedAgentUsername: request.assignedAgentUsername,
    assignedAgentDisplayName: request.assignedAgentDisplayName,
  };
}

async function listStoredRequests(sheetContext?: SheetContext | null): Promise<StoredCrmRequest[]> {
  const resolvedContext = sheetContext ?? await getSheetContext();
  if (!resolvedContext) {
    return fallbackStore.map((request, index) => ({ ...request, sheetRowNumber: index + 2 }));
  }

  const headers = await ensureCrmHeaders(resolvedContext.client, resolvedContext.title);
  const response = await resolvedContext.client.spreadsheets.values.get({
    spreadsheetId: GOOGLE_LEADS_SHEET_ID,
    range: `${formatSheetTitleForRange(resolvedContext.title)}!A2:Z`,
  });

  const rows = response.data.values ?? [];
  return rows
    .map((row, index) => mapRowToCrmRequest(headers, row.map((cell) => String(cell ?? "")), index + 2))
    .filter((request: StoredCrmRequest | null): request is StoredCrmRequest => request !== null);
}

export async function getRequests(): Promise<CrmRequest[]> {
  const requests = await listStoredRequests();
  return requests.map(stripStorageFields);
}

export async function getRequestById(id: string): Promise<CrmRequest | null> {
  const request = await getStoredRequestById(id);
  return request ? stripStorageFields(request) : null;
}

export async function getStoredRequestById(id: string, sheetContext?: SheetContext | null): Promise<StoredCrmRequest | null> {
  const requests = await listStoredRequests(sheetContext);
  return requests.find((entry) => entry.id === id) ?? null;
}

export async function addRequest(data: CreateCrmRequestInput): Promise<CrmRequest> {
  const now = toIstTimestamp();
  const request: CrmRequest = {
    ...data,
    id: data.id?.trim() || createRequestId(),
    price: data.price ?? 0,
    status: "new",
    createdAt: now,
    updatedAt: now,
    agentNote: "",
    assignedAgentUsername: "",
    assignedAgentDisplayName: "",
  };

  const sheetContext = await getSheetContext();
  if (!sheetContext) {
    fallbackStore.push(request);
    return request;
  }

  const headers = await ensureCrmHeaders(sheetContext.client, sheetContext.title);
  const row = buildSheetRow(headers, request);

  await sheetContext.client.spreadsheets.values.append({
    spreadsheetId: GOOGLE_LEADS_SHEET_ID,
    range: `${formatSheetTitleForRange(sheetContext.title)}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return request;
}

export async function updateRequest(id: string, patch: UpdateCrmRequestPatch, existingRequest?: StoredCrmRequest | null): Promise<CrmRequest | null> {
  const now = toIstTimestamp();
  const sheetContext = await getSheetContext();

  if (!sheetContext) {
    const idx = fallbackStore.findIndex((request) => request.id === id);
    if (idx === -1) return null;

    fallbackStore[idx] = {
      ...fallbackStore[idx],
      ...patch,
      updatedAt: now,
    };

    return fallbackStore[idx];
  }

  const headers = await ensureCrmHeaders(sheetContext.client, sheetContext.title);
  const existing = existingRequest ?? await getStoredRequestById(id, sheetContext);
  if (!existing) return null;

  const updated: CrmRequest = {
    ...stripStorageFields(existing),
    ...patch,
    updatedAt: now,
  };

  const row = buildSheetRow(headers, updated);
  await sheetContext.client.spreadsheets.values.update({
    spreadsheetId: GOOGLE_LEADS_SHEET_ID,
    range: `${formatSheetTitleForRange(sheetContext.title)}!A${existing.sheetRowNumber}:Z${existing.sheetRowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  return updated;
}

export function getStats(source: CrmRequest[]) {
  const total = source.length;
  const newRequests = source.filter((request) => request.status === "new").length;
  const paymentPending = source.filter((request) => request.status === "payment_pending").length;
  const inProgress = source.filter((request) => request.status === "in_progress").length;
  const completed = source.filter((request) => request.status === "completed").length;

  const now = Date.now();
  const trend: Record<string, { date: string; new: number; payment_pending: number; in_progress: number; completed: number }> = {};
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(now - index * 86400000);
    const key = date.toISOString().slice(0, 10);
    trend[key] = { date: key, new: 0, payment_pending: 0, in_progress: 0, completed: 0 };
  }

  for (const request of source) {
    const key = request.createdAt.slice(0, 10);
    if (trend[key] && (request.status === "new" || request.status === "payment_pending" || request.status === "in_progress" || request.status === "completed")) {
      trend[key][request.status] += 1;
    }
  }

  const serviceCount: Record<string, number> = {};
  for (const request of source) {
    serviceCount[request.service] = (serviceCount[request.service] ?? 0) + 1;
  }

  const topServices = Object.entries(serviceCount)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { total, new: newRequests, paymentPending, inProgress, completed, trend: Object.values(trend), topServices };
}
