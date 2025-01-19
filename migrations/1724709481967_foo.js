export default async function (sql) {
  return sql`
    CREATE TABLE USERS (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `;
}
