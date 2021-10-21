import BaseDatabase from "better-sqlite3";

import SQL from "./tag.js";

export declare namespace Database {
  type RunResult = BaseDatabase.RunResult;
  type Options = BaseDatabase.Options;
  type PragmaOptions = BaseDatabase.PragmaOptions;
  type RegistrationOptions = BaseDatabase.RegistrationOptions;
  type AggregateOptions = BaseDatabase.AggregateOptions;
  type BackupMetadata = BaseDatabase.BackupMetadata;
  type BackupOptions = BaseDatabase.BackupOptions;
  type SqliteError = BaseDatabase.SqliteError;
  type Statement<
    BindParameters extends any[] | {} = any[]
  > = BaseDatabase.Statement<BindParameters>;
  type ColumnDefinition = BaseDatabase.ColumnDefinition;
  type Transaction = BaseDatabase.Transaction;
  type Database = BaseDatabase.Database;
}

export class Database extends BaseDatabase {
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
