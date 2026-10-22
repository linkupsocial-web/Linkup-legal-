import assert from "node:assert/strict";
import Module from "node:module";

const moduleLoader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = moduleLoader._load;

const uploads: Array<{ path: string; body: Uint8Array; options: Record<string, unknown> }> = [];

moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "server-only") return {};
  if (request === "@/lib/supabase/server") {
    return {
      createSupabaseServiceRoleClient: () => ({
        storage: {
          from: () => ({
            upload: async (path: string, body: Uint8Array, options: Record<string, unknown>) => {
              uploads.push({ path, body, options });
              return { data: { path }, error: null };
            },
            getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example.com/${path}` } }),
            remove: async () => ({ data: [], error: null }),
          }),
        },
      }),
    };
  }

  return originalLoad(request, parent, isMain);
};

async function main() {
  try {
    const {
      SERVICE_IMAGE_MAX_BYTES,
      getServiceImageValidationError,
      uploadServiceImage,
    } = await import("./service-image-storage.js");

    assert.equal(getServiceImageValidationError({ type: "image/svg+xml", size: 10 }), "Use a JPG, PNG, WEBP, or GIF image.");
    assert.equal(getServiceImageValidationError({ type: "image/png", size: SERVICE_IMAGE_MAX_BYTES + 1 }), "Service images must be 5 MB or smaller.");

    const file = new File([new Uint8Array([1, 2, 3])], "new-image.png", { type: "image/png" });
    const uploaded = await uploadServiceImage("11111111-1111-4111-8111-111111111111", file);

    assert.match(uploaded.path, /^services\/11111111-1111-4111-8111-111111111111\//);
    assert.equal(uploaded.publicUrl, `https://cdn.example.com/${uploaded.path}`);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0]?.options.contentType, "image/png");
    assert.equal(uploads[0]?.options.upsert, false);
  } finally {
    moduleLoader._load = originalLoad;
  }

  console.log("service image storage: OK");
}

void main().catch((error) => {
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});
