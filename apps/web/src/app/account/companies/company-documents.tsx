"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { uploadDocument, deleteDocument } from "./documents-actions";

export type CompanyDocument = {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CompanyDocuments({
  companyId,
  documents,
}: {
  companyId: string;
  documents: CompanyDocument[];
}) {
  const [state, formAction, pending] = useActionState(uploadDocument, null);

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No documents yet — upload one below.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Size</th>
                <th className="px-4 py-2 font-medium">Added</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2">
                    <a
                      href={`/account/documents/${d.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      {d.name}
                    </a>
                  </td>
                  <td className="text-muted-foreground px-4 py-2">{humanSize(d.sizeBytes)}</td>
                  <td className="text-muted-foreground px-4 py-2 font-mono text-xs">
                    {d.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteDocument}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="companyId" value={companyId} />
                      <button className="text-muted-foreground hover:text-destructive text-xs">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-2">
          <Label htmlFor="file">Upload a document (max 10 MB)</Label>
          <Input id="file" name="file" type="file" required className="max-w-sm" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
        {state?.error ? <p className="text-destructive w-full text-sm">{state.error}</p> : null}
        {state?.ok ? <p className="text-brand w-full text-sm">Document uploaded.</p> : null}
      </form>
    </div>
  );
}
