import "server-only";
import { google, type sheets_v4 } from "googleapis";
import { findAllServices } from "@/server/services.repository";
import { getStoredRequestById } from "@/lib/crm-store";
import { normalizePaymentStatus, type PaymentStatus } from "@/lib/payment-status";

export type { PaymentStatus } from "@/lib/payment-status";

export interface CrmPayment {
  id: string;
  requestId: string;
  customerName: string;
  phone: string;
  serviceName: string;
  assignedAgentUsername: string;
  assignedAgentDisplayName: string;
  amountTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  notes: string;
  paymentDate: string;
  nextDueDate: string;
  createdAt: string;
  updatedAt: string;
}

type CreateCrmPaymentInput = Omit<
  CrmPayment,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "paymentMethod"
  | "paymentStatus"
  | "notes"
  | "amountTotal"
  | "amountPaid"
  | "balanceDue"
  | "paymentDate"
  | "nextDueDate"
> &
  Partial<
    Pick<
      CrmPayment,
      | "paymentMethod"
      | "paymentStatus"
      | "notes"
      | "amountTotal"
      | "amountPaid"
      | "balanceDue"
      | "paymentDate"
      | "nextDueDate"
    >
  >;

type UpdateCrmPaymentPatch = Partial<
  Pick<
    CrmPayment,
    | "amountTotal"
    | "amountPaid"
    | "balanceDue"
    | "paymentMethod"
    | "paymentStatus"
    | "notes"
    | "paymentDate"
    | "nextDueDate"
    | "assignedAgentUsername"
    | "assignedAgentDisplayName"
  >
>;

export type StoredCrmPayment = CrmPayment & {
  sheetRowNumber: number;
};

type SheetContext = {
  client: sheets_v4.Sheets;
  title: string;
};

const PAYMENT_HEADERS = [
  "Payment ID",
  "Request ID",
  "Customer Name",
  "Phone",
  "Service Name",
  "Agent Assigned",
  "Amount Total",
  "Amount Paid",
  "Balance Due",
  "Payment Method",
  "Payment Status",
  "Notes",
  "Payment Date",
  "Next Due Date",
  "Created At",
  "Updated At",
];

const GOOGLE_PAYMENTS_SERVICE_ACCOUNT_EMAIL = (process.env.GOOGLE_PAYMENTS_SERVICE_ACCOUNT_EMAIL ?? "").trim();
const GOOGLE_PAYMENTS_PRIVATE_KEY = normalizePrivateKey(process.env.GOOGLE_PAYMENTS_PRIVATE_KEY ?? "");
const GOOGLE_PAYMENTS_SHEET_ID = (process.env.GOOGLE_PAYMENTS_SHEET_ID ?? "").trim();
const GOOGLE_PAYMENTS_SHEET_NAME = (process.env.GOOGLE_PAYMENTS_SHEET_NAME ?? "").trim();
const GOOGLE_PAYMENTS_SHEET_GID = (process.env.GOOGLE_PAYMENTS_SHEET_GID ?? "").trim();
const GOOGLE_PAYMENTS_SHEET_RANGE = (process.env.GOOGLE_PAYMENTS_SHEET_RANGE ?? "").trim();
const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330;
const SHEET_METADATA_CACHE_TTL_MS = 5 * 60 * 1000;

const g = globalThis as typeof globalThis & {
  _crmPayments?: CrmPayment[];
  _crmPaymentsSheetClient?: sheets_v4.Sheets | null;
  _crmPaymentsSheetTitleCache?: { title: string; expiresAt: number };
  _crmPaymentsSheetHeadersCache?: Map<string, { headers: string[]; expiresAt: number }>;
};

if (!g._crmPayments) g._crmPayments = [];
if (!g._crmPaymentsSheetHeadersCache) g._crmPaymentsSheetHeadersCache = new Map();
const fallbackStore: CrmPayment[] = g._crmPayments;

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

function parseAmount(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "");
    const match = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
  }

  return fallback;
}

function normalizeAmount(value: unknown, fallback = 0): number {
  return Math.max(0, parseAmount(value, fallback));
}

function normalizeDateValue(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return toIstTimestamp(parsed);
}

function getIstDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return {
    year,
    month,
    day,
    dayNumber: Date.UTC(year, month - 1, day),
  };
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

function toPaymentStatus(value: string): PaymentStatus {
  return normalizePaymentStatus(value);
}

function derivePaymentStatus(amountTotal: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return "pending";
  if (amountPaid < amountTotal) return "authorized";
  return "captured";
}

function createPaymentId() {
  return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function isGooglePaymentsSheetConfigured() {
  return Boolean(
    GOOGLE_PAYMENTS_SERVICE_ACCOUNT_EMAIL &&
      GOOGLE_PAYMENTS_PRIVATE_KEY &&
      GOOGLE_PAYMENTS_SHEET_ID &&
      (GOOGLE_PAYMENTS_SHEET_GID || GOOGLE_PAYMENTS_SHEET_NAME || GOOGLE_PAYMENTS_SHEET_RANGE)
  );
}

async function buildGoogleSheetsClient() {
  if (!isGooglePaymentsSheetConfigured()) {
    return null;
  }

  if (g._crmPaymentsSheetClient) {
    return g._crmPaymentsSheetClient;
  }

  if (!hasPrivateKeyShape(GOOGLE_PAYMENTS_PRIVATE_KEY)) {
    console.error("CRM Payments Google Sheets private key is not in PEM format.", {
      hasServiceAccountEmail: Boolean(GOOGLE_PAYMENTS_SERVICE_ACCOUNT_EMAIL),
      hasPaymentsSheetId: Boolean(GOOGLE_PAYMENTS_SHEET_ID),
    });
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_PAYMENTS_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PAYMENTS_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  g._crmPaymentsSheetClient = google.sheets({ version: "v4", auth });
  return g._crmPaymentsSheetClient;
}

async function resolveSheetTitle(client: sheets_v4.Sheets) {
  const cachedTitle = g._crmPaymentsSheetTitleCache;
  if (cachedTitle && cachedTitle.expiresAt > Date.now()) {
    return cachedTitle.title;
  }

  if (!client) return null;

  if (GOOGLE_PAYMENTS_SHEET_GID) {
    const metadata = await client.spreadsheets.get({
      spreadsheetId: GOOGLE_PAYMENTS_SHEET_ID,
      fields: "sheets(properties(sheetId,title))",
    });

    const sheets = metadata.data.sheets ?? [];
    const matchedSheet = sheets.find((sheet) => String(sheet.properties?.sheetId ?? "") === GOOGLE_PAYMENTS_SHEET_GID);
    if (matchedSheet?.properties?.title) {
      g._crmPaymentsSheetTitleCache = {
        title: matchedSheet.properties.title,
        expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
      };
      return matchedSheet.properties.title;
    }

    const availableSheets = sheets
      .map((sheet) => `${sheet.properties?.title ?? "Untitled"} (${sheet.properties?.sheetId ?? "unknown"})`)
      .join(", ");

    throw new Error(
      `Payments sheet GID ${GOOGLE_PAYMENTS_SHEET_GID} was not found in spreadsheet ${GOOGLE_PAYMENTS_SHEET_ID}. Available sheets: ${availableSheets || "none"}`
    );
  }

  const titleFromRange = parseSheetTitleFromRange(GOOGLE_PAYMENTS_SHEET_RANGE);
  if (titleFromRange) {
    g._crmPaymentsSheetTitleCache = {
      title: titleFromRange,
      expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
    };
    return titleFromRange;
  }

  if (GOOGLE_PAYMENTS_SHEET_NAME) {
    g._crmPaymentsSheetTitleCache = {
      title: GOOGLE_PAYMENTS_SHEET_NAME,
      expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
    };
    return GOOGLE_PAYMENTS_SHEET_NAME;
  }

  return null;
}

async function getSheetContext() {
  const client = await buildGoogleSheetsClient();
  if (!client) return null;

  const title = await resolveSheetTitle(client);
  if (!title) {
    throw new Error("CRM Payments Google Sheet is configured, but the target sheet could not be resolved.");
  }

  return { client, title };
}

async function readSheetHeaders(client: sheets_v4.Sheets, title: string) {
  const response = await client.spreadsheets.values.get({
    spreadsheetId: GOOGLE_PAYMENTS_SHEET_ID,
    range: `${formatSheetTitleForRange(title)}!A1:P1`,
  });

  return response.data.values?.[0]?.map((cell) => String(cell ?? "").trim()) ?? [];
}

async function ensurePaymentHeaders(client: sheets_v4.Sheets, title: string) {
  const cacheKey = `${GOOGLE_PAYMENTS_SHEET_ID}:${title}`;
  const cachedHeaders = g._crmPaymentsSheetHeadersCache?.get(cacheKey);
  const existingHeaders =
    cachedHeaders && cachedHeaders.expiresAt > Date.now()
      ? cachedHeaders.headers
      : await readSheetHeaders(client, title);

  const normalizedExisting = existingHeaders.map((header) => normalizeKey(header));
  const missingHeaders = PAYMENT_HEADERS.filter((header) => !normalizedExisting.includes(normalizeKey(header)));

  if (missingHeaders.length === 0 && existingHeaders.length > 0) {
    g._crmPaymentsSheetHeadersCache?.set(cacheKey, {
      headers: existingHeaders,
      expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
    });
    return existingHeaders;
  }

  const nextHeaders = existingHeaders.length > 0 ? [...existingHeaders, ...missingHeaders] : [...PAYMENT_HEADERS];

  await client.spreadsheets.values.update({
    spreadsheetId: GOOGLE_PAYMENTS_SHEET_ID,
    range: `${formatSheetTitleForRange(title)}!A1:P1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [nextHeaders],
    },
  });

  g._crmPaymentsSheetHeadersCache?.set(cacheKey, {
    headers: nextHeaders,
    expiresAt: Date.now() + SHEET_METADATA_CACHE_TTL_MS,
  });

  return nextHeaders;
}

function mapRowToPayment(headers: string[], row: string[], rowNumber: number): StoredCrmPayment | null {
  const record = headers.reduce<Record<string, string>>((acc, header, index) => {
    if (header.trim()) {
      acc[header] = String(row[index] ?? "").trim();
    }
    return acc;
  }, {});

  const id = getField(record, ["Payment ID", "ID"]);
  const requestId = getField(record, ["Request ID", "Lead ID"]);
  const customerName = getField(record, ["Customer Name", "Name"]);
  const serviceName = getField(record, ["Service Name", "Service"]);

  if (!id || !requestId || !customerName || !serviceName) return null;

  const fallbackDate = new Date().toISOString();
  const createdAt = normalizeTimestamp(getField(record, ["Created At", "Date", "Timestamp"]), fallbackDate);
  const updatedAt = normalizeTimestamp(getField(record, ["Updated At", "Last Updated"]), createdAt);

  const amountTotal = normalizeAmount(getField(record, ["Amount Total", "Amount Due", "Amount", "Price"]));
  const paymentStatus = toPaymentStatus(getField(record, ["Payment Status", "Status"]));
  const amountPaidRaw = normalizeAmount(getField(record, ["Amount Paid", "Paid Amount"]), 0);
  const amountPaid = amountPaidRaw > 0 ? amountPaidRaw : paymentStatus === "captured" ? amountTotal : 0;
  const balanceDueRaw = normalizeAmount(getField(record, ["Balance Due", "Balance"]), 0);
  const balanceDue = balanceDueRaw > 0 ? balanceDueRaw : Math.max(0, amountTotal - amountPaid);

  return {
    id,
    requestId,
    customerName,
    phone: getField(record, ["Phone", "Phone Number", "Mobile"]),
    serviceName,
    assignedAgentUsername: getField(record, ["Assigned Agent Username", "Agent Assigned Username", "Agent Username"]),
    assignedAgentDisplayName: getField(record, ["Agent Assigned", "Assigned Agent", "Assigned Agent Display Name"]),
    amountTotal,
    amountPaid,
    balanceDue,
    paymentMethod: getField(record, ["Payment Method", "Method"]),
    paymentStatus,
    notes: getField(record, ["Notes", "Payment Notes", "Remark"]),
    paymentDate: normalizeDateValue(getField(record, ["Payment Date", "Date Paid", "Collected At", "Paid At"])),
    nextDueDate: normalizeDateValue(getField(record, ["Next Due Date", "Due Date", "Balance Due Date"])),
    createdAt,
    updatedAt,
    sheetRowNumber: rowNumber,
  };
}

function buildSheetRow(headers: string[], payment: CrmPayment) {
  return headers.map((header) => {
    const key = normalizeKey(header);

    if (["paymentid", "id"].includes(key)) return payment.id;
    if (["requestid", "leadid"].includes(key)) return payment.requestId;
    if (["customername", "name"].includes(key)) return payment.customerName;
    if (["phone", "phonenumber", "mobile"].includes(key)) return payment.phone;
    if (["servicename", "service"].includes(key)) return payment.serviceName;
    if (["agentassigned", "assignedagent", "agentassigneddisplayname"].includes(key)) return payment.assignedAgentDisplayName;
    if (["assignedagentusername", "agentassignedusername"].includes(key)) return payment.assignedAgentUsername;
    if (["amounttotal", "amountdue", "amount", "price"].includes(key)) return String(payment.amountTotal);
    if (["amountpaid", "paidamount"].includes(key)) return String(payment.amountPaid);
    if (["balancedue", "balance"].includes(key)) return String(payment.balanceDue);
    if (["paymentmethod", "method"].includes(key)) return payment.paymentMethod;
    if (["paymentstatus", "status"].includes(key)) return payment.paymentStatus;
    if (["notes", "paymentnotes", "remark"].includes(key)) return payment.notes;
    if (["paymentdate", "datepaid", "collectedat", "paidat"].includes(key)) return payment.paymentDate;
    if (["nextduedate", "duedate", "balanceduedate"].includes(key)) return payment.nextDueDate;
    if (["createdat", "date", "timestamp"].includes(key)) return payment.createdAt;
    if (["updatedat", "lastupdated"].includes(key)) return payment.updatedAt;

    return "";
  });
}

function stripStorageFields(payment: StoredCrmPayment): CrmPayment {
  return {
    id: payment.id,
    requestId: payment.requestId,
    customerName: payment.customerName,
    phone: payment.phone,
    serviceName: payment.serviceName,
    assignedAgentUsername: payment.assignedAgentUsername,
    assignedAgentDisplayName: payment.assignedAgentDisplayName,
    amountTotal: payment.amountTotal,
    amountPaid: payment.amountPaid,
    balanceDue: payment.balanceDue,
    paymentMethod: payment.paymentMethod,
    paymentStatus: payment.paymentStatus,
    notes: payment.notes,
    paymentDate: payment.paymentDate,
    nextDueDate: payment.nextDueDate,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

async function listStoredPayments(sheetContext?: SheetContext | null): Promise<StoredCrmPayment[]> {
  const resolvedContext = sheetContext ?? (await getSheetContext());
  if (!resolvedContext) {
    return fallbackStore.map((payment, index) => ({ ...payment, sheetRowNumber: index + 2 }));
  }

  const headers = await ensurePaymentHeaders(resolvedContext.client, resolvedContext.title);
  const response = await resolvedContext.client.spreadsheets.values.get({
    spreadsheetId: GOOGLE_PAYMENTS_SHEET_ID,
    range: `${formatSheetTitleForRange(resolvedContext.title)}!A2:P`,
  });

  const rows = response.data.values ?? [];
  const payments = rows
    .map((row, index) => mapRowToPayment(headers, row.map((cell) => String(cell ?? "")), index + 2))
    .filter((payment: StoredCrmPayment | null): payment is StoredCrmPayment => payment !== null);

  return Promise.all(
    payments.map(async (payment) => {
      const amountTotal = await resolvePaymentAmountTotal(payment);
      const amountPaid = payment.amountPaid > 0 ? payment.amountPaid : payment.paymentStatus === "captured" ? amountTotal : 0;
      const balanceDue = payment.balanceDue > 0 ? payment.balanceDue : Math.max(0, amountTotal - amountPaid);
      const paymentDate =
        payment.paymentDate || (amountPaid > 0 || payment.paymentStatus !== "pending" ? payment.updatedAt || payment.createdAt : "");

      return {
        ...payment,
        amountTotal,
        amountPaid,
        balanceDue,
        paymentDate,
      };
    })
  );
}

export async function getPayments(): Promise<CrmPayment[]> {
  const payments = await listStoredPayments();
  return payments.map(stripStorageFields);
}

export async function getPaymentById(id: string): Promise<CrmPayment | null> {
  const payment = await getStoredPaymentById(id);
  return payment ? stripStorageFields(payment) : null;
}

export async function getStoredPaymentById(id: string, sheetContext?: SheetContext | null): Promise<StoredCrmPayment | null> {
  const payments = await listStoredPayments(sheetContext);
  return payments.find((entry) => entry.id === id) ?? null;
}

export async function getStoredPaymentByRequestId(
  requestId: string,
  sheetContext?: SheetContext | null
): Promise<StoredCrmPayment | null> {
  const payments = await listStoredPayments(sheetContext);
  return payments.find((entry) => entry.requestId === requestId) ?? null;
}

async function resolveServiceAmount(serviceName: string): Promise<number> {
  const services = await findAllServices();
  const normalizedServiceName = serviceName.trim().toLowerCase();
  const match = services.find((service) => service.title.trim().toLowerCase() === normalizedServiceName);
  return match?.price ?? 0;
}

async function resolvePaymentAmountTotal(payment: Pick<CrmPayment, "requestId" | "serviceName" | "amountTotal">): Promise<number> {
  if (payment.amountTotal > 0) return payment.amountTotal;

  const request = await getStoredRequestById(payment.requestId);
  if (request?.price && request.price > 0) {
    return request.price;
  }

  return resolveServiceAmount(payment.serviceName);
}

export async function addPayment(data: CreateCrmPaymentInput): Promise<CrmPayment> {
  const now = toIstTimestamp();
  const existing = await getStoredPaymentByRequestId(data.requestId);
  if (existing) {
    return stripStorageFields(existing);
  }

  const requestedTotal = Number.isFinite(data.amountTotal ?? NaN) ? Math.trunc(data.amountTotal ?? 0) : 0;
  const resolvedTotal = requestedTotal > 0 ? requestedTotal : await resolveServiceAmount(data.serviceName);
  let resolvedPaid =
    Number.isFinite(data.amountPaid ?? NaN)
      ? Math.trunc(data.amountPaid ?? 0)
      : data.paymentStatus === "captured"
        ? resolvedTotal
        : 0;
  if ((data.paymentStatus ?? "").trim().toLowerCase() === "captured" && resolvedPaid <= 0) {
    resolvedPaid = resolvedTotal;
  }
  const resolvedBalance =
    Number.isFinite(data.balanceDue ?? NaN) ? Math.trunc(data.balanceDue ?? 0) : Math.max(0, resolvedTotal - resolvedPaid);
  const resolvedStatus = data.paymentStatus ?? derivePaymentStatus(resolvedTotal, resolvedPaid);
  const resolvedPaymentDate = data.paymentDate?.trim()
    ? normalizeDateValue(data.paymentDate)
    : resolvedPaid > 0 || resolvedStatus !== "pending"
      ? now
      : "";

  const payment: CrmPayment = {
    ...data,
    id: createPaymentId(),
    amountTotal: resolvedTotal,
    amountPaid: resolvedPaid,
    balanceDue: resolvedBalance,
    paymentMethod: data.paymentMethod ?? "",
    paymentStatus: resolvedStatus,
    notes: data.notes ?? "",
    paymentDate: resolvedPaymentDate,
    nextDueDate: data.nextDueDate?.trim() ? normalizeDateValue(data.nextDueDate) : "",
    createdAt: now,
    updatedAt: now,
  };

  const sheetContext = await getSheetContext();
  if (!sheetContext) {
    fallbackStore.push(payment);
    return payment;
  }

  const headers = await ensurePaymentHeaders(sheetContext.client, sheetContext.title);
  const row = buildSheetRow(headers, payment);

  await sheetContext.client.spreadsheets.values.append({
    spreadsheetId: GOOGLE_PAYMENTS_SHEET_ID,
    range: `${formatSheetTitleForRange(sheetContext.title)}!A:P`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return payment;
}

export async function updatePayment(
  id: string,
  patch: UpdateCrmPaymentPatch,
  existingPayment?: StoredCrmPayment | null
): Promise<CrmPayment | null> {
  const now = toIstTimestamp();
  const sheetContext = await getSheetContext();

  if (!sheetContext) {
    const idx = fallbackStore.findIndex((payment) => payment.id === id);
    if (idx === -1) return null;

    const current = fallbackStore[idx];
    const nextAmountTotal = patch.amountTotal !== undefined ? Math.max(0, Math.trunc(patch.amountTotal)) : current.amountTotal;
    const nextAmountPaid =
      patch.amountPaid !== undefined
        ? Math.max(0, Math.trunc(patch.amountPaid))
        : patch.paymentStatus === "captured"
          ? nextAmountTotal
          : current.amountPaid;
    const nextPaymentStatus = patch.paymentStatus ?? derivePaymentStatus(nextAmountTotal, nextAmountPaid);

    fallbackStore[idx] = {
      ...current,
      ...patch,
      amountTotal: nextAmountTotal,
      amountPaid: nextAmountPaid,
      balanceDue: patch.balanceDue !== undefined ? Math.max(0, Math.trunc(patch.balanceDue)) : Math.max(0, nextAmountTotal - nextAmountPaid),
      paymentStatus: nextPaymentStatus,
      paymentDate:
        patch.paymentDate !== undefined
          ? normalizeDateValue(patch.paymentDate)
          : current.paymentDate || (patch.amountPaid !== undefined || patch.paymentStatus !== undefined ? now : current.paymentDate),
      nextDueDate: patch.nextDueDate !== undefined ? normalizeDateValue(patch.nextDueDate) : current.nextDueDate,
      updatedAt: now,
    };

    return fallbackStore[idx];
  }

  const headers = await ensurePaymentHeaders(sheetContext.client, sheetContext.title);
  const existing = existingPayment ?? (await getStoredPaymentById(id, sheetContext));
  if (!existing) return null;

  const updated: CrmPayment = {
    ...stripStorageFields(existing),
    ...patch,
    amountTotal: patch.amountTotal !== undefined ? Math.max(0, Math.trunc(patch.amountTotal)) : existing.amountTotal,
    amountPaid:
      patch.amountPaid !== undefined
        ? Math.max(0, Math.trunc(patch.amountPaid))
        : patch.paymentStatus === "captured"
          ? patch.amountTotal !== undefined
            ? Math.max(0, Math.trunc(patch.amountTotal))
            : existing.amountTotal
          : existing.amountPaid,
    balanceDue: patch.balanceDue !== undefined ? Math.max(0, Math.trunc(patch.balanceDue)) : existing.balanceDue,
    paymentDate:
      patch.paymentDate !== undefined
        ? normalizeDateValue(patch.paymentDate)
        : existing.paymentDate || (patch.amountPaid !== undefined || patch.paymentStatus !== undefined ? now : existing.paymentDate),
    nextDueDate: patch.nextDueDate !== undefined ? normalizeDateValue(patch.nextDueDate) : existing.nextDueDate,
    paymentStatus:
      patch.paymentStatus ?? derivePaymentStatus(
        patch.amountTotal !== undefined ? Math.max(0, Math.trunc(patch.amountTotal)) : existing.amountTotal,
        patch.amountPaid !== undefined ? Math.max(0, Math.trunc(patch.amountPaid)) : existing.amountPaid
      ),
    updatedAt: now,
  };

  updated.balanceDue = patch.balanceDue !== undefined ? updated.balanceDue : Math.max(0, updated.amountTotal - updated.amountPaid);
  if (updated.paymentStatus === "captured" && updated.amountPaid <= 0) {
    updated.amountPaid = updated.amountTotal;
    updated.balanceDue = 0;
  }
  if (!updated.paymentDate && (updated.amountPaid > 0 || updated.paymentStatus !== "pending")) {
    updated.paymentDate = now;
  }

  const row = buildSheetRow(headers, updated);
  await sheetContext.client.spreadsheets.values.update({
    spreadsheetId: GOOGLE_PAYMENTS_SHEET_ID,
    range: `${formatSheetTitleForRange(sheetContext.title)}!A${existing.sheetRowNumber}:P${existing.sheetRowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  return updated;
}

export function getPaymentStats(source: CrmPayment[], now: Date = new Date()) {
  const total = source.length;
  const pending = source.filter((payment) => payment.paymentStatus === "pending").length;
  const authorized = source.filter((payment) => payment.paymentStatus === "authorized").length;
  const captured = source.filter((payment) => payment.paymentStatus === "captured").length;
  const failed = source.filter((payment) => payment.paymentStatus === "failed").length;
  const nowParts = getIstDateParts(now);
  const monthKey = `${nowParts.year}-${String(nowParts.month).padStart(2, "0")}`;
  const todayKey = nowParts.dayNumber;
  const weekStartKey = todayKey - (6 * 86400000);

  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayKey - (6 - index) * 86400000);
    const parts = getIstDateParts(date);
    return {
      date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-IN", {
        timeZone: IST_TIME_ZONE,
        day: "2-digit",
        month: "short",
      }).format(date),
      revenue: 0,
      payments: 0,
    };
  });

  let collected = 0;
  let totalDues = 0;
  let todayRevenue = 0;
  let weekRevenue = 0;
  let monthRevenue = 0;

  for (const payment of source) {
    const outstandingDue = payment.balanceDue > 0 ? payment.balanceDue : Math.max(0, payment.amountTotal - payment.amountPaid);
    totalDues += outstandingDue;

    if (payment.paymentStatus === "pending" || payment.paymentStatus === "failed" || payment.paymentStatus === "refunded") continue;

    const collectedAmount = payment.amountPaid > 0 ? Math.min(payment.amountPaid, payment.amountTotal) : payment.amountTotal;
    const revenueDate = new Date(payment.paymentDate || payment.updatedAt || payment.createdAt);
    const paidAt = getIstDateParts(revenueDate);
    const paymentMonthKey = `${paidAt.year}-${String(paidAt.month).padStart(2, "0")}`;
    const paymentDateKey = `${paidAt.year}-${String(paidAt.month).padStart(2, "0")}-${String(paidAt.day).padStart(2, "0")}`;

    collected += collectedAmount;
    if (paidAt.dayNumber === todayKey) todayRevenue += collectedAmount;
    if (paidAt.dayNumber >= weekStartKey && paidAt.dayNumber <= todayKey) weekRevenue += collectedAmount;
    if (paymentMonthKey === monthKey) monthRevenue += collectedAmount;

    const trendEntry = trend.find((entry) => entry.date === paymentDateKey);
    if (trendEntry) {
      trendEntry.revenue += collectedAmount;
      trendEntry.payments += 1;
    }
  }

  return { total, pending, authorized, captured, failed, collected, totalDues, todayRevenue, weekRevenue, monthRevenue, trend };
}
