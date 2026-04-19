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
  Video,
  PlayCircle,
  Calendar,
} from 'lucide-react';

// =============================================================================
// Design tokens
// =============================================================================

// Colour — neutral first, one accent for money/positive
const INK = {
  bg:         '#0a0a0a',
  bgSoft:     '#101010',
  surface:    '#141414',
  surfaceHi:  '#191919',
  border:     '#222',
  borderHi:   '#2b2b2b',
  text:       '#ECECEC',
  textMuted:  '#8a8a8a',
  textSubtle: '#5a5a5a',
  accent:     '#9ee6a8',
  wire:       '#2e2e2e',
  wireHi:     '#4a4a4a',
};

// Brand pigments — only inside 12–14px badges, never on chrome
const BRAND = {
  meta:     '#1877f2',
  telegram: '#6AB3F3',
};

// Spacing — 4pt scale
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64, jumbo: 96 };

// Type — 5-step scale, ≥1.25 ratio between the two body sizes
const TYPE = {
  label:    9,   // uppercase meta
  body:     11,  // primary body
  title:    13,  // card titles
  display:  20,  // stat numbers
};

// Node widths — two primary sizes, one small
const W = {
  primary: 320,  // ad, page, email, webinar
  phone:   280,  // sms, telegram (phone-shaped on purpose)
  chip:    220,  // tag, destination
};

// Column grid — 480px stride (320w card + 160 gutter)
const STRIDE = 480;
const col = (i: number) => i * STRIDE;

// Column headers shown at y=COL_LABEL_Y
const COL_LABEL_Y = -72;
const COLUMNS: { label: string; i: number }[] = [
  { label: 'Traffic',          i: 0 },
  { label: 'Capture',          i: 1 },
  { label: 'Opt-in automation',i: 2 },
  { label: 'Reminders',        i: 3 },
  { label: 'Live event',       i: 4 },
  { label: 'Offer',            i: 5 },
  { label: 'Purchase',         i: 6 },
  { label: 'Confirmation',     i: 7 },
  { label: 'Post-event',       i: 8 },
  { label: 'Destinations',     i: 9 },
];

// =============================================================================
// Types
// =============================================================================

type Platform = 'GHL' | 'Kit' | 'Meta' | 'Telegram' | 'Twilio' | 'Supabase' | 'Close' | 'WebinarJam';

interface PixelEvent { name: string; trigger: string; value?: string }

interface AdNodeData {
  kind: 'ad'; label: string; platform: Platform; image: string;
  headline: string; primaryText: string; cta: string;
  spend: number; leads: number; cpl: number;
}
interface PageNodeData {
  kind: 'page'; label: string; url: string; openHref: string;
  views: number; clicks: number; conversionPct: number;
  pixelEvents: PixelEvent[]; cta: string;
}
interface EmailNodeData {
  kind: 'email'; fromName: string; fromEmail: string; toDisplay: string;
  subject: string; body: string; trigger: string; sendingFrom: Platform;
  sent: number; openedPct: number; clickedPct: number;
}
interface SmsNodeData {
  kind: 'sms'; contactName: string; body: string; trigger: string;
  sendingFrom: Platform; sent: number; clickedPct: number; time: string;
}
interface TelegramNodeData {
  kind: 'telegram'; botName: string; botSubtitle: string; body: string;
  trigger: string; sent: number; clickedPct: number; time: string;
}
interface TagNodeData {
  kind: 'tag'; platform: Platform; label: string; trigger: string;
}
interface DestinationNodeData {
  kind: 'destination'; platform: Platform; label: string; action: string;
}
interface WebinarNodeData {
  kind: 'webinar'; platform: 'WebinarJam'; title: string;
  date: string; time: string; duration: string;
  registered: number; showRate: number;
}

// =============================================================================
// Atoms
// =============================================================================

const labelStyle: React.CSSProperties = {
  fontSize: TYPE.label,
  fontWeight: 600,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: INK.textMuted,
};

const metaText: React.CSSProperties = {
  fontSize: TYPE.body - 1,
  color: INK.textMuted,
  fontVariantNumeric: 'tabular-nums',
};

const TriggerPill: React.FC<{ trigger: string }> = ({ trigger }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: SP.xs,
    fontSize: TYPE.label, color: INK.textMuted,
    background: 'rgba(255,255,255,0.04)',
    padding: `2px ${SP.sm - 1}px`, borderRadius: 999, fontWeight: 500,
  }}>
    <Clock size={8} />{trigger}
  </span>
);

const NodeShell: React.FC<React.PropsWithChildren<{ width: number }>> = ({ width, children }) => (
  <div style={{
    width, background: INK.surface, border: `1px solid ${INK.border}`,
    borderRadius: 12, overflow: 'hidden', color: INK.text,
    fontSize: TYPE.body, boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
  }}>
    {children}
  </div>
);

const StripRow: React.FC<React.PropsWithChildren<{ emphasis?: boolean }>> = ({ emphasis, children }) => (
  <div style={{
    padding: `${SP.sm - 1}px ${SP.md}px`,
    background: emphasis ? INK.surfaceHi : 'transparent',
    borderBottom: emphasis ? `1px solid ${INK.border}` : undefined,
    display: 'flex', alignItems: 'center', gap: SP.sm,
    minHeight: 28,
  }}>
    {children}
  </div>
);

const ChannelStrip: React.FC<{ icon: React.ReactNode; title: string; trigger: string }> = ({ icon, title, trigger }) => (
  <StripRow emphasis>
    <span style={{ display: 'flex', alignItems: 'center', gap: SP.sm, ...labelStyle }}>
      {icon}{title}
    </span>
    <span style={{ marginLeft: 'auto' }}><TriggerPill trigger={trigger} /></span>
  </StripRow>
);

const FooterRow: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div style={{
    padding: `${SP.sm}px ${SP.md}px`,
    display: 'flex', gap: SP.lg,
    borderTop: `1px solid ${INK.border}`,
    background: INK.bgSoft,
    ...metaText,
  }}>{children}</div>
);

// =============================================================================
// Ad node
// =============================================================================

const AdNode = memo<NodeProps<AdNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={W.primary}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: SP.sm,
        padding: `${SP.sm}px ${SP.md}px`, background: INK.surfaceHi,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 13, background: BRAND.meta,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Facebook size={13} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: TYPE.body, fontWeight: 600, color: INK.text }}>Luke Alexander</div>
          <div style={{ fontSize: TYPE.label, color: INK.textMuted }}>Sponsored · {data.platform}</div>
        </div>
      </div>

      <div style={{
        padding: `${SP.sm}px ${SP.md}px ${SP.md}px`,
        fontSize: TYPE.body, color: INK.text, lineHeight: 1.5,
      }}>
        {data.primaryText}
      </div>

      <div style={{
        height: 170,
        background: `linear-gradient(145deg, rgba(10,10,10,0.55), rgba(8,8,8,0.85)), url(${data.image}) center/cover, #141414`,
        backgroundBlendMode: 'normal',
        borderTop: `1px solid ${INK.border}`,
        borderBottom: `1px solid ${INK.border}`,
        filter: 'saturate(0.75)',
      }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: SP.sm,
        padding: `${SP.sm + 2}px ${SP.md}px`,
        background: INK.surfaceHi,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...labelStyle, marginBottom: 2 }}>aiinsiders.com</div>
          <div style={{
            fontSize: TYPE.title - 1, fontWeight: 600, color: INK.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {data.headline}
          </div>
        </div>
        <button style={{
          fontSize: TYPE.body, padding: `${SP.xs}px ${SP.md}px`,
          borderRadius: 6, background: INK.surface, color: INK.text,
          border: `1px solid ${INK.borderHi}`, fontWeight: 500,
        }}>
          {data.cta}
        </button>
      </div>

      {showMetrics && (
        <FooterRow>
          <span>${data.spend.toLocaleString()}</span>
          <span>{data.leads} leads</span>
          <span style={{ color: INK.accent, marginLeft: 'auto' }}>CPL ${data.cpl.toFixed(2)}</span>
        </FooterRow>
      )}
      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
AdNode.displayName = 'AdNode';

// =============================================================================
// Page node (with Meta Pixel events inline)
// =============================================================================

const PageNode = memo<NodeProps<PageNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={W.primary}>
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />

      {/* Browser chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: SP.sm,
        padding: `${SP.sm - 1}px ${SP.md - 2}px`,
        background: INK.surfaceHi, borderBottom: `1px solid ${INK.border}`,
      }}>
        <div style={{ display: 'flex', gap: SP.xs }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: '#333' }} />
          <span style={{ width: 7, height: 7, borderRadius: 4, background: '#333' }} />
          <span style={{ width: 7, height: 7, borderRadius: 4, background: '#333' }} />
        </div>
        <div style={{
          flex: 1, fontSize: TYPE.body - 1, color: INK.textMuted, background: INK.bgSoft,
          padding: `2px ${SP.sm}px`, borderRadius: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.url}
        </div>
        <a href={data.openHref} target="_blank" rel="noopener noreferrer"
          style={{ color: INK.textMuted, display: 'flex', alignItems: 'center' }} title="Open page">
          <ExternalLink size={11} />
        </a>
      </div>

      {/* Ghost preview */}
      <div style={{
        height: 150, background: INK.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: SP.sm - 1,
      }}>
        <div style={{ width: 68, height: 4, background: INK.borderHi, borderRadius: 2 }} />
        <div style={{ width: 200, height: 7, background: INK.border, borderRadius: 3 }} />
        <div style={{ width: 232, height: 7, background: INK.border, borderRadius: 3 }} />
        <div style={{ width: 160, height: 7, background: INK.border, borderRadius: 3 }} />
        <div style={{
          marginTop: SP.xs, width: 132, height: 22, borderRadius: 4,
          background: INK.borderHi, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: TYPE.label,
          color: INK.text, fontWeight: 600, letterSpacing: 0.6,
        }}>
          {data.cta}
        </div>
      </div>

      {/* Label + metrics */}
      <div style={{
        padding: `${SP.sm + 2}px ${SP.md}px`, background: INK.surfaceHi,
        borderTop: `1px solid ${INK.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, marginBottom: showMetrics ? SP.sm - 2 : 0 }}>
          <FileText size={11} color={INK.text} />
          <span style={{ fontSize: TYPE.title, fontWeight: 600 }}>{data.label}</span>
        </div>
        {showMetrics && (
          <div style={{ display: 'flex', gap: SP.lg, ...metaText }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: SP.xs }}>
              <Eye size={10} />{data.views.toLocaleString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: SP.xs }}>
              <MousePointerClick size={10} />{data.clicks}
            </span>
            <span style={{ color: INK.accent, marginLeft: 'auto' }}>{data.conversionPct}%</span>
          </div>
        )}
      </div>

      {/* Inline Meta Pixel events */}
      {data.pixelEvents.length > 0 && (
        <div style={{ padding: `${SP.sm}px ${SP.md}px`, borderTop: `1px solid ${INK.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, marginBottom: SP.xs + 1 }}>
            <div style={{
              width: 12, height: 12, borderRadius: 2, background: BRAND.meta,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Target size={7} color="#fff" />
            </div>
            <span style={labelStyle}>Meta Pixel</span>
          </div>
          {data.pixelEvents.map((px, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: SP.sm,
              ...metaText, padding: '2px 0',
            }}>
              <span style={{
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                color: INK.text, fontSize: TYPE.body - 1, minWidth: 78,
              }}>
                {px.name}
              </span>
              <span style={{ flex: 1 }}>{px.trigger}</span>
              {px.value && <span style={{ color: INK.accent }}>{px.value}</span>}
            </div>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="trigger" style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
PageNode.displayName = 'PageNode';

// =============================================================================
// Email node — Gmail preview inside neutral chrome
// =============================================================================

const EmailNode = memo<NodeProps<EmailNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  const initial = data.fromName[0]?.toUpperCase() || 'L';
  return (
    <NodeShell width={W.primary}>
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <ChannelStrip icon={<Mail size={11} />} title={`Email · ${data.sendingFrom}`} trigger={data.trigger} />

      {/* Authentic Gmail surface */}
      <div style={{ background: '#fff', color: '#202124' }}>
        <div style={{ padding: `${SP.md + 2}px ${SP.md + 2}px ${SP.sm + 2}px`, borderBottom: '1px solid #e8eaed' }}>
          <div style={{
            fontSize: TYPE.title, fontWeight: 500, lineHeight: 1.3,
            marginBottom: SP.sm + 2, color: '#202124',
          }}>
            {data.subject}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm + 2 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14, background: '#1a73e8',
              color: '#fff', fontSize: TYPE.title - 1, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: TYPE.body }}>
                <span style={{ fontWeight: 600 }}>{data.fromName}</span>{' '}
                <span style={{ color: '#5f6368' }}>&lt;{data.fromEmail}&gt;</span>
              </div>
              <div style={{ fontSize: TYPE.body - 1, color: '#5f6368' }}>to {data.toDisplay}</div>
            </div>
          </div>
        </div>
        <div className="nodrag nowheel" style={{
          padding: `${SP.md}px ${SP.md + 2}px`,
          fontSize: TYPE.body, lineHeight: 1.65,
          whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto',
        }}>{data.body}</div>
      </div>

      {showMetrics && (
        <FooterRow>
          <span>{data.sent} sent</span>
          <span>{data.openedPct}% open</span>
          <span style={{ color: INK.accent, marginLeft: 'auto' }}>{data.clickedPct}% click</span>
        </FooterRow>
      )}
      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
EmailNode.displayName = 'EmailNode';

// =============================================================================
// SMS node — iMessage-style preview
// =============================================================================

const SmsNode = memo<NodeProps<SmsNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={W.phone}>
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <ChannelStrip icon={<MessageSquare size={11} />} title={`SMS · ${data.sendingFrom}`} trigger={data.trigger} />

      <div style={{ background: '#000', padding: `${SP.sm + 2}px ${SP.md + 2}px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: TYPE.body - 1, color: '#fff', marginBottom: SP.sm }}>
          <span style={{ fontWeight: 600 }}>{data.time}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: SP.xs }}>
            <Signal size={9} /><Wifi size={9} /><BatteryFull size={10} />
          </span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingBottom: SP.sm + 2, borderBottom: '1px solid #222', position: 'relative',
        }}>
          <ChevronLeft size={18} color="#0A84FF" style={{ position: 'absolute', left: 0, top: SP.xs }} />
          <div style={{
            width: 34, height: 34, borderRadius: 17, background: '#333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: TYPE.title - 1, fontWeight: 600, color: '#fff', marginBottom: 3,
          }}>{data.contactName[0]}</div>
          <div style={{ fontSize: TYPE.body - 1, color: '#fff', fontWeight: 500 }}>{data.contactName}</div>
        </div>
      </div>
      <div className="nodrag nowheel" style={{ background: '#000', padding: `${SP.md}px ${SP.md + 2}px ${SP.md + 2}px`, minHeight: 100 }}>
        <div style={{ fontSize: TYPE.label - 1, color: '#8e8e93', textAlign: 'center', marginBottom: SP.sm }}>
          Text Message · {data.time}
        </div>
        <div style={{
          background: '#26262a', color: '#fff', fontSize: TYPE.body,
          padding: `${SP.sm}px ${SP.md}px`,
          borderRadius: '17px 17px 17px 4px',
          maxWidth: '88%', lineHeight: 1.45, whiteSpace: 'pre-wrap',
        }}>{data.body}</div>
      </div>

      {showMetrics && (
        <FooterRow>
          <span>{data.sent} sent</span>
          <span style={{ color: INK.accent, marginLeft: 'auto' }}>{data.clickedPct}% click</span>
        </FooterRow>
      )}
      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
SmsNode.displayName = 'SmsNode';

// =============================================================================
// Telegram node
// =============================================================================

const TelegramNode = memo<NodeProps<TelegramNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={W.phone}>
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <ChannelStrip icon={<Send size={11} />} title="Telegram" trigger={data.trigger} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: SP.sm + 2,
        padding: `${SP.sm + 2}px ${SP.md}px`,
        background: '#17212B', borderBottom: '1px solid #0b1017',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 15, background: BRAND.telegram,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: TYPE.body, fontWeight: 600, color: '#fff',
        }}>{data.botName[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: TYPE.body, fontWeight: 600, color: '#fff' }}>{data.botName}</div>
          <div style={{ fontSize: TYPE.label, color: '#6A7A8C' }}>{data.botSubtitle}</div>
        </div>
      </div>
      <div className="nodrag nowheel" style={{ background: '#0E1621', padding: `${SP.md}px ${SP.md}px ${SP.md + 2}px`, minHeight: 100 }}>
        <div style={{
          background: '#182533', color: '#fff', fontSize: TYPE.body,
          padding: `${SP.sm}px ${SP.sm + 2}px 18px`,
          borderRadius: '12px 12px 12px 4px',
          maxWidth: '90%', lineHeight: 1.5, whiteSpace: 'pre-wrap', position: 'relative',
        }}>
          {data.body}
          <span style={{ position: 'absolute', right: SP.sm, bottom: SP.xs, fontSize: TYPE.label - 1, color: '#6A7A8C' }}>
            {data.time}
          </span>
        </div>
      </div>

      {showMetrics && (
        <FooterRow>
          <span>{data.sent} sent</span>
          <span style={{ color: INK.accent, marginLeft: 'auto' }}>{data.clickedPct}% click</span>
        </FooterRow>
      )}
      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
TelegramNode.displayName = 'TelegramNode';

// =============================================================================
// Tag node — small chip
// =============================================================================

const TagNode = memo<NodeProps<TagNodeData>>(({ data }) => (
  <div style={{
    width: W.chip, background: INK.surface, border: `1px solid ${INK.border}`,
    borderRadius: 10, padding: `${SP.sm}px ${SP.md - 2}px`,
    color: INK.text, boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
  }}>
    <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 7, height: 7 }} />
    <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 7, height: 7 }} />
    <Handle type="source" position={Position.Bottom} id="dest" style={{ background: INK.wireHi, width: 7, height: 7 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm - 2, marginBottom: SP.xs }}>
      <TagIcon size={10} color={INK.textMuted} />
      <span style={labelStyle}>{data.platform} · tag added</span>
    </div>
    <div style={{
      fontSize: TYPE.body, fontWeight: 600, color: INK.text,
      fontFamily: 'ui-monospace, SFMono-Regular, monospace', marginBottom: 2,
    }}>{data.label}</div>
    <div style={metaText}>{data.trigger}</div>
  </div>
));
TagNode.displayName = 'TagNode';

// =============================================================================
// Webinar node (WebinarJam)
// =============================================================================

const WebinarNode = memo<NodeProps<WebinarNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={W.primary}>
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <StripRow emphasis>
        <span style={{ display: 'flex', alignItems: 'center', gap: SP.sm, ...labelStyle }}>
          <Video size={11} />WebinarJam · Live event
        </span>
      </StripRow>

      <div style={{
        height: 140,
        background: `radial-gradient(circle at 30% 30%, #262626, ${INK.bg})`,
        borderBottom: `1px solid ${INK.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <PlayCircle size={56} color={INK.borderHi} strokeWidth={1} />
      </div>

      <div style={{ padding: `${SP.md}px ${SP.md + 2}px` }}>
        <div style={{ fontSize: TYPE.title, fontWeight: 600, color: INK.text, marginBottom: SP.sm }}>
          {data.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.xs + 2, ...metaText, marginBottom: 3 }}>
          <Calendar size={10} />
          <span>{data.date} · {data.time}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.xs + 2, ...metaText }}>
          <Clock size={10} />
          <span>{data.duration}</span>
        </div>
      </div>

      {showMetrics && (
        <FooterRow>
          <span>{data.registered} registered</span>
          <span style={{ color: INK.accent, marginLeft: 'auto' }}>{data.showRate}% show rate</span>
        </FooterRow>
      )}
      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
WebinarNode.displayName = 'WebinarNode';

// =============================================================================
// Destination node
// =============================================================================

const DEST_ICON: Partial<Record<Platform, React.ReactNode>> = {
  GHL:      <Zap size={13} color={INK.text} />,
  Kit:      <Mail size={13} color={INK.text} />,
  Supabase: <Database size={13} color={INK.text} />,
  Close:    <Phone size={13} color={INK.text} />,
};

const DestinationNode = memo<NodeProps<DestinationNodeData>>(({ data }) => (
  <div style={{
    width: W.chip + 20, background: INK.surface, border: `1px solid ${INK.border}`,
    borderRadius: 12, padding: `${SP.md}px ${SP.md + 2}px`,
    color: INK.text, boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
  }}>
    <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm + 2, marginBottom: SP.sm - 2 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, background: INK.surfaceHi,
        border: `1px solid ${INK.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{DEST_ICON[data.platform]}</div>
      <div>
        <div style={labelStyle}>Destination</div>
        <div style={{ fontSize: TYPE.title, fontWeight: 600, color: INK.text }}>{data.label}</div>
      </div>
    </div>
    <div style={{
      fontSize: TYPE.label, color: INK.textMuted,
      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      background: INK.surfaceHi, padding: `3px ${SP.sm - 1}px`,
      borderRadius: 4, display: 'inline-block',
    }}>{data.action}</div>
  </div>
));
DestinationNode.displayName = 'DestinationNode';

// =============================================================================
// Registry
// =============================================================================

// =============================================================================
// Column label node — non-interactive, sits above each column
// =============================================================================

const ColumnLabelNode = memo<NodeProps<{ label: string; index: number }>>(({ data }) => (
  <div style={{
    width: W.primary,
    display: 'flex',
    alignItems: 'center',
    gap: SP.sm,
    paddingBottom: SP.sm,
    borderBottom: `1px solid ${INK.border}`,
  }}>
    <span style={{
      fontSize: TYPE.label - 1,
      fontVariantNumeric: 'tabular-nums',
      color: INK.textSubtle,
      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    }}>
      {String(data.index + 1).padStart(2, '0')}
    </span>
    <span style={{
      ...labelStyle,
      color: INK.text,
      fontSize: TYPE.label + 1,
      letterSpacing: 1.2,
    }}>
      {data.label}
    </span>
  </div>
));
ColumnLabelNode.displayName = 'ColumnLabelNode';

const nodeTypes = {
  ad: AdNode,
  page: PageNode,
  email: EmailNode,
  sms: SmsNode,
  telegram: TelegramNode,
  tag: TagNode,
  webinar: WebinarNode,
  destination: DestinationNode,
  colLabel: ColumnLabelNode,
};

// =============================================================================
// Layout — strict L→R timeline with rhythm
//
// Columns (x) on a 400px stride. Primary nodes anchor at y=0 ("spine row").
// Vertical gaps follow the SP scale:
//   - 8–12px: tightly related (two tags firing together)
//   - 24–32px: siblings in same group
//   - 48–64px: distinct groups inside a column
// =============================================================================

const AD_IMAGE = '/funnels/luke-alexander/hero.jpg';

// Standard row heights for stacking maths
const R = {
  ad:      400,
  page:    440,
  email:   460,
  phone:   400,
  webinar: 330,
  tag:     70,
  dest:    100,
};

const SEED_NODES: any[] = [
  // ========= Column headers =========
  ...COLUMNS.map(c => ({
    id: `col-${c.i}`,
    type: 'colLabel',
    position: { x: col(c.i), y: COL_LABEL_Y },
    data: { label: c.label, index: c.i },
    draggable: false,
    selectable: false,
    connectable: false,
  })),

  // ========= C0 · Ads =========
  { id: 'ad-meta',    type: 'ad', position: { x: col(0), y: 0 },                      data: { kind: 'ad', label: 'AI Insiders — Cold',   platform: 'Meta', image: AD_IMAGE, headline: 'AI Insiders — Free Briefing', primaryText: 'The 3 AI workflows quietly replacing entire marketing teams. Free 60-min briefing. Seats limited.', cta: 'Sign Up',      spend: 420, leads: 68,  cpl: 6.18 } },
  { id: 'ad-ig',      type: 'ad', position: { x: col(0), y: R.ad + SP.huge },         data: { kind: 'ad', label: 'IG Retarget',          platform: 'Meta', image: AD_IMAGE, headline: 'Still thinking about it?',     primaryText: 'You looked, you left. The AI Insiders briefing starts tomorrow. Last call.',                   cta: 'Save My Seat', spend: 180, leads: 41,  cpl: 4.39 } },
  { id: 'ad-organic', type: 'ad', position: { x: col(0), y: (R.ad + SP.huge) * 2 },   data: { kind: 'ad', label: 'Kit broadcast',        platform: 'Kit',  image: AD_IMAGE, headline: 'List broadcast · AI Insiders', primaryText: "Broadcast to Luke's subscriber list announcing the free AI Insiders briefing tomorrow.",       cta: 'Open',         spend: 0,   leads: 112, cpl: 0    } },

  // ========= C1 · Capture Page =========
  { id: 'pg-optin', type: 'page', position: { x: col(1), y: 0 },
    data: {
      kind: 'page', label: 'Capture Page',
      url: 'aureumfunnels.com/luke/optin',
      openHref: '/funnels/luke-alexander/optin/index.html',
      views: 1240, clicks: 221, conversionPct: 17.8, cta: 'SAVE MY SEAT',
      pixelEvents: [
        { name: 'PageView', trigger: 'on load' },
        { name: 'Lead',     trigger: 'on opt-in', value: '$6' },
      ],
    },
  },

  // ========= C2 · Opt-in events =========
  // Tags: tight pair at top (12px gap)
  { id: 'tag-lead', type: 'tag', position: { x: col(2), y: 0 },                   data: { kind: 'tag', platform: 'GHL', label: 'ai-insiders-lead', trigger: 'on opt-in' } },
  { id: 'tag-kit',  type: 'tag', position: { x: col(2), y: R.tag + SP.md },       data: { kind: 'tag', platform: 'Kit', label: 'AI Insiders',      trigger: 'on opt-in' } },

  // Welcome messages: generous gap after tags (64px), siblings at 32px
  { id: 'msg-welcome-email', type: 'email',    position: { x: col(2), y: (R.tag * 2) + SP.md + SP.huge },                         data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: "You're in — AI Insiders briefing details inside",
    body: `Hey {{first_name}},

You're locked in for the AI Insiders briefing tomorrow. Here's everything you need:

📅  When: Tomorrow at 3pm ET
🔗  Join: [ AI Insiders Briefing → ]
⏱   Duration: 60 minutes

Save this. Add it to your calendar. See you inside.

— Luke`,
    trigger: 'on opt-in', sendingFrom: 'Kit', sent: 221, openedPct: 68, clickedPct: 42,
  } },
  { id: 'msg-welcome-sms', type: 'sms',        position: { x: col(2), y: (R.tag * 2) + SP.md + SP.huge + R.email + SP.xxl },         data: {
    kind: 'sms', contactName: 'Luke Alexander',
    body: `Hey, Luke here 👋

You're in for tomorrow's AI Insiders briefing — 3pm ET.

Save this link:
aiinsiders.com/join

Reply STOP to opt out.`,
    trigger: 'on opt-in', sendingFrom: 'Twilio', sent: 198, clickedPct: 31, time: '9:41',
  } },
  { id: 'msg-welcome-tg', type: 'telegram',    position: { x: col(2), y: (R.tag * 2) + SP.md + SP.huge + R.email + SP.xxl + R.phone + SP.xxl }, data: {
    kind: 'telegram', botName: 'AI Insiders', botSubtitle: 'channel · 1 240 subscribers',
    body: `Welcome to AI Insiders 🎯

Join the private channel for behind-the-scenes drops:
t.me/aiinsiders

Briefing kicks off tomorrow at 3pm ET.`,
    trigger: 'on opt-in', sent: 174, clickedPct: 58, time: '9:41',
  } },

  // ========= C3 · Reminders =========
  { id: 'msg-24h',  type: 'email', position: { x: col(3), y: 0 },                                                 data: { kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me', subject: 'Tomorrow · AI Insiders briefing (save your seat)', body: `{{first_name}} —

Quick reminder: the AI Insiders briefing is tomorrow at 3pm ET.

If you haven't blocked your calendar, do it now.

Join here: [ AI Insiders Briefing → ]

— Luke`, trigger: 'T-24h', sendingFrom: 'Kit', sent: 221, openedPct: 54, clickedPct: 28 } },
  { id: 'msg-1h',   type: 'email', position: { x: col(3), y: R.email + SP.xxl },                                  data: { kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me', subject: '1 hour · final reminder', body: `{{first_name}} —

60 minutes out. Make sure you're at your desk, bring questions, and grab a notepad.

Join: [ AI Insiders Briefing → ]

— Luke`, trigger: 'T-1h', sendingFrom: 'Kit', sent: 221, openedPct: 62, clickedPct: 36 } },
  { id: 'msg-live', type: 'sms',   position: { x: col(3), y: (R.email + SP.xxl) * 2 },                            data: { kind: 'sms', contactName: 'Luke Alexander', body: `We're LIVE.

Tap to join:
aiinsiders.com/join

(Starts in 2 min — don't wait.)`, trigger: 'T-0', sendingFrom: 'Twilio', sent: 198, clickedPct: 71, time: '3:00' } },

  // ========= C4 · Webinar =========
  { id: 'webinar', type: 'webinar', position: { x: col(4), y: 0 }, data: {
    kind: 'webinar', platform: 'WebinarJam',
    title: 'AI Insiders Briefing',
    date: 'Apr 19, 2026', time: '3:00 PM ET', duration: '60 min',
    registered: 221, showRate: 64,
  } },

  // ========= C5 · SLO =========
  { id: 'pg-slo', type: 'page', position: { x: col(5), y: 0 }, data: {
    kind: 'page', label: 'SLO Page',
    url: 'aureumfunnels.com/luke/slo',
    openHref: '/funnels/luke-alexander/slo/index.html',
    views: 221, clicks: 34, conversionPct: 15.4, cta: 'GET ACCESS',
    pixelEvents: [
      { name: 'PageView', trigger: 'on load' },
      { name: 'Purchase', trigger: 'on checkout', value: '$47' },
    ],
  } },

  // ========= C6 · Purchase events =========
  { id: 'tag-buyer', type: 'tag', position: { x: col(6), y: 0 }, data: {
    kind: 'tag', platform: 'GHL', label: 'ai-insiders-buyer', trigger: 'on purchase',
  } },
  { id: 'msg-slo-receipt', type: 'email', position: { x: col(6), y: R.tag + SP.huge }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Your AI Insiders access is confirmed',
    body: `{{first_name}} —

You're in. Your AI Insiders access is active and the replay library is now unlocked.

Access your portal: [ AI Insiders Portal → ]

Inside you'll find:
•  Full briefing replay
•  Workflow blueprints
•  Prompt library + automation templates

Welcome aboard.

— Luke`,
    trigger: 'on purchase', sendingFrom: 'Kit', sent: 34, openedPct: 88, clickedPct: 61,
  } },

  // ========= C7 · Thank You =========
  { id: 'pg-ty', type: 'page', position: { x: col(7), y: 0 }, data: {
    kind: 'page', label: 'Thank You',
    url: 'aureumfunnels.com/luke/ty',
    openHref: '/funnels/luke-alexander/thank-you/index.html',
    views: 221, clicks: 198, conversionPct: 89.6, cta: 'VIEW REPLAY',
    pixelEvents: [
      { name: 'PageView', trigger: 'on load' },
    ],
  } },

  // ========= C8 · Replay =========
  { id: 'msg-ty-replay', type: 'email', position: { x: col(8), y: 0 }, data: {
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
  } },

  // ========= C9 · Destinations =========
  // Stacked tight (related group, 24px apart)
  { id: 'dest-supabase', type: 'destination', position: { x: col(9), y: 0 },                        data: { kind: 'destination', platform: 'Supabase', label: 'Supabase',    action: 'INSERT funnel_leads' } },
  { id: 'dest-kit',      type: 'destination', position: { x: col(9), y: (R.dest + SP.xl) * 1 },     data: { kind: 'destination', platform: 'Kit',      label: 'Kit',         action: 'POST /subscribers' } },
  { id: 'dest-close',    type: 'destination', position: { x: col(9), y: (R.dest + SP.xl) * 2 },     data: { kind: 'destination', platform: 'Close',    label: 'Close CRM',   action: 'POST /lead → pipeline' } },
  { id: 'dest-ghl',      type: 'destination', position: { x: col(9), y: (R.dest + SP.xl) * 3 },     data: { kind: 'destination', platform: 'GHL',      label: 'GoHighLevel', action: 'upsert contact + tag' } },
];

// =============================================================================
// Edges
// =============================================================================

const labelTheme = {
  labelStyle: { fill: INK.textMuted, fontSize: TYPE.body - 1 },
  labelBgStyle: { fill: INK.surface },
  labelBgPadding: [SP.xs, 2] as [number, number],
  labelBgBorderRadius: 4,
};
const arrow = (c: string) => ({ type: MarkerType.ArrowClosed, color: c });
const spine     = () => ({ style: { stroke: INK.wireHi, strokeWidth: 1.5 }, animated: true,  markerEnd: arrow(INK.wireHi), ...labelTheme });
const solid     = () => ({ style: { stroke: INK.wire,   strokeWidth: 1.3 }, animated: false, markerEnd: arrow(INK.wire),   ...labelTheme });
const triggered = () => ({ style: { stroke: INK.wire,   strokeWidth: 1.1, strokeDasharray: '4 4' }, animated: false, markerEnd: arrow(INK.wire), ...labelTheme });

const SEED_EDGES: any[] = [
  // Spine
  { id: 'sp-ad-meta',       source: 'ad-meta',    target: 'pg-optin',      label: 'CPL $6.18',        ...spine() },
  { id: 'sp-ad-ig',         source: 'ad-ig',      target: 'pg-optin',      label: 'CPL $4.39',        ...spine() },
  { id: 'sp-ad-organic',    source: 'ad-organic', target: 'pg-optin',      label: 'organic',          ...spine() },
  { id: 'sp-optin-webinar', source: 'pg-optin',   target: 'webinar',       label: 'registers',        ...spine() },
  { id: 'sp-webinar-slo',   source: 'webinar',    target: 'pg-slo',        label: 'post-event offer', ...spine() },
  { id: 'sp-slo-ty',        source: 'pg-slo',     target: 'pg-ty',         label: '15.4% CVR',        ...spine() },
  { id: 'sp-ty-replay',     source: 'pg-ty',      target: 'msg-ty-replay', label: 'T+24h',            ...spine() },

  // Page → Tags
  { id: 'e-optin-tag-lead', source: 'pg-optin', sourceHandle: 'trigger', target: 'tag-lead', ...triggered() },
  { id: 'e-optin-tag-kit',  source: 'pg-optin', sourceHandle: 'trigger', target: 'tag-kit',  ...triggered() },

  // Tags → Messages
  { id: 'e-tag-welcome-email', source: 'tag-kit',  target: 'msg-welcome-email', ...triggered() },
  { id: 'e-tag-welcome-sms',   source: 'tag-lead', target: 'msg-welcome-sms',   ...triggered() },
  { id: 'e-tag-welcome-tg',    source: 'tag-lead', target: 'msg-welcome-tg',    ...triggered() },
  { id: 'e-tag-24h',           source: 'tag-kit',  target: 'msg-24h',           ...triggered() },
  { id: 'e-tag-1h',            source: 'tag-kit',  target: 'msg-1h',            ...triggered() },
  { id: 'e-tag-live',          source: 'tag-lead', target: 'msg-live',          ...triggered() },

  // SLO → Buyer tag → receipt
  { id: 'e-slo-tag-buyer', source: 'pg-slo',    sourceHandle: 'trigger', target: 'tag-buyer',        ...triggered() },
  { id: 'e-tag-receipt',   source: 'tag-buyer', target: 'msg-slo-receipt', ...triggered() },

  // Destinations
  { id: 'e-taglead-supa',  source: 'tag-lead',  sourceHandle: 'dest', target: 'dest-supabase', ...solid() },
  { id: 'e-tagkit-kit',    source: 'tag-kit',   sourceHandle: 'dest', target: 'dest-kit',      ...solid() },
  { id: 'e-taglead-close', source: 'tag-lead',  sourceHandle: 'dest', target: 'dest-close',    ...solid() },
  { id: 'e-taglead-ghl',   source: 'tag-lead',  sourceHandle: 'dest', target: 'dest-ghl',      ...solid() },
  { id: 'e-tagbuyer-ghl',  source: 'tag-buyer', sourceHandle: 'dest', target: 'dest-ghl',      ...solid() },
  { id: 'e-tagbuyer-close',source: 'tag-buyer', sourceHandle: 'dest', target: 'dest-close',    ...solid() },
];

// =============================================================================
// Stats — single row, dividers, varied emphasis
// =============================================================================

interface Stats { adSpend: number; leads: number; cpl: number; sales: number; revenue: number; roas: number }

const useFunnelStats = (): Stats => {
  // TODO: Meta Ads API (spend/leads/CPL) + Whop API (sales/revenue)
  const adSpend = 600, leads = 221;
  const cpl = +(adSpend / leads).toFixed(2);
  const sales = 34, revenue = sales * 47;
  const roas = +(revenue / adSpend).toFixed(2);
  return { adSpend, leads, cpl, sales, revenue, roas };
};

const StatItem: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div style={{
    flex: 1, minWidth: 0,
    padding: `${SP.md}px ${SP.lg}px`,
    display: 'flex', flexDirection: 'column', gap: SP.xs,
  }}>
    <div style={{ ...labelStyle }}>{label}</div>
    <div style={{
      fontSize: TYPE.display, fontWeight: 600,
      color: accent ? INK.accent : INK.text,
      fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3,
      lineHeight: 1,
    }}>
      {value}
    </div>
  </div>
);

const StatsBar: React.FC<{ stats: Stats }> = ({ stats }) => {
  const divider = <div style={{ width: 1, alignSelf: 'stretch', background: INK.border }} />;
  return (
    <div style={{
      display: 'flex',
      background: INK.surface,
      border: `1px solid ${INK.border}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <StatItem label="Ad spend" value={`$${stats.adSpend.toLocaleString()}`} />
      {divider}
      <StatItem label="Leads"    value={stats.leads.toLocaleString()} />
      {divider}
      <StatItem label="CPL"      value={`$${stats.cpl.toFixed(2)}`} />
      {divider}
      <StatItem label="Sales"    value={stats.sales.toLocaleString()} />
      {divider}
      <StatItem label="Revenue"  value={`$${stats.revenue.toLocaleString()}`} accent />
      {divider}
      <StatItem label="ROAS"     value={`${stats.roas.toFixed(2)}x`} accent />
    </div>
  );
};

// =============================================================================
// Main
// =============================================================================

interface Props { storagePrefix: string }

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
    <div className="flex-1 min-h-0 flex flex-col" style={{ gap: SP.md }}>
      <StatsBar stats={stats} />

      <div
        className="flex-1 min-h-0 rounded-xl overflow-hidden border relative"
        style={{ background: INK.bg, borderColor: INK.border }}
      >
        <div style={{ position: 'absolute', top: SP.md, right: SP.md, zIndex: 10 }}>
          <button
            onClick={toggleMetrics}
            style={{
              padding: `${SP.xs + 2}px ${SP.md}px`,
              borderRadius: 6,
              fontSize: TYPE.body,
              fontWeight: 500,
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
          minZoom={0.05}
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
            maskColor="rgba(0,0,0,0.72)"
            style={{ background: INK.surface, border: `1px solid ${INK.border}` }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default LukeFlowView;
