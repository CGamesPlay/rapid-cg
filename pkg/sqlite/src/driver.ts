import BaseDatabase from "better-sqlite3";

import type SQL from "./tag.js";

export declare namespace Database {
  type RunResult = BaseDatabase.RunResult;
  type Options = BaseDatabase.Options;
  type PragmaOptions = BaseDatabase.PragmaOptions;
  type RegistrationOptions = BaseDatabase.RegistrationOptions;
  type AggregateOptions = BaseDatabase.AggregateOptions;
  type BackupMetadata = BaseDatabase.BackupMetadata;
  type BackupOptions = BaseDatabase.BackupOptions;
  type SqliteError = BaseDatabase.SqliteError;
  type Statement<BindParameters extends any[] | {} = any[]> =
    BaseDatabase.Statement<BindParameters>;
  type ColumnDefinition = BaseDatabase.ColumnDefinition;
  type Transaction = BaseDatabase.Transaction;
  type Database = BaseDatabase.Database;
}

export class Database extends BaseDatabase {
  constructor(filename: string, options?: BaseDatabase.Options) {
    super(filename, options);
    // better-sqlite3's Database isn't an ES6 class, it's an ES5-style function
    // with a prototype. There appears to be a lot of inconsistency in how this
    // gets handled: Safari throws a runtime error, node doesn't. However, a
    // "safety" check that better-sqlite3 applies causes the function to return
    // a new object which is not actually an instance of our Database override.
    // So we get to do this would-be no-op.
    Object.setPrototypeOf(this, Database.prototype);
    this.pragma("foreign_keys = ON");
  }

  // Execute a query and return information about the execution.
  run(query: SQL.Template): Database.RunResult {
    return this.prepare(query.sql).run(...query.values);
  }

  // Execute a query and return the first row.
  get<T extends Record<string, unknown>>(query: SQL.Template): T | undefined {
    return this.prepare(query.sql).get(...query.values);
  }

  // Execute a query and return all results.
  all<T extends Record<string, unknown>>(query: SQL.Template): T[] {
    return this.prepare(query.sql).all(...query.values);
  }

  // Execute a query and return an iterator over the results.
  iterate<T extends Record<string, unknown>>(
    query: SQL.Template
  ): IterableIterator<T> {
    return this.prepare(query.sql).iterate(...query.values);
  }

  // Execute a query and return the first column of the first row.
  pluckOne<T extends unknown>(query: SQL.Template): T | undefined {
    return this.prepare(query.sql)
      .pluck()
      .get(...query.values);
  }

  // Execute a query and return the first column of each row.
  pluckAll<T extends unknown>(query: SQL.Template): T[] {
    return this.prepare(query.sql)
      .pluck()
      .all(...query.values);
  }
}
