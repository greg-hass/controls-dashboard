import type {
  User,
  Profile,
  Device,
  DeviceType,
  ServiceCategory,
  Service,
  Filter,
  ExternalFilter,
  CustomRule,
  RuleFolder,
  AccessIP,
  AnalyticsLevel,
  StorageRegion,
  IPInfo,
  NetworkStats,
  QuickAction,
} from '@/types/controld';

export const mockUser: User = {
  PK: 'usr_001',
  email: 'admin@homelab.local',
  status: 1,
  email_status: 1,
  proxy_access: 1,
  last_active: Date.now() / 1000,
  twofa: 1,
  date: '2023-01-15',
};

export const mockProfiles: Profile[] = [
  {
    PK: 'prof_001',
    name: 'Strict Family',
    description: 'Maximum protection for kids. Blocks social media, games, adult content, and ads.',
    policies: { log_level: 2, safesearch: 1, block_bypass: 1 },
    default_rule: { action: 'block' },
  },
  {
    PK: 'prof_002',
    name: 'Standard',
    description: 'Balanced filtering for general household use. Blocks ads, trackers, and malware.',
    policies: { log_level: 1, safesearch: 1, block_bypass: 0 },
    default_rule: { action: 'allow' },
  },
  {
    PK: 'prof_003',
    name: 'Guest Wi-Fi',
    description: 'Permissive profile for guest devices. Basic malware protection only.',
    policies: { log_level: 0, safesearch: 0, block_bypass: 0 },
    default_rule: { action: 'allow' },
  },
  {
    PK: 'prof_004',
    name: 'Homework Mode',
    description: 'Distraction-free profile for study time. Blocks entertainment and social sites.',
    policies: { log_level: 2, safesearch: 1, block_bypass: 1 },
    default_rule: { action: 'block' },
  },
];

export const mockFilters: Filter[] = [
  { PK: 'malware', name: 'Malware & Phishing', description: 'Blocks known malicious domains', category: 'security', status: 1, count: 450000 },
  { PK: 'ads', name: 'Ads & Trackers', description: 'Blocks advertising and tracking domains', category: 'privacy', status: 1, count: 890000 },
  { PK: 'adult', name: 'Adult Content', description: 'Blocks adult and explicit websites', category: 'content', status: 1, count: 120000 },
  { PK: 'gambling', name: 'Gambling', description: 'Blocks online gambling sites', category: 'content', status: 1, count: 8500 },
  { PK: 'drugs', name: 'Drugs & Alcohol', description: 'Blocks drug-related content', category: 'content', status: 0, count: 15000 },
  { PK: 'dating', name: 'Dating Sites', description: 'Blocks online dating platforms', category: 'content', status: 0, count: 3200 },
];

export const mockExternalFilters: ExternalFilter[] = [
  { PK: 'oisd', name: 'OISD Full', url: 'https://oisd.nl', status: 1 },
  { PK: 'stevenblack', name: 'StevenBlack Unified', url: 'https://github.com/StevenBlack/hosts', status: 1 },
];

export const mockServiceCategories: ServiceCategory[] = [
  { PK: 'social', name: 'Social Media', description: 'Social networking platforms' },
  { PK: 'streaming', name: 'Streaming', description: 'Video and audio streaming services' },
  { PK: 'gaming', name: 'Gaming', description: 'Online gaming platforms and services' },
  { PK: 'communication', name: 'Communication', description: 'Messaging and video calling apps' },
  { PK: 'shopping', name: 'Shopping', description: 'E-commerce and shopping sites' },
  { PK: 'news', name: 'News & Media', description: 'News outlets and media sites' },
  { PK: 'education', name: 'Education', description: 'Learning platforms and educational content' },
  { PK: 'finance', name: 'Finance', description: 'Banking and financial services' },
];

export const mockServices: Service[] = [
  { PK: 'tiktok', name: 'TikTok', category: 'social', status: 0 },
  { PK: 'instagram', name: 'Instagram', category: 'social', status: 0 },
  { PK: 'facebook', name: 'Facebook', category: 'social', status: 0 },
  { PK: 'twitter', name: 'X / Twitter', category: 'social', status: 1 },
  { PK: 'snapchat', name: 'Snapchat', category: 'social', status: 0 },
  { PK: 'youtube', name: 'YouTube', category: 'streaming', status: 1 },
  { PK: 'netflix', name: 'Netflix', category: 'streaming', status: 1 },
  { PK: 'spotify', name: 'Spotify', category: 'streaming', status: 1 },
  { PK: 'twitch', name: 'Twitch', category: 'streaming', status: 0 },
  { PK: 'steam', name: 'Steam', category: 'gaming', status: 0 },
  { PK: 'epic', name: 'Epic Games', category: 'gaming', status: 0 },
  { PK: 'roblox', name: 'Roblox', category: 'gaming', status: 0 },
  { PK: 'discord', name: 'Discord', category: 'communication', status: 1 },
  { PK: 'zoom', name: 'Zoom', category: 'communication', status: 1 },
  { PK: 'teams', name: 'Microsoft Teams', category: 'communication', status: 1 },
  { PK: 'amazon', name: 'Amazon', category: 'shopping', status: 1 },
  { PK: 'ebay', name: 'eBay', category: 'shopping', status: 1 },
  { PK: 'coursera', name: 'Coursera', category: 'education', status: 1 },
  { PK: 'khan', name: 'Khan Academy', category: 'education', status: 1 },
  { PK: 'reddit', name: 'Reddit', category: 'social', status: 1 },
];

export const mockDevices: Device[] = [
  {
    PK: 'dev_001',
    name: 'Living Room TV',
    type: 'router',
    profile: 'prof_002',
    profile_name: 'Standard',
    status: 1,
    resolver: 'dns.controld.com/abc123',
    last_activity: Date.now() / 1000 - 300,
    known_ip_count: 4,
    activity: { state: 'online', label: 'Online', lastSeen: Date.now() / 1000 - 300, knownIpCount: 4 },
  },
  {
    PK: 'dev_002',
    name: "Kid's iPad",
    type: 'user',
    profile: 'prof_001',
    profile_name: 'Strict Family',
    status: 1,
    resolver: 'dns.controld.com/def456',
    last_activity: Date.now() / 1000 - 120,
    known_ip_count: 1,
    activity: { state: 'online', label: 'Online', lastSeen: Date.now() / 1000 - 120, knownIpCount: 1 },
  },
  {
    PK: 'dev_003',
    name: 'Home Router',
    type: 'router',
    profile: 'prof_002',
    profile_name: 'Standard',
    status: 1,
    resolver: 'dns.controld.com/ghi789',
    last_activity: Date.now() / 1000 - 60,
    known_ip_count: 12,
    activity: { state: 'online', label: 'Online', lastSeen: Date.now() / 1000 - 60, knownIpCount: 12 },
  },
  {
    PK: 'dev_004',
    name: 'Guest Phone',
    type: 'user',
    profile: 'prof_003',
    profile_name: 'Guest Wi-Fi',
    status: 1,
    resolver: 'dns.controld.com/jkl012',
    last_activity: Date.now() / 1000 - 1800,
    known_ip_count: 1,
    activity: { state: 'offline', label: 'Offline', lastSeen: Date.now() / 1000 - 1800, knownIpCount: 1 },
  },
  {
    PK: 'dev_005',
    name: 'Office Laptop',
    type: 'user',
    profile: 'prof_002',
    profile_name: 'Standard',
    status: 1,
    resolver: 'dns.controld.com/mno345',
    last_activity: Date.now() / 1000 - 600,
    known_ip_count: 1,
    activity: { state: 'offline', label: 'Offline', lastSeen: Date.now() / 1000 - 600, knownIpCount: 1 },
  },
  {
    PK: 'dev_006',
    name: 'Smart Home Hub',
    type: 'router',
    profile: 'prof_002',
    profile_name: 'Standard',
    status: 1,
    resolver: 'dns.controld.com/pqr678',
    last_activity: Date.now() / 1000 - 30,
    known_ip_count: 8,
    activity: { state: 'online', label: 'Online', lastSeen: Date.now() / 1000 - 30, knownIpCount: 8 },
  },
];

export const mockDeviceTypes: DeviceType[] = [
  { PK: 'router', name: 'Router / Network', description: 'Router or network-wide device' },
  { PK: 'user', name: 'User Device', description: 'Individual user device' },
];

export const mockCustomRules: CustomRule[] = [
  { PK: 'rule_001', hostname: 'example-ads.com', action: 'block', group: 'Ads', status: 1 },
  { PK: 'rule_002', hostname: 'family-calendar.local', action: 'redirect', value: '192.168.1.50', group: 'Local', status: 1 },
  { PK: 'rule_003', hostname: 'old-nas.local', action: 'redirect', value: '192.168.1.100', group: 'Local', status: 1 },
  { PK: 'rule_004', hostname: 'malicious-site.xyz', action: 'block', group: 'Security', status: 1 },
  { PK: 'rule_005', hostname: 'tracking-corp.com', action: 'block', group: 'Privacy', status: 1 },
  { PK: 'rule_006', hostname: 'printer.local', action: 'redirect', value: '192.168.1.25', group: 'Local', status: 1 },
];

export const mockRuleFolders: RuleFolder[] = [
  { PK: 'Ads', name: 'Ads', description: 'Ad blocking rules', status: 1 },
  { PK: 'Local', name: 'Local DNS', description: 'Local network redirects', status: 1 },
  { PK: 'Security', name: 'Security', description: 'Security-related blocks', status: 1 },
  { PK: 'Privacy', name: 'Privacy', description: 'Privacy protection rules', status: 1 },
];

export const mockAccessIPs: AccessIP[] = [
  { ip: '192.168.1.45', date: Date.now() / 1000 - 300, learned: 1 },
  { ip: '192.168.1.12', date: Date.now() / 1000 - 600, learned: 1 },
  { ip: '192.168.1.88', date: Date.now() / 1000 - 1200, learned: 1 },
  { ip: '10.0.0.55', date: Date.now() / 1000 - 3600, learned: 0 },
  { ip: '192.168.1.200', date: Date.now() / 1000 - 7200, learned: 1 },
];

export const mockAnalyticsLevels: AnalyticsLevel[] = [
  { PK: 0, name: 'None', description: 'No logging' },
  { PK: 1, name: 'Basic', description: 'Log query counts only' },
  { PK: 2, name: 'Detailed', description: 'Log full query details including domains' },
  { PK: 3, name: 'Verbose', description: 'Log everything including blocked queries' },
];

export const mockStorageRegions: StorageRegion[] = [
  { PK: 'us-east', name: 'US East', location: 'New York, USA' },
  { PK: 'us-west', name: 'US West', location: 'San Francisco, USA' },
  { PK: 'eu-central', name: 'EU Central', location: 'Frankfurt, Germany' },
  { PK: 'asia-east', name: 'Asia East', location: 'Singapore' },
];

export const mockIPInfo: IPInfo = {
  ip: '203.0.113.45',
  city: 'New York',
  country: 'US',
  org: 'Example ISP',
  pop: 'nyk-1',
};

export const mockNetworkStats: NetworkStats[] = [
  { pop: 'nyk-1', location: 'New York, USA', services: { dns: true, doh: true, dot: true, proxy: true }, latency: 12 },
  { pop: 'lax-1', location: 'Los Angeles, USA', services: { dns: true, doh: true, dot: true, proxy: true }, latency: 45 },
  { pop: 'fra-1', location: 'Frankfurt, DE', services: { dns: true, doh: true, dot: true, proxy: true }, latency: 89 },
  { pop: 'sin-1', location: 'Singapore', services: { dns: true, doh: true, dot: true, proxy: false }, latency: 156 },
  { pop: 'syd-1', location: 'Sydney, AU', services: { dns: true, doh: true, dot: false, proxy: true }, latency: 178 },
];

export const mockQuickActions: QuickAction[] = [
  {
    id: 'dinner_mode',
    name: 'Dinner Time',
    description: 'Block social media and streaming for 60 minutes',
    icon: 'UtensilsCrossed',
    services_to_block: ['tiktok', 'instagram', 'youtube', 'netflix', 'twitch'],
    duration_minutes: 60,
    profile_ids: ['prof_001', 'prof_004'],
  },
  {
    id: 'homework_mode',
    name: 'Homework Mode',
    description: 'Block games, social media, and entertainment. Allow educational sites.',
    icon: 'BookOpen',
    services_to_block: ['tiktok', 'instagram', 'snapchat', 'steam', 'epic', 'roblox', 'twitch'],
    services_to_allow: ['coursera', 'khan'],
    duration_minutes: 120,
    profile_ids: ['prof_001', 'prof_002', 'prof_004'],
  },
  {
    id: 'bedtime',
    name: 'Bedtime Lock',
    description: 'Block all entertainment until morning',
    icon: 'Moon',
    services_to_block: ['tiktok', 'instagram', 'youtube', 'netflix', 'spotify', 'steam', 'epic', 'roblox', 'twitch'],
    duration_minutes: 480,
    profile_ids: ['prof_001', 'prof_002'],
  },
  {
    id: 'social_freeze',
    name: 'Social Freeze',
    description: 'Block all social media platforms temporarily',
    icon: 'Smartphone',
    services_to_block: ['tiktok', 'instagram', 'facebook', 'twitter', 'snapchat', 'reddit'],
    duration_minutes: 30,
    profile_ids: ['prof_001', 'prof_002', 'prof_003', 'prof_004'],
  },
  {
    id: 'guest_unlock',
    name: 'Guest Access',
    description: 'Temporarily allow all services on Guest profile',
    icon: 'Users',
    services_to_allow: ['tiktok', 'instagram', 'youtube', 'netflix', 'steam', 'twitch'],
    duration_minutes: 180,
    profile_ids: ['prof_003'],
  },
];
