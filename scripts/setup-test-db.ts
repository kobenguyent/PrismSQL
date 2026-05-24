const fs = require('node:fs')
const path = require('node:path')

function openDatabaseSync(dbPath) {
  const nodeSqlite = process.getBuiltinModule?.('node:sqlite')
  if (nodeSqlite?.DatabaseSync) {
    return new nodeSqlite.DatabaseSync(dbPath)
  }

  const BetterSqlite3 = require('better-sqlite3')
  return new BetterSqlite3(dbPath)
}

function setupTestDb(targetPath) {
  const databasePath = path.resolve(targetPath)
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })
  if (fs.existsSync(databasePath)) {
    fs.rmSync(databasePath, { force: true })
  }

  const db = openDatabaseSync(databasePath)

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL
    );

    CREATE TABLE posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE comments (
      id INTEGER PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    INSERT INTO users (id, email, display_name) VALUES
      (1, 'alice@example.com', 'Alice'),
      (2, 'bob@example.com', 'Bob');

    INSERT INTO posts (id, user_id, title, body) VALUES
      (1, 1, 'Welcome', 'Post from Alice');

    INSERT INTO comments (id, post_id, user_id, message) VALUES
      (1, 1, 2, 'Great post!');
  `)

  db.close()
  return databasePath
}

if (require.main === module) {
  const outputPath = process.argv[2] || path.resolve(process.cwd(), '.tmp/database-visualizer-e2e.sqlite')
  const seededPath = setupTestDb(outputPath)
  console.log(`Seeded test database at ${seededPath}`)
}

module.exports = {
  setupTestDb
}
