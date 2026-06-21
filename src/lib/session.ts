import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptions } from "./auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return typeof token?.id === "string" ? token.id : null;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
