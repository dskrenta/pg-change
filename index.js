#!/usr/bin/env node

import path from "path";
import { promises as fs } from "fs";

import postgres from "postgres";

const DEBUG = false;

const MIGRATIONS_TABLE = "pg_migrations";

const MIGRATION_TEMPLATE = `export default async function (sql) {
  return sql\`
    SELECT 1 + 1;
  \`
}
`;

async function main() {
  try {
    let rootDir = await findProjectRoot();

    const CONFIG_FILE = path.join(rootDir, "pgChange.json");

    const {
      migrationsPath,
      postgresHost,
      postgresPort,
      postgresUser,
      postgresPassword,
      postgresDb,
    } = await getConfig();

    const sql = postgres({
      host: postgresHost,
      port: postgresPort,
      database: postgresDb,
      username: postgresUser,
      password: postgresPassword,

      onnotice: () => {}, // Show no notices
    });

    const MIGRATIONS_DIR = path.join(rootDir, migrationsPath);

    async function fileExists(path) {
      try {
        await fs.access(path);
        return true;
      } catch (err) {
        return false;
      }
    }

    async function findProjectRoot() {
      let currentDir = process.cwd();

      while (currentDir !== path.dirname(currentDir)) {
        if (await fileExists(path.join(currentDir, "package.json"))) {
          return currentDir;
        }

        currentDir = path.dirname(currentDir);
      }

      throw new Error("Unable to find project root.");
    }

    async function init() {
      try {
        await fs.mkdir(MIGRATIONS_DIR);
      } catch (err) {
        if (err.code !== "EEXIST") {
          throw err;
        }
      }

      await sql`
        CREATE TABLE IF NOT EXISTS ${sql(MIGRATIONS_TABLE)} (
          name TEXT PRIMARY KEY,
          executed_at TIMESTAMP DEFAULT NOW()
        );
      `;
    }

    function checkName(name) {
      if (!name) {
        console.error("Please provide a migration name.");
        process.exit(1);
      }
    }

    async function createMigration(name) {
      checkName(name);

      const timestamp = new Date().getTime();

      const filename = `${timestamp}_${name}.js`;

      const filepath = path.join(MIGRATIONS_DIR, filename);

      await fs.writeFile(filepath, MIGRATION_TEMPLATE);

      console.log(`Created migration ${filename}`);
    }

    async function runMigration(name, skipCheck = false) {
      checkName(name);

      if (!skipCheck) {
        const results = await sql`
          SELECT name FROM ${sql(MIGRATIONS_TABLE)}
          WHERE name = ${name};
        `;

        if (results.length > 0) {
          console.error(`Migration ${name} has already been run.`);
          process.exit(1);
        }
      }

      const filepath = path.join(MIGRATIONS_DIR, name);

      let migrationFunction = null;

      try {
        const { default: importedFunction } = await import(filepath);
        migrationFunction = importedFunction;
      } catch (err) {
        console.error(`Unable to find migration ${name}`);
        process.exit(1);
      }

      console.log(`Running migration ${name}`);

      await migrationFunction(sql);

      await sql`
        INSERT INTO ${sql(MIGRATIONS_TABLE)} (name)
        VALUES (${name});
      `;
    }

    async function runLatestMigrations() {
      const filenames = await fs.readdir(MIGRATIONS_DIR);

      const results = await sql`
        SELECT name FROM ${sql(MIGRATIONS_TABLE)}
        ORDER BY name;
      `;

      const executed = results.map((result) => result.name);

      for (const name of executed) {
        if (!filenames.includes(name)) {
          console.error(
            `Migration ${name} has already been run but does not exist in the migrations directory.`
          );
          process.exit(1);
        }
      }

      const unrun = filenames.filter(
        (filename) => !executed.includes(filename)
      );

      for (const name of unrun) {
        if (name === "README.md") continue;

        await runMigration(name, true);
      }
    }

    async function getConfig() {
      if (!(await fileExists(CONFIG_FILE))) {
        throw new Error(
          "No pgChange.json config file found. Please create one at the root of your project."
        );
      }

      const configFile = await fs.readFile(CONFIG_FILE);

      return JSON.parse(configFile);
    }

    async function cli() {
      await init();

      const command = process.argv[2];

      const name = process.argv[3];

      switch (command) {
        case "create":
          await createMigration(name);

          break;

        case "run":
          await runMigration(name);

          break;

        case "run-latest":
          await runLatestMigrations();

          break;

        case "help":
          console.log("Usage: pgChange <command> [name]");
          console.log("Commands: create, run, run-latest, help, config");

          break;

        case "reset":
          await sql`
            DROP TABLE ${sql(MIGRATIONS_TABLE)};
          `;

          await init();

          break;

        case "config":
          const config = await getConfig();

          console.log(JSON.stringify(config, null, 2));

          break;

        default:
          console.error(
            'Unknown command. Use "create", "run", "run-latest", "help", or "config".'
          );
          process.exit(1);
      }

      process.exit(0);
    }

    await cli();
  } catch (err) {
    console.error("pgChange error: ", DEBUG ? err : err.message);
    process.exit(1);
  }
}

main();
