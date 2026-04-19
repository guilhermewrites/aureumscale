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
  Tag as TagIcon,
  Eye,
  MousePointerClick,
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
  ExternalLink,
  TrendingUp,
} from 'lucide-react';

// =============================================================================
// Design tokens — dark & monochrome with a single positive accent
// =============================================================================

const INK = {
  bg:         '#0a0a0a',
  bgSoft:     '#111',
  surface:    '#141414',
  surfaceHi:  '#1a1a1a',
  border:     '#232323',
  borderHi:   '#2e2e2e',
  text:       '#ECECEC',
  textMuted:  '#8a8a8a',
  textSubtle: '#555',
  accent:     '#9ee6a8',    // single muted-green accent for money/success
  wire:       '#2f2f2f',
  wireHi:     '#4a4a4a',
};

// Brand pigments reserved for tiny icons only — NOT for chrome
const BRAND = {
  meta:     '#1877f2',
  google:   '#ea4335',
  telegram: '#6AB3F3',
};

// =============================================================================
// Types
// =============================================================================

type Platform = 'GHL' | 'Kit' | 'Meta' | 'Telegram' | 'Twilio' | 'Supabase' | 'Close' | 'Google';

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
  openHref: string;
  views: number;
  clicks: number;
  conversionPct: number;
}

interface EmailNodeData {
  kind: 'email';
  fromName: string;
  fromEmail: string;
  toDisplay: string;
  subject: string;
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
  trigger: string;
}

interface DestinationNodeData {
  kind: 'destination';
  platform: Platform;
  label: string;
  action: string;
}

// =============================================================================
// Shared atoms
// =============================================================================

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: INK.textMuted,
};

const TriggerPill: React.FC<{ trigger: string }> = ({ trigger }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 9,
      color: INK.textMuted,
      background: 'rgba(255,255,255,0.04)',
      padding: '2px 7px',
      borderRadius: 999,
      fontWeight: 500,
    }}
  >
    <Clock size={8} />
    {trigger}
  </span>
);

const NodeShell: React.FC<React.PropsWithChildren<{ width: number; style?: React.CSSProperties }>> = ({ width, style, children }) => (
  <div
    style={{
      width,
      background: INK.surface,
      border: `1px solid ${INK.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      color: INK.text,
      fontSize: 11,
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      ...style,
    }}
  >
    {children}
  </div>
);

const ChannelStrip: React.FC<{ icon: React.ReactNode; title: string; trigger: string }> = ({ icon, title, trigger }) => (
  <div
    style={{
      padding: '6px 12px',
      background: INK.surfaceHi,
      borderBottom: `1px solid ${INK.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: INK.textMuted,
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    }}
  >
    {icon}
    {title}
    <span style={{ marginLeft: 'auto' }}>
      <TriggerPill trigger={trigger} />
    </span>
  </div>
);

// =============================================================================
// AD NODE — Facebook-style post, monochrome chrome
// =============================================================================

const AdNode = memo<NodeProps<AdNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={320}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: INK.surfaceHi }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: BRAND.meta,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Facebook size={14} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: INK.text }}>Luke Alexander</div>
          <div style={{ fontSize: 9, color: INK.textMuted }}>Sponsored · {data.platform}</div>
        </div>
      </div>
      <div style={{ padding: '10px 12px', fontSize: 11, color: INK.text, lineHeight: 1.45 }}>
        {data.primaryText}
      </div>
      <div
        style={{
          height: 170,
          background: `url(${data.image}) center/cover, #1a1a1a`,
          borderTop: `1px solid ${INK.border}`,
          borderBottom: `1px solid ${INK.border}`,
        }}
      />
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, background: INK.surfaceHi }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: INK.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>aiinsiders.com</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: INK.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.headline}
          </div>
        </div>
        <button
          style={{
            fontSize: 11,
            padding: '5px 12px',
            borderRadius: 6,
            background: INK.surface,
            color: INK.text,
            border: `1px solid ${INK.borderHi}`,
            fontWeight: 500,
          }}
        >
          {data.cta}
        </button>
      </div>
      {showMetrics && (
        <div
          style={{
            padding: '8px 12px',
            display: 'flex',
            gap: 14,
            fontSize: 10,
            color: INK.textMuted,
            borderTop: `1px solid ${INK.border}`,
          }}
        >
          <span>${data.spend}</span>
          <span>{data.leads} leads</span>
          <span style={{ color: INK.accent, marginLeft: 'auto' }}>CPL ${data.cpl.toFixed(2)}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
AdNode.displayName = 'AdNode';

// =============================================================================
// PAGE NODE — browser-chrome card, ghost placeholder
// =============================================================================

const PageNode = memo<NodeProps<PageNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={320}>
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          background: INK.surfaceHi,
          borderBottom: `1px solid ${INK.border}`,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#333' }} />
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#333' }} />
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#333' }} />
        </div>
        <div
          style={{
            flex: 1,
            fontSize: 10,
            color: INK.textMuted,
            background: INK.bgSoft,
            padding: '3px 8px',
            borderRadius: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.url}
        </div>
        <a
          href={data.openHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: INK.textMuted, display: 'flex', alignItems: 'center' }}
          title="Open page"
        >
          <ExternalLink size={11} />
        </a>
      </div>

      <div
        style={{
          height: 160,
          background: INK.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <div style={{ width: 70, height: 4, background: INK.borderHi, borderRadius: 2 }} />
        <div style={{ width: 200, height: 9, background: INK.border, borderRadius: 3 }} />
        <div style={{ width: 230, height: 9, background: INK.border, borderRadius: 3 }} />
        <div style={{ width: 160, height: 9, background: INK.border, borderRadius: 3 }} />
        <div
          style={{
            marginTop: 6,
            width: 130,
            height: 24,
            borderRadius: 4,
            background: INK.borderHi,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            color: INK.text,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          {data.label === 'Capture Page' ? 'SAVE MY SEAT' : data.label === 'SLO Page' ? 'GET ACCESS' : 'VIEW REPLAY'}
        </div>
      </div>

      <div style={{ padding: '10px 12px', background: INK.surfaceHi, borderTop: `1px solid ${INK.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: showMetrics ? 6 : 0 }}>
          <FileText size={11} color={INK.text} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{data.label}</span>
        </div>
        {showMetrics && (
          <div style={{ display: 'flex', gap: 14, fontSize: 10, color: INK.textMuted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Eye size={9} />{data.views}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <MousePointerClick size={9} />{data.clicks}
            </span>
            <span style={{ color: INK.accent, marginLeft: 'auto' }}>{data.conversionPct}%</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="msg" style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
PageNode.displayName = 'PageNode';

// =============================================================================
// EMAIL NODE — Gmail-style preview inside neutral chrome
// =============================================================================

const EmailNode = memo<NodeProps<EmailNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  const initial = data.fromName[0]?.toUpperCase() || 'L';
  return (
    <NodeShell width={320}>
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <ChannelStrip
        icon={<Mail size={11} />}
        title={`Email · ${data.sendingFrom}`}
        trigger={data.trigger}
      />

      {/* Email body on white — authentic client look */}
      <div style={{ background: '#fff', color: '#202124' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #e8eaed' }}>
          <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 10 }}>
            {data.subject}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                background: '#1a73e8',
                color: '#fff',
                fontSize: 13,
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
              <div style={{ fontSize: 11 }}>
                <span style={{ fontWeight: 600 }}>{data.fromName}</span>{' '}
                <span style={{ color: '#5f6368' }}>&lt;{data.fromEmail}&gt;</span>
              </div>
              <div style={{ fontSize: 10, color: '#5f6368' }}>to {data.toDisplay}</div>
            </div>
          </div>
        </div>
        <div
          className="nodrag nowheel"
          style={{
            padding: '12px 14px',
            fontSize: 11,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            maxHeight: 220,
            overflow: 'auto',
          }}
        >
          {data.body}
        </div>
      </div>

      {showMetrics && (
        <div
          style={{
            padding: '8px 12px',
            display: 'flex',
            gap: 14,
            fontSize: 10,
            color: INK.textMuted,
            borderTop: `1px solid ${INK.border}`,
          }}
        >
          <span>{data.sent} sent</span>
          <span>{data.openedPct}% open</span>
          <span>{data.clickedPct}% click</span>
        </div>
      )}
    </NodeShell>
  );
});
EmailNode.displayName = 'EmailNode';

// =============================================================================
// SMS NODE — iMessage-style phone preview
// =============================================================================

const SmsNode = memo<NodeProps<SmsNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={280}>
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <ChannelStrip
        icon={<MessageSquare size={11} />}
        title={`SMS · ${data.sendingFrom}`}
        trigger={data.trigger}
      />

      <div style={{ background: '#000', padding: '10px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: '#fff', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>{data.time}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Signal size={9} />
            <Wifi size={9} />
            <BatteryFull size={10} />
          </span>
        </div>
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
          <ChevronLeft size={18} color="#0A84FF" style={{ position: 'absolute', left: 0, top: 4 }} />
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              background: '#333',
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
            padding: '8px 12px',
            display: 'flex',
            gap: 14,
            fontSize: 10,
            color: INK.textMuted,
            borderTop: `1px solid ${INK.border}`,
          }}
        >
          <span>{data.sent} sent</span>
          <span>{data.clickedPct}% click</span>
        </div>
      )}
    </NodeShell>
  );
});
SmsNode.displayName = 'SmsNode';

// =============================================================================
// TELEGRAM NODE
// =============================================================================

const TelegramNode = memo<NodeProps<TelegramNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={280}>
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <ChannelStrip
        icon={<Send size={11} />}
        title="Telegram"
        trigger={data.trigger}
      />

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
            width: 32,
            height: 32,
            borderRadius: 16,
            background: BRAND.telegram,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
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
      </div>

      <div
        className="nodrag nowheel"
        style={{
          background: '#0E1621',
          padding: '12px 12px 14px',
          minHeight: 100,
        }}
      >
        <div
          style={{
            background: '#182533',
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
            padding: '8px 12px',
            display: 'flex',
            gap: 14,
            fontSize: 10,
            color: INK.textMuted,
            borderTop: `1px solid ${INK.border}`,
          }}
        >
          <span>{data.sent} sent</span>
          <span>{data.clickedPct}% click</span>
        </div>
      )}
    </NodeShell>
  );
});
TelegramNode.displayName = 'TelegramNode';

// =============================================================================
// PIXEL NODE — tiny, uniform, brand colour in ICON ONLY
// =============================================================================

const PixelNode = memo<NodeProps<PixelNodeData>>(({ data }) => {
  const brandColor =
    data.provider === 'Meta' ? BRAND.meta :
    data.provider === 'Google' ? BRAND.google :
    '#000';
  return (
    <div
      style={{
        width: 180,
        background: INK.surface,
        border: `1px solid ${INK.border}`,
        borderRadius: 10,
        padding: '8px 10px',
        color: INK.text,
        fontSize: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: INK.wireHi, width: 7, height: 7 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            background: brandColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Target size={8} color="#fff" />
        </div>
        <span style={labelStyle}>{data.provider} Pixel</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: INK.text, marginBottom: 2 }}>
        {data.eventName}
      </div>
      <div style={{ fontSize: 9, color: INK.textMuted }}>
        {data.trigger}
        {data.value && <span style={{ color: INK.accent, marginLeft: 6 }}>· {data.value}</span>}
      </div>
    </div>
  );
});
PixelNode.displayName = 'PixelNode';

// =============================================================================
// TAG NODE — mono chrome, platform in text
// =============================================================================

const TagNode = memo<NodeProps<TagNodeData>>(({ data }) => {
  return (
    <div
      style={{
        width: 200,
        background: INK.surface,
        border: `1px solid ${INK.border}`,
        borderRadius: 10,
        padding: '8px 10px',
        color: INK.text,
        fontSize: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: INK.wireHi, width: 7, height: 7 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <TagIcon size={10} color={INK.textMuted} />
        <span style={labelStyle}>{data.platform} · tag added</span>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: INK.text,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          marginBottom: 2,
        }}
      >
        {data.label}
      </div>
      <div style={{ fontSize: 9, color: INK.textMuted }}>{data.trigger}</div>
    </div>
  );
});
TagNode.displayName = 'TagNode';

// =============================================================================
// DESTINATION NODE — mono chrome, small icon
// =============================================================================

const DEST_ICON: Partial<Record<Platform, React.ReactNode>> = {
  GHL:      <Zap size={13} color={INK.text} />,
  Kit:      <Mail size={13} color={INK.text} />,
  Supabase: <Database size={13} color={INK.text} />,
  Close:    <Phone size={13} color={INK.text} />,
};

const DestinationNode = memo<NodeProps<DestinationNodeData>>(({ data }) => {
  return (
    <div
      style={{
        width: 240,
        background: INK.surface,
        border: `1px solid ${INK.border}`,
        borderRadius: 12,
        padding: '12px 14px',
        color: INK.text,
        fontSize: 11,
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: INK.surfaceHi,
            border: `1px solid ${INK.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {DEST_ICON[data.platform]}
        </div>
        <div>
          <div style={labelStyle}>Destination</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK.text }}>{data.label}</div>
        </div>
      </div>
      <div
        style={{
          fontSize: 9,
          color: INK.textMuted,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          background: INK.surfaceHi,
          padding: '4px 7px',
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
// Layout — strict swim lanes
// =============================================================================
//   x=0      ADS column          (320 wide)
//   x=400    CAPTURE stage       (2-col grid, 680 wide, messages stack)
//   x=1120   OFFER stage         (320 wide)
//   x=1480   POST-BUY stage      (320 wide)
//   x=1860   DESTINATIONS column (240 wide, stacked)
//
//   y=0      Ads & Pages row
//   y=430    Pixel lane
//   y=560    Tag lane
//   y=700    Message lane (stacks down)

const AD_IMAGE = '/funnels/luke-alexander/hero.jpg';

const X = {
  ads:       0,
  capCol1:   400,
  capCol2:   740,
  offer:     1120,
  postbuy:   1480,
  dest:      1860,
};

const Y = {
  row1:      0,
  row1b:     420,   // 2nd ad
  row1c:     840,   // 3rd ad
  page:      40,
  pixel:     430,
  tag:       560,
  msg:       700,
  msg2:      1200,
  msg3:      1700,
};

const SEED_NODES: any[] = [
  // -------- Ads --------
  {
    id: 'ad-meta',
    type: 'ad',
    position: { x: X.ads, y: Y.row1 },
    data: {
      kind: 'ad', label: 'AI Insiders — Cold', platform: 'Meta', image: AD_IMAGE,
      headline: 'AI Insiders — Free Briefing',
      primaryText: 'The 3 AI workflows quietly replacing entire marketing teams. Free 60-min briefing. Seats limited.',
      cta: 'Sign Up', spend: 420, leads: 68, cpl: 6.18,
    },
  },
  {
    id: 'ad-ig',
    type: 'ad',
    position: { x: X.ads, y: Y.row1b },
    data: {
      kind: 'ad', label: 'IG Retarget', platform: 'Meta', image: AD_IMAGE,
      headline: 'Still thinking about it?',
      primaryText: 'You looked, you left. The AI Insiders briefing starts tomorrow. Last call.',
      cta: 'Save My Seat', spend: 180, leads: 41, cpl: 4.39,
    },
  },
  {
    id: 'ad-organic',
    type: 'ad',
    position: { x: X.ads, y: Y.row1c },
    data: {
      kind: 'ad', label: 'Kit broadcast', platform: 'Kit', image: AD_IMAGE,
      headline: 'List broadcast · AI Insiders',
      primaryText: "Broadcast to Luke's subscriber list announcing the free AI Insiders briefing tomorrow.",
      cta: 'Open', spend: 0, leads: 112, cpl: 0,
    },
  },

  // -------- Pages (single row) --------
  {
    id: 'pg-optin', type: 'page', position: { x: X.capCol1 + 170, y: Y.page },
    data: { kind: 'page', label: 'Capture Page', url: 'aureumfunnels.com/luke/optin',  openHref: '/funnels/luke-alexander/optin/index.html',     views: 1240, clicks: 221, conversionPct: 17.8 },
  },
  {
    id: 'pg-slo',   type: 'page', position: { x: X.offer,   y: Y.page },
    data: { kind: 'page', label: 'SLO Page',     url: 'aureumfunnels.com/luke/slo',    openHref: '/funnels/luke-alexander/slo/index.html',       views: 221,  clicks: 34,  conversionPct: 15.4 },
  },
  {
    id: 'pg-ty',    type: 'page', position: { x: X.postbuy, y: Y.page },
    data: { kind: 'page', label: 'Thank You',    url: 'aureumfunnels.com/luke/ty',     openHref: '/funnels/luke-alexander/thank-you/index.html', views: 221,  clicks: 198, conversionPct: 89.6 },
  },

  // -------- Pixels (lane y=430) --------
  {
    id: 'px-optin-pv',     type: 'pixel', position: { x: X.capCol1,       y: Y.pixel },
    data: { kind: 'pixel', provider: 'Meta',   eventName: 'PageView',         trigger: 'on page load' },
  },
  {
    id: 'px-optin-lead',   type: 'pixel', position: { x: X.capCol1 + 220,  y: Y.pixel },
    data: { kind: 'pixel', provider: 'Meta',   eventName: 'Lead',             trigger: 'on opt-in', value: '$6 est.' },
  },
  {
    id: 'px-optin-google', type: 'pixel', position: { x: X.capCol1 + 440,  y: Y.pixel },
    data: { kind: 'pixel', provider: 'Google', eventName: 'conversion: signup', trigger: 'on opt-in' },
  },
  {
    id: 'px-slo-purchase', type: 'pixel', position: { x: X.offer + 70,     y: Y.pixel },
    data: { kind: 'pixel', provider: 'Meta',   eventName: 'Purchase',         trigger: 'on checkout', value: '$47' },
  },
  {
    id: 'px-ty-pv',        type: 'pixel', position: { x: X.postbuy + 70,   y: Y.pixel },
    data: { kind: 'pixel', provider: 'Meta',   eventName: 'PageView',         trigger: 'on page load' },
  },

  // -------- Tags (lane y=560) --------
  {
    id: 'tag-lead', type: 'tag', position: { x: X.capCol1 + 60,  y: Y.tag },
    data: { kind: 'tag', platform: 'GHL', label: 'ai-insiders-lead', trigger: 'on opt-in' },
  },
  {
    id: 'tag-kit',  type: 'tag', position: { x: X.capCol1 + 340, y: Y.tag },
    data: { kind: 'tag', platform: 'Kit', label: 'AI Insiders',     trigger: 'on opt-in' },
  },
  {
    id: 'tag-buyer',type: 'tag', position: { x: X.offer + 60,     y: Y.tag },
    data: { kind: 'tag', platform: 'GHL', label: 'ai-insiders-buyer', trigger: 'on purchase' },
  },

  // -------- Messages · Capture cluster (2-col grid) --------
  {
    id: 'msg-welcome-email', type: 'email', position: { x: X.capCol1, y: Y.msg },
    data: {
      kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
      subject: "You're in — AI Insiders briefing details inside",
      body: `Hey {{first_name}},

You're locked in for the AI Insiders briefing tomorrow. Here's everything you need:

📅  When: Tomorrow at 3pm ET
🔗  Join: [ AI Insiders Briefing → ]
⏱   Duration: 60 minutes

I'll be walking through the 3 AI workflows that are quietly replacing entire marketing departments — and how to position yourself on the right side of it.

Save this. Add it to your calendar. See you inside.

— Luke`,
      trigger: 'on opt-in', sendingFrom: 'Kit', sent: 221, openedPct: 68, clickedPct: 42,
    },
  },
  {
    id: 'msg-welcome-sms', type: 'sms', position: { x: X.capCol2, y: Y.msg },
    data: {
      kind: 'sms', contactName: 'Luke Alexander',
      body: `Hey, Luke here 👋

You're in for tomorrow's AI Insiders briefing — 3pm ET.

Save this link:
aiinsiders.com/join

Reply STOP to opt out.`,
      trigger: 'on opt-in', sendingFrom: 'Twilio', sent: 198, clickedPct: 31, time: '9:41',
    },
  },
  {
    id: 'msg-welcome-tg', type: 'telegram', position: { x: X.capCol1, y: Y.msg2 },
    data: {
      kind: 'telegram', botName: 'AI Insiders', botSubtitle: 'channel · 1 240 subscribers',
      body: `Welcome to AI Insiders 🎯

Join the private channel for behind-the-scenes drops:
t.me/aiinsiders

Briefing kicks off tomorrow at 3pm ET.`,
      trigger: 'on opt-in', sent: 174, clickedPct: 58, time: '9:41',
    },
  },
  {
    id: 'msg-24h', type: 'email', position: { x: X.capCol2, y: Y.msg2 },
    data: {
      kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
      subject: 'Tomorrow · AI Insiders briefing (save your seat)',
      body: `{{first_name}} —

Quick reminder: the AI Insiders briefing is tomorrow at 3pm ET.

If you haven't blocked your calendar, do it now — I'm walking through material I'm not sharing anywhere else.

Join here: [ AI Insiders Briefing → ]

— Luke`,
      trigger: 'T-24h', sendingFrom: 'Kit', sent: 221, openedPct: 54, clickedPct: 28,
    },
  },
  {
    id: 'msg-1h', type: 'email', position: { x: X.capCol1, y: Y.msg3 },
    data: {
      kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
      subject: '1 hour · final reminder',
      body: `{{first_name}} —

60 minutes out. Make sure you're at your desk, bring questions, and grab a notepad.

Join: [ AI Insiders Briefing → ]

— Luke`,
      trigger: 'T-1h', sendingFrom: 'Kit', sent: 221, openedPct: 62, clickedPct: 36,
    },
  },
  {
    id: 'msg-live', type: 'sms', position: { x: X.capCol2, y: Y.msg3 },
    data: {
      kind: 'sms', contactName: 'Luke Alexander',
      body: `We're LIVE.

Tap to join:
aiinsiders.com/join

(Starts in 2 min — don't wait.)`,
      trigger: 'T-0', sendingFrom: 'Twilio', sent: 198, clickedPct: 71, time: '3:00',
    },
  },

  // -------- Messages · Offer & Post-buy --------
  {
    id: 'msg-slo-receipt', type: 'email', position: { x: X.offer, y: Y.msg },
    data: {
      kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
      subject: 'Your AI Insiders access is confirmed',
      body: `{{first_name}} —

You're in. Your AI Insiders access is active and the replay library is now unlocked.

Access your portal: [ AI Insiders Portal → ]

Inside you'll find:
•  Full briefing replay
•  Workflow blueprints
•  Prompt library + automation templates

Reply to this email if anything is off.

Welcome aboard.

— Luke`,
      trigger: 'on purchase', sendingFrom: 'Kit', sent: 34, openedPct: 88, clickedPct: 61,
    },
  },
  {
    id: 'msg-ty-replay', type: 'email', position: { x: X.postbuy, y: Y.msg },
    data: {
      kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
      subject: 'Replay + resources from AI Insiders',
      body: `Hey {{first_name}} —

Here's the full replay and every resource I promised from yesterday's AI Insiders briefing:

▶  Full replay: [ Watch → ]
📦  Resource pack: [ Download → ]
📅  Next live drop: next week

Let me know what lands.

— Luke`,
      trigger: 'T+24h post-event', sendingFrom: 'Kit', sent: 0, openedPct: 0, clickedPct: 0,
    },
  },

  // -------- Destinations (right column) --------
  { id: 'dest-supabase', type: 'destination', position: { x: X.dest, y: Y.pixel - 120 }, data: { kind: 'destination', platform: 'Supabase', label: 'Supabase',      action: 'INSERT funnel_leads' } },
  { id: 'dest-kit',      type: 'destination', position: { x: X.dest, y: Y.pixel },        data: { kind: 'destination', platform: 'Kit',      label: 'Kit',           action: 'POST /subscribers' } },
  { id: 'dest-close',    type: 'destination', position: { x: X.dest, y: Y.pixel + 120 },  data: { kind: 'destination', platform: 'Close',    label: 'Close CRM',     action: 'POST /lead → pipeline' } },
  { id: 'dest-ghl',      type: 'destination', position: { x: X.dest, y: Y.pixel + 240 },  data: { kind: 'destination', platform: 'GHL',      label: 'GoHighLevel',   action: 'upsert contact + tag' } },
];

// =============================================================================
// Edges — single neutral palette, dashed for "triggered by"
// =============================================================================

const solid    = { style: { stroke: INK.wire, strokeWidth: 1.5 }, animated: false };
const solidHi  = { style: { stroke: INK.wireHi, strokeWidth: 1.5 }, animated: true };
const triggered = { style: { stroke: INK.wire, strokeWidth: 1.2, strokeDasharray: '4 4' }, animated: false };
const labelTheme = {
  labelStyle: { fill: INK.textMuted, fontSize: 10 },
  labelBgStyle: { fill: INK.surface },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 4,
};
const arrow = (c: string) => ({ type: MarkerType.ArrowClosed, color: c });

const SEED_EDGES: any[] = [
  // Ads → Capture
  { id: 'e-meta-optin',    source: 'ad-meta',    target: 'pg-optin', label: 'CPL $6.18', ...solidHi, markerEnd: arrow(INK.wireHi), ...labelTheme },
  { id: 'e-ig-optin',      source: 'ad-ig',      target: 'pg-optin', label: 'CPL $4.39', ...solidHi, markerEnd: arrow(INK.wireHi), ...labelTheme },
  { id: 'e-organic-optin', source: 'ad-organic', target: 'pg-optin', label: 'organic',   ...solidHi, markerEnd: arrow(INK.wireHi), ...labelTheme },

  // Page → Page
  { id: 'e-optin-slo', source: 'pg-optin', target: 'pg-slo', label: '17.8% CTR', ...solid, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-slo-ty',    source: 'pg-slo',   target: 'pg-ty',  label: '15.4% CVR', ...solid, markerEnd: arrow(INK.wire), ...labelTheme },

  // Page → Pixels
  { id: 'e-optin-px-pv',    source: 'pg-optin', sourceHandle: 'msg', target: 'px-optin-pv',     ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-optin-px-lead',  source: 'pg-optin', sourceHandle: 'msg', target: 'px-optin-lead',   ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-optin-px-goog',  source: 'pg-optin', sourceHandle: 'msg', target: 'px-optin-google', ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-slo-px-purch',   source: 'pg-slo',   sourceHandle: 'msg', target: 'px-slo-purchase', ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-ty-px-pv',       source: 'pg-ty',    sourceHandle: 'msg', target: 'px-ty-pv',        ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },

  // Pixel → Tag
  { id: 'e-pxlead-tag-lead', source: 'px-optin-lead',   target: 'tag-lead',  ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-pxlead-tag-kit',  source: 'px-optin-lead',   target: 'tag-kit',   ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-pxpurch-tag-buy', source: 'px-slo-purchase', target: 'tag-buyer', ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },

  // Tag → Messages
  { id: 'e-tag-welcome-email', source: 'tag-kit',   target: 'msg-welcome-email', ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-tag-welcome-sms',   source: 'tag-lead',  target: 'msg-welcome-sms',   ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-tag-welcome-tg',    source: 'tag-lead',  target: 'msg-welcome-tg',    ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-tag-24h',           source: 'tag-kit',   target: 'msg-24h',           ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-tag-1h',            source: 'tag-kit',   target: 'msg-1h',            ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-tag-live',          source: 'tag-lead',  target: 'msg-live',          ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-tag-slo-receipt',   source: 'tag-buyer', target: 'msg-slo-receipt',   ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },

  // TY → replay email
  { id: 'e-ty-replay', source: 'pg-ty', sourceHandle: 'msg', target: 'msg-ty-replay', ...triggered, markerEnd: arrow(INK.wire), ...labelTheme },

  // Tags → Destinations
  { id: 'e-taglead-supa',  source: 'tag-lead',  target: 'dest-supabase', ...solid, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-taglead-kit',   source: 'tag-kit',   target: 'dest-kit',      ...solid, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-taglead-close', source: 'tag-lead',  target: 'dest-close',    ...solid, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-taglead-ghl',   source: 'tag-lead',  target: 'dest-ghl',      ...solid, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-tagbuy-ghl',    source: 'tag-buyer', target: 'dest-ghl',      ...solid, markerEnd: arrow(INK.wire), ...labelTheme },
  { id: 'e-tagbuy-close',  source: 'tag-buyer', target: 'dest-close',    ...solid, markerEnd: arrow(INK.wire), ...labelTheme },
];

// =============================================================================
// Stats (wire to Whop + Meta Ads later)
// =============================================================================

interface Stats {
  adSpend: number;
  leads: number;
  cpl: number;
  sales: number;
  revenue: number;
  roas: number;
}

// TODO: replace with hook that reads Meta Ads (spend/leads) + Whop (sales/revenue)
const useFunnelStats = (): Stats => {
  const adSpend = 600;
  const leads = 221;
  const cpl = +(adSpend / leads).toFixed(2);
  const sales = 34;
  const revenue = sales * 47;
  const roas = +(revenue / adSpend).toFixed(2);
  return { adSpend, leads, cpl, sales, revenue, roas };
};

const StatCard: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div
    style={{
      flex: 1,
      minWidth: 120,
      padding: '12px 14px',
      background: INK.surface,
      border: `1px solid ${INK.border}`,
      borderRadius: 10,
    }}
  >
    <div style={{ ...labelStyle, marginBottom: 4 }}>{label}</div>
    <div
      style={{
        fontSize: 20,
        fontWeight: 600,
        color: accent ? INK.accent : INK.text,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: -0.3,
      }}
    >
      {value}
    </div>
  </div>
);

const StatsBar: React.FC<{ stats: Stats }> = ({ stats }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    <StatCard label="Ad spend"  value={`$${stats.adSpend.toLocaleString()}`} />
    <StatCard label="Leads"     value={stats.leads.toLocaleString()} />
    <StatCard label="CPL"       value={`$${stats.cpl.toFixed(2)}`} />
    <StatCard label="Sales"     value={stats.sales.toLocaleString()} />
    <StatCard label="Revenue"   value={`$${stats.revenue.toLocaleString()}`} accent />
    <StatCard label="ROAS"      value={`${stats.roas.toFixed(2)}x`} accent />
  </div>
);

// =============================================================================
// Main component
// =============================================================================

interface Props {
  storagePrefix: string;
}

const LukeFlowView: React.FC<Props> = () => {
  const [showMetrics, setShowMetrics] = useState(true);
  const stats = useFunnelStats();

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
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <StatsBar stats={stats} />

      <div
        className="flex-1 min-h-0 rounded-xl overflow-hidden border relative"
        style={{ background: INK.bg, borderColor: INK.border }}
      >
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <button
            onClick={toggleMetrics}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={{
              background: INK.surface,
              color: showMetrics ? INK.text : INK.textMuted,
              border: `1px solid ${INK.border}`,
            }}
          >
            {showMetrics ? 'Metrics on' : 'Metrics off'}
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.08 }}
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
          <Background color={INK.border} gap={32} size={1} />
          <Controls
            style={{ background: INK.surface, border: `1px solid ${INK.border}` }}
            showInteractive={false}
          />
          <MiniMap
            nodeColor={() => INK.borderHi}
            nodeStrokeColor={() => INK.border}
            maskColor="rgba(0,0,0,0.7)"
            style={{ background: INK.surface, border: `1px solid ${INK.border}` }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default LukeFlowView;
