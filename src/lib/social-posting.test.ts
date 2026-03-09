import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generatePostText,
  computeImmediateScheduleTime,
  computeIdempotencyKey,
} from './social-posting';
import { summarizeSocialStatus } from '@/pages/admin/EventsPage';

describe('generatePostText', () => {
  it('includes title with emoji', () => {
    const text = generatePostText({
      title: 'Friday Mixer',
      date_time: null,
      venue: 'The Loft',
    });
    expect(text).toContain('📅 Friday Mixer');
  });

  it('includes formatted date when provided', () => {
    const text = generatePostText({
      title: 'Test',
      date_time: '2026-04-15T18:00:00.000Z',
      venue: 'Cafe',
    });
    expect(text).toContain('🗓');
    expect(text).toContain('📍 Cafe');
  });

  it('skips date line when date_time is null', () => {
    const text = generatePostText({
      title: 'TBD Event',
      date_time: null,
      venue: 'Online',
    });
    expect(text).not.toContain('🗓');
    expect(text).toContain('📍 Online');
  });

  it('includes truncated description', () => {
    const longDesc = 'A'.repeat(300);
    const text = generatePostText({
      title: 'Test',
      date_time: null,
      venue: 'V',
      description: longDesc,
    });
    // description should be max 200 chars
    const lines = text.split('\n');
    const descLine = lines.find(l => l.startsWith('A'));
    expect(descLine).toBeDefined();
    expect(descLine!.length).toBeLessThanOrEqual(200);
  });

  it('includes external link when provided', () => {
    const text = generatePostText({
      title: 'Ev',
      date_time: null,
      venue: 'V',
      external_link: 'https://example.com/register',
    });
    expect(text).toContain('https://example.com/register');
  });

  it('omits description and link when not provided', () => {
    const text = generatePostText({
      title: 'Simple Event',
      date_time: null,
      venue: 'Park',
    });
    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2); // title + venue
  });
});

describe('computeImmediateScheduleTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an ISO string 5 minutes in the future', () => {
    const now = new Date('2026-03-05T12:00:00.000Z');
    vi.setSystemTime(now);

    const result = computeImmediateScheduleTime();
    const parsed = new Date(result);

    expect(parsed.getTime()).toBe(now.getTime() + 5 * 60 * 1000);
  });

  it('returns a valid ISO string', () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    const result = computeImmediateScheduleTime();
    expect(() => new Date(result)).not.toThrow();
    expect(new Date(result).toISOString()).toBe(result);
  });
});

describe('computeIdempotencyKey', () => {
  it('combines eventId and socialTargetId with separator', () => {
    const key = computeIdempotencyKey('evt-123', 'st-456');
    expect(key).toBe('evt-123::st-456');
  });

  it('is deterministic', () => {
    const a = computeIdempotencyKey('a', 'b');
    const b = computeIdempotencyKey('a', 'b');
    expect(a).toBe(b);
  });

  it('produces different keys for different inputs', () => {
    const k1 = computeIdempotencyKey('a', 'b');
    const k2 = computeIdempotencyKey('b', 'a');
    expect(k1).not.toBe(k2);
  });
});

describe('summarizeSocialStatus', () => {
  it('returns "none" for undefined jobs', () => {
    expect(summarizeSocialStatus(undefined)).toBe('none');
  });

  it('returns "none" for empty array', () => {
    expect(summarizeSocialStatus([])).toBe('none');
  });

  it('returns "failed" when any job has failed', () => {
    const jobs = [
      { id: '1', status: 'scheduled' },
      { id: '2', status: 'failed' },
      { id: '3', status: 'pending' },
    ];
    expect(summarizeSocialStatus(jobs)).toBe('failed');
  });

  it('returns "scheduled" when all jobs are scheduled', () => {
    const jobs = [
      { id: '1', status: 'scheduled' },
      { id: '2', status: 'scheduled' },
    ];
    expect(summarizeSocialStatus(jobs)).toBe('scheduled');
  });

  it('returns "pending" when jobs are mixed but none failed', () => {
    const jobs = [
      { id: '1', status: 'scheduled' },
      { id: '2', status: 'pending' },
    ];
    expect(summarizeSocialStatus(jobs)).toBe('pending');
  });

  it('returns "pending" for a single pending job', () => {
    const jobs = [{ id: '1', status: 'pending' }];
    expect(summarizeSocialStatus(jobs)).toBe('pending');
  });
});

