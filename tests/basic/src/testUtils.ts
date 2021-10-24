import * as fs from "fs";
import * as path from "path";
import { SQL } from "@rad/sqlite";

import { createClient, Client } from "./sqlite.generated.js";

function migrate(client: Client) {
  const dir = path.join(__dirname, "../db/migrations");
  const files = fs.readdirSync(dir);
  files.forEach((f) => {
    const sql = fs.readFileSync(path.join(dir, f), "utf-8");
    expect(sql).toMatch(/^-- migrate:up\n/m);
    expect(sql).toMatch("\n-- migrate:down\n");
    const endOfMigration = sql.indexOf("\n-- migrate:down\n");
    const upMigration = sql.substr(0, endOfMigration);
    client.$db.exec(upMigration);
  });
}

export let client: Client;
beforeAll(() => {
  client = createClient(":memory:");
  migrate(client);
});

beforeEach(() => {
  client.$db.run(SQL`BEGIN`);
});

afterEach(() => {
  try {
    client.$db.run(SQL`ROLLBACK`);
  } catch (e) {
    // error - no transaction is in progress
  }
});
