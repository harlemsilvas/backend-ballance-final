import { DomainError } from './domain-error';

export interface InboxMessageState {
  consumerName: string;
  messageId: string;
  payloadHash: string;
  receivedAt: Date;
  processedAt?: Date | undefined;
}
export type ReceiveInboxProps = Omit<InboxMessageState, 'processedAt'>;

/** Record of one delivery per (consumerName, messageId); uniqueness itself is enforced by the database. */
export class InboxMessage {
  private readonly receivedAtMs: number;
  private processedAtMs: number | undefined;
  private constructor(
    public readonly consumerName: string,
    public readonly messageId: string,
    public readonly payloadHash: string,
    receivedAt: Date,
    processedAt: Date | undefined,
  ) {
    this.receivedAtMs = receivedAt.getTime();
    this.processedAtMs = processedAt?.getTime();
  }

  static receive(props: ReceiveInboxProps): InboxMessage {
    if (typeof props.consumerName !== 'string' || !props.consumerName.trim()
      || typeof props.messageId !== 'string' || !props.messageId.trim()
      || typeof props.payloadHash !== 'string' || !/^[a-f0-9]{64}$/.test(props.payloadHash)
      || !Number.isFinite(props.receivedAt.getTime())) throw new DomainError('INVALID_INBOX_RECEIPT');
    return new InboxMessage(props.consumerName, props.messageId, props.payloadHash, props.receivedAt, undefined);
  }

  /** Trusted persistence state only; never used to validate a delivery. */
  static rehydrate(state: InboxMessageState): InboxMessage {
    return new InboxMessage(state.consumerName, state.messageId, state.payloadHash, state.receivedAt, state.processedAt);
  }

  get receivedAt(): Date { return new Date(this.receivedAtMs); }
  get processedAt(): Date | undefined { return this.processedAtMs === undefined ? undefined : new Date(this.processedAtMs); }
  isProcessed(): boolean { return this.processedAtMs !== undefined; }
  /** The same messageId with another transport hash is a conflict, not a replay. */
  matchesPayload(payloadHash: string): boolean { return this.payloadHash === payloadHash; }
  markProcessed(at: Date): void {
    if (this.isProcessed()) throw new DomainError('INBOX_ALREADY_PROCESSED');
    if (!Number.isFinite(at.getTime())) throw new DomainError('INVALID_TIMESTAMP');
    this.processedAtMs = at.getTime();
  }
}
