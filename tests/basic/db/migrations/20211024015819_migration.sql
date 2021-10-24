-- migrate:up
CREATE TABLE "docs" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "extra" TEXT NOT NULL
);

-- migrate:down
DROP TABLE "docs";
