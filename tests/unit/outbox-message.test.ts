import { expect, test } from 'bun:test';
import { OutboxMessage } from '../../src/domain/outbox-message';
import { WalletBalanceChanged } from '../../src/domain/events/wager-events';
import { Money } from '../../src/domain/money';
import { Wallet } from '../../src/domain/wallet';
const at = new Date('2026-10-29T12:00:00.000Z');
const brl = (amount: string) => Money.from({ amount, currency: 'BRL' });
const event = () => {
  const { wallet, openingEntry } = Wallet.open({ id: 'wallet-1', playerId: 'player-1', initialBalance: brl('100'), at,
    opening: { entryId: 'entry-opening', transactionId: 'tx-opening' } });
  return WalletBalanceChanged.from(wallet, openingEntry!, { eventId: 'event-1', correlationId: 'corr-1', occurredAt: at });
};
const claimed = (attempts: number) => OutboxMessage.rehydrate({ id: 'event-1', aggregateId: 'wallet-1', eventType: 'WalletBalanceChanged',
  payload: { eventId: 'event-1' }, occurredAt: at, attempts });

test('enqueue captures the event envelope as a pending, never-attempted message', () => {
  const source = event();
  const message = OutboxMessage.enqueue(source);
  expect(message).toMatchObject({ id: 'event-1', aggregateId: 'wallet-1', eventType: 'WalletBalanceChanged', attempts: 0 });
  expect(message.occurredAt).toEqual(at);
  expect(message.payload).toEqual(JSON.parse(JSON.stringify(source)));
  expect(message.isPending()).toBe(true);
  expect(message.nextAttemptAt).toBeUndefined();
  expect(message.publishedAt).toBeUndefined();
});
test('the payload is frozen and keeps money as decimal strings', () => {
  const message = OutboxMessage.enqueue(event());
  expect(Object.isFrozen(message.payload)).toBe(true);
  expect((message.payload.data as { money: unknown }).money).toEqual({ amount: '100.00', currency: 'BRL' });
});
test('isDue is true without a schedule and only after nextAttemptAt once scheduled', () => {
  const message = claimed(1);
  expect(message.isDue(at)).toBe(true);
  message.scheduleRetry(at);
  expect(message.nextAttemptAt).toEqual(new Date(at.getTime() + 1000));
  expect(message.isDue(new Date(at.getTime() + 999))).toBe(false);
  expect(message.isDue(new Date(at.getTime() + 1000))).toBe(true);
});
test('retry delay doubles per attempt, adds jitter and is capped at five minutes', () => {
  expect([1, 2, 3, 4, 5].map(n => OutboxMessage.retryDelayMs(n))).toEqual([1000, 2000, 4000, 8000, 16000]);
  expect(OutboxMessage.retryDelayMs(2, 249.9)).toBe(2249);
  expect(OutboxMessage.retryDelayMs(10)).toBe(300000);
  expect(OutboxMessage.retryDelayMs(500)).toBe(300000);
});
test('retry scheduling does not change the attempts counted by the SQL claim', () => {
  const message = claimed(3);
  message.scheduleRetry(at, 100);
  expect(message.attempts).toBe(3);
  expect(message.nextAttemptAt).toEqual(new Date(at.getTime() + 4100));
});
test('retry needs a claimed message and valid inputs', () => {
  expect(() => OutboxMessage.enqueue(event()).scheduleRetry(at)).toThrow('INVALID_OUTBOX_ATTEMPTS');
  expect(() => OutboxMessage.retryDelayMs(1.5)).toThrow('INVALID_OUTBOX_ATTEMPTS');
  expect(() => OutboxMessage.retryDelayMs(1, -1)).toThrow('INVALID_OUTBOX_JITTER');
  expect(() => claimed(1).scheduleRetry(new Date('invalid'))).toThrow('INVALID_TIMESTAMP');
});
test('markPublished closes the message once and clears the schedule', () => {
  const message = claimed(2);
  message.scheduleRetry(at);
  const done = new Date(at.getTime() + 5000);
  message.markPublished(done);
  expect(message.isPending()).toBe(false);
  expect(message.publishedAt).toEqual(done);
  expect(message.nextAttemptAt).toBeUndefined();
  expect(message.isDue(new Date(at.getTime() + 60000))).toBe(false);
  expect(() => message.markPublished(done)).toThrow('OUTBOX_ALREADY_PUBLISHED');
  expect(() => message.scheduleRetry(at)).toThrow('OUTBOX_ALREADY_PUBLISHED');
});
test('markPublished rejects an invalid timestamp without publishing', () => {
  const message = claimed(1);
  expect(() => message.markPublished(new Date('invalid'))).toThrow('INVALID_TIMESTAMP');
  expect(message.isPending()).toBe(true);
});
test('rehydrate restores persisted state without revalidating it', () => {
  const published = new Date('2026-10-29T12:10:00.000Z');
  const message = OutboxMessage.rehydrate({ id: 'x', aggregateId: 'y', eventType: 'Anything', payload: { a: 1 }, occurredAt: at,
    attempts: 7, nextAttemptAt: published, publishedAt: published });
  expect(message).toMatchObject({ attempts: 7 });
  expect(message.isPending()).toBe(false);
  expect(message.publishedAt).toEqual(published);
});
