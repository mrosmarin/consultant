import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documentBlobs } from "@/db/schema";

// Object storage for company documents (DEV-104). Uses Vercel Blob when
// BLOB_READ_WRITE_TOKEN is set (production); otherwise falls back to a DB table
// (dev/test — the sandbox can't reach Vercel Blob). Same interface either way.

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export type StoredFile = { storageKey: string; storageUrl: string | null };

// Store bytes under a key. Returns the key + a public URL (Blob) or null (DB).
export async function putFile(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<StoredFile> {
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, Buffer.from(bytes), {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { storageKey: key, storageUrl: blob.url };
  }
  // DB fallback: hold the bytes base64.
  const data = Buffer.from(bytes).toString("base64");
  await db
    .insert(documentBlobs)
    .values({ storageKey: key, data })
    .onConflictDoUpdate({ target: documentBlobs.storageKey, set: { data } });
  return { storageKey: key, storageUrl: null };
}

// Read bytes back for streaming a download.
export async function getFile(file: StoredFile): Promise<Uint8Array | null> {
  if (hasBlob() && file.storageUrl) {
    const res = await fetch(file.storageUrl);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }
  const [row] = await db
    .select({ data: documentBlobs.data })
    .from(documentBlobs)
    .where(eq(documentBlobs.storageKey, file.storageKey))
    .limit(1);
  return row ? new Uint8Array(Buffer.from(row.data, "base64")) : null;
}

// Best-effort delete of the stored bytes (metadata soft-delete is separate).
export async function deleteFile(file: StoredFile): Promise<void> {
  if (hasBlob() && file.storageUrl) {
    const { del } = await import("@vercel/blob");
    await del(file.storageUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
    return;
  }
  await db.delete(documentBlobs).where(eq(documentBlobs.storageKey, file.storageKey)).catch(() => {});
}
