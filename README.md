# pg-change

Postgres migration tool built with Node.js using the [Postgres.js](https://github.com/porsager/postgres) client

## Install

`npx pgChange` or `npm i -g pgChange`

## Usage

### Create a pgChange.json configuration file

Put this `pgChange.json` configuration file in the root directory of your project with your own values here:

```
{
  "migrationsPath": "migrations",
  "postgresHost": "localhost",
  "postgresPort": "5432",
  "postgresUser": "postgres",
  "postgresPassword": "password",
  "postgresDb": "postgres"
}
```

Don't forget to add `pgChange.json` to your `.gitignore` file

### Create a migration

```
pgChange create users
Created migration 1724709481967_users.js
```

### Edit the created migration

`migrations/1724709481967_users.js`:

```
const sql = require('../db')

module.exports = async function () {
  return sql`
    CREATE TABLE USERS (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `
}
```

### Run all the latest migrations that have not run

```
pgChange run-latest
Running migration 1724709481967_users.js
```

### Run a specific migration

```
pgChange run 1724709481967_users.js
Running migration 1724709481967_users.js
```

## Development

```
npm i
npm link
```
