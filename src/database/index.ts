import postgres from "postgres";

const DB_HOST = process.env["DB_HOST"];
const DB_NAME = process.env["DB_NAME"];
const DB_USER = process.env["DB_USER"];
const DB_PW = process.env["DB_PW"];

export const sql = postgres({
  host: DB_HOST,
  port: 5432,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PW,
  ssl: true,
});
