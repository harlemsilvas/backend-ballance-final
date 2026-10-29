import { expect, test } from 'bun:test';
import { InboxMessage, type ReceiveInboxProps } from '../../src/domain/inbox-message';
const at = new Date('2026-10-29T12:00:00.000Z');
const props = (): ReceiveInboxProps => ({ consumerName: 'wager-v1', messageId: 'msg-1', payloadHash: 'a'.repeat(64), receivedAt: at });

test('receive creates an unprocessed message', () => {
  const message = InboxMessage.receive(props());
  expect(message).toMatchObject({ consumerName: 'wager-v1', messageId: 'msg-1', payloadHash: 'a'.repeat(64) });
  expect(message.receivedAt).toEqual(at);
  expect(message.isProcessed()).toBe(false);
  expect(message.processedAt).toBeUndefined();
});
test('receive rejects blank identities, malformed hash and invalid time with the stable code', () => {
  for (const bad of [{ consumerName: ' ' }, { messageId: '' }, { payloadHash: 'A'.repeat(64) }, { payloadHash: 'a'.repeat(63) },
    { receivedAt: new Date('invalid') }]) {
    expect(() => InboxMessage.receive({ ...props(), ...bad })).toThrow('INVALID_INBOX_RECEIPT');
  }
});
test('same messageId with another transport hash is a conflict, not a match', () => {
  const message = InboxMessage.receive(props());
  expect(message.matchesPayload('a'.repeat(64))).toBe(true);
  expect(message.matchesPayload('b'.repeat(64))).toBe(false);
});
test('markProcessed records the time once and refuses a second completion', () => {
  const message = InboxMessage.receive(props());
  const later = new Date('2026-10-29T12:00:01.000Z');
  message.markProcessed(later);
  expect(message.isProcessed()).toBe(true);
  expect(message.processedAt).toEqual(later);
  expect(() => message.markProcessed(new Date('2026-10-29T12:00:02.000Z'))).toThrow('INBOX_ALREADY_PROCESSED');
  expect(message.processedAt).toEqual(later);
});
test('markProcessed rejects an invalid timestamp without changing state', () => {
  const message = InboxMessage.receive(props());
  expect(() => message.markProcessed(new Date('invalid'))).toThrow('INVALID_TIMESTAMP');
  expect(message.isProcessed()).toBe(false);
});
test('rehydrate rebuilds persisted state without revalidating it', () => {
  const processedAt = new Date('2026-10-29T12:05:00.000Z');
  const message = InboxMessage.rehydrate({ consumerName: ' ', messageId: 'legacy', payloadHash: 'not-a-hash', receivedAt: at, processedAt });
  expect(message.isProcessed()).toBe(true);
  expect(message.processedAt).toEqual(processedAt);
  expect(message.payloadHash).toBe('not-a-hash');
});
test('exposed dates are copies, so callers cannot mutate the message', () => {
  const message = InboxMessage.receive(props());
  message.receivedAt.setFullYear(1999);
  expect(message.receivedAt).toEqual(at);
});
