import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadEnvConfig } from "@next/env";
import { getMigrations } from "better-auth/db/migration";

loadEnvConfig(process.cwd());

const sqlitePath = resolve(process.env.AUTH_SQLITE_PATH ?? ".data/auth.sqlite");

function readPositiveIntegerEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

mkdirSync(dirname(sqlitePath), { recursive: true });

const db = new DatabaseSync(sqlitePath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations({
  appName: "Auth POC",
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.APP_SESSION_SECRET,
  database: db,
  session: {
    expiresIn: readPositiveIntegerEnv("AUTH_SESSION_TTL_SECONDS", 60 * 60),
    updateAge: readPositiveIntegerEnv("AUTH_SESSION_UPDATE_AGE_SECONDS", 15 * 60),
    additionalFields: {
      decodedIdToken: {
        type: "json",
        required: false,
      },
      entraExternalIdToken: {
        type: "string",
        required: false,
        returned: false,
      },
      entraExternalRefreshToken: {
        type: "string",
        required: false,
        returned: false,
      },
    },
  },
  advanced: {
    cookies: {
      session_token: {
        attributes: {
          sameSite: "strict",
        },
      },
    },
  },
});

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log("Auth database is already up to date.");
} else {
  await runMigrations();
  console.log(`Auth database migrated at ${sqlitePath}.`);
}

db.close();
