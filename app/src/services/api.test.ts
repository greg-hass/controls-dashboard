import { describe, expect, it } from 'vitest';
import {
  buildControlDFormBody,
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
    expect(toControlDServiceRulePayload(1)).toEqual({ do: 0, status: 0 });
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
    ).toBe('do=2&status=1&via=1.2.3.4&group=42&hostnames%5B%5D=example.com');
  });
});
