export type UserRole = "admin" | "manager" | "staff";

export interface AppUser {
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

const KEY = "training:users:v1";
let mem: Record<string, AppUser> = {};

const hasKV = () =>
  !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function kvRead(): Promise<Record<string, AppUser>> {
  const { kv } = await import("@vercel/kv");
  return (await kv.get<Record<string, AppUser>>(KEY)) ?? {};
}

async function kvWrite(users: Record<string, AppUser>): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(KEY, users);
}

async function seedIfEmpty(users: Record<string, AppUser>): Promise<Record<string, AppUser>> {
  if (Object.keys(users).length > 0) return users;
  const jasonHash = process.env.USER_JASON_HASH;
  if (!jasonHash) return users;
  const seeded: Record<string, AppUser> = {
    "jason@allstartalent.us": {
      email: "jason@allstartalent.us",
      name: "Jason Litchney",
      passwordHash: jasonHash,
      role: "admin",
      active: true,
      createdAt: new Date().toISOString(),
    },
  };
  if (hasKV()) await kvWrite(seeded);
  else mem = seeded;
  return seeded;
}

export async function getAllUsers(): Promise<Record<string, AppUser>> {
  if (!hasKV()) return seedIfEmpty(Object.keys(mem).length > 0 ? mem : {});
  try {
    return seedIfEmpty(await kvRead());
  } catch {
    return {};
  }
}

export async function getUser(email: string): Promise<AppUser | null> {
  const users = await getAllUsers();
  return users[email.toLowerCase()] ?? null;
}

export async function createUser(user: AppUser): Promise<void> {
  const email = user.email.toLowerCase();
  if (!hasKV()) { mem = { ...mem, [email]: { ...user, email } }; return; }
  const users = await kvRead();
  await kvWrite({ ...users, [email]: { ...user, email } });
}

export async function updateUser(email: string, patch: Partial<AppUser>): Promise<AppUser | null> {
  const e = email.toLowerCase();
  if (!hasKV()) {
    const existing = mem[e];
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    mem = { ...mem, [e]: updated };
    return updated;
  }
  const users = await kvRead();
  const existing = users[e];
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await kvWrite({ ...users, [e]: updated });
  return updated;
}

export async function deleteUser(email: string): Promise<void> {
  const e = email.toLowerCase();
  if (!hasKV()) {
    const { [e]: _, ...rest } = mem;
    mem = rest;
    return;
  }
  const users = await kvRead();
  const { [e]: _, ...rest } = users;
  await kvWrite(rest);
}
