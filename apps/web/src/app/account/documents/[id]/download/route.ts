import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companyDocuments } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { getFile } from "@/lib/storage";

// Authenticated download of a company document (DEV-104). Owner-scoped; streams
// the stored bytes (from Vercel Blob in prod, or the DB fallback in dev).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const [doc] = await db
    .select()
    .from(companyDocuments)
    .where(
      and(
        eq(companyDocuments.id, id),
        eq(companyDocuments.userId, session.user.id),
        isNull(companyDocuments.deletedAt),
      ),
    )
    .limit(1);
  if (!doc) return new Response("Not found", { status: 404 });

  const bytes = await getFile({ storageKey: doc.storageKey, storageUrl: doc.storageUrl });
  if (!bytes) return new Response("Not found", { status: 404 });

  // Copy into a concrete ArrayBuffer so the body is an unambiguous BodyInit.
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);

  return new Response(body, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `attachment; filename="${doc.name.replace(/"/g, "")}"`,
    },
  });
}
