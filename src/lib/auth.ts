import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getUser, type UserRole } from "./users";

export const SESSION_COOKIE = "training_session";

export interface SessionUser {
  email: string;
  name: string;
  role: UserRole;
}

function secret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dev-secret-replace-in-production"
  );
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await getUser(email.toLowerCase());
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { email: user.email, name: user.name, role: user.role };
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      email: payload.email as string,
      name: payload.name as string,
      role: (payload.role as UserRole) ?? "staff",
    };
  } catch {
    return null;
  }
}
