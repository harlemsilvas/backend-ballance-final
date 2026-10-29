import { DomainError } from './domain-error';
import type { IntegrationEvent } from './events/integration-event';

export interface OutboxMessageState {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: Readonly<Record<string, unknown>>;
  occurredAt: Date;
  attempts: number;
  nextAttemptAt?: Date | undefined;
  publishedAt?: Date | undefined;
}

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 300000;

/**
 * Integration event waiting for publication. Claiming and leasing happen atomically in SQL
 * (FOR UPDATE SKIP LOCKED) and increment `attempts`; this class owns creation and the
 * publication and retry rules.
 */
export class OutboxMessage {
  private readonly occurredAtMs: number;
  private _attempts: number;
  private nextAttemptAtMs: number | undefined;
  private publishedAtMs: number | undefined;
  private constructor(
    public readonly id: string,
    public readonly aggregateId: string,
    public readonly eventType: string,
    public readonly payload: Readonly<Record<string, unknown>>,
    occurredAt: Date,
    attempts: number,
    nextAttemptAt: Date | undefined,
    publishedAt: Date | undefined,
  ) {
    this.occurredAtMs = occurredAt.getTime();
    this._attempts = attempts;
    this.nextAttemptAtMs = nextAttemptAt?.getTime();
    this.publishedAtMs = publishedAt?.getTime();
  }

  static enqueue(event: IntegrationEvent<unknown>): OutboxMessage {
    return new OutboxMessage(event.eventId, event.aggregateId, event.eventType,
      Object.freeze({ ...event.toJSON() }), event.occurredAt, 0, undefined, undefined);
  }

  /** Trusted persistence state only; never used to validate a new event. */
  static rehydrate(state: OutboxMessageState): OutboxMessage {
    return new OutboxMessage(state.id, state.aggregateId, state.eventType, Object.freeze({ ...state.payload }),
      state.occurredAt, state.attempts, state.nextAttemptAt, state.publishedAt);
  }

  /** Exponential backoff in milliseconds for a claimed message (1s, 2s, 4s ... capped at 5min), plus jitter. */
  static retryDelayMs(attempts: number, jitterMs = 0): number {
    if (!Number.isInteger(attempts) || attempts < 1) throw new DomainError('INVALID_OUTBOX_ATTEMPTS');
    if (!Number.isFinite(jitterMs) || jitterMs < 0) throw new DomainError('INVALID_OUTBOX_JITTER');
    return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.min(attempts - 1, 20) + Math.floor(jitterMs));
  }

  get occurredAt(): Date { return new Date(this.occurredAtMs); }
  get attempts(): number { return this._attempts; }
  get nextAttemptAt(): Date | undefined { return this.nextAttemptAtMs === undefined ? undefined : new Date(this.nextAttemptAtMs); }
  get publishedAt(): Date | undefined { return this.publishedAtMs === undefined ? undefined : new Date(this.publishedAtMs); }

  isPending(): boolean { return this.publishedAtMs === undefined; }
  isDue(now: Date): boolean {
    return this.isPending() && (this.nextAttemptAtMs === undefined || this.nextAttemptAtMs <= now.getTime());
  }
  markPublished(at: Date): void {
    if (!this.isPending()) throw new DomainError('OUTBOX_ALREADY_PUBLISHED');
    if (!Number.isFinite(at.getTime())) throw new DomainError('INVALID_TIMESTAMP');
    this.publishedAtMs = at.getTime();
    this.nextAttemptAtMs = undefined;
  }
  /** Schedules the next attempt after a failed publication; `attempts` was already counted by the SQL claim. */
  scheduleRetry(now: Date, jitterMs = 0): void {
    if (!this.isPending()) throw new DomainError('OUTBOX_ALREADY_PUBLISHED');
    if (!Number.isFinite(now.getTime())) throw new DomainError('INVALID_TIMESTAMP');
    this.nextAttemptAtMs = now.getTime() + OutboxMessage.retryDelayMs(this._attempts, jitterMs);
  }
}
