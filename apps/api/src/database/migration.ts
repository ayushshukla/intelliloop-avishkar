export interface SqlMigration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}
