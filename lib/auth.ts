import { cache } from "react";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { LOCAL_OWNER } from "@/lib/local-owner";

export function isOwnerEmail(email: string | null | undefined) {
  if (!email) return false;
  // Local mode: the hard-coded owner is always valid
  if (email.toLowerCase() === LOCAL_OWNER.email.toLowerCase()) return true;
  return email.toLowerCase() === (env.ownerEmail ?? LOCAL_OWNER.email).toLowerCase();
}

/** Always returns the local owner — no login required. */
export const getOwnerUser = cache(async () => {
  return LOCAL_OWNER;
});

export async function requireOwnerUser() {
  const user = await getOwnerUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

export function requireOwnerEmailConfigured() {
  const email = env.ownerEmail ?? LOCAL_OWNER.email;
  if (!email) {
    throw new Error("OWNER_EMAIL is not configured.");
  }
  return email;
}

export function serializeUser(user: typeof LOCAL_OWNER | null) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
  };
}
