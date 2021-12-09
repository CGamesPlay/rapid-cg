import { s } from "@rapid-cg/schema";

import { generateServer } from "./generator.js";

describe("generateServer", () => {
  it("generates a server", () => {
    const schema = s.database({ tbl: s.model({ col: s.text() }) });
    // If this method does not throw, it means prettier successfully parsed and
    // rewrote the generated code.
    expect(() => generateServer(schema, "@unknown/client")).not.toThrow();
  });
});
