import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const sqlitePath =
  process.env.AUTH_SQLITE_PATH ??
  resolve(process.cwd(), ".data", "auth.sqlite");

mkdirSync(dirname(sqlitePath), { recursive: true });

export const authDb = new DatabaseSync(sqlitePath);

authDb.exec("PRAGMA journal_mode = WAL");
authDb.exec("PRAGMA foreign_keys = ON");
