import "server-only";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Built-in auth backend, used when AUTH_API_URL is empty.
 * Users live in a JSON file (dev / single-instance only — swap for a real database in production).
 * Passwords: scrypt + per-user salt. Sessions: HMAC-signed token `<payload>.<sig>`.
 */
type User = { id: string; name: string; email: string; salt: string; hash: string; createdAt: string; onboarded?: boolean; planChosen?: boolean };

const FILE = process.env.AUTH_STORE_FILE ?? path.join(process.cwd(), ".data", "users.json");
let queue: Promise<unknown> = Promise.resolve();

/** Serialize read-modify-write so concurrent signups can't clobber each other. */
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function load(): Promise<User[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as User[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function save(users: User[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(users, null, 2), { mode: 0o600 });
  await fs.rename(tmp, FILE);
}

const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 64).toString("hex");

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production.");
  return "tidypin-dev-secret-change-me";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function issueToken(userId: string, ttlSeconds: number) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id for a valid, unexpired token; otherwise null. */
export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: string; exp?: number };
    return sub && typeof exp === "number" && exp > Date.now() / 1000 ? sub : null;
  } catch {
    return null;
  }
}

export type RegisterResult = { ok: true; id: string } | { ok: false; reason: "exists" };

export function registerUser(input: { name: string; email: string; password: string }): Promise<RegisterResult> {
  return locked(async () => {
    const users = await load();
    const email = input.email.trim().toLowerCase();
    if (users.some((u) => u.email === email)) return { ok: false, reason: "exists" } as const;
    const salt = randomBytes(16).toString("hex");
    const user: User = {
      id: randomUUID(),
      name: input.name.trim(),
      email,
      salt,
      hash: hashPassword(input.password, salt),
      createdAt: new Date().toISOString(),
    };
    await save([...users, user]);
    return { ok: true, id: user.id } as const;
  });
}

// Fixed dummy so unknown emails cost the same as wrong passwords (no user enumeration by timing).
const DUMMY_SALT = "00".repeat(16);

export async function verifyLogin(emailInput: string, password: string): Promise<string | null> {
  const email = emailInput.trim().toLowerCase();
  const user = (await load()).find((u) => u.email === email);
  const candidate = Buffer.from(hashPassword(password, user?.salt ?? DUMMY_SALT), "hex");
  if (!user) return null;
  const actual = Buffer.from(user.hash, "hex");
  return candidate.length === actual.length && timingSafeEqual(candidate, actual) ? user.id : null;
}

export async function getUser(id: string) {
  const u = (await load()).find((x) => x.id === id);
  return u ? { id: u.id, name: u.name, email: u.email, onboarded: u.onboarded === true, planChosen: u.planChosen === true } : null;
}

/** Marks the Get started screen as seen (idempotent). */
export function markOnboarded(id: string): Promise<void> {
  return locked(async () => {
    const users = await load();
    const u = users.find((x) => x.id === id);
    if (!u || u.onboarded) return;
    u.onboarded = true;
    await save(users);
  });
}

/** Marks that the user has picked (or skipped) a plan (idempotent). */
export function markPlanChosen(id: string): Promise<void> {
  return locked(async () => {
    const users = await load();
    const u = users.find((x) => x.id === id);
    if (!u || u.planChosen) return;
    u.planChosen = true;
    await save(users);
  });
}
