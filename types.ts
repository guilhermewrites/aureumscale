export enum ChartViewType {
  REVENUE = 'REVENUE',
  CONTENT_SCHEDULE = 'CONTENT_SCHEDULE',
  TEAM_SPEND = 'TEAM_SPEND'
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  goal: number;
}

export interface ContentDataPoint {
  date: string;
  daysAhead: number; // actual pieces (e.g. videos) for that day
  published?: number;
  expected?: number; // total expected across all visible platforms
  expectedYouTube?: number;
  expectedInstagram?: number;
  expectedTikTok?: number;
  expectedLinkedIn?: number;
}

export interface TeamSpendDataPoint {
  date: string;
  spend: number;
  budget: number;
}

export interface AdMetric {
  id: string;
  campaignName: string;
  platform: 'Facebook' | 'Google' | 'LinkedIn' | 'TikTok';
  status: 'Active' | 'Paused' | 'Learning';
  cpc: number;
  cpm: number;
  ctr: number;
  costPerBookedCall: number;
  costPerShowedCall: number;
  spend: number;
}

export enum NavigationItem {
  DASHBOARD = 'Dashboard',
  PLANNER = 'Planner',
  CONTENT = 'Content',
  ADS = 'Ads',
  FUNNELS = 'Funnels',
  VSLS = 'VSLs',
  PAGES = 'Pages',
  NEWSLETTER = 'Newsletter',
  WEBINAR = 'Webinar',
  TEAM = 'Team',
  FINANCE = 'Finance',
  SWIPEFILE = 'Swipefile'
}

// --- User / Workspace ---
export interface AppUser {
  id: string;
  name: string;
  label: string; // e.g. "Guilherme" or "The AI Partner"
  initials: string;
  color: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

// --- Funnel Types ---
export type FunnelStepType = 'registration' | 'thank_you' | 'video' | 'email' | 'sales_page' | 'checkout' | 'upsell' | 'ad' | 'product' | 'blog' | 'webinar' | 'download' | 'custom' | 'sms' | 'whatsapp' | 'call' | 'pipeline' | 'crm' | 'group_chat';

export interface FunnelStepAd {
  id: string;
  campaignName: string;
  platform: 'Facebook' | 'Google' | 'LinkedIn' | 'TikTok';
  type: 'marketing' | 'remarketing';
  spend: number;
  clicks: number;
  impressions: number;
}

export type FunnelAdStatus = 'Unassigned' | 'Pending' | 'Scripted' | 'Recorded' | 'Edited' | 'Needs Review' | 'Sent' | 'Live' | 'Paused';

export interface FunnelStep {
  id: string;
  name: string;
  type: FunnelStepType;
  url?: string;
  previewMedia?: string;
  previewMediaType?: 'image' | 'video';
  transcript?: string;
  adTitle?: string;
  adStatus?: FunnelAdStatus;
  emailHeadline?: string;
  emailSubheadline?: string;
  emailBody?: string;
  emailStatus?: FunnelAdStatus;
  smsBody?: string;
  smsStatus?: FunnelAdStatus;
  views: number;
  clicks: number;
  conversions: number;
  ads: FunnelStepAd[];
  order: number;
}

export interface FunnelExpectedMetrics {
  views?: number;
  clicks?: number;
  conversions?: number;
}

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  expectedMetrics?: FunnelExpectedMetrics;
  createdAt: string;
}

// --- Ads with funnel association ---
export interface AdCampaign {
  id: string;
  campaignName: string;
  platform: 'Facebook' | 'Google' | 'LinkedIn' | 'TikTok';
  type: 'marketing' | 'remarketing';
  status: 'Active' | 'Paused' | 'Learning';
  funnelId?: string;
  funnelStepId?: string;
  cpc: number;
  cpm: number;
  ctr: number;
  costPerBookedCall: number;
  costPerShowedCall: number;
  spend: number;
  clicks: number;
  impressions: number;
}

export enum Platform {
  YOUTUBE = 'YouTube',
  INSTAGRAM = 'Instagram',
  TIKTOK = 'TikTok',
  LINKEDIN = 'LinkedIn'
}

export enum ContentStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  EDITING = 'Editing',
  SENT = 'Sent',
  REJECTED = 'Rejected',
  DONE = 'Done',
  LIVE = 'Live'
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  description?: string;
  initials: string;
  color: string;
  photoUrl?: string;
}

// YouTube styles
export enum VideoStyle {
  MIRO = 'Miro',
  IPAD = 'iPad',
  GAMMA = 'Gamma',
  BLENDED = 'Blended',
  ED_LAWRENCE = 'Ed Lawrence'
}

// Instagram styles
export enum InstagramStyle {
  MOVING_CHAIR = 'Moving Chair',
  TALKING_HEAD = 'Talking Head',
  FACE_BACKGROUND = 'Face & Background',
  MIRO = 'Miro',
  VOICE_OVER = 'Voice-over'
}

// Platform-specific status sets
export const YOUTUBE_STATUSES: ContentStatus[] = [
  ContentStatus.PENDING,
  ContentStatus.IN_PROGRESS,
  ContentStatus.EDITING,
  ContentStatus.SENT,
  ContentStatus.DONE,
  ContentStatus.LIVE,
];

export const INSTAGRAM_STATUSES: ContentStatus[] = [
  ContentStatus.PENDING,
  ContentStatus.IN_PROGRESS,
  ContentStatus.EDITING,
  ContentStatus.SENT,
  ContentStatus.REJECTED,
  ContentStatus.DONE,
  ContentStatus.LIVE,
];

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  driveLink: string;
  scriptLink?: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
  status: ContentStatus;
  style?: VideoStyle | InstagramStyle;
  team: TeamMember[];
  postDate: string;
  platform: Platform;
}

export interface ContentIdea {
  id: string;
  text: string;
  transcript?: string;
  platform: Platform;
  createdAt: string;
}

export enum InvoiceStatus {
  SENT = 'Sent',
  NOT_PAID = 'Not Paid',
  PAID = 'Paid'
}

export interface FinanceItem {
  id: string;
  amount: number;
  clientName: string;
  invoiceDate: string;
  status: InvoiceStatus;
}

export enum SwipefileCategory {
  PROMPTS = 'Prompts',
  VSLS = 'VSLs',
  PAGES = 'Pages',
  ADS = 'Ads',
  YOUTUBE = 'YouTube',
  OTHERS = 'Others'
}

export type SwipefileMediaType = 'text' | 'image' | 'video';

export interface SwipefileItem {
  id: string;
  title: string;
  content: string; // Link or Text content
  mediaType: SwipefileMediaType;
  mediaUrl?: string; // URL for image or video preview
  category: SwipefileCategory;
  tags: string[];
  createdAt: string;
}

export interface PlannerSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface PlannerTask {
  id: string;
  title: string;
  completed: boolean;
  notes?: string;
  subtasks?: PlannerSubtask[];
  createdAt: string;
}