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
