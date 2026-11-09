import crypto from 'node:crypto';
import { DatabaseManager } from '../database/DatabaseManager.ts';
import type { IdempotencyRecord } from '../types.ts';

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  isProcessing: boolean;
  cachedResponse?: {
    code: number;
    body: any;
  };
  requestHash: string;
}

export class IdempotencyManager {
  private dbManager: DatabaseManager;

  constructor(dbManager?: DatabaseManager) {
    this.dbManager = dbManager || DatabaseManager.getInstance();
  }

  public computeHash(method: string, path: string, body: any): string {
    const raw = `${method.toUpperCase()}:${path}:${typeof body === 'string' ? body : JSON.stringify(body || {})}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public acquireLock(idempotencyKey: string, requestHash: string, timeoutMs: number = 10000): IdempotencyCheckResult {
    const now = Date.now();
    const nowIso = new Date().toISOString();

    return this.dbManager.transaction(() => {
      // 1. Check existing record
      const stmt = this.dbManager.db.prepare('SELECT * FROM idempotency_records WHERE idempotency_key = ?');
      const existing = stmt.get(idempotencyKey) as any as IdempotencyRecord | undefined;

      if (existing) {
        // Payload tamper check
        if (existing.request_hash !== requestHash) {
          throw new Error('422: Idempotency payload mismatch. A different payload was previously submitted with this key.');
        }

        // Check if currently locked/in-flight
        if (existing.status === 'PROCESSING') {
          if (existing.lock_expires_at > now) {
            return {
              isDuplicate: true,
              isProcessing: true,
              requestHash
            };
          } else {
            // Lock expired (zombie process crashed) - reclaim lock
            const updateStmt = this.dbManager.db.prepare(`
              UPDATE idempotency_records 
              SET lock_expires_at = ?, created_at = ?
              WHERE idempotency_key = ?
            `);
            updateStmt.run(now + timeoutMs, nowIso, idempotencyKey);
            return {
              isDuplicate: false,
              isProcessing: false,
              requestHash
            };
          }
        }

        // Resolved cache hit
        let parsedBody = {};
        try {
          parsedBody = JSON.parse(existing.response_body);
        } catch (e) {
          parsedBody = { raw: existing.response_body };
        }

        return {
          isDuplicate: true,
          isProcessing: false,
          cachedResponse: {
            code: existing.response_code,
            body: parsedBody
          },
          requestHash
        };
      }

      // 2. New key: acquire atomic lock
      const insertStmt = this.dbManager.db.prepare(`
        INSERT INTO idempotency_records (
          idempotency_key, request_hash, status, response_code,
          response_body, lock_expires_at, created_at
        ) VALUES (?, ?, 'PROCESSING', 0, '', ?, ?)
      `);
      insertStmt.run(idempotencyKey, requestHash, now + timeoutMs, nowIso);

      return {
        isDuplicate: false,
        isProcessing: false,
        requestHash
      };
    });
  }

  public resolveLock(idempotencyKey: string, responseCode: number, responseBody: any): void {
    const serialized = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    const stmt = this.dbManager.db.prepare(`
      UPDATE idempotency_records
      SET status = 'RESOLVED', response_code = ?, response_body = ?
      WHERE idempotency_key = ?
    `);
    stmt.run(responseCode, serialized, idempotencyKey);
  }

  public releaseLockOnError(idempotencyKey: string): void {
    const stmt = this.dbManager.db.prepare(`
      DELETE FROM idempotency_records WHERE idempotency_key = ? AND status = 'PROCESSING'
    `);
    stmt.run(idempotencyKey);
  }
}
