import { env } from 'cloudflare:workers';

import { hashPassword, verifyPassword } from './password';
import { DEFAULT_PASSWORD, SEED_ACCOUNTS } from './seed';

export type AccountRole = 'partner' | 'admin';

export type Account = {
  code: string;
  role: AccountRole;
  memberName: string;
  projectName: string;
  displayName: string;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SessionAccount = Account;

type AccountRow = {
  code: string;
  role: AccountRole;
  member_name: string;
  project_name: string;
  display_name: string;
  password_hash: string;
  must_change_password: number;
  created_at: string;
  updated_at: string;
};

export const SESSION_DAYS_DEFAULT = 30;
export const SESSION_DAYS_REMEMBER = 90;

let initialization: Promise<void> | undefined;

function getD1() {
  if (!env.DB) {
    throw new Error('D1 binding `DB` is unavailable.');
  }
  return env.DB;
}

function mapAccount(row: AccountRow): Account {
  return {
    code: row.code,
    role: row.role,
    memberName: row.member_name,
    projectName: row.project_name,
    displayName: row.display_name,
    mustChangePassword: row.must_change_password === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureAuthTables() {
  const db = getD1();
  await db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
      code TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('partner', 'admin')),
      member_name TEXT NOT NULL DEFAULT '',
      project_name TEXT NOT NULL DEFAULT '',
      display_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      account_code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_code) REFERENCES accounts(code)
    )`).run();

  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_account_code ON sessions (account_code)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at)').run();
}

async function seedAccountsIfEmpty() {
  const db = getD1();
  const count = await db.prepare('SELECT COUNT(*) AS total FROM accounts').first<{ total: number }>();
  if ((count?.total ?? 0) > 0) return;

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const statements = SEED_ACCOUNTS.map((account) =>
    db.prepare(`INSERT INTO accounts (
        code, role, member_name, project_name, display_name, password_hash, must_change_password
      ) VALUES (?, ?, ?, ?, ?, ?, 1)`)
      .bind(account.code, account.role, account.memberName, account.projectName, account.displayName, passwordHash),
  );
  await db.batch(statements);
}

export async function ensureAuthReady() {
  if (!initialization) {
    initialization = (async () => {
      await ensureAuthTables();
      await seedAccountsIfEmpty();
    })();
  }
  await initialization;
}

async function getAccountRow(code: string) {
  await ensureAuthReady();
  return getD1()
    .prepare(`SELECT code, role, member_name, project_name, display_name, password_hash,
      must_change_password, created_at, updated_at
      FROM accounts WHERE code = ?`)
    .bind(code)
    .first<AccountRow>();
}

export async function authenticateAccount(code: string, password: string) {
  const row = await getAccountRow(code.trim().toUpperCase());
  if (!row) return null;
  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;
  return mapAccount(row);
}

function hashToken(token: string) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)).then((buffer) => {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  });
}

function sessionExpiry(days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires.toISOString();
}

export async function createSession(accountCode: string, days = SESSION_DAYS_DEFAULT) {
  await ensureAuthReady();
  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  await getD1()
    .prepare('INSERT INTO sessions (token_hash, account_code, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, accountCode, sessionExpiry(days))
    .run();
  return token;
}

export async function refreshSession(token: string, days = SESSION_DAYS_DEFAULT) {
  await ensureAuthReady();
  const tokenHash = await hashToken(token);
  const result = await getD1()
    .prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ? AND expires_at > ?')
    .bind(sessionExpiry(days), tokenHash, new Date().toISOString())
    .run();
  return Boolean(result.meta.changes);
}

export async function deleteSession(token: string) {
  await ensureAuthReady();
  const tokenHash = await hashToken(token);
  await getD1().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function getAccountBySessionToken(token: string) {
  await ensureAuthReady();
  const tokenHash = await hashToken(token);
  const row = await getD1()
    .prepare(`SELECT a.code, a.role, a.member_name, a.project_name, a.display_name,
      a.password_hash, a.must_change_password, a.created_at, a.updated_at
      FROM sessions s
      INNER JOIN accounts a ON a.code = s.account_code
      WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(tokenHash, new Date().toISOString())
    .first<AccountRow>();
  return row ? mapAccount(row) : null;
}

export async function changeAccountPassword(code: string, newPassword: string) {
  await ensureAuthReady();
  const passwordHash = await hashPassword(newPassword);
  const result = await getD1()
    .prepare(`UPDATE accounts
      SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
      WHERE code = ?`)
    .bind(passwordHash, code)
    .run();
  if (!result.meta.changes) return null;
  return getAccountRow(code).then((row) => (row ? mapAccount(row) : null));
}

export async function listAccounts() {
  await ensureAuthReady();
  const result = await getD1()
    .prepare(`SELECT code, role, member_name, project_name, display_name,
      password_hash, must_change_password, created_at, updated_at
      FROM accounts
      ORDER BY CASE WHEN code = 'ADMIN' THEN 0 ELSE 1 END, code ASC`)
    .all<AccountRow>();
  return (result.results ?? []).map(mapAccount);
}

export async function getAccount(code: string) {
  const row = await getAccountRow(code);
  return row ? mapAccount(row) : null;
}

export type AccountInput = {
  code: string;
  role: AccountRole;
  memberName: string;
  projectName: string;
  displayName: string;
};

export async function createAccount(input: AccountInput) {
  await ensureAuthReady();
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  await getD1()
    .prepare(`INSERT INTO accounts (
        code, role, member_name, project_name, display_name, password_hash, must_change_password
      ) VALUES (?, ?, ?, ?, ?, ?, 1)`)
    .bind(input.code, input.role, input.memberName, input.projectName, input.displayName, passwordHash)
    .run();
  return getAccount(input.code);
}

export async function updateAccount(input: AccountInput) {
  await ensureAuthReady();
  const result = await getD1()
    .prepare(`UPDATE accounts
      SET role = ?, member_name = ?, project_name = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE code = ?`)
    .bind(input.role, input.memberName, input.projectName, input.displayName, input.code)
    .run();
  if (!result.meta.changes) return null;
  return getAccount(input.code);
}

export async function deleteAccount(code: string) {
  await ensureAuthReady();
  await getD1().prepare('DELETE FROM sessions WHERE account_code = ?').bind(code).run();
  const result = await getD1().prepare('DELETE FROM accounts WHERE code = ?').bind(code).run();
  return Boolean(result.meta.changes);
}

export async function resetAccountPassword(code: string) {
  await ensureAuthReady();
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const result = await getD1()
    .prepare(`UPDATE accounts
      SET password_hash = ?, must_change_password = 1, updated_at = CURRENT_TIMESTAMP
      WHERE code = ?`)
    .bind(passwordHash, code)
    .run();
  if (!result.meta.changes) return null;
  await getD1().prepare('DELETE FROM sessions WHERE account_code = ?').bind(code).run();
  return getAccount(code);
}
