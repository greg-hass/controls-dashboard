import type { CustomRule, RuleFolder, Service } from '@/types/controld';

type RawObject = Record<string, unknown>;

const isObject = (value: unknown): value is RawObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const readString = (value: unknown) =>
  value === undefined || value === null ? undefined : String(value);

const readStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map(readString).filter((item): item is string => Boolean(item));
  }

  if (isObject(value)) {
    return Object.values(value).map(readString).filter((item): item is string => Boolean(item));
  }

  const single = readString(value);
  return single ? [single] : [];
};

export const readControlDAction = (value: unknown) => {
  const action = isObject(value) ? value : {};

  return {
    do: readNumber(action.do),
    status: readNumber(action.status),
    via: readString(action.via),
    via_v6: readString(action.via_v6),
  };
};

export const toDashboardServiceStatus = (service: Partial<Service>) => {
  const action = readControlDAction(service.action);
  const ruleStatus = readNumber(service.status) ?? action.status;
  const ruleType = readNumber(service.do) ?? action.do;

  if (ruleStatus === 0) return 1;
  if (ruleType === 0) return 0;
  if (ruleType === 1) return 2;
  if (ruleType === 3) return 3;
  return 1;
};

export const normalizeProfileServiceRules = (
  catalog: Partial<Service>[],
  rules: Partial<Service>[]
): Service[] => {
  const rulesById = new Map(rules.map((service) => [String(service.PK), service]));

  return catalog.map((service) => {
    const rule = rulesById.get(String(service.PK));
    const action = readControlDAction(rule?.action);
    const via = readString(rule?.via) ?? action.via;
    const via_v6 = readString(rule?.via_v6) ?? action.via_v6;
    const doValue = readNumber(rule?.do) ?? action.do;

    return {
      ...service,
      ...rule,
      PK: String(service.PK ?? rule?.PK ?? ''),
      name: readString(rule?.name) ?? readString(service.name) ?? String(service.PK ?? rule?.PK ?? ''),
      category: readString(rule?.category) ?? readString(service.category) ?? '',
      locations: readStringArray(rule?.locations ?? service.locations),
      unlock_location: readString(rule?.unlock_location) ?? readString(service.unlock_location),
      warning: readString(rule?.warning) ?? readString(service.warning),
      status: rule ? toDashboardServiceStatus(rule) : 1,
      do: doValue,
      via,
      via_v6,
    } as Service;
  });
};

export const controlDDoToRuleAction = (doValue: unknown): CustomRule['action'] => {
  const normalized = readNumber(doValue);
  if (normalized === 0) return 'block';
  if (normalized === 1) return 'allow';
  if (normalized === 3) return 'redirect';
  return 'redirect';
};

export const normalizeControlDRules = (rules: unknown[]): CustomRule[] =>
  rules.filter(isObject).map((rule) => {
    const action = readControlDAction(rule.action);
    const hostname = readString(rule.hostname) ?? readString(rule.PK) ?? '';

    return {
      ...rule,
      PK: readString(rule.PK) ?? hostname,
      hostname,
      action: controlDDoToRuleAction(action.do ?? rule.do),
      do: action.do ?? readNumber(rule.do),
      via: action.via ?? readString(rule.via),
      via_v6: action.via_v6 ?? readString(rule.via_v6),
      value: action.via ?? readString(rule.via) ?? readString(rule.value),
      group: readString(rule.group) ?? '',
      status: action.status ?? readNumber(rule.status) ?? 1,
    } as CustomRule;
  });

export const normalizeControlDRuleFolders = (folders: unknown[]): RuleFolder[] =>
  folders.filter(isObject).map((folder) => {
    const action = readControlDAction(folder.action);
    const id = readString(folder.PK) ?? readString(folder.group) ?? '';

    return {
      ...folder,
      PK: id,
      name: readString(folder.name) ?? readString(folder.group) ?? id,
      description: readString(folder.description) ?? '',
      status: action.status ?? readNumber(folder.status) ?? 1,
      count: readNumber(folder.count),
      action: controlDDoToRuleAction(action.do ?? folder.do),
      do: action.do ?? readNumber(folder.do),
      via: action.via ?? readString(folder.via),
    } as RuleFolder;
  });

export const collectRouteLocations = (services: Partial<Service>[]) => {
  const locations = services.flatMap((service) => [
    ...readStringArray(service.locations),
    readString(service.via),
    readString(service.unlock_location),
  ]);

  return [...new Set(locations.filter((location): location is string => Boolean(location)))];
};
