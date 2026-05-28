import { appLogger } from '../logger'
import fs from 'fs'
import path from 'path'

export interface MigrationStep {
  version: number
  up: () => Promise<void> | void
}

/**
 * MigrationManager handles both SQLite schema migrations and JSON file migrations.
 */
export class MigrationManager {
  private userDataPath: string

  constructor(userDataPath: string) {
    this.userDataPath = userDataPath
  }

  /**
   * Run migrations for a SQLite database.
   * @param db The SQLite database instance (compatible with BetterSqlite3 or node:sqlite)
   * @param migrations List of migration steps
   */
  async migrateSqlite(db: any, migrations: MigrationStep[]): Promise<void> {
    const currentVersion = this.getSqliteVersion(db)
    appLogger.info('Checking SQLite migrations', { currentVersion })

    for (const step of migrations) {
      if (step.version > currentVersion) {
        appLogger.info(`Applying SQLite migration to version ${step.version}`)
        try {
          await step.up()
          this.setSqliteVersion(db, step.version)
        } catch (err) {
          appLogger.error(`Failed SQLite migration to version ${step.version}`, { error: (err as Error).message })
          throw err // Re-throw to prevent data corruption
        }
      }
    }
  }

  /**
   * Run migrations for a JSON file.
   * @param fileName The name of the file in userData (e.g., 'connections.json')
   * @param migrations List of migration steps
   */
  async migrateJson(fileName: string, migrations: MigrationStep[]): Promise<void> {
    const filePath = path.join(this.userDataPath, fileName)
    if (!fs.existsSync(filePath)) return

    let data: any
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch (err) {
      appLogger.error(`Failed to read ${fileName} for migration`, { error: (err as Error).message })
      return
    }

    const currentVersion = Array.isArray(data) ? 0 : (data.version || 0)
    let modified = false

    // If it's a legacy array, wrap it in a versioned object first
    if (Array.isArray(data)) {
      appLogger.info(`Converting legacy array to versioned object for ${fileName}`)
      if (fileName === 'connections.json') {
        data = { version: 0, connections: data }
      } else if (fileName === 'saved-queries.json') {
        data = { version: 0, queries: data }
      } else {
        data = { version: 0, data: data }
      }
      modified = true
    }

    for (const step of migrations) {
      if (step.version > currentVersion) {
        appLogger.info(`Applying JSON migration for ${fileName} to version ${step.version}`)
        // Note: JSON migrations usually need to operate on the 'data' object itself.
        // We'll pass the data to the step if we ever need complex logic, 
        // but for now we'll just track the version.
        await step.up()
        data.version = step.version
        modified = true
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    }
  }

  private getSqliteVersion(db: any): number {
    try {
      // PRAGMA user_version is a standard way to track schema version in SQLite
      if (typeof db.pragma === 'function') {
        const result = db.pragma('user_version')
        return Array.isArray(result) ? result[0].user_version : (result as any).user_version ?? 0
      } else {
        // Fallback for node:sqlite if it doesn't have .pragma()
        const row = db.prepare('PRAGMA user_version').get()
        return row?.user_version ?? 0
      }
    } catch (err) {
      appLogger.warn('Failed to get SQLite user_version', { error: (err as Error).message })
      return 0
    }
  }

  private setSqliteVersion(db: any, version: number): void {
    try {
      if (typeof db.pragma === 'function') {
        db.pragma(`user_version = ${version}`)
      } else {
        db.prepare(`PRAGMA user_version = ${version}`).run()
      }
    } catch (err) {
      appLogger.error(`Failed to set SQLite user_version to ${version}`, { error: (err as Error).message })
    }
  }
}
