import { createClient } from "@libsql/client";

const DB_URL = process.env["DB_URL"] ?? "http://localhost:8080";
const DB_AUTH_TOKEN = process.env["DB_AUTH_TOKEN"];

export const client = createClient({
  url: DB_URL,
  authToken: DB_AUTH_TOKEN,
});
