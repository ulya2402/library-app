CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  identity_number TEXT UNIQUE NOT NULL,
  join_date INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  role TEXT DEFAULT 'member'
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  borrow_date INTEGER NOT NULL,
  due_date INTEGER NOT NULL,
  return_date INTEGER,
  status TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);