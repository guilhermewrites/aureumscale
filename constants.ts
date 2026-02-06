import { AdMetric, ContentDataPoint, RevenueDataPoint, TeamSpendDataPoint, ContentItem, ContentStatus, Platform, TeamMember } from "./types";

export const REVENUE_DATA: RevenueDataPoint[] = [
  { date: 'Sep 01', revenue: 4200, goal: 5000 },
  { date: 'Sep 02', revenue: 4800, goal: 5000 },
  { date: 'Sep 03', revenue: 5100, goal: 5000 },
  { date: 'Sep 04', revenue: 3900, goal: 5000 },
  { date: 'Sep 05', revenue: 5600, goal: 5000 },
  { date: 'Sep 06', revenue: 6100, goal: 5000 },
  { date: 'Sep 07', revenue: 5900, goal: 5000 },
];

export const CONTENT_DATA: ContentDataPoint[] = [
  { date: 'Sep 01', daysAhead: 3, published: 2 },
  { date: 'Sep 02', daysAhead: 4, published: 1 },
  { date: 'Sep 03', daysAhead: 2, published: 3 },
  { date: 'Sep 04', daysAhead: 5, published: 1 },
  { date: 'Sep 05', daysAhead: 7, published: 2 },
  { date: 'Sep 06', daysAhead: 9, published: 1 },
  { date: 'Sep 07', daysAhead: 12, published: 0 },
];

export const TEAM_SPEND_DATA: TeamSpendDataPoint[] = [
  { date: 'Sep 01', spend: 1200, budget: 1500 },
  { date: 'Sep 02', spend: 1300, budget: 1500 },
  { date: 'Sep 03', spend: 1100, budget: 1500 },
  { date: 'Sep 04', spend: 1450, budget: 1500 },
  { date: 'Sep 05', spend: 1600, budget: 1500 },
  { date: 'Sep 06', spend: 1550, budget: 1500 },
  { date: 'Sep 07', spend: 1400, budget: 1500 },
];

export const AD_METRICS: AdMetric[] = [
  { id: '1', campaignName: 'Q3_Scale_Cold_Traffic', platform: 'Facebook', status: 'Active', cpc: 2.45, cpm: 25.00, ctr: 1.2, costPerBookedCall: 120, costPerShowedCall: 150, spend: 5430 },
  { id: '2', campaignName: 'Retargeting_Webinar_Views', platform: 'Google', status: 'Active', cpc: 4.10, cpm: 45.00, ctr: 2.8, costPerBookedCall: 85, costPerShowedCall: 100, spend: 2100 },
  { id: '3', campaignName: 'Lookalike_1%_Customers', platform: 'TikTok', status: 'Learning', cpc: 0.95, cpm: 12.00, ctr: 0.9, costPerBookedCall: 200, costPerShowedCall: 310, spend: 800 },
  { id: '4', campaignName: 'B2B_LeadGen_V2', platform: 'LinkedIn', status: 'Active', cpc: 8.50, cpm: 60.00, ctr: 0.7, costPerBookedCall: 150, costPerShowedCall: 180, spend: 3200 },
  { id: '5', campaignName: 'TOF_Educational_Video', platform: 'Facebook', status: 'Paused', cpc: 1.80, cpm: 18.00, ctr: 1.5, costPerBookedCall: 130, costPerShowedCall: 160, spend: 1200 },
];

export const TEAM_MEMBERS: Record<string, TeamMember> = {
  NABEEL: { id: '1', name: 'Nabeel', role: 'CEO', initials: 'NA', color: 'bg-indigo-500' },
  WRITES: { id: '2', name: 'Writes', role: 'CMO', initials: 'WR', color: 'bg-purple-500' },
  ZAIN: { id: '3', name: 'Zain', role: 'CTO', initials: 'ZA', color: 'bg-blue-500' },
  FRANKO: { id: '4', name: 'Franko', role: 'Editor', initials: 'FR', color: 'bg-emerald-500' },
  LEWIS: { id: '5', name: 'Lewis', role: 'COO', initials: 'LE', color: 'bg-rose-500' },
};

export const CONTENT_ITEMS: ContentItem[] = [
  // YouTube
  {
    id: '1770415611897',
    title: 'Give Me 11 Minutes And I\'ll Teach You How To Build a $1M Agency',
    driveLink: 'https://drive.google.com/file/d/1FYBs3JyiaVoBMpkcbAms9AVKkmZmeLSS/view?usp=sharing',
    scriptLink: '',
    youtubeUrl: '',
    status: ContentStatus.LIVE,
    style: 'Ed Lawrence' as any,
    platform: Platform.YOUTUBE,
    postDate: 'Jan 30, 2026',
    team: [TEAM_MEMBERS.WRITES, TEAM_MEMBERS.NABEEL, TEAM_MEMBERS.FRANKO, TEAM_MEMBERS.LEWIS, TEAM_MEMBERS.ZAIN]
  },
  {
    id: '1770417500742',
    title: 'How To Scale From $0 To $150,000 Per Month (Updated For 2026)',
    driveLink: '',
    scriptLink: '',
    youtubeUrl: '',
    status: ContentStatus.LIVE,
    style: 'Ed Lawrence' as any,
    platform: Platform.YOUTUBE,
    postDate: 'Feb 4, 2026',
    team: [TEAM_MEMBERS.WRITES]
  },

  // Instagram
  {
    id: '1769982286657',
    title: 'Everyone\'s Obsessed',
    driveLink: 'https://drive.google.com/file/d/1gT9wFzjPIUt6YwgSSvYCV5MuYrQpGKxq/view?usp=sharing',
    scriptLink: '',
    youtubeUrl: '',
    status: ContentStatus.DONE,
    platform: Platform.INSTAGRAM,
    postDate: 'Feb 1, 2026',
    team: [TEAM_MEMBERS.NABEEL, TEAM_MEMBERS.WRITES]
  },

  // LinkedIn
  {
    id: 'li-1',
    title: 'The Truth About Fundraising',
    driveLink: '#',
    status: ContentStatus.LIVE,
    platform: Platform.LINKEDIN,
    postDate: 'Oct 10, 2024',
    team: [TEAM_MEMBERS.LEWIS, TEAM_MEMBERS.NABEEL]
  },
  {
    id: 'li-2',
    title: 'Case Study: 0 to 10k Users',
    driveLink: '#',
    status: ContentStatus.IN_PROGRESS,
    platform: Platform.LINKEDIN,
    postDate: 'Oct 18, 2024',
    team: [TEAM_MEMBERS.LEWIS]
  },

  // TikTok
  {
    id: 'tt-1',
    title: 'Office Tour - Minimal Setup',
    driveLink: '#',
    status: ContentStatus.DONE,
    platform: Platform.TIKTOK,
    postDate: 'Oct 15, 2024',
    team: [TEAM_MEMBERS.WRITES]
  },
  {
    id: 'tt-2',
    title: 'Quick Tip: Focus Blocks',
    driveLink: '#',
    status: ContentStatus.PENDING,
    platform: Platform.TIKTOK,
    postDate: 'Oct 20, 2024',
    team: [TEAM_MEMBERS.WRITES, TEAM_MEMBERS.FRANKO]
  },
];