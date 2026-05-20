import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataSlice, extractAccessEntries, extractApiArray } from './dataSlice';

const mockedApi = vi.hoisted(() => ({
  getCustomRules: vi.fn(),
  getRuleFolders: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  api: mockedApi,
}));

describe('Control D response extraction', () => {
  it('uses documented collection keys instead of flattening sibling metadata', () => {
    const devices = extractApiArray(
      {
        devices: [{ PK: 'dev_1', name: 'Endpoint' }],
        activity: true,
      },
      'devices'
    );

    expect(devices).toEqual([{ PK: 'dev_1', name: 'Endpoint' }]);
  });

  it('preserves IP keys from flexible /access responses', () => {
    expect(
      extractAccessEntries({
        ips: {
          '198.51.100.10': { date: 1_710_000_000 },
        },
      })
    ).toEqual([{ ip: '198.51.100.10', date: 1_710_000_000 }]);
  });
});

describe('Control D non-fatal load warnings', () => {
  beforeEach(() => {
    mockedApi.getCustomRules.mockReset();
    mockedApi.getRuleFolders.mockReset();
  });

  it('records a warning when optional rule folders fail to load', async () => {
    type TestState = Partial<ReturnType<typeof createDataSlice>> & {
      settings: { demoMode: boolean };
      apiWarnings: string[];
    };
    const state = {
      settings: { demoMode: false },
      apiWarnings: [],
    } as TestState;
    const set = (patch: Partial<TestState> | ((state: TestState) => Partial<TestState>)) => {
      Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
    };
    const get = () => state;
    Object.assign(state, createDataSlice(set, get));
    mockedApi.getCustomRules.mockResolvedValue({ success: true, body: { rules: [] } });
    mockedApi.getRuleFolders.mockRejectedValue(new Error('folder endpoint failed'));

    await state.refreshRules?.('prof_123');

    expect(state.apiWarnings).toContain('Rule folders could not be loaded: folder endpoint failed');
  });
});
