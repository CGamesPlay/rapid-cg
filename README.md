# Rapid Code Generation

Rapid-CG is a database access layer that relies on code generation to provide a strongly-typed database client. Presently it can generate libraries for [better-sqlite3](https://github.com/JoshuaWise/better-sqlite3) and [tRPC](https://trpc.io), which allows you to directly expose a SQL database to a web application (authentication and access control are controlled by you).

[![CI Pipeline](https://github.com/CGamesPlay/rapid-cg/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/CGamesPlay/rapid-cg/actions/workflows/ci.yml)

### Features

- Many supported data types including uuids, text, binary blobs, json blobs, and dates.
- Generate a Prisma-like client API that you are free to modify and extend.
- Automatically generate migrations by comparing your live database to your desired schema.
- [Zod](https://github.com/colinhacks/zod) schemas generated for all model fields and query parameters.
- Extensible code generation to enable more advanced generators. (Planned: rails-like model scaffolding using React Admin).

Why code generation? Using code generation means that you get TypeScript completion for your database models, and it gives you an escape hatch to manually modify the classes if necessary. It also means that the runtime dependencies are smaller, since we only use a thin database wrapper instead of an entire model DSL.

## Getting Started

You can see an example project in [tests/basic](https://github.com/CGamesPlay/rapid-cg/tree/master/tests/basic) of this repository. To add Rapid-CG to your own project:

1. Install dependencies.
2. Write your schema.ts file.
3. Run the code generator.
4. Use your generated classes.

**Install dependencies.** You need to install the dependencies that you will be using. Rapid-CG is divided up into several packages, including both runtime and development-only packages. This will install the base dependencies, SQLite generator, and SQLite runtime.

```bash
npm install -D @rapid-cg/cli @rapid-cg/schema @rapid-cg/sqlite-generator
npm install @rapid-cg/sqlite zod
```

You also need to verify that your `tsconfig.json` specifies `"target": "es2019"` or later, because the code generation requires ES6 classes.

**Write your schema.** The next step is to specify your schema. This is done by writing a `schema.ts` file in the root of your repository. A simple example might look like this:

```typescript
import * as path from "path";
import { s, Config } from "@rapid-cg/schema";
import sqliteGenerator from "@rapid-cg/sqlite-generator";

const database = s.database({
  Doc: s
    .model({
      id: s.uuid().primary().autogenerate(),
      createdAt: s.date().createdAt(),
      updatedAt: s.date().updatedAt(),
      isPublished: s.boolean().default(false),
      content: s.text(),
    }),
});

const config: Config = {
  database,
  generators: [
    sqliteGenerator({
      clientFilename: path.join(__dirname, "src/database.ts"),
      migrationsPath: path.join(__dirname, "db/migrations"),
    }),
  ],
};

export default config;
```

Since the schema is written in TypeScript, you can use your editor's completion to help you specify the schema, or you can see [the implementation](https://github.com/CGamesPlay/rapid-cg/blob/master/pkg/schema/src/schema.ts) for all available methods.

**Run the code generator.** Rapid-CG provides a CLI that is used to actually generate the code. As you can see from the example schema, we provided the file location for our generated client and our migrations directory. 

```bash
# Generate all of the TypeScript files that are supposed to be generated.
rapid-cg generate
# Generate a SQL script that would mutate the database to the schema.
rapid-cg sqlite migrate -d db/database.sqlite3
```

The migrations are written to be compatible with [dbmate](https://github.com/amacneil/dbmate), which means they are written in plain SQL.

**Use the generated code.** Now you can review the generated files, and import them to being using your database. A simple example might look like this:

```typescript
import { createClient, Doc } from "./sqlite.generated.js";

const db = createClient("db/database.sqlite3");

export function docById(id: string): Doc | undefined {
  return db.docs.findFirst({ where: { id } });
}
```

## Using relations

:warning: Needs documentation. Basically, create foreign key columns as you would normally, then use `s.belongsTo`, `s.hasMany` or`s.hasOne` to specify the relationship. The foreign key constraints will be generated by the automatic migration, and the generated SQLite class will include methods to query on relations, like this:

```typescript
// schema.ts
const database = s.database({
  Person: {
    id: s.integer().autoincrement(),
    parentId: s.integer().nullable(),
    parent: s.belongsTo("parentId", "Person", "id"),
    children: s.hasMany("id", "Person", "parentId"),
  },
});
```

```typescript
const childrenOfPerson1 = db.persons.findMany({
  where: {
    parent: { is: { id: 1 } }
  }
});
```

## Structured JSON columns

:warning: Needs documentation. Basically, follow the pattern in [tests/basic](https://github.com/CGamesPlay/rapid-cg/blob/master/tests/basic/src/sqlite.ts) where you extend the model's zod schema to add the required validations to the json column, then pass the updated type to the `createClient` method.

To query on JSON columns, use a generated column and [json_extract](https://www.sqlite.org/json1.html#jex):

```typescript
// schema.ts
const database = s.database({
  Doc: {
    id: s.integer().autoincrement(),
    data: s.json(),
    extractedValue: s.text().nullable().generatedAs(`json_extract(data, '$.fieldName')`),
  },
});
```

Then you can query on `extractedValue` like any normal column, but since it's virtual, it can't be written to.
