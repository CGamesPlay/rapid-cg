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

/**
 * This class is a thin wrapper around
 * [better-sqlite](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
 * that adds support the {@link SQL | SQL template tags}.
 */
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

  /** Execute a query and return information about the execution. */
  run(query: SQL.Template): Database.RunResult {
    return this.prepare(query.sql).run(...query.values);
  }

  /**
   * Execute a query and return the first row.
   * @typeparam T the expected return type of the query
   */
  get<T extends Record<string, unknown>>(query: SQL.Template): T | undefined {
    return this.prepare(query.sql).get(...query.values);
  }

  /**
   * Execute a query and return all rows in an array.
   * @typeparam T the expected return type of the query
   */
  all<T extends Record<string, unknown>>(query: SQL.Template): T[] {
    return this.prepare(query.sql).all(...query.values);
  }

  /**
   * Execute a query and return an iterator over the results.
   * @typeparam T the expected return type of the query
   */
  iterate<T extends Record<string, unknown>>(
    query: SQL.Template
  ): IterableIterator<T> {
    return this.prepare(query.sql).iterate(...query.values);
  }

  /**
   * Execute a query and return the first column of the first row.
   * @typeparam T the expected data type of the column
   */
  pluckOne<T extends unknown>(query: SQL.Template): T | undefined {
    return this.prepare(query.sql)
      .pluck()
      .get(...query.values);
  }

  /**
   * Execute a query and return the first column of each row.
   * @typeparam T the expected data type of the column
   */
  pluckAll<T extends unknown>(query: SQL.Template): T[] {
    return this.prepare(query.sql)
      .pluck()
      .all(...query.values);
  }
}
