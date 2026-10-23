import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute } from 'node:path'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

/**
 * Database configuration.
 * Defines database connections, query settings, and migration options.
 */
/**
 * DB_PATH decides where the SQLite file lives. Without it the historical location
 * (database/seeders/db.sqlite3) is kept so that existing data is never silently abandoned.
 * Tests always get their own file through .env.test.
 */
const dbFile = (() => {
  const configured = env.get('DB_PATH')
  if (!configured) return app.tmpPath('db/db.sqlite3')
  const file = isAbsolute(configured) ? configured : app.makePath(configured)
  mkdirSync(dirname(file), { recursive: true })
  return file
})()

const dbConfig = defineConfig({
  /**
   * The default database connection to use for making queries.
   */
  connection: 'sqlite',

  /**
   * Pretty print SQL queries in development mode for easier debugging.
   */
  prettyPrintDebugQueries: true,

  /**
   * Available database connections.
   * Multiple connections can be configured for different databases.
   */
  connections: {
    /**
     * SQLite connection configuration.
     * Uses better-sqlite3 driver for synchronous SQLite operations.
     */
    sqlite: {
      client: 'better-sqlite3',

      /**
       * SQLite database connection settings.
       */
      connection: {
        /**
         * Path to the SQLite database file.
         * Stored in the tmp directory by default.
         */
        filename: dbFile,
      },

      /**
       * Use NULL as default value for undefined columns.
       * Required for SQLite compatibility.
       */
      useNullAsDefault: true,

      /**
       * Migration settings for this connection.
       */
      migrations: {
        /**
         * Sort migration files in natural order (1, 2, 10 instead of 1, 10, 2).
         */
        naturalSort: true,

        /**
         * Directories where migration files are stored.
         */
        paths: ['database/migrations'],
      },

      /**
       * Enable SQL query debugging in development mode.
       */
      debug: app.inDev,
    },
  },
})

export default dbConfig
