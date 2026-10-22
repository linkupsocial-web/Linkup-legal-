import assert from "node:assert/strict";
import Module from "node:module";

const moduleLoader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = moduleLoader._load;

moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "googleapis") {
    return {
      google: {
        auth: {
          GoogleAuth: class GoogleAuth {},
        },
        sheets: () => ({}),
      },
    };
  }

  return originalLoad(request, parent, isMain);
};

function clearGoogleSheetEnv() {
  for (const key of [
    "GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_LEADS_PRIVATE_KEY",
    "GOOGLE_LEADS_SHEET_ID",
    "GOOGLE_LEADS_SHEET_NAME",
    "GOOGLE_LEADS_SHEET_GID",
    "GOOGLE_LEADS_SHEET_RANGE",
  ]) {
    delete process.env[key];
  }
}

async function main() {
  clearGoogleSheetEnv();

  const globals = globalThis as typeof globalThis & {
    _crmRequests?: unknown[];
    _crmSheetClient?: unknown;
    _crmSheetTitleCache?: unknown;
    _crmSheetHeadersCache?: Map<string, unknown>;
  };
  globals._crmRequests = [];
  globals._crmSheetClient = null;
  globals._crmSheetTitleCache = undefined;
  globals._crmSheetHeadersCache = new Map();

  const { addRequest, getRequestById, getRequests } = await import("./crm-store.js");

  const created = await addRequest({
    id: "LL-20260729-123456",
    name: "Aarav Sharma",
    phone: "+919876543210",
    email: "aarav@example.com",
    notes: "Need GST help.",
    service: "GST Registration",
    price: 1180,
  });

  assert.equal(created.id, "LL-20260729-123456");
  assert.equal(created.price, 1180);
  assert.equal((await getRequestById("LL-20260729-123456"))?.service, "GST Registration");
  assert.equal((await getRequests()).length, 1);

  moduleLoader._load = originalLoad;
  console.log("crm-store request-number fallback: OK");
}

void main().catch((error) => {
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});
