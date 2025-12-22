import {
  schools,
  type School,
  type TeacherRecord,
  type TeacherRecordsData,
  teacherRecords,
  type User,
  type UserRole,
  users,
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export type CreateUserInput = {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  schoolName: string;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = storedHash.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const storedKey = Buffer.from(keyB64, "base64");
  const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;
  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getSchool(id: string): Promise<School | undefined>;
  getOrCreateSchoolByName(name: string): Promise<School>;
  countUsers(): Promise<number>;
  listUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<User>;
  getTeacherRecords(userId: string): Promise<TeacherRecord | undefined>;
  upsertTeacherRecords(userId: string, data: TeacherRecordsData): Promise<TeacherRecord>;
  clearTeacherRecords(userId: string): Promise<void>;
}

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const normalizeSchoolName = (value: string) => value.trim();

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private schoolsById: Map<string, School>;
  private schoolIdByName: Map<string, string>;
  private teacherRecordsByUserId: Map<string, TeacherRecord>;

  constructor() {
    this.users = new Map();
    this.schoolsById = new Map();
    this.schoolIdByName = new Map();
    this.teacherRecordsByUserId = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const normalized = normalizeUsername(username);
    return Array.from(this.users.values()).find((user) => user.username === normalized);
  }

  async getSchool(id: string): Promise<School | undefined> {
    return this.schoolsById.get(id);
  }

  async getOrCreateSchoolByName(name: string): Promise<School> {
    const normalized = normalizeSchoolName(name);
    const existingId = this.schoolIdByName.get(normalized);
    if (existingId) {
      const existing = this.schoolsById.get(existingId);
      if (existing) return existing;
    }

    const id = randomUUID();
    const now = new Date();
    const school: School = { id, name: normalized, createdAt: now };
    this.schoolsById.set(id, school);
    this.schoolIdByName.set(normalized, id);
    return school;
  }

  async countUsers(): Promise<number> {
    return this.users.size;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const username = normalizeUsername(input.username);
    const existing = await this.getUserByUsername(username);
    if (existing) {
      throw new Error("username already exists");
    }

    const school = await this.getOrCreateSchoolByName(input.schoolName);
    const passwordHash = await hashPassword(input.password);

    const id = randomUUID();
    const now = new Date();
    const user: User = {
      id,
      username,
      passwordHash,
      name: input.name.trim(),
      role: input.role,
      schoolId: school.id,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    return user;
  }

  async getTeacherRecords(userId: string): Promise<TeacherRecord | undefined> {
    return this.teacherRecordsByUserId.get(userId);
  }

  async upsertTeacherRecords(userId: string, data: TeacherRecordsData): Promise<TeacherRecord> {
    const now = new Date();
    const existing = this.teacherRecordsByUserId.get(userId);
    const record: TeacherRecord = {
      userId,
      data,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.teacherRecordsByUserId.set(userId, record);
    return record;
  }

  async clearTeacherRecords(userId: string): Promise<void> {
    this.teacherRecordsByUserId.delete(userId);
  }
}

export class DbStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor(databaseUrl: string) {
    const sqlClient = neon(databaseUrl);
    this.db = drizzle(sqlClient);
  }

  async getUser(id: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const normalized = normalizeUsername(username);
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.username, normalized))
      .limit(1);
    return rows[0];
  }

  async getSchool(id: string): Promise<School | undefined> {
    const rows = await this.db.select().from(schools).where(eq(schools.id, id)).limit(1);
    return rows[0];
  }

  async getOrCreateSchoolByName(name: string): Promise<School> {
    const normalized = normalizeSchoolName(name);
    const existing = await this.db
      .select()
      .from(schools)
      .where(eq(schools.name, normalized))
      .limit(1);
    if (existing[0]) return existing[0];

    try {
      const created = await this.db
        .insert(schools)
        .values({ name: normalized })
        .returning();
      return created[0]!;
    } catch {
      const retry = await this.db
        .select()
        .from(schools)
        .where(eq(schools.name, normalized))
        .limit(1);
      if (!retry[0]) throw new Error("failed to create school");
      return retry[0];
    }
  }

  async countUsers(): Promise<number> {
    const rows = await this.db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(rows[0]?.count ?? 0);
  }

  async listUsers(): Promise<User[]> {
    return this.db.select().from(users).orderBy(asc(users.createdAt));
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const username = normalizeUsername(input.username);
    const existing = await this.getUserByUsername(username);
    if (existing) {
      throw new Error("username already exists");
    }

    const school = await this.getOrCreateSchoolByName(input.schoolName);
    const passwordHash = await hashPassword(input.password);
    const created = await this.db
      .insert(users)
      .values({
        username,
        passwordHash,
        name: input.name.trim(),
        role: input.role,
        schoolId: school.id,
      })
      .returning();
    return created[0]!;
  }

  async getTeacherRecords(userId: string): Promise<TeacherRecord | undefined> {
    const rows = await this.db
      .select()
      .from(teacherRecords)
      .where(eq(teacherRecords.userId, userId))
      .limit(1);
    return rows[0];
  }

  async upsertTeacherRecords(userId: string, data: TeacherRecordsData): Promise<TeacherRecord> {
    const rows = await this.db
      .insert(teacherRecords)
      .values({ userId, data })
      .onConflictDoUpdate({
        target: teacherRecords.userId,
        set: {
          data,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return rows[0]!;
  }

  async clearTeacherRecords(userId: string): Promise<void> {
    await this.db.delete(teacherRecords).where(eq(teacherRecords.userId, userId));
  }
}

const runtimeEnv = process.env.NODE_ENV ?? "development";
if (runtimeEnv === "production" && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in production");
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DbStorage(process.env.DATABASE_URL)
  : new MemStorage();
