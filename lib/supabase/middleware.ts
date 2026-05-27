import { NextResponse, type NextRequest } from "next/server";
import { LOCAL_OWNER } from "@/lib/local-owner";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  return { response, user: LOCAL_OWNER };
}
