import { s, DatabaseSchema, ModelSchema, Column, Relation } from "@rapid-cg/schema";

function id(val: string) {
  return `"${val.replace(/"/g, '""')}"`;
}

function columnType(column: Column): string {
  switch (column.type) {
    case "blob":
      return "BLOB";
    case "boolean":
    case "integer":
      return "INTEGER";
    case "date":
    case "json":
    case "text":
    case "uuid":
      return "TEXT";
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
  if (column.generatedAs) {
    constraints.push(`GENERATED ALWAYS AS (${column.generatedAs})`);
  }
  return constraints.join(" ");
}

function columnDefinition(c: Column): string {
  return [id(c.name), columnType(c), columnConstraints(c)]
    .filter((x) => x)
    .join(" ");
}

function foreignKey(rel: Relation): string {
  if (rel.relationType !== "belongsTo") {
    /* istanbul ignore next */
    throw new Error("invalid relation for foreignKey");
  }
  return `FOREIGN KEY ( ${id(rel.column)} ) REFERENCES ${id(
    rel.foreignModel.tableName
  )} ( ${id(rel.foreignColumn)} )`;
}

function createTable(name: string, spec: ModelSchema) {
  const lines = [
    ...Object.values(spec.columns).map((c) => columnDefinition(c)),
    ...Object.values(spec.relations)
      .filter((rel) => rel.relationType === "belongsTo")
      .map((rel) => foreignKey(rel)),
  ];
  return [
    `CREATE TABLE ${id(name)} (`,
    lines.map((l) => `  ${l}`).join(",\n"),
    `);`,
  ].join("\n");
}

function generateModelCopyMigration(
  from: ModelSchema,
  to: ModelSchema
): string {
  const transferModel = `transfer${to.tableName}`;
  let lines: string[] = [];
  lines = lines.concat([
    `BEGIN EXCLUSIVE TRANSACTION;`,
    createTable(transferModel, to),
  ]);
  const sharedColumns: string[] = [];
  for (let column in from.columns) {
    if (to.columns[column]) {
      sharedColumns.push(column);
    }
  }
  lines = lines.concat([
    `INSERT INTO ${transferModel} ( ${sharedColumns.map(id).join(", ")} )`,
    `  SELECT ${sharedColumns.map(id).join(", ")}`,
    `  FROM ${id(from.tableName)};`,
    `DROP TABLE ${from.tableName};`,
    `ALTER TABLE ${transferModel} RENAME TO ${to.tableName};`,
    `COMMIT TRANSACTION;`,
  ]);
  return lines.join("\n");
}

function generateModelMigration(
  from: ModelSchema | undefined,
  to: ModelSchema | undefined
): string {
  /* istanbul ignore if */
  if (from === undefined && to === undefined) return "";
  else if (from !== undefined && to !== undefined) {
    const fromRelations = Object.keys(from.relations)
      .filter((rel) => from.relations[rel].relationType === "belongsTo")
      .map((rel) => foreignKey(from.relations[rel]))
      .sort()
      .join(", ");
    const toRelations = Object.keys(to.relations)
      .filter((rel) => to.relations[rel].relationType === "belongsTo")
      .map((rel) => foreignKey(to.relations[rel]))
      .sort()
      .join(", ");
    if (fromRelations !== toRelations) {
      return generateModelCopyMigration(from, to);
    }
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
        return generateModelCopyMigration(from, to);
      } else {
        statements.push(
          `ALTER TABLE ${id(from.tableName)} DROP COLUMN ${id(column)};`
        );
      }
    }
    for (let column in to.columns) {
      if (!(column in from.columns)) {
        statements.push(
          `ALTER TABLE ${id(from.tableName)} ADD COLUMN ${columnDefinition(
            to.columns[column]
          )};`
        );
      }
    }
    return statements.join("\n\n");
  } else if (to !== undefined) {
    return createTable(to.tableName, to);
  } else if (from !== undefined) {
    return `DROP TABLE ${id(from.tableName)};`;
  } else {
    /* istanbul ignore next */
    return "";
  }
}

type MigrationParams = { from: DatabaseSchema; to: DatabaseSchema };

export function generateMigration({ from, to }: MigrationParams): string {
  const fromTables: Record<string, ModelSchema> = {};
  const toTables: Record<string, ModelSchema> = {};
  for (let model in from.models) {
    fromTables[from.models[model].tableName] = from.models[model];
  }
  for (let model in to.models) {
    toTables[to.models[model].tableName] = to.models[model];
  }
  const components: string[] = [];
  for (let model in fromTables) {
    components.push(generateModelMigration(fromTables[model], toTables[model]));
  }
  for (let model in toTables) {
    if (!(model in fromTables)) {
      components.push(generateModelMigration(undefined, toTables[model]));
    }
  }
  return components.filter((c) => c).join("\n\n");
}
