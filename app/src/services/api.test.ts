import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildControlDFormBody,
  ControlDApi,
  toControlDCustomRulePayload,
  toControlDDevicePayload,
  toControlDServiceRulePayload,
} from './api';

describe('Control D API payloads', () => {
  it('sends form-encoded filter fields', () => {
    expect(buildControlDFormBody({ status: 1 }).toString()).toBe('status=1');
  });

  it('maps dashboard service states to Control D rule form fields', () => {
    expect(toControlDServiceRulePayload(0)).toEqual({ do: 0, status: 1 });
    expect(toControlDServiceRulePayload(1)).toEqual({ status: 0 }); // allow = disable rule
    expect(toControlDServiceRulePayload(2)).toEqual({ do: 1, status: 1 });
    expect(toControlDServiceRulePayload(3, 'LON')).toEqual({ do: 3, status: 1, via: 'LON' });
  });

  it('uses Control D device field names instead of app field names', () => {
    expect(toControlDDevicePayload({ profile: 'prof_123', configured_clients: 4, status: 2 })).toEqual({
      profile_id: 'prof_123',
      client_count: 4,
      status: 2,
    });
  });

  it('maps custom rule actions to Control D do/status/hostnames form fields', () => {
    expect(
      buildControlDFormBody(
        toControlDCustomRulePayload({
          hostname: 'example.com',
          action: 'redirect',
          value: '1.2.3.4',
          group: '42',
        })
      ).toString()
    ).toBe('do=3&status=1&via=1.2.3.4&group=42&hostnames%5B%5D=example.com');
  });
});

describe('Control D API contract tests', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.useRealTimers();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, body: {} }),
    });
  });

  const createApi = () => {
    const client = new ControlDApi();
    client.setToken('token_123');
    client.setBaseUrl('https://proxy.example');
    return client;
  };

  it('updateFilter calls the documented filter modify route with a form body', async () => {
    const client = createApi();

    await client.updateFilter('prof_123', 'ads & trackers', 1);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://proxy.example/profiles/prof_123/filters/filter/ads%20%26%20trackers',
      expect.objectContaining({
        method: 'PUT',
        body: expect.any(URLSearchParams),
      })
    );
    expect((mockFetch.mock.calls[0][1].body as URLSearchParams).toString()).toBe('status=1');
  });

  it('getProfileOptions calls the global profile options route', async () => {
    const client = createApi();

    await client.getProfileOptions();

    expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example/profiles/options');
  });

  it('updateProfileOption sends documented status and value fields', async () => {
    const client = createApi();

    await client.updateProfileOption('prof_123', 'safesearch', 1, 'strict');

    expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example/profiles/prof_123/options/safesearch');
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    expect((mockFetch.mock.calls[0][1].body as URLSearchParams).toString()).toBe('status=1&value=strict');
  });

  it('getDeviceActivity delegates to the documented access route', async () => {
    const client = createApi();

    await client.getDeviceActivity('dev_123');

    expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example/access?device_id=dev_123');
  });

  it('updateDefaultRule sends do status and via as form fields', async () => {
    const client = createApi();

    await client.updateDefaultRule('prof_123', 3, 1, 'LON');

    expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example/profiles/prof_123/default');
    expect((mockFetch.mock.calls[0][1].body as URLSearchParams).toString()).toBe('do=3&status=1&via=LON');
  });

  it('createProfile uses a form body with documented profile fields', async () => {
    const client = createApi();

    await client.createProfile({ name: 'Test Profile', PK: 'prof_456' });

    expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example/profiles');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect((mockFetch.mock.calls[0][1].body as URLSearchParams).toString()).toBe('name=Test+Profile&clone_profile_id=prof_456');
  });

  it('batchUpdateFilters sends the documented filters array field', async () => {
    const client = createApi();
    const filters = [
      { filter: 'ads', status: 1 },
      { filter: 'malware', status: 0 },
    ];

    await client.batchUpdateFilters('prof_123', filters);

    const body = mockFetch.mock.calls[0][1].body as URLSearchParams;
    expect(body.toString()).toContain('filters=');
    const filtersParam = decodeURIComponent(body.toString().replace('filters=', ''));
    const parsed = JSON.parse(filtersParam);
    expect(parsed).toEqual(filters);
  });

  it('aborts requests after the configured timeout', async () => {
    vi.useFakeTimers();
    const client = createApi();
    client.setRequestTimeoutMs(25);
    mockFetch.mockImplementation((_url, init: RequestInit) => (
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      })
    ));

    const request = expect(client.getUser()).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(25);

    await request;
  });
});
