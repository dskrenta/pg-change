# pg-change

Postgres migration tool built with Node.js using the [Postgres.js](https://github.com/porsager/postgres) driver

## Install

`npx pgChange` or `npm i -g pgChange`

## Usage

### Create a postgres.js db connection file
Put this `db.js` connection file in the directory you plan to run pgChange:
```
const postgres = require('postgres')

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'password',

  onnotice: () => { } // Show no notices
})

module.exports = sql
```

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
