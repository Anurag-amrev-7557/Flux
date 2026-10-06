-- Cloudflare D1 Schema for Flux (Personal Finance Tracker)
-- Run this via: npx wrangler d1 execute flux_db --file=./d1-schema.sql

-- 1. Users metadata
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    created_at INTEGER NOT NULL
);

-- 2. Profiles / Persons
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    theme TEXT DEFAULT 'emerald',
    is_deleted INTEGER DEFAULT 0,
    modified_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    modified_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_profile ON categories(profile_id);

-- 4. Debts (Money lent or borrowed with persons)
CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    person_name TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('owe', 'lent')),
    purpose TEXT,
    due_date INTEGER,
    status TEXT NOT NULL CHECK(status IN ('active', 'settled')),
    is_deleted INTEGER DEFAULT 0,
    modified_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_profile ON debts(profile_id);
CREATE INDEX IF NOT EXISTS idx_debts_person ON debts(person_name);

-- 5. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    category_id TEXT,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
    timestamp INTEGER NOT NULL,
    note TEXT,
    tag_ids TEXT,
    is_deleted INTEGER DEFAULT 0,
    modified_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile ON transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
