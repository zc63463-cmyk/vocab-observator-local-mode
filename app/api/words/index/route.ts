import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireOwnerApiSession } from "@/lib/request-auth";

export async function GET() {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const { data, error } = await sql<{
    id: string;
    slug: string;
    title: string;
    lemma: string;
    ipa: string | null;
    short_definition: string | null;
    metadata: unknown;
  }>`
    SELECT id, slug, title, lemma, ipa, short_definition, metadata
    FROM words
    WHERE is_published = true AND is_deleted = false
    ORDER BY lemma ASC
  `;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
