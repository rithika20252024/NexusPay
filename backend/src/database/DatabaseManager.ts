import { DatabaseSync } from 'node:sqlite';
import { MigrationRunner } from './MigrationRunner.ts';
import path from 'node:path';
import fs from 'node:fs';

export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  public db: DatabaseSync;
  public migrationRunner: MigrationRunner;

  private constructor(dbPath?: string) {
    if (!dbPath) {
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      dbPath = path.join(dataDir, 'nexuspay.sqlite');
    }

    this.db = new DatabaseSync(dbPath);
    
    // Configure SQLite for high-throughput write performance
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA busy_timeout = 5000;');

    this.migrationRunner = new MigrationRunner(this.db);
    this.migrationRunner.runAll();
    this.seedDefaultAccounts();
  }

  public static getInstance(dbPath?: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(dbPath);
    }
    return DatabaseManager.instance;
  }

  public static createInMemory(): DatabaseManager {
    return new DatabaseManager(':memory:');
  }

  private seedDefaultAccounts(): void {
    const existing = this.db.prepare('SELECT count(*) as count FROM accounts').get() as { count: number };
    if (existing && existing.count > 0) return;

    const now = new Date().toISOString();
    const insert = this.db.prepare(`
      INSERT INTO accounts (id, name, type, currency, balance_cents, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Seed $10,000.00 (1,000,000 cents) in customer wallet, $0 in merchant, $0 in fees, $0 in settlement
    insert.run('acc_customer_primary', 'Jane Doe (Retail Client)', 'CUSTOMER_WALLET', 'USD', 1000000, 0, now, now);
    insert.run('acc_merchant_stripe', 'Acme Corp (Merchant Terminal)', 'MERCHANT_RECEIVABLE', 'USD', 0, 0, now, now);
    insert.run('acc_stripe_fees', 'Stripe Processing Interchange (2.9% + 30¢)', 'PROCESSING_FEES', 'USD', 0, 0, now, now);
    insert.run('acc_escrow_holding', 'NexusPay In-Transit Escrow', 'ESCROW', 'USD', 0, 0, now, now);

    console.log('[Database] Seeded initial financial accounts with $10,000.00 customer liquidity.');
  }

  private inTransaction: boolean = false;

  public transaction<T>(callback: () => T): T {
    if (this.inTransaction) {
      return callback();
    }
    this.inTransaction = true;
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const result = callback();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    } finally {
      this.inTransaction = false;
    }
  }
}
