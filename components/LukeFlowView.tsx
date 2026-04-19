import React, { memo, useCallback, useMemo, useState } from 'react';
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
  Database,
  Target,
  Zap,
  Wifi,
  BatteryFull,
  Signal,
  ChevronLeft,
  Phone,
  Video,
  ExternalLink,
} from 'lucide-react';

// =============================================================================
// Data model
// =============================================================================

type Platform = 'GHL' | 'Kit' | 'Meta' | 'Telegram' | 'Twilio' | 'Supabase' | 'Close' | 'Google';

type NodeKind =
  | 'ad'
  | 'page'
  | 'email'
  | 'sms'
  | 'telegram'
  | 'pixel'
  | 'tag'
  | 'destination';

interface TagRef {
  platform: Platform;
  label: string;
}

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
  previewSrc?: string;
  openHref: string;
  views: number;
  clicks: number;
  conversionPct: number;
  color?: string;
}

interface EmailNodeData {
  kind: 'email';
  fromName: string;
  fromEmail: string;
  toDisplay: string;
  subject: string;
  preheader: string;
  body: string;
  trigger: string;
  sendingFrom: Platform;
  sent: number;
  openedPct: number;
  clickedPct: number;
}

interface SmsNodeData {
  kind: 'sms';
  contactName: string;
  body: string;
  trigger: string;
  sendingFrom: Platform;
  sent: number;
  clickedPct: number;
  time: string;
}

interface TelegramNodeData {
  kind: 'telegram';
  botName: string;
  botSubtitle: string;
  body: string;
  trigger: string;
  sent: number;
  clickedPct: number;
  time: string;
}

interface PixelNodeData {
  kind: 'pixel';
  provider: 'Meta' | 'Google' | 'TikTok';
  eventName: string;
  trigger: string;
  value?: string;
}

interface TagNodeData {
  kind: 'tag';
  platform: Platform;
  label: string;
  action: 'added' | 'removed';
  trigger: string;
}

interface DestinationNodeData {
  kind: 'destination';
  platform: Platform;
  label: string;
  purpose: string;
  action: string;
}

// =============================================================================
// Visual tokens
// =============================================================================

const PLATFORM_COLOR: Record<Platform, string> = {
  GHL:      '#f9a8d4',
  Kit:      '#fcd34d',
  Meta:     '#93c5fd',
  Telegram: '#86efac',
  Twilio:   '#fca5a5',
  Supabase: '#4ade80',
  Close:    '#c4b5fd',
  Google:   '#f87171',
};

const CHANNEL_ACCENT = {
  email: { fg: '#bfdbfe', bg: 'rgba(191,219,254,0.08)', border: 'rgba(191,219,254,0.35)' },
  sms:   { fg: '#fde68a', bg: 'rgba(253,230,138,0.08)', border: 'rgba(253,230,138,0.35)' },
  tg:    { fg: '#86efac', bg: 'rgba(134,239,172,0.08)', border: 'rgba(134,239,172,0.35)' },
};

// =============================================================================
// Shared fragments
// =============================================================================

const TriggerPill: React.FC<{ trigger: string; color?: string }> = ({ trigger, color = '#bbb' }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 9,
      color,
      background: 'rgba(255,255,255,0.05)',
      padding: '2px 7px',
      borderRadius: 999,
      fontWeight: 500,
      letterSpacing: 0.2,
    }}
  >
    <Clock size={8} />
    {trigger}
  </span>
);

// =============================================================================
// AD NODE — Facebook sponsored post style
// =============================================================================

const AdNode = memo<NodeProps<AdNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 280,
        background: '#1a1a1a',
        border: '1px solid rgba(147,197,253,0.3)',
        borderRadius: 12,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: '#141414',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: 'linear-gradient(135deg,#1877f2,#0a66c2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Facebook size={14} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#ECECEC' }}>Luke Alexander</div>
          <div style={{ fontSize: 9, color: '#888' }}>Sponsored · <span style={{ color: '#93c5fd' }}>{data.platform}</span></div>
        </div>
      </div>
      <div style={{ padding: '0 12px 10px', fontSize: 11, color: '#ECECEC', lineHeight: 1.45 }}>
        {data.primaryText}
      </div>
      <div
        style={{
          height: 160,
          background: `url(${data.image}) center/cover, #222`,
          borderTop: '1px solid #222',
          borderBottom: '1px solid #222',
        }}
      />
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, background: '#141414' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>aiinsiders.com</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#ECECEC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.headline}
          </div>
        </div>
        <button
          style={{
            fontSize: 11,
            padding: '5px 12px',
            borderRadius: 6,
            background: '#2a2a2a',
            color: '#ECECEC',
            border: '1px solid #3a3a3a',
            fontWeight: 500,
          }}
        >
          {data.cta}
        </button>
      </div>
      {showMetrics && (
        <div
          style={{
            padding: '7px 12px',
            display: 'flex',
            gap: 10,
            fontSize: 10,
            color: '#999',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid #222',
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
});
AdNode.displayName = 'AdNode';

// =============================================================================
// PAGE NODE — clean browser-chrome card, no iframe (perf)
// =============================================================================

const PageNode = memo<NodeProps<PageNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 340,
        background: '#1a1a1a',
        border: '1px solid rgba(236,236,236,0.22)',
        borderRadius: 12,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#ECECEC', width: 8, height: 8 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          background: '#141414',
          borderBottom: '1px solid #222',
        }}
      >
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, background: '#ef4444' }} />
          <span style={{ width: 9, height: 9, borderRadius: 5, background: '#eab308' }} />
          <span style={{ width: 9, height: 9, borderRadius: 5, background: '#22c55e' }} />
        </div>
        <div
          style={{
            flex: 1,
            fontSize: 10,
            color: '#aaa',
            background: '#0f0f0f',
            padding: '3px 8px',
            borderRadius: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          🔒 {data.url}
        </div>
        <a
          href={data.openHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#888', display: 'flex', alignItems: 'center' }}
          title="Open page"
        >
          <ExternalLink size={11} />
        </a>
      </div>

      {/* Page preview area */}
      <div
        style={{
          height: 180,
          background: data.previewSrc
            ? `url(${data.previewSrc}) center/cover`
            : `linear-gradient(135deg, ${data.color || '#2a2a2a'}20, #0f0f0f)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          position: 'relative',
          borderBottom: '1px solid #222',
        }}
      >
        {!data.previewSrc && (
          <>
            <div
              style={{
                width: 60,
                height: 4,
                background: data.color || '#ECECEC',
                opacity: 0.5,
                borderRadius: 2,
              }}
            />
            <div style={{ width: 180, height: 10, background: '#2a2a2a', borderRadius: 3 }} />
            <div style={{ width: 220, height: 10, background: '#2a2a2a', borderRadius: 3 }} />
            <div style={{ width: 140, height: 10, background: '#2a2a2a', borderRadius: 3 }} />
            <div
              style={{
                marginTop: 10,
                width: 120,
                height: 24,
                borderRadius: 4,
                background: data.color || '#3a3a3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                color: '#0f0f0f',
                fontWeight: 600,
              }}
            >
              {data.label === 'Capture Page' ? 'SAVE MY SEAT' : 'CONTINUE'}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: showMetrics ? 8 : 0 }}>
          <FileText size={12} color="#ECECEC" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{data.label}</span>
        </div>
        {showMetrics && (
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#aaa' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Eye size={9} />{data.views}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <MousePointerClick size={9} />{data.clicks}
            </span>
            <span style={{ color: '#86efac', marginLeft: 'auto', fontWeight: 600 }}>{data.conversionPct}%</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#ECECEC', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="msg" style={{ background: '#ECECEC', width: 8, height: 8 }} />
    </div>
  );
});
PageNode.displayName = 'PageNode';

// =============================================================================
// EMAIL NODE — Gmail-inspired preview
// =============================================================================

const EmailNode = memo<NodeProps<EmailNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  const initial = data.fromName[0]?.toUpperCase() || 'L';
  return (
    <div
      style={{
        width: 380,
        background: '#ffffff',
        border: `1px solid ${CHANNEL_ACCENT.email.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        color: '#202124',
        fontSize: 11,
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: CHANNEL_ACCENT.email.fg, width: 8, height: 8 }} />

      {/* Trigger strip (outside the email itself) */}
      <div
        style={{
          padding: '6px 12px',
          background: '#1a1a1a',
          color: CHANNEL_ACCENT.email.fg,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <Mail size={11} />
        Email · sent via {data.sendingFrom}
        <span style={{ marginLeft: 'auto' }}>
          <TriggerPill trigger={data.trigger} color={CHANNEL_ACCENT.email.fg} />
        </span>
      </div>

      {/* Gmail-ish header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#202124', lineHeight: 1.3, marginBottom: 10 }}>
          {data.subject}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              background: 'linear-gradient(135deg,#1a73e8,#174ea6)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#202124' }}>
              <span style={{ fontWeight: 600 }}>{data.fromName}</span>{' '}
              <span style={{ color: '#5f6368' }}>&lt;{data.fromEmail}&gt;</span>
            </div>
            <div style={{ fontSize: 11, color: '#5f6368' }}>to {data.toDisplay}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="nodrag nowheel"
        style={{
          padding: '14px 16px',
          fontSize: 12,
          color: '#202124',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          maxHeight: 240,
          overflow: 'auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {data.body}
      </div>

      {/* Footer metrics */}
      {showMetrics && (
        <div
          style={{
            padding: '8px 16px',
            display: 'flex',
            gap: 12,
            fontSize: 10,
            color: '#5f6368',
            background: '#f8f9fa',
            borderTop: '1px solid #e8eaed',
          }}
        >
          <span>{data.sent} sent</span>
          <span>{data.openedPct}% open</span>
          <span>{data.clickedPct}% click</span>
        </div>
      )}
    </div>
  );
});
EmailNode.displayName = 'EmailNode';

// =============================================================================
// SMS NODE — iMessage-style phone preview
// =============================================================================

const SmsNode = memo<NodeProps<SmsNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 280,
        background: '#1a1a1a',
        border: `1px solid ${CHANNEL_ACCENT.sms.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: CHANNEL_ACCENT.sms.fg, width: 8, height: 8 }} />

      {/* Trigger strip */}
      <div
        style={{
          padding: '6px 12px',
          background: '#1a1a1a',
          color: CHANNEL_ACCENT.sms.fg,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #222',
        }}
      >
        <MessageSquare size={11} />
        SMS · sent via {data.sendingFrom}
        <span style={{ marginLeft: 'auto' }}>
          <TriggerPill trigger={data.trigger} color={CHANNEL_ACCENT.sms.fg} />
        </span>
      </div>

      {/* Phone chrome */}
      <div style={{ background: '#000', padding: '10px 14px 0' }}>
        {/* Status bar */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: '#fff', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>{data.time}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Signal size={9} />
            <Wifi size={9} />
            <BatteryFull size={10} />
          </span>
        </div>
        {/* Contact header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: 10,
            borderBottom: '1px solid #222',
            position: 'relative',
          }}
        >
          <ChevronLeft
            size={18}
            color="#0A84FF"
            style={{ position: 'absolute', left: 0, top: 4 }}
          />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: 'linear-gradient(135deg,#555,#333)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 3,
            }}
          >
            {data.contactName[0]}
          </div>
          <div style={{ fontSize: 10, color: '#fff', fontWeight: 500 }}>{data.contactName}</div>
        </div>
      </div>

      {/* Chat area */}
      <div
        className="nodrag nowheel"
        style={{
          background: '#000',
          padding: '12px 14px 14px',
          minHeight: 100,
        }}
      >
        <div style={{ fontSize: 8, color: '#8e8e93', textAlign: 'center', marginBottom: 8 }}>
          Text Message · {data.time}
        </div>
        <div
          style={{
            background: '#26262a',
            color: '#fff',
            fontSize: 11,
            padding: '8px 12px',
            borderRadius: '17px 17px 17px 4px',
            maxWidth: '88%',
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
          }}
        >
          {data.body}
        </div>
      </div>

      {showMetrics && (
        <div
          style={{
            padding: '7px 12px',
            display: 'flex',
            gap: 10,
            fontSize: 10,
            color: '#999',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid #222',
          }}
        >
          <span>{data.sent} sent</span>
          <span>{data.clickedPct}% click</span>
        </div>
      )}
    </div>
  );
});
SmsNode.displayName = 'SmsNode';

// =============================================================================
// TELEGRAM NODE — Telegram dark UI
// =============================================================================

const TG_BG = '#0E1621';
const TG_BUBBLE_IN = '#182533';
const TG_ACCENT = '#6AB3F3';

const TelegramNode = memo<NodeProps<TelegramNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 280,
        background: '#1a1a1a',
        border: `1px solid ${CHANNEL_ACCENT.tg.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        color: '#ECECEC',
        fontSize: 11,
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: CHANNEL_ACCENT.tg.fg, width: 8, height: 8 }} />

      {/* Trigger strip */}
      <div
        style={{
          padding: '6px 12px',
          background: '#1a1a1a',
          color: CHANNEL_ACCENT.tg.fg,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #222',
        }}
      >
        <Send size={11} />
        Telegram
        <span style={{ marginLeft: 'auto' }}>
          <TriggerPill trigger={data.trigger} color={CHANNEL_ACCENT.tg.fg} />
        </span>
      </div>

      {/* TG header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          background: '#17212B',
          borderBottom: '1px solid #0b1017',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            background: `linear-gradient(135deg,${TG_ACCENT},#3a7bd5)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
          }}
        >
          {data.botName[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{data.botName}</div>
          <div style={{ fontSize: 9, color: '#6A7A8C' }}>{data.botSubtitle}</div>
        </div>
        <Phone size={14} color="#6A7A8C" />
      </div>

      {/* Chat */}
      <div
        className="nodrag nowheel"
        style={{
          background: TG_BG,
          padding: '12px 12px 14px',
          minHeight: 110,
          backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(106,179,243,0.08), transparent 50%)',
        }}
      >
        <div
          style={{
            background: TG_BUBBLE_IN,
            color: '#fff',
            fontSize: 11,
            padding: '8px 10px 18px',
            borderRadius: '12px 12px 12px 4px',
            maxWidth: '90%',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            position: 'relative',
          }}
        >
          {data.body}
          <span
            style={{
              position: 'absolute',
              right: 8,
              bottom: 4,
              fontSize: 8,
              color: '#6A7A8C',
            }}
          >
            {data.time}
          </span>
        </div>
      </div>

      {showMetrics && (
        <div
          style={{
            padding: '7px 12px',
            display: 'flex',
            gap: 10,
            fontSize: 10,
            color: '#999',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid #222',
          }}
        >
          <span>{data.sent} sent</span>
          <span>{data.clickedPct}% click</span>
        </div>
      )}
    </div>
  );
});
TelegramNode.displayName = 'TelegramNode';

// =============================================================================
// PIXEL NODE — small event firing indicator
// =============================================================================

const PIXEL_COLOR: Record<'Meta' | 'Google' | 'TikTok', string> = {
  Meta:   '#1877f2',
  Google: '#ea4335',
  TikTok: '#ff0050',
};

const PixelNode = memo<NodeProps<PixelNodeData>>(({ data }) => {
  const color = PIXEL_COLOR[data.provider];
  return (
    <div
      style={{
        width: 170,
        background: '#0f0f0f',
        border: `1px solid ${color}55`,
        borderRadius: 10,
        padding: '8px 10px',
        color: '#ECECEC',
        fontSize: 10,
        boxShadow: `0 0 0 1px ${color}15, 0 2px 8px rgba(0,0,0,0.3)`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 7, height: 7 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Target size={9} color="#fff" />
        </div>
        <span style={{ fontSize: 9, color, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {data.provider} Pixel
        </span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#ECECEC', marginBottom: 2 }}>
        {data.eventName}
      </div>
      <div style={{ fontSize: 9, color: '#888' }}>
        fires {data.trigger}
        {data.value && <span style={{ color: '#86efac', marginLeft: 6 }}>· {data.value}</span>}
      </div>
    </div>
  );
});
PixelNode.displayName = 'PixelNode';

// =============================================================================
// TAG NODE — moment a tag is added/removed
// =============================================================================

const TagNode = memo<NodeProps<TagNodeData>>(({ data }) => {
  const color = PLATFORM_COLOR[data.platform];
  return (
    <div
      style={{
        width: 190,
        background: '#0f0f0f',
        border: `1px solid ${color}55`,
        borderRadius: 10,
        padding: '8px 10px',
        color: '#ECECEC',
        fontSize: 10,
        boxShadow: `0 0 0 1px ${color}12, 0 2px 8px rgba(0,0,0,0.3)`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 7, height: 7 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <TagIcon size={10} color={color} />
        <span style={{ fontSize: 9, color, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {data.platform} · tag {data.action}
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#ECECEC',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          marginBottom: 2,
        }}
      >
        {data.label}
      </div>
      <div style={{ fontSize: 9, color: '#888' }}>
        {data.trigger}
      </div>
    </div>
  );
});
TagNode.displayName = 'TagNode';

// =============================================================================
// DESTINATION NODE — where data is going
// =============================================================================

const DEST_ICON: Record<Platform, React.ReactNode> = {
  GHL:      <Zap size={14} color="#f9a8d4" />,
  Kit:      <Mail size={14} color="#fcd34d" />,
  Meta:     <Facebook size={14} color="#93c5fd" />,
  Telegram: <Send size={14} color="#86efac" />,
  Twilio:   <MessageSquare size={14} color="#fca5a5" />,
  Supabase: <Database size={14} color="#4ade80" />,
  Close:    <Phone size={14} color="#c4b5fd" />,
  Google:   <Video size={14} color="#f87171" />,
};

const DestinationNode = memo<NodeProps<DestinationNodeData>>(({ data }) => {
  const color = PLATFORM_COLOR[data.platform];
  return (
    <div
      style={{
        width: 230,
        background: '#141414',
        border: `1px solid ${color}55`,
        borderRadius: 12,
        padding: '12px 14px',
        color: '#ECECEC',
        fontSize: 11,
        boxShadow: `0 0 0 1px ${color}10, 0 4px 16px rgba(0,0,0,0.35)`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: `${color}1a`,
            border: `1px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {DEST_ICON[data.platform]}
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Destination</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ECECEC' }}>{data.label}</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#aaa', lineHeight: 1.4, marginBottom: 4 }}>
        {data.purpose}
      </div>
      <div
        style={{
          fontSize: 9,
          color,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          background: `${color}10`,
          padding: '3px 6px',
          borderRadius: 4,
          display: 'inline-block',
        }}
      >
        {data.action}
      </div>
    </div>
  );
});
DestinationNode.displayName = 'DestinationNode';

// =============================================================================
// Node registry
// =============================================================================

const nodeTypes = {
  ad: AdNode,
  page: PageNode,
  email: EmailNode,
  sms: SmsNode,
  telegram: TelegramNode,
  pixel: PixelNode,
  tag: TagNode,
  destination: DestinationNode,
};

// =============================================================================
// Seed data — Luke Alexander · AI Insiders
// =============================================================================

const AD_IMAGE = '/funnels/luke-alexander/hero.jpg';

const SEED_NODES: any[] = [
  // ========= ADS (column x=0) =========
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
    position: { x: 0, y: 500 },
    data: {
      kind: 'ad',
      label: 'IG Retarget',
      platform: 'Meta',
      image: AD_IMAGE,
      headline: 'Still thinking about it?',
      primaryText: 'You looked, you left. The AI Insiders briefing starts tomorrow. Last call.',
      cta: 'Save My Seat',
      spend: 180,
      leads: 41,
      cpl: 4.39,
    },
  },
  {
    id: 'ad-organic',
    type: 'ad',
    position: { x: 0, y: 1000 },
    data: {
      kind: 'ad',
      label: 'Kit broadcast',
      platform: 'Kit',
      image: AD_IMAGE,
      headline: 'List broadcast · AI Insiders',
      primaryText: 'Broadcast to Luke\'s subscriber list announcing the free AI Insiders briefing tomorrow.',
      cta: 'Open',
      spend: 0,
      leads: 112,
      cpl: 0,
    },
  },

  // ========= PAGES (row y=350) =========
  {
    id: 'pg-optin',
    type: 'page',
    position: { x: 480, y: 350 },
    data: {
      kind: 'page',
      label: 'Capture Page',
      url: 'aureumfunnels.com/luke/optin',
      openHref: '/funnels/luke-alexander/optin/index.html',
      views: 1240,
      clicks: 221,
      conversionPct: 17.8,
      color: '#fcd34d',
    },
  },
  {
    id: 'pg-slo',
    type: 'page',
    position: { x: 1800, y: 350 },
    data: {
      kind: 'page',
      label: 'SLO Page',
      url: 'aureumfunnels.com/luke/slo',
      openHref: '/funnels/luke-alexander/slo/index.html',
      views: 221,
      clicks: 34,
      conversionPct: 15.4,
      color: '#86efac',
    },
  },
  {
    id: 'pg-ty',
    type: 'page',
    position: { x: 2320, y: 350 },
    data: {
      kind: 'page',
      label: 'Thank You',
      url: 'aureumfunnels.com/luke/ty',
      openHref: '/funnels/luke-alexander/thank-you/index.html',
      views: 221,
      clicks: 198,
      conversionPct: 89.6,
      color: '#bfdbfe',
    },
  },

  // ========= PIXEL EVENTS (just below pages) =========
  {
    id: 'px-optin-pv',
    type: 'pixel',
    position: { x: 420, y: 780 },
    data: { kind: 'pixel', provider: 'Meta', eventName: 'PageView', trigger: 'on page load' },
  },
  {
    id: 'px-optin-lead',
    type: 'pixel',
    position: { x: 620, y: 780 },
    data: { kind: 'pixel', provider: 'Meta', eventName: 'Lead', trigger: 'on form submit', value: '$6 est.' },
  },
  {
    id: 'px-optin-google',
    type: 'pixel',
    position: { x: 820, y: 780 },
    data: { kind: 'pixel', provider: 'Google', eventName: 'conversion: signup', trigger: 'on form submit' },
  },
  {
    id: 'px-slo-purchase',
    type: 'pixel',
    position: { x: 1770, y: 780 },
    data: { kind: 'pixel', provider: 'Meta', eventName: 'Purchase', trigger: 'on checkout success', value: '$47' },
  },
  {
    id: 'px-ty-pv',
    type: 'pixel',
    position: { x: 2320, y: 780 },
    data: { kind: 'pixel', provider: 'Meta', eventName: 'PageView', trigger: 'on page load' },
  },

  // ========= TAG EVENTS (below pixels) =========
  {
    id: 'tag-lead',
    type: 'tag',
    position: { x: 520, y: 930 },
    data: {
      kind: 'tag',
      platform: 'GHL',
      label: 'ai-insiders-lead',
      action: 'added',
      trigger: 'on opt-in form submit',
    },
  },
  {
    id: 'tag-kit-subscribe',
    type: 'tag',
    position: { x: 740, y: 930 },
    data: {
      kind: 'tag',
      platform: 'Kit',
      label: 'AI Insiders',
      action: 'added',
      trigger: 'on opt-in form submit',
    },
  },
  {
    id: 'tag-buyer',
    type: 'tag',
    position: { x: 1770, y: 930 },
    data: {
      kind: 'tag',
      platform: 'GHL',
      label: 'ai-insiders-buyer',
      action: 'added',
      trigger: 'on purchase',
    },
  },

  // ========= MESSAGES · Capture cluster row 1 (y=1100) =========
  {
    id: 'msg-welcome-email',
    type: 'email',
    position: { x: 220, y: 1100 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      toDisplay: 'me',
      subject: "You're in — AI Insiders briefing details inside",
      preheader: 'Link, time, and what to expect tomorrow.',
      body: `Hey {{first_name}},

You're locked in for the AI Insiders briefing tomorrow. Here's everything you need:

📅  When: Tomorrow at 3pm ET
🔗  Join: [ AI Insiders Briefing → ]
⏱   Duration: 60 minutes

I'll be walking through the 3 AI workflows that are quietly replacing entire marketing departments — and how to position yourself on the right side of it.

Save this. Add it to your calendar. See you inside.

— Luke`,
      trigger: 'on opt-in',
      sendingFrom: 'Kit',
      sent: 221,
      openedPct: 68,
      clickedPct: 42,
    },
  },
  {
    id: 'msg-welcome-sms',
    type: 'sms',
    position: { x: 660, y: 1100 },
    data: {
      kind: 'sms',
      contactName: 'Luke Alexander',
      body: `Hey, Luke here 👋

You're in for tomorrow's AI Insiders briefing — 3pm ET.

Save this link:
aiinsiders.com/join

Reply STOP to opt out.`,
      trigger: 'on opt-in',
      sendingFrom: 'Twilio',
      sent: 198,
      clickedPct: 31,
      time: '9:41',
    },
  },
  {
    id: 'msg-welcome-tg',
    type: 'telegram',
    position: { x: 1000, y: 1100 },
    data: {
      kind: 'telegram',
      botName: 'AI Insiders',
      botSubtitle: 'channel · 1 240 subscribers',
      body: `Welcome to AI Insiders 🎯

Join the private channel for behind-the-scenes drops from Luke:
t.me/aiinsiders

Briefing kicks off tomorrow at 3pm ET.`,
      trigger: 'on opt-in',
      sent: 174,
      clickedPct: 58,
      time: '9:41',
    },
  },

  // ========= MESSAGES · Capture cluster row 2 (y=1680) =========
  {
    id: 'msg-24h',
    type: 'email',
    position: { x: 220, y: 1680 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      toDisplay: 'me',
      subject: 'Tomorrow · AI Insiders briefing (save your seat)',
      preheader: "24h out — don't miss this.",
      body: `{{first_name}} —

Quick reminder: the AI Insiders briefing is tomorrow at 3pm ET.

If you haven't blocked your calendar, do it now — I'm walking through material I'm not sharing anywhere else, and there's no replay for no-shows.

Join here: [ AI Insiders Briefing → ]

See you tomorrow.

— Luke`,
      trigger: 'T-24h',
      sendingFrom: 'Kit',
      sent: 221,
      openedPct: 54,
      clickedPct: 28,
    },
  },
  {
    id: 'msg-1h',
    type: 'email',
    position: { x: 660, y: 1680 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      toDisplay: 'me',
      subject: '1 hour · final reminder',
      preheader: 'We kick off in 60 minutes.',
      body: `{{first_name}} —

60 minutes out. Make sure you're at your desk, bring questions, and grab a notepad.

Join: [ AI Insiders Briefing → ]

— Luke`,
      trigger: 'T-1h',
      sendingFrom: 'Kit',
      sent: 221,
      openedPct: 62,
      clickedPct: 36,
    },
  },
  {
    id: 'msg-live',
    type: 'sms',
    position: { x: 1100, y: 1680 },
    data: {
      kind: 'sms',
      contactName: 'Luke Alexander',
      body: `We're LIVE.

Tap to join the AI Insiders briefing:
aiinsiders.com/join

(Starts in 2 min — don't wait.)`,
      trigger: 'T-0',
      sendingFrom: 'Twilio',
      sent: 198,
      clickedPct: 71,
      time: '3:00',
    },
  },

  // ========= MESSAGES · SLO (y=1100 aligned under SLO) =========
  {
    id: 'msg-slo-receipt',
    type: 'email',
    position: { x: 1740, y: 1100 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      toDisplay: 'me',
      subject: 'Your AI Insiders access is confirmed',
      preheader: 'Login details + next steps.',
      body: `{{first_name}} —

You're in. Your AI Insiders access is active and the replay library is now unlocked.

Access your portal: [ AI Insiders Portal → ]

Inside you'll find:
•  Full briefing replay
•  Workflow blueprints (Notion)
•  Prompt library + automation templates

Reply to this email if anything is off — comes straight to me.

Welcome aboard.

— Luke`,
      trigger: 'on purchase',
      sendingFrom: 'Kit',
      sent: 34,
      openedPct: 88,
      clickedPct: 61,
    },
  },

  // ========= MESSAGES · TY (y=1100) =========
  {
    id: 'msg-ty-replay',
    type: 'email',
    position: { x: 2320, y: 1100 },
    data: {
      kind: 'email',
      fromName: 'Luke Alexander',
      fromEmail: 'luke@aiinsiders.com',
      toDisplay: 'me',
      subject: 'Replay + resources from AI Insiders',
      preheader: "Everything from yesterday's briefing.",
      body: `Hey {{first_name}} —

Here's the full replay and every resource I promised from yesterday's AI Insiders briefing:

▶  Full replay: [ Watch → ]
📦  Resource pack: [ Download → ]
📅  Next live drop: next week

Let me know what lands.

— Luke`,
      trigger: 'T+24h post-event',
      sendingFrom: 'Kit',
      sent: 0,
      openedPct: 0,
      clickedPct: 0,
    },
  },

  // ========= DESTINATIONS (right column x=2800) =========
  {
    id: 'dest-supabase',
    type: 'destination',
    position: { x: 2900, y: 350 },
    data: {
      kind: 'destination',
      platform: 'Supabase',
      label: 'Supabase',
      purpose: 'Primary source of truth — stores lead records and funnel analytics.',
      action: 'INSERT funnel_leads',
    },
  },
  {
    id: 'dest-kit',
    type: 'destination',
    position: { x: 2900, y: 620 },
    data: {
      kind: 'destination',
      platform: 'Kit',
      label: 'Kit (ConvertKit)',
      purpose: 'Subscribes to the AI Insiders list and sends the email sequence.',
      action: 'POST /subscribers',
    },
  },
  {
    id: 'dest-close',
    type: 'destination',
    position: { x: 2900, y: 890 },
    data: {
      kind: 'destination',
      platform: 'Close',
      label: 'Close CRM',
      purpose: 'Creates contact + adds to "AI Insiders — Warm" pipeline for sales follow-up.',
      action: 'POST /lead → pipeline',
    },
  },
  {
    id: 'dest-ghl',
    type: 'destination',
    position: { x: 2900, y: 1160 },
    data: {
      kind: 'destination',
      platform: 'GHL',
      label: 'GoHighLevel',
      purpose: 'Drives SMS automations and tag-based workflow triggers.',
      action: 'upsert contact + apply tag',
    },
  },
];

// =============================================================================
// Edges
// =============================================================================

const baseEdge = (color: string, dashed = false, animated = false) => ({
  style: { stroke: color, strokeWidth: 1.5, ...(dashed ? { strokeDasharray: '4 4' } : {}) },
  animated,
  markerEnd: { type: MarkerType.ArrowClosed, color },
  labelStyle: { fill: '#aaa', fontSize: 10 },
  labelBgStyle: { fill: '#141414' },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 4,
});

const SEED_EDGES: any[] = [
  // Ads → Capture
  { id: 'e-meta-optin',    source: 'ad-meta',    target: 'pg-optin', label: 'CPL $6.18', ...baseEdge('#93c5fd', false, false) },
  { id: 'e-ig-optin',      source: 'ad-ig',      target: 'pg-optin', label: 'CPL $4.39', ...baseEdge('#93c5fd', false, false) },
  { id: 'e-organic-optin', source: 'ad-organic', target: 'pg-optin', label: 'organic',   ...baseEdge('#86efac', false, false) },

  // Page → Page
  { id: 'e-optin-slo', source: 'pg-optin', target: 'pg-slo', label: '17.8% CTR', ...baseEdge('#ECECEC') },
  { id: 'e-slo-ty',    source: 'pg-slo',   target: 'pg-ty',  label: '15.4% CVR', ...baseEdge('#ECECEC') },

  // Page → Pixels
  { id: 'e-optin-px-pv',    source: 'pg-optin', sourceHandle: 'msg', target: 'px-optin-pv',    ...baseEdge('#1877f2', true) },
  { id: 'e-optin-px-lead',  source: 'pg-optin', sourceHandle: 'msg', target: 'px-optin-lead',  ...baseEdge('#1877f2', true) },
  { id: 'e-optin-px-goog',  source: 'pg-optin', sourceHandle: 'msg', target: 'px-optin-google',...baseEdge('#ea4335', true) },
  { id: 'e-slo-px-purchase',source: 'pg-slo',   sourceHandle: 'msg', target: 'px-slo-purchase',...baseEdge('#1877f2', true) },
  { id: 'e-ty-px-pv',       source: 'pg-ty',    sourceHandle: 'msg', target: 'px-ty-pv',       ...baseEdge('#1877f2', true) },

  // Pixels → Tag events
  { id: 'e-pxlead-tag-lead',  source: 'px-optin-lead',   target: 'tag-lead',          ...baseEdge('#f9a8d4', true) },
  { id: 'e-pxlead-tag-kit',   source: 'px-optin-lead',   target: 'tag-kit-subscribe', ...baseEdge('#fcd34d', true) },
  { id: 'e-pxpurch-tag-buyer',source: 'px-slo-purchase', target: 'tag-buyer',         ...baseEdge('#f9a8d4', true) },

  // Tags → Messages (tag triggers send)
  { id: 'e-tag-welcome-email', source: 'tag-kit-subscribe', target: 'msg-welcome-email', ...baseEdge('#bfdbfe', true) },
  { id: 'e-tag-welcome-sms',   source: 'tag-lead',          target: 'msg-welcome-sms',   ...baseEdge('#fde68a', true) },
  { id: 'e-tag-welcome-tg',    source: 'tag-lead',          target: 'msg-welcome-tg',    ...baseEdge('#86efac', true) },
  { id: 'e-tag-24h',           source: 'tag-kit-subscribe', target: 'msg-24h',           ...baseEdge('#bfdbfe', true) },
  { id: 'e-tag-1h',            source: 'tag-kit-subscribe', target: 'msg-1h',            ...baseEdge('#bfdbfe', true) },
  { id: 'e-tag-live',          source: 'tag-lead',          target: 'msg-live',          ...baseEdge('#fde68a', true) },
  { id: 'e-tag-slo-receipt',   source: 'tag-buyer',         target: 'msg-slo-receipt',   ...baseEdge('#bfdbfe', true) },

  // TY → replay email (direct)
  { id: 'e-ty-replay', source: 'pg-ty', sourceHandle: 'msg', target: 'msg-ty-replay', ...baseEdge('#bfdbfe', true) },

  // Tags → Destinations (where lead data lands)
  { id: 'e-taglead-supa',  source: 'tag-lead',          target: 'dest-supabase', ...baseEdge('#4ade80') },
  { id: 'e-tagkit-kit',    source: 'tag-kit-subscribe', target: 'dest-kit',      ...baseEdge('#fcd34d') },
  { id: 'e-taglead-close', source: 'tag-lead',          target: 'dest-close',    ...baseEdge('#c4b5fd') },
  { id: 'e-taglead-ghl',   source: 'tag-lead',          target: 'dest-ghl',      ...baseEdge('#f9a8d4') },
  { id: 'e-tagbuyer-ghl',  source: 'tag-buyer',         target: 'dest-ghl',      ...baseEdge('#f9a8d4') },
  { id: 'e-tagbuyer-close',source: 'tag-buyer',         target: 'dest-close',    ...baseEdge('#c4b5fd') },
];

// =============================================================================
// Main component
// =============================================================================

interface Props {
  storagePrefix: string;
}

const LukeFlowView: React.FC<Props> = () => {
  const [showMetrics, setShowMetrics] = useState(true);

  const initialNodes = useMemo(
    () => SEED_NODES.map(n => ({ ...n, data: { ...n.data, __showMetrics: showMetrics } })),
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
    <div
      className="flex-1 min-h-0 rounded-xl overflow-hidden border border-[#2a2a2a] relative"
      style={{ background: '#0b0b0b' }}
    >
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

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(20,20,20,0.9)',
          border: '1px solid #2a2a2a',
          borderRadius: 10,
          padding: '8px 10px',
          fontSize: 10,
          color: '#999',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          maxWidth: 600,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Megaphone size={10} color="#93c5fd" /> Ad
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <FileText size={10} color="#ECECEC" /> Page
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Target size={10} color="#1877f2" /> Pixel
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TagIcon size={10} color="#f9a8d4" /> Tag
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Database size={10} color="#4ade80" /> Destination
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
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements
        nodesDraggable
        nodesConnectable={false}
        panOnScroll
        zoomOnPinch
        elevateNodesOnSelect={false}
      >
        <Background color="#1a1a1a" gap={28} size={1} />
        <Controls style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />
        <MiniMap
          nodeColor={n => {
            const k = (n.data as any)?.kind;
            if (k === 'ad') return '#93c5fd';
            if (k === 'page') return '#ECECEC';
            if (k === 'email') return '#bfdbfe';
            if (k === 'sms') return '#fde68a';
            if (k === 'telegram') return '#86efac';
            if (k === 'pixel') return '#1877f2';
            if (k === 'tag') return '#f9a8d4';
            if (k === 'destination') return '#4ade80';
            return '#555';
          }}
          maskColor="rgba(0,0,0,0.65)"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
        />
      </ReactFlow>
    </div>
  );
};

export default LukeFlowView;
