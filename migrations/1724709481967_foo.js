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
