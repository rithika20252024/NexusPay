import crypto from 'node:crypto';
import { DatabaseManager } from '../database/DatabaseManager.ts';
import type { Account, LedgerEntry, EntryDirection } from '../types.ts';

export interface TransferRequest {
  transaction_id: string;
  source_account_id: string;
  destination_account_id: string;
  fee_account_id?: string;
  amount_cents: number;
  fee_cents?: number;
  currency?: string;
  description: string;
}

export class DoubleEntryLedger {
  private dbManager: DatabaseManager;

  constructor(dbManager?: DatabaseManager) {
    this.dbManager = dbManager || DatabaseManager.getInstance();
  }

  private getLatestBlockHash(): string {
    const stmt = this.dbManager.db.prepare(`
      SELECT block_hash FROM ledger_entries ORDER BY rowid DESC LIMIT 1
    `);
    const row = stmt.get() as { block_hash: string } | undefined;
    return row?.block_hash || '0000000000000000000000000000000000000000000000000000000000000000';
  }

  private computeBlockHash(
    prevHash: string,
    id: string,
    txId: string,
    accountId: string,
    direction: EntryDirection,
    amount: number,
    runningBalance: number
  ): string {
    const payload = `${prevHash}|${id}|${txId}|${accountId}|${direction}|${amount}|${runningBalance}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  public getAccount(id: string): Account | null {
    const stmt = this.dbManager.db.prepare('SELECT * FROM accounts WHERE id = ?');
    return (stmt.get(id) as Account) || null;
  }

  public getAllAccounts(): Account[] {
    const stmt = this.dbManager.db.prepare('SELECT * FROM accounts ORDER BY id ASC');
    return stmt.all() as any as Account[];
  }

  public getEntries(limit: number = 50): LedgerEntry[] {
    const stmt = this.dbManager.db.prepare(`
      SELECT * FROM ledger_entries ORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(limit) as any as LedgerEntry[];
  }

  public transfer(req: TransferRequest): { success: boolean; entries: LedgerEntry[] } {
    if (req.amount_cents <= 0) {
      throw new Error('Transfer amount must be strictly positive (> 0 cents)');
    }

    const feeCents = req.fee_cents || 0;
    const totalDeduction = req.amount_cents;
    const netDestinationAmount = req.amount_cents - feeCents;

    if (netDestinationAmount <= 0 && feeCents > 0) {
      throw new Error('Transaction fee exceeds or equals transfer amount');
    }

    return this.dbManager.transaction(() => {
      // 1. Fetch accounts
      const srcAccount = this.getAccount(req.source_account_id);
      if (!srcAccount) throw new Error(`Source account ${req.source_account_id} not found`);

      const dstAccount = this.getAccount(req.destination_account_id);
      if (!dstAccount) throw new Error(`Destination account ${req.destination_account_id} not found`);

      let feeAccount: Account | null = null;
      if (feeCents > 0 && req.fee_account_id) {
        feeAccount = this.getAccount(req.fee_account_id);
        if (!feeAccount) throw new Error(`Fee account ${req.fee_account_id} not found`);
      }

      // 2. Validate balance (allow non-customer accounts or check funds)
      if (srcAccount.type === 'CUSTOMER_WALLET' && srcAccount.balance_cents < totalDeduction) {
        throw new Error(`Insufficient funds: account balance ${srcAccount.balance_cents}¢ is less than required ${totalDeduction}¢`);
      }

      const now = new Date().toISOString();
      const entries: LedgerEntry[] = [];
      let prevHash = this.getLatestBlockHash();

      // Helper to record entry and update account with optimistic lock check
      const recordLeg = (
        account: Account,
        direction: EntryDirection,
        amount: number,
        delta: number,
        desc: string
      ) => {
        const newBalance = account.balance_cents + delta;
        const entryId = 'leg_' + crypto.randomBytes(8).toString('hex');
        const currentPrevHash = prevHash;
        const blockHash = this.computeBlockHash(
          currentPrevHash,
          entryId,
          req.transaction_id,
          account.id,
          direction,
          amount,
          newBalance
        );
        prevHash = blockHash;

        // Insert ledger entry
        const insertEntry = this.dbManager.db.prepare(`
          INSERT INTO ledger_entries (
            id, transaction_id, account_id, direction, amount_cents,
            running_balance_cents, currency, description, created_at,
            block_hash, prev_block_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertEntry.run(
          entryId,
          req.transaction_id,
          account.id,
          direction,
          amount,
          newBalance,
          req.currency || 'USD',
          desc,
          now,
          blockHash,
          currentPrevHash
        );

        // Optimistic locking update
        const updateAccount = this.dbManager.db.prepare(`
          UPDATE accounts 
          SET balance_cents = ?, version = version + 1, updated_at = ?
          WHERE id = ? AND version = ?
        `);
        const result = updateAccount.run(newBalance, now, account.id, account.version);
        if (result.changes === 0) {
          throw new Error(`OptimisticLockException: Account ${account.id} was concurrently modified`);
        }

        entries.push({
          id: entryId,
          transaction_id: req.transaction_id,
          account_id: account.id,
          direction,
          amount_cents: amount,
          running_balance_cents: newBalance,
          currency: req.currency || 'USD',
          description: desc,
          created_at: now,
          block_hash: blockHash,
          prev_block_hash: prevHash
        });
      };

      // Double-entry balancing:
      // DEBIT source account for total amount
      recordLeg(srcAccount, 'DEBIT', totalDeduction, -totalDeduction, `${req.description} (Debit)`);

      // CREDIT destination account for net amount
      recordLeg(dstAccount, 'CREDIT', netDestinationAmount, netDestinationAmount, `${req.description} (Credit)`);

      // CREDIT fee account for interchange fee if applicable
      if (feeCents > 0 && feeAccount) {
        recordLeg(feeAccount, 'CREDIT', feeCents, feeCents, `Interchange Fee for tx ${req.transaction_id}`);
      }

      // Assert Double-Entry Invariant: Sum(DEBITS) === Sum(CREDITS)
      const totalDebits = entries.filter(e => e.direction === 'DEBIT').reduce((acc, e) => acc + e.amount_cents, 0);
      const totalCredits = entries.filter(e => e.direction === 'CREDIT').reduce((acc, e) => acc + e.amount_cents, 0);
      if (totalDebits !== totalCredits) {
        throw new Error(`CRITICAL LEDGER CORRUPTION: Debits (${totalDebits}¢) != Credits (${totalCredits}¢)`);
      }

      return { success: true, entries };
    });
  }

  public verifyLedgerIntegrity(): { isValid: boolean; checkedEntries: number; error?: string } {
    const stmt = this.dbManager.db.prepare('SELECT * FROM ledger_entries ORDER BY rowid ASC');
    const allEntries = stmt.all() as any as LedgerEntry[];

    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < allEntries.length; i++) {
      const entry = allEntries[i];
      if (i > 0 && entry.prev_block_hash !== expectedPrevHash) {
        return {
          isValid: false,
          checkedEntries: i,
          error: `Broken hash link at entry ${entry.id}. Expected ${expectedPrevHash}, found ${entry.prev_block_hash}`
        };
      }

      const computed = this.computeBlockHash(
        entry.prev_block_hash,
        entry.id,
        entry.transaction_id,
        entry.account_id,
        entry.direction,
        entry.amount_cents,
        entry.running_balance_cents
      );

      if (computed !== entry.block_hash) {
        return {
          isValid: false,
          checkedEntries: i,
          error: `Tampered payload hash at entry ${entry.id}. Hash does not match entry data!`
        };
      }
      expectedPrevHash = entry.block_hash;
    }

    return { isValid: true, checkedEntries: allEntries.length };
  }
}
