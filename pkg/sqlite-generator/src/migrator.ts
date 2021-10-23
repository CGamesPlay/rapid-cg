import { s, DatabaseSchema, TableSchema, Column } from "@rad/schema";

function id(val: string) {
  return `"${val.replace(/"/g, '""')}"`;
}

function columnType(column: Column): string {
  switch (column.type) {
    case "date":
    case "json":
    case "text":
    case "uuid":
      return "TEXT";
    case "integer":
      return "INTEGER";
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnConstraints(column: Column): string {
  const constraints: string[] = [];
  if (column.primary) {
    constraints.push("PRIMARY KEY");
    if (column.primary === "autoincrement") {
      constraints.push("AUTOINCREMENT");
    }
  }
  if (column.unique) {
    constraints.push("UNIQUE");
  }
  if (!column.nullable) {
    constraints.push("NOT NULL");
  }
  return constraints.join(" ");
}

function columnDefinition(c: Column): string {
  return [id(c.name), columnType(c), columnConstraints(c)]
    .filter((x) => x)
    .join(" ");
}

function generateTableCopyMigration(
  from: TableSchema,
  to: TableSchema
): string {
  const transferTable = `transfer${to.name}`;
  let lines: string[] = [];
  lines = lines.concat([
    `BEGIN EXCLUSIVE TRANSACTION;`,
    `CREATE TABLE ${id(transferTable)} (`,
    Object.values(to.columns)
      .map((c) => `  ${columnDefinition(c)}`)
      .join(",\n"),
    `);`,
  ]);
  const sharedColumns: string[] = [];
  for (let column in from.columns) {
    if (to.columns[column]) {
      sharedColumns.push(column);
    }
  }
  lines = lines.concat([
    `INSERT INTO ${transferTable} ( ${sharedColumns.map(id).join(", ")} )`,
    `  SELECT ${sharedColumns.map(id).join(", ")}`,
    `  FROM ${id(from.name)};`,
    `DROP TABLE ${from.name};`,
    `ALTER TABLE ${transferTable} RENAME TO ${to.name};`,
    `COMMIT TRANSACTION;`,
  ]);
  return lines.join("\n");
}

function generateTableMigration(
  from: TableSchema | undefined,
  to: TableSchema | undefined
): string {
  /* istanbul ignore if */
  if (from === undefined && to === undefined) return "";
  else if (from !== undefined && to !== undefined) {
    const statements: string[] = [];
    for (let column in from.columns) {
      if (
        from.columns[column] &&
        to.columns[column] &&
        columnDefinition(from.columns[column]) ===
          columnDefinition(to.columns[column])
      ) {
        continue;
      } else if (to.columns[column]) {
        return generateTableCopyMigration(from, to);
      } else {
        statements.push(
          `ALTER TABLE ${id(from.name)} DROP COLUMN ${id(column)};`
        );
      }
    }
    for (let column in to.columns) {
      if (!(column in from.columns)) {
        statements.push(
          `ALTER TABLE ${id(from.name)} ADD COLUMN ${columnDefinition(
            to.columns[column]
          )};`
        );
      }
    }
    return statements.join("\n\n");
  } else if (to !== undefined) {
    return [
      `CREATE TABLE ${id(to.name)} (`,
      Object.values(to.columns)
        .map((c) => `  ${columnDefinition(c)}`)
        .join(",\n"),
      `);`,
    ].join("\n");
  } else if (from !== undefined) {
    return `DROP TABLE ${id(from.name)};`;
  } else {
    /* istanbul ignore next */
    return "";
  }
}

type MigrationParams = { from: DatabaseSchema; to: DatabaseSchema };

export function generateMigration({ from, to }: MigrationParams): string {
  const components: string[] = [];
  for (let table in from.tables) {
    components.push(
      generateTableMigration(from.tables[table], to.tables[table])
    );
  }
  for (let table in to.tables) {
    if (!(table in from.tables)) {
      components.push(generateTableMigration(undefined, to.tables[table]));
    }
  }
  return components.filter((c) => c).join("\n\n");
}
