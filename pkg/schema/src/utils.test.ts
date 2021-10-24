import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { generatedBanner, writeGeneratedFile } from "./utils.js";

describe("writeGeneratedFile", () => {
  const content = generatedBanner("the tests");
  const target = path.join(os.tmpdir(), "rad-test-file.txt");

  beforeEach(async () => {
    await fs.promises.unlink(target).catch((e) => {
      expect(e.code).toEqual("ENOENT");
    });
  });

  it("requires generated content", async () => {
    await expect(writeGeneratedFile(target, "custom")).rejects.toThrow(
      "writing generated file without generatedBanner"
    );
  });

  it("creates a new file", async () => {
    await writeGeneratedFile(target, content);
    const written = await fs.promises.readFile(target, "utf-8");
    expect(written).toEqual(content);
  });

  it("overwrites a generated file", async () => {
    await writeGeneratedFile(target, content + "v1");
    await writeGeneratedFile(target, content + "v2");
    const written = await fs.promises.readFile(target, "utf-8");
    expect(written).toEqual(content + "v2");
  });

  it("does not overwrite a modified file", async () => {
    await fs.promises.writeFile(target, "custom", { flag: "wx" });
    await expect(writeGeneratedFile(target, content)).rejects.toThrow(
      "already exists and is not a generated file"
    );
  });

  it("handles other errors", async () => {
    await expect(
      writeGeneratedFile(
        path.join(os.tmpdir(), "rad-not-dir/file.txt"),
        content
      )
    ).rejects.toThrow("ENOENT");
  });
});
