import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

export type UserRole = "admin" | "manager" | "staff" | "viewer";

export interface SessionUser {
  email: string;
  name: string;
  role: UserRole;
}

export async function getSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return {
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    role: ((session.user as { role?: string }).role as UserRole) ?? "admin",
  };
}
