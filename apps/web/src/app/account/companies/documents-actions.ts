"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, companyDocuments } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { putFile, deleteFile } from "@/lib/storage";

export type DocumentState = { ok: boolean; error?: string } | null;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const revalidate = (companyId: string) => revalidatePath(`/account/companies/${companyId}/edit`);

export async function uploadDocument(
  _prev: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const file = formData.get("file");
  if (!companyId) return { ok: false, error: "Missing company." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File is larger than 10 MB." };

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(eq(companies.id, companyId), eq(companies.userId, session.user.id), isNull(companies.deletedAt)),
    )
    .limit(1);
  if (!company) return { ok: false, error: "Pick one of your companies." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";
  const storageKey = `companies/${companyId}/${crypto.randomUUID()}-${safeName}`;
  const stored = await putFile(storageKey, bytes, file.type || "application/octet-stream");

  await db.insert(companyDocuments).values({
    userId: session.user.id,
    companyId,
    name: file.name.slice(0, 200),
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storageKey: stored.storageKey,
    storageUrl: stored.storageUrl,
  });
  revalidate(companyId);
  return { ok: true };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  const companyId = (formData.get("companyId") as string)?.trim();
  if (!id) return;

  const [doc] = await db
    .select()
    .from(companyDocuments)
    .where(and(eq(companyDocuments.id, id), eq(companyDocuments.userId, session.user.id)))
    .limit(1);
  if (!doc) return;

  await db
    .update(companyDocuments)
    .set({ deletedAt: new Date() })
    .where(and(eq(companyDocuments.id, id), eq(companyDocuments.userId, session.user.id)));
  await deleteFile({ storageKey: doc.storageKey, storageUrl: doc.storageUrl });
  if (companyId) revalidate(companyId);
}
