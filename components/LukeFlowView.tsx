import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Mail,
  MessageSquare,
  Send,
  FileText,
  Megaphone,
  Tag as TagIcon,
  Eye,
  MousePointerClick,
  DollarSign,
  Users,
  Clock,
  Facebook,
} from 'lucide-react';

// --- Data model ---

type Platform = 'GHL' | 'Kit' | 'Meta' | 'Telegram' | 'Twilio';

interface AdNodeData {
  kind: 'ad';
  label: string;
  platform: Platform;
  image: string;
  headline: string;
  primaryText: string;
  cta: string;
  spend: number;
  leads: number;
  cpl: number;
}

interface PageNodeData {
  kind: 'page';
  label: string;
  url: string;
  iframeSrc: string;
  views: number;
  clicks: number;
  conversionPct: number;
}

interface EmailNodeData {
  kind: 'email';
  fromName: string;
  fromEmail: string;
  subject: string;
  preheader: string;
  body: string;
  trigger: string;
  tags: { platform: Platform; label: string }[];
  sent: number;
  openedPct: number;
  clickedPct: number;
}

interface SmsNodeData {
  kind: 'sms';
  fromNumber: string;
  body: string;
  trigger: string;
  tags: { platform: Platform; label: string }[];
  sent: number;
  clickedPct: number;
}

interface TelegramNodeData {
  kind: 'telegram';
  fromHandle: string;
  body: string;
  trigger: string;
  tags: { platform: Platform; label: string }[];
  sent: number;
  clickedPct: number;
}

const PLATFORM_COLOR: Record<Platform, string> = {
  GHL:      '#f9a8d4',
  Kit:      '#fcd34d',
  Meta:     '#93c5fd',
  Telegram: '#86efac',
  Twilio:   '#fca5a5',
};

const EMAIL_COLOR = { fg: '#bfdbfe', bg: 'rgba(191,219,254,0.08)', border: 'rgba(191,219,254,0.35)' };
const SMS_COLOR   = { fg: '#fde68a', bg: 'rgba(253,230,138,0.08)', border: 'rgba(253,230,138,0.35)' };
const TG_COLOR    = { fg: '#86efac', bg: 'rgba(134,239,172,0.08)', border: 'rgba(134,239,172,0.35)' };

// --- Shared UI helpers ---

const TagChips: React.FC<{ tags: { platform: Platform; label: string }[] }> = ({ tags }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
    {tags.map((t, i) => (
      <span
        key={i}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 5,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${PLATFORM_COLOR[t.platform]}40`,
          color: PLATFORM_COLOR[t.platform],
        }}
      >
        <TagIcon size={8} /> {t.platform}:{t.label}
      </span>
    ))}
  </div>
);

const TriggerBadge: React.FC<{ trigger: string; color: string }> = ({ trigger, color }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 9,
      color,
      background: 'rgba(255,255,255,0.04)',
      padding: '2px 6px',
      borderRadius: 6,
    }}
  >
    <Clock size={8} />
    {trigger}
  </span>
);

// --- Ad Node ---

const AdNode: React.FC<NodeProps<AdNodeData>> = ({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 280,
        background: '#1a1a1a',
        border: '1px solid rgba(147,197,253,0.35)',
        borderRadius: 12,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
      }}
    >
      {/* Ad header (platform badge) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          background: 'rgba(147,197,253,0.08)',
          borderBottom: '1px solid rgba(147,197,253,0.2)',
        }}
      >
        <Facebook size={12} color="#93c5fd" />
        <span style={{ fontSize: 10, color: '#93c5fd', fontWeight: 600 }}>{data.platform} · Sponsored</span>
      </div>

      {/* Ad primary text */}
      <div style={{ padding: '8px 10px', fontSize: 10, color: '#ECECEC', lineHeight: 1.4 }}>
        {data.primaryText}
      </div>

      {/* Ad creative */}
      <div
        style={{
          height: 160,
          background: `url(${data.image}) center/cover, linear-gradient(135deg,#1a1a1a,#333)`,
          borderTop: '1px solid #2a2a2a',
          borderBottom: '1px solid #2a2a2a',
        }}
      />

      {/* Ad footer (headline + CTA) */}
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>aiinsiders.luke</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#ECECEC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.headline}
          </div>
        </div>
        <button
          style={{
            fontSize: 10,
            padding: '4px 10px',
            borderRadius: 6,
            background: '#2a2a2a',
            color: '#ECECEC',
            border: '1px solid #3a3a3a',
          }}
        >
          {data.cta}
        </button>
      </div>

      {/* Metrics */}
      {showMetrics && (
        <div
          style={{
            padding: '6px 10px',
            display: 'flex',
            gap: 10,
            fontSize: 10,
            color: '#999',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid #2a2a2a',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <DollarSign size={9} />${data.spend}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Users size={9} />{data.leads}
          </span>
          <span style={{ color: '#86efac', marginLeft: 'auto' }}>CPL ${data.cpl.toFixed(2)}</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: '#93c5fd', width: 8, height: 8 }} />
    </div>
  );
};

// --- Page Node (iframe thumbnail) ---

const PageNode: React.FC<NodeProps<PageNodeData>> = ({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  // iframe scaled: 1000x700 source scaled to 320x224 (scale 0.32)
  const scale = 0.32;
  const srcW = 1000;
  const srcH = 700;
  const displayW = Math.round(srcW * scale);
  const displayH = Math.round(srcH * scale);

  return (
    <div
      style={{
        width: displayW + 20,
        background: '#1a1a1a',
        border: '1px solid rgba(236,236,236,0.3)',
        borderRadius: 12,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#ECECEC', width: 8, height: 8 }} />

      {/* Browser chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: '#222',
          borderBottom: '1px solid #2a2a2a',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#ef4444' }} />
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#eab308' }} />
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#22c55e' }} />
        </div>
        <div
          style={{
            flex: 1,
            fontSize: 9,
            color: '#888',
            background: '#1a1a1a',
            padding: '2px 6px',
            borderRadius: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.url}
        </div>
      </div>

      {/* Iframe thumbnail */}
      <div
        style={{
          width: displayW,
          height: displayH,
          margin: '8px auto 0',
          overflow: 'hidden',
          background: '#0f0f0f',
          position: 'relative',
          borderRadius: 4,
        }}
      >
        <iframe
          src={data.iframeSrc}
          title={data.label}
          style={{
            width: srcW,
            height: srcH,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
          sandbox="allow-same-origin"
        />
      </div>

      {/* Label + metrics */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: showMetrics ? 6 : 0 }}>
          <FileText size={11} color="#ECECEC" />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{data.label}</span>
        </div>
        {showMetrics && (
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#999' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Eye size={9} />{data.views}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <MousePointerClick size={9} />{data.clicks}
            </span>
            <span style={{ color: '#86efac', marginLeft: 'auto' }}>{data.conversionPct}%</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#ECECEC', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="msg" style={{ background: '#ECECEC', width: 8, height: 8 }} />
    </div>
  );
};

// --- Email Node (inbox-style preview) ---

const EmailNode: React.FC<NodeProps<EmailNodeData>> = ({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 380,
        background: '#1a1a1a',
        border: `1px solid ${EMAIL_COLOR.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: EMAIL_COLOR.fg, width: 8, height: 8 }} />

      {/* Channel strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: EMAIL_COLOR.bg,
          borderBottom: `1px solid ${EMAIL_COLOR.border}`,
        }}
      >
        <Mail size={11} color={EMAIL_COLOR.fg} />
        <span style={{ fontSize: 9, color: EMAIL_COLOR.fg, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Email · Kit
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <TriggerBadge trigger={data.trigger} color="#ccc" />
        </span>
      </div>

      {/* Envelope header */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #2a2a2a', background: '#141414' }}>
        <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>
          <span style={{ color: '#aaa', fontWeight: 600 }}>From:</span> {data.fromName}{' '}
          <span style={{ color: '#666' }}>&lt;{data.fromEmail}&gt;</span>
        </div>
        <div style={{ fontSize: 12, color: '#ECECEC', fontWeight: 600, lineHeight: 1.3 }}>
          {data.subject}
        </div>
        <div style={{ fontSize: 10, color: '#777', marginTop: 2 }}>
          {data.preheader}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '10px 12px',
          fontSize: 11,
          color: '#d4d4d4',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          maxHeight: 260,
          overflow: 'auto',
        }}
        className="nodrag nowheel"
      >
        {data.body}
      </div>

      {/* Tags + metrics footer */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #2a2a2a', background: '#141414' }}>
        <TagChips tags={data.tags} />
        {showMetrics && (
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#999', marginTop: 6 }}>
            <span>{data.sent} sent</span>
            <span>{data.openedPct}% open</span>
            <span>{data.clickedPct}% click</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- SMS Node (phone-bubble style) ---

const SmsNode: React.FC<NodeProps<SmsNodeData>> = ({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 280,
        background: '#1a1a1a',
        border: `1px solid ${SMS_COLOR.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: SMS_COLOR.fg, width: 8, height: 8 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: SMS_COLOR.bg,
          borderBottom: `1px solid ${SMS_COLOR.border}`,
        }}
      >
        <MessageSquare size={11} color={SMS_COLOR.fg} />
        <span style={{ fontSize: 9, color: SMS_COLOR.fg, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          SMS · Twilio
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <TriggerBadge trigger={data.trigger} color="#ccc" />
        </span>
      </div>

      {/* Phone chat area */}
      <div
        style={{
          padding: '14px 12px',
          background: '#0f0f0f',
          minHeight: 120,
        }}
      >
        <div style={{ fontSize: 9, color: '#666', textAlign: 'center', marginBottom: 8 }}>
          {data.fromNumber}
        </div>
        <div
          style={{
            background: '#2a2a2a',
            color: '#ECECEC',
            fontSize: 11,
            padding: '8px 12px',
            borderRadius: '14px 14px 14px 4px',
            maxWidth: '85%',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
          }}
        >
          {data.body}
        </div>
      </div>

      <div style={{ padding: '8px 10px', borderTop: '1px solid #2a2a2a', background: '#141414' }}>
        <TagChips tags={data.tags} />
        {showMetrics && (
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#999', marginTop: 6 }}>
            <span>{data.sent} sent</span>
            <span>{data.clickedPct}% click</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Telegram Node ---

const TelegramNode: React.FC<NodeProps<TelegramNodeData>> = ({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 280,
        background: '#1a1a1a',
        border: `1px solid ${TG_COLOR.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: TG_COLOR.fg, width: 8, height: 8 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: TG_COLOR.bg,
          borderBottom: `1px solid ${TG_COLOR.border}`,
        }}
      >
        <Send size={11} color={TG_COLOR.fg} />
        <span style={{ fontSize: 9, color: TG_COLOR.fg, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Telegram
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <TriggerBadge trigger={data.trigger} color="#ccc" />
        </span>
      </div>

      <div
        style={{
          padding: '14px 12px',
          background: '#0f0f0f',
          minHeight: 120,
        }}
      >
        <div style={{ fontSize: 9, color: '#666', marginBottom: 8 }}>
          {data.fromHandle}
        </div>
        <div
          style={{
            background: 'linear-gradient(180deg, #1e3a5f, #14243d)',
            color: '#ECECEC',
            fontSize: 11,
            padding: '8px 12px',
            borderRadius: '14px 14px 14px 4px',
            maxWidth: '90%',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            border: '1px solid rgba(134,239,172,0.2)',
          }}
        >
          {data.body}
        </div>
      </div>

      <div style={{ padding: '8px 10px', borderTop: '1px solid #2a2a2a', background: '#141414' }}>
        <TagChips tags={data.tags} />
        {showMetrics && (
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#999', marginTop: 6 }}>
            <span>{data.sent} sent</span>
            <span>{data.clickedPct}% click</span>
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  ad: AdNode,
  page: PageNode,
  email: EmailNode,
  sms: SmsNode,
  telegram: TelegramNode,
};

// --- Seed data: Luke Alexander · AI Insiders ---

const AD_IMAGE = '/funnels/luke-alexander/hero.jpg';

const SEED_NODES: any[] = [
  // Ads
  {
    id: 'ad-meta',
    type: 'ad',
    position: { x: 0, y: 0 },
    data: {
      kind: 'ad',
      label: 'AI Insiders — Cold',
      platform: 'Meta',
      image: AD_IMAGE,
      headline: 'AI Insiders — Free Briefing',
      primaryText: 'The 3 AI workflows quietly replacing entire marketing teams. Free 60-min briefing. Seats limited.',
      cta: 'Sign Up',
      spend: 420,
      leads: 68,
      cpl: 6.18,
    },
  },
  {
    id: 'ad-ig',
    type: 'ad',
    position: { x: 0, y: 440 },
    data: {
      kind: 'ad',
      label: 'IG Retarget',
      platform: 'Meta',
      image: AD_IMAGE,
      headline: 'Still thinking about it?',
      primaryText: 'You looked, you left. The AI Insiders briefing starts tomorrow. Last call for seats.',
      cta: 'Save My Seat',
      spend: 180,
      leads: 41,
      cpl: 4.39,
    },
  },
  {
    id: 'ad-organic',
    type: 'ad',
    position: { x: 0, y: 880 },
    data: {
      kind: 'ad',
      label: 'Organic / Kit blast',
      platform: 'Kit',
      image: AD_IMAGE,
      headline: 'List email · AI Insiders',
      primaryText: 'Broadcast to Luke\'s subscriber list announcing the free AI Insiders briefing.',
      cta: 'Open',
      spend: 0,
      leads: 112,
      cpl: 0,
    },
  },

  // Pages
  {
    id: 'pg-optin',
    type: 'page',
    position: { x: 420, y: 280 },
    data: {
      kind: 'page',
      label: 'Capture Page',
      url: 'aureumfunnels.com/luke/optin',
      iframeSrc: '/funnels/luke-alexander/optin/index.html',
      views: 1240,
      clicks: 221,
      conversionPct: 17.8,
    },
  },
  {
    id: 'pg-slo',
    type: 'page',
    position: { x: 1540, y: 280 },
    data: {
      kind: 'page',
      label: 'SLO Page',
      url: 'aureumfunnels.com/luke/slo',
      iframeSrc: '/funnels/luke-alexander/slo/index.html',
      views: 221,
      clicks: 34,
      conversionPct: 15.4,
    },
  },
  {
    id: 'pg-ty',
    type: 'page',
    position: { x: 2040, y: 280 },
    data: {
      kind: 'page',
      label: 'Thank You',
      url: 'aureumfunnels.com/luke/ty',
      iframeSrc: '/funnels/luke-alexander/thank-you/index.html',
      views: 221,
      clicks: 198,
      conversionPct: 89.6,
    },
  },

  // Capture-triggered messages (row 1)
  {
    id: 'msg-welcome-email',
    type: 'email',
    position: { x: 180, y: 780 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      subject: 'You\'re in — AI Insiders briefing details inside',
      preheader: 'Link, time, and what to expect tomorrow.',
      body: `Hey {{first_name}},

You're locked in for the AI Insiders briefing tomorrow. Here's everything you need:

📅  When: Tomorrow at 3pm ET
🔗  Join link: [ AI Insiders Briefing → ]
⏱   Duration: 60 minutes

I'll be walking through the 3 AI workflows that are quietly replacing entire marketing departments — and how to position yourself on the right side of it.

Save this email. Add it to your calendar. See you inside.

— Luke`,
      trigger: 'on opt-in',
      tags: [
        { platform: 'GHL', label: 'ai-insiders-lead' },
        { platform: 'Kit', label: 'AI Insiders' },
      ],
      sent: 221,
      openedPct: 68,
      clickedPct: 42,
    },
  },
  {
    id: 'msg-welcome-sms',
    type: 'sms',
    position: { x: 600, y: 780 },
    data: {
      kind: 'sms',
      fromNumber: '+1 (305) 555-0144',
      body: `Hey, Luke here 👋

You're in for tomorrow's AI Insiders briefing — 3pm ET.

Save this link so you don't miss it:
aiinsiders.com/join

Reply STOP to opt out.`,
      trigger: 'on opt-in',
      tags: [{ platform: 'Twilio', label: 'ai-insiders' }],
      sent: 198,
      clickedPct: 31,
    },
  },
  {
    id: 'msg-welcome-tg',
    type: 'telegram',
    position: { x: 920, y: 780 },
    data: {
      kind: 'telegram',
      fromHandle: '@AIInsidersBot',
      body: `Welcome to AI Insiders 🎯

Join the private channel for behind-the-scenes drops from Luke:
t.me/aiinsiders

Briefing kicks off tomorrow at 3pm ET.`,
      trigger: 'on opt-in',
      tags: [{ platform: 'Telegram', label: 'invite' }],
      sent: 174,
      clickedPct: 58,
    },
  },

  // Capture-triggered messages (row 2)
  {
    id: 'msg-24h',
    type: 'email',
    position: { x: 180, y: 1380 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      subject: 'Tomorrow · AI Insiders briefing (save your seat)',
      preheader: '24h out — don\'t miss this.',
      body: `{{first_name}} —

Quick reminder: the AI Insiders briefing is tomorrow at 3pm ET.

If you haven't blocked your calendar, do it now — I'm walking through material I'm not sharing anywhere else, and there's no replay for no-shows.

Join here: [ AI Insiders Briefing → ]

See you tomorrow.

— Luke`,
      trigger: 'T-24h',
      tags: [{ platform: 'GHL', label: 'reminder-sent' }],
      sent: 221,
      openedPct: 54,
      clickedPct: 28,
    },
  },
  {
    id: 'msg-1h',
    type: 'email',
    position: { x: 600, y: 1380 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      subject: '1 hour · final reminder',
      preheader: 'We kick off in 60 minutes.',
      body: `{{first_name}} —

60 minutes out. Make sure you're at your desk, bring questions, and grab a notepad — this is hands-on.

Join: [ AI Insiders Briefing → ]

— Luke`,
      trigger: 'T-1h',
      tags: [{ platform: 'GHL', label: 'reminder-sent' }],
      sent: 221,
      openedPct: 62,
      clickedPct: 36,
    },
  },
  {
    id: 'msg-live',
    type: 'sms',
    position: { x: 1020, y: 1380 },
    data: {
      kind: 'sms',
      fromNumber: '+1 (305) 555-0144',
      body: `We're LIVE.

Tap to join the AI Insiders briefing:
aiinsiders.com/join

(Starts in 2 min — don't wait.)`,
      trigger: 'T-0',
      tags: [{ platform: 'Twilio', label: 'live' }],
      sent: 198,
      clickedPct: 71,
    },
  },

  // SLO-triggered
  {
    id: 'msg-slo-receipt',
    type: 'email',
    position: { x: 1480, y: 780 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      subject: 'Your AI Insiders access is confirmed',
      preheader: 'Login details + next steps.',
      body: `{{first_name}} —

You're in. Your AI Insiders access is active and the replay library is now unlocked.

Access your portal here: [ AI Insiders Portal → ]

Inside you'll find:
•  The full briefing replay
•  Workflow blueprints (Notion)
•  Prompt library + automation templates

If anything is off, reply to this email — it comes straight to me.

Welcome aboard.

— Luke`,
      trigger: 'on purchase',
      tags: [
        { platform: 'GHL', label: 'ai-insiders-buyer' },
        { platform: 'Kit', label: 'Buyers' },
      ],
      sent: 34,
      openedPct: 88,
      clickedPct: 61,
    },
  },

  // TY-triggered
  {
    id: 'msg-ty-replay',
    type: 'email',
    position: { x: 2040, y: 780 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      subject: 'Replay + resources from AI Insiders',
      preheader: 'Everything from yesterday\'s briefing.',
      body: `Hey {{first_name}} —

Here's the full replay and every resource I promised from yesterday's AI Insiders briefing:

▶  Full replay: [ Watch → ]
📦  Resource pack (prompts + workflows): [ Download → ]
📅  Next live drop: coming next week

Let me know what lands.

— Luke`,
      trigger: 'T+24h post-event',
      tags: [{ platform: 'GHL', label: 'attended' }],
      sent: 0,
      openedPct: 0,
      clickedPct: 0,
    },
  },
];

const SEED_EDGES = [
  // Ads → Capture
  { id: 'e-meta-optin',    source: 'ad-meta',    target: 'pg-optin', label: 'CPL $6.18', animated: true, style: { stroke: '#93c5fd' } },
  { id: 'e-ig-optin',      source: 'ad-ig',      target: 'pg-optin', label: 'CPL $4.39', animated: true, style: { stroke: '#93c5fd' } },
  { id: 'e-organic-optin', source: 'ad-organic', target: 'pg-optin', label: 'organic',   animated: true, style: { stroke: '#86efac' } },

  // Page → Page
  { id: 'e-optin-slo',  source: 'pg-optin', target: 'pg-slo',  label: '17.8% CTR', style: { stroke: '#ECECEC' } },
  { id: 'e-slo-ty',     source: 'pg-slo',   target: 'pg-ty',   label: '15.4% CVR', style: { stroke: '#ECECEC' } },

  // Capture → messages
  { id: 'e-optin-welcome-email', source: 'pg-optin', sourceHandle: 'msg', target: 'msg-welcome-email', style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },
  { id: 'e-optin-welcome-sms',   source: 'pg-optin', sourceHandle: 'msg', target: 'msg-welcome-sms',   style: { stroke: '#fde68a', strokeDasharray: '4 4' } },
  { id: 'e-optin-welcome-tg',    source: 'pg-optin', sourceHandle: 'msg', target: 'msg-welcome-tg',    style: { stroke: '#86efac', strokeDasharray: '4 4' } },
  { id: 'e-optin-24h',           source: 'pg-optin', sourceHandle: 'msg', target: 'msg-24h',           style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },
  { id: 'e-optin-1h',            source: 'pg-optin', sourceHandle: 'msg', target: 'msg-1h',            style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },
  { id: 'e-optin-live',          source: 'pg-optin', sourceHandle: 'msg', target: 'msg-live',          style: { stroke: '#fde68a', strokeDasharray: '4 4' } },

  // SLO → receipt
  { id: 'e-slo-receipt', source: 'pg-slo', sourceHandle: 'msg', target: 'msg-slo-receipt', style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },

  // TY → replay
  { id: 'e-ty-replay',   source: 'pg-ty',  sourceHandle: 'msg', target: 'msg-ty-replay',   style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },
].map(e => ({
  ...e,
  markerEnd: { type: MarkerType.ArrowClosed, color: (e.style as any)?.stroke || '#ECECEC' },
  labelStyle: { fill: '#999', fontSize: 10 },
  labelBgStyle: { fill: '#1a1a1a' },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 4,
}));

interface Props {
  storagePrefix: string;
}

const LukeFlowView: React.FC<Props> = () => {
  const [showMetrics, setShowMetrics] = useState(true);

  const initialNodes = useMemo(
    () =>
      SEED_NODES.map(n => ({
        ...n,
        data: { ...n.data, __showMetrics: showMetrics },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(SEED_EDGES);

  const toggleMetrics = useCallback(() => {
    setShowMetrics(v => {
      const next = !v;
      setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, __showMetrics: next } })));
      return next;
    });
  }, [setNodes]);

  return (
    <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-[#2a2a2a] relative" style={{ background: '#0f0f0f' }}>
      {/* Overlay controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6 }}>
        <button
          onClick={toggleMetrics}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{
            background: showMetrics ? 'rgba(134,239,172,0.12)' : '#1a1a1a',
            color: showMetrics ? '#86efac' : '#999',
            border: `1px solid ${showMetrics ? 'rgba(134,239,172,0.35)' : '#2a2a2a'}`,
          }}
        >
          {showMetrics ? 'Metrics on' : 'Metrics off'}
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(26,26,26,0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #2a2a2a',
          borderRadius: 10,
          padding: '8px 10px',
          fontSize: 10,
          color: '#999',
          display: 'flex',
          gap: 12,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Megaphone size={10} color="#93c5fd" /> Ad
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <FileText size={10} color="#ECECEC" /> Page
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Mail size={10} color="#bfdbfe" /> Email
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MessageSquare size={10} color="#fde68a" /> SMS
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Send size={10} color="#86efac" /> Telegram
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#222" gap={24} size={1} />
        <Controls style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />
        <MiniMap
          nodeColor={n => {
            const k = (n.data as any)?.kind;
            if (k === 'ad') return '#93c5fd';
            if (k === 'page') return '#ECECEC';
            if (k === 'email') return '#bfdbfe';
            if (k === 'sms') return '#fde68a';
            if (k === 'telegram') return '#86efac';
            return '#555';
          }}
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
        />
      </ReactFlow>
    </div>
  );
};

export default LukeFlowView;
