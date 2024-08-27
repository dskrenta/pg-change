#!/usr/bin/env node

const path = require('path')
const fs = require('fs').promises

const cwd = process.cwd()

const sql = require(path.join(cwd, 'db'))

// The directory where migrations are stored
const MIGRATIONS_DIR = path.join(cwd, 'migrations')

// The name of the migrations table
const MIGRATIONS_TABLE = 'pg_migrations'

// The template for new migrations
const MIGRATION_TEMPLATE = `const sql = require('../db')

module.exports = async function () {
  return sql\`
    SELECT 1 + 1;
  \`
}
`

async function init () {
  // Create the migrations directory if it doesn't exist
  try {
    await fs.mkdir(MIGRATIONS_DIR)
  } catch (err) {
    // Ignore the error if the directory already exists
    if (err.code !== 'EEXIST') {
      throw err
    }
  }

  // Create the migrations table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(MIGRATIONS_TABLE)} (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `
}

function checkName (name) {
  // Check if a name was provided
  if (!name) {
    console.error('Please provide a migration name.')
    process.exit(1)
  }
}

async function createMigration (name) {
  // Check if a name was provided
  checkName(name)

  // Get the current timestamp
  const timestamp = new Date().getTime()

  // Create the filename
  const filename = `${timestamp}_${name}.js`

  // Get the full path to the migration
  const filepath = path.join(MIGRATIONS_DIR, filename)

  // Create the migration file
  await fs.writeFile(filepath, MIGRATION_TEMPLATE)

  // Log that the migration was created
  console.log(`Created migration ${filename}`)
}

async function runMigration (name, skipCheck = false) {
  // Check if a name was provided
  checkName(name)

  // Check if the migration has already been run (unless skipCheck is true)
  if (!skipCheck) {
    // Verify migration has not already been run
    const results = await sql`
      SELECT name FROM ${sql(MIGRATIONS_TABLE)}
      WHERE name = ${name};
    `

    // If the migration has already been run, exit
    if (results.length > 0) {
      console.error(`Migration ${name} has already been run.`)
      process.exit(1)
    }
  }

  // Get the full path to the migration
  const filepath = path.join(MIGRATIONS_DIR, name)

  let migrationFunction = null

  // Import the migration function
  try {
    migrationFunction = require(filepath)
  } catch (err) {
    console.error(`Unable to find migration ${name}`)
    process.exit(1)
  }

  // Log that the migration is running
  console.log(`Running migration ${name}`)

  // Run the migration
  await migrationFunction()

  // Add the migration to the migrations table
  await sql`
    INSERT INTO ${sql(MIGRATIONS_TABLE)} (name)
    VALUES (${name});
  `
}

async function runLatestMigrations () {
  // Get all migrations from migrations directory
  const filenames = await fs.readdir(MIGRATIONS_DIR)

  // Get all migrations from database
  const results = await sql`
    SELECT name FROM ${sql(MIGRATIONS_TABLE)}
    ORDER BY name;
  `

  // Get the names of migrations that have already been run
  const executed = results.map(result => result.name)

  // Verify that all executed migrations exist in the migrations directory
  for (const name of executed) {
    if (!filenames.includes(name)) {
      console.error(`Migration ${name} has already been run but does not exist in the migrations directory.`)
      process.exit(1)
    }
  }

  // Filter out migrations that have already been run
  const unrun = filenames.filter(filename => !executed.includes(filename))

  // Run all unrun migrations
  for (const name of unrun) {
    // Skip the README
    if (name === 'README.md') continue

    // Run the migration
    await runMigration(name, true)
  }
}

async function main () {
  try {
    if (!sql) {
      throw new Error('db.js not found, please create a postgres.js db connection file in order to use pgChange.')
    }

    // Initialize the migrations table
    await init()

    // Get the command
    const command = process.argv[2]

    // Get the name
    const name = process.argv[3]

    // Run the command
    switch (command) {
      // Create a new migration
      case 'create':
        await createMigration(name)

        break

      // Run a specific migration
      case 'run':
        await runMigration(name)

        break

      // Run all migrations that have not been run
      case 'run-latest':
        await runLatestMigrations()

        break

      // Help
      case 'help':
        console.log('Usage: pChange <command> [name]')
        console.log('Commands: create, run, run-latest')

        break

      // Reset the migrations table
      case 'reset':
        // Drop the migrations table
        await sql`
          DROP TABLE ${sql(MIGRATIONS_TABLE)};
        `

        // Reinitialize the migrations table
        await init()

        break

      // Catch all
      default:
        console.error('Unknown command. Use "create", "run", or "run-latest".')
        process.exit(1)
    }
  } catch (err) {
    console.error('pgChange error: ', err)
    process.exit(1)
  }

  // Exit the script
  process.exit(0)
}

// Run the script
main()
