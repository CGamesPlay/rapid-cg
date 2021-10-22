import SQL from "./tag.js";
import { Database } from "./driver.js";

describe("Database", () => {
  let db: Database;
  beforeAll(() => {
    db = new Database(":memory:");
    db.run(SQL`CREATE TABLE tbl ( col TEXT )`);
    const ret = db.run(SQL`INSERT INTO tbl VALUES ( ${"row 1"} )`);
  });

  beforeEach(() => {
    db.run(SQL`BEGIN`);
  });

  afterEach(() => {
    db.run(SQL`ROLLBACK`);
  });

  test(".run", () => {
    const ret = db.run(SQL`INSERT INTO tbl VALUES ( ${"'unsafe input\""} )`);
    expect(ret.changes).toBe(1);
  });

  test(".get", () => {
    const ret = db.get(SQL`SELECT rowid, col FROM tbl LIMIT 1`);
    expect(ret).toEqual({ rowid: expect.any(Number), col: "row 1" });
  });

  test(".all", () => {
    const ret = db.all(SQL`SELECT rowid, col FROM tbl`);
    expect(ret).toEqual([{ rowid: expect.any(Number), col: "row 1" }]);
  });

  test(".iterate", () => {
    const iter = db.iterate(SQL`SELECT rowid, col FROM tbl`);
    for (let row of iter) {
      expect(row).toEqual({ rowid: expect.any(Number), col: "row 1" });
    }
    expect.assertions(1);
  });

  test(".pluckOne", () => {
    const ret = db.pluckOne(SQL`SELECT col FROM tbl LIMIT 1`);
    expect(ret).toEqual("row 1");
  });

  test(".pluckAll", () => {
    const ret = db.pluckAll(SQL`SELECT col FROM tbl`);
    expect(ret).toEqual(["row 1"]);
  });
});
