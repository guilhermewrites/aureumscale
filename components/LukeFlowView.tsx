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
  Node,
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
  Target,
  Wifi,
  BatteryFull,
  Signal,
  ChevronLeft,
  ExternalLink,
  Video,
  PlayCircle,
  Calendar,
  ArrowRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from 'lucide-react';

// =============================================================================
// Design tokens
// =============================================================================

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
  wire:       '#2a2a2a',
  wireHi:     '#4a4a4a',
  selection:  '#9ee6a8',
};

const BRAND = {
  meta:     '#1877f2',
  telegram: '#6AB3F3',
};

const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64, jumbo: 96 };

const TYPE = {
  label:   9,
  body:    11,
  title:   13,
  display: 20,
};

const W = {
  primary: 320,
  phone:   280,
  tag:     260,
};

// Horizontal grid
const STRIDE = 520;
const col = (i: number) => i * STRIDE;

// Vertical bands
const Y = {
  spine:    0,
  tagBand:  520,
  msgBand:  680,
};

// Row heights (for stacking maths)
const R = {
  ad:      400,
  page:    440,
  email:   460,
  phone:   400,
  webinar: 330,
  tag:     150,
};

// Column intent (reference only — no longer rendered as headers):
// 00 Traffic · 01 Capture · 02 Opt-in·phone · 03 Opt-in·email · 04 Reminders
// 05 Live event · 06 Offer · 07 Purchase·SLO · 08 Recovery·SLO · 09 Confirmation
// 10 Main offer · 11 Purchase·Main · 12 Recovery·Main · 13 Post-event

// =============================================================================
// Types
// =============================================================================

type Platform = 'Close' | 'Kit' | 'Meta' | 'Telegram' | 'Twilio' | 'Supabase' | 'WebinarJam' | 'Calendly';

interface PixelEvent { name: string; trigger: string; value?: string }

interface AdNodeData {
  kind: 'ad'; label: string; platform: Platform; image: string;
  headline: string; primaryText: string; cta: string;
  spend: number; leads: number; cpl: number;
  variant?: 'reach';
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
  syncsTo: Platform[];
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
  fontSize: TYPE.label, fontWeight: 600, letterSpacing: 0.8,
  textTransform: 'uppercase', color: INK.textMuted,
};
const metaText: React.CSSProperties = {
  fontSize: TYPE.body - 1, color: INK.textMuted, fontVariantNumeric: 'tabular-nums',
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

const ChannelStrip: React.FC<{ icon: React.ReactNode; title: string; trigger: string }> = ({ icon, title, trigger }) => (
  <div style={{
    padding: `${SP.sm - 1}px ${SP.md}px`,
    background: INK.surfaceHi,
    borderBottom: `1px solid ${INK.border}`,
    display: 'flex', alignItems: 'center', gap: SP.sm,
  }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: SP.sm, ...labelStyle }}>
      {icon}{title}
    </span>
    <span style={{ marginLeft: 'auto' }}><TriggerPill trigger={trigger} /></span>
  </div>
);

const FooterRow: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div style={{
    padding: `${SP.sm}px ${SP.md}px`, display: 'flex', gap: SP.lg,
    borderTop: `1px solid ${INK.border}`, background: INK.bgSoft, ...metaText,
  }}>{children}</div>
);

// =============================================================================
// Ad node
// =============================================================================

const AdNode = memo<NodeProps<AdNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  const isReach = data.variant === 'reach';
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
          <div style={{ fontSize: TYPE.label, color: INK.textMuted }}>
            Sponsored · {data.platform}{isReach ? ' · Reach' : ''}
          </div>
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
        borderTop: `1px solid ${INK.border}`,
        borderBottom: `1px solid ${INK.border}`,
        filter: 'saturate(0.75)',
      }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: SP.sm,
        padding: `${SP.sm + 2}px ${SP.md}px`, background: INK.surfaceHi,
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
          <span>{data.leads} {isReach ? 'reached' : 'leads'}</span>
          {!isReach && <span style={{ color: INK.accent, marginLeft: 'auto' }}>CPL ${data.cpl.toFixed(2)}</span>}
          {isReach && <span style={{ color: INK.accent, marginLeft: 'auto' }}>T-48h</span>}
        </FooterRow>
      )}
      <Handle type="source" position={Position.Right} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="trigger" style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
AdNode.displayName = 'AdNode';

// =============================================================================
// Page node
// =============================================================================

const PageNode = memo<NodeProps<PageNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={W.primary}>
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />

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
// Email node
// =============================================================================

const EmailNode = memo<NodeProps<EmailNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  const initial = data.fromName[0]?.toUpperCase() || 'L';
  return (
    <NodeShell width={W.primary}>
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <ChannelStrip icon={<Mail size={11} />} title={`Email · ${data.sendingFrom}`} trigger={data.trigger} />

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
      <Handle type="source" position={Position.Bottom} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
EmailNode.displayName = 'EmailNode';

// =============================================================================
// SMS node
// =============================================================================

const SmsNode = memo<NodeProps<SmsNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={W.phone}>
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 8, height: 8 }} />
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
      <Handle type="source" position={Position.Bottom} style={{ background: INK.wireHi, width: 8, height: 8 }} />
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
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 8, height: 8 }} />
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
      <Handle type="source" position={Position.Bottom} style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
TelegramNode.displayName = 'TelegramNode';

// =============================================================================
// Tag node
// =============================================================================

// Actual price-tag shape: pentagonal body with a pointed left tip and a
// grommet hole near the tip (drawn via SVG so we get a proper stroked outline
// that follows the shape)
const TagNode = memo<NodeProps<TagNodeData>>(({ data }) => {
  const tipInset = 18;   // how far the V-cut goes in
  const hole     = 5;    // grommet dot radius * 2 visually
  const padL     = 26;   // left padding to clear the tip + hole
  return (
    <div style={{
      width: W.tag,
      position: 'relative',
      color: INK.text,
      fontSize: TYPE.body,
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: INK.wireHi, width: 7, height: 7 }} />

      {/* Tag body + outline — SVG so the stroke follows the pentagonal shape */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        preserveAspectRatio="none"
        viewBox={`0 0 ${W.tag} 100`}
      >
        <path
          d={`M ${tipInset} 1 L ${W.tag - 1} 1 L ${W.tag - 1} 99 L ${tipInset} 99 L 1 50 Z`}
          fill={INK.surface}
          stroke={INK.borderHi}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Grommet hole */}
        <circle cx={9} cy={50} r={3} fill={INK.bg} stroke={INK.borderHi} strokeWidth={0.75} vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Content overlay */}
      <div style={{
        position: 'relative',
        padding: `${SP.sm + 2}px ${SP.md}px ${SP.sm + 2}px ${padL}px`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.xs + 1, marginBottom: SP.xs }}>
          <TagIcon size={10} color={INK.textMuted} />
          <span style={{ ...labelStyle, fontSize: TYPE.label - 1 }}>{data.platform} · tag</span>
        </div>

        {/* Tag name — the actual label, rendered like a hashtag */}
        <div style={{
          fontSize: TYPE.title,
          fontWeight: 700,
          color: INK.text,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          letterSpacing: -0.2,
          lineHeight: 1.2,
          marginBottom: 3,
          wordBreak: 'break-word',
        }}>
          <span style={{ color: INK.textSubtle, marginRight: 1 }}>#</span>{data.label}
        </div>

        <div style={{ ...metaText, fontSize: TYPE.label }}>{data.trigger}</div>

        {data.syncsTo.length > 0 && (
          <div style={{
            marginTop: SP.sm,
            paddingTop: SP.sm - 2,
            borderTop: `1px dashed ${INK.borderHi}`,
          }}>
            <div style={{
              ...labelStyle, fontSize: TYPE.label - 1,
              display: 'flex', alignItems: 'center', gap: SP.xs,
              marginBottom: SP.xs + 1,
            }}>
              <ArrowRight size={9} />Syncs to
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs }}>
              {data.syncsTo.map(p => (
                <span key={p} style={{
                  fontSize: TYPE.label,
                  padding: `2px ${SP.sm - 1}px`,
                  background: INK.surfaceHi,
                  border: `1px solid ${INK.border}`,
                  borderRadius: 3,
                  color: INK.text,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}>{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
TagNode.displayName = 'TagNode';

// =============================================================================
// Webinar node
// =============================================================================

const WebinarNode = memo<NodeProps<WebinarNodeData>>(({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <NodeShell width={W.primary}>
      <Handle type="target" position={Position.Left} style={{ background: INK.wireHi, width: 8, height: 8 }} />
      <div style={{
        padding: `${SP.sm}px ${SP.md}px`, background: INK.surfaceHi,
        borderBottom: `1px solid ${INK.border}`, display: 'flex',
        alignItems: 'center', gap: SP.sm, ...labelStyle,
      }}>
        <Video size={11} />WebinarJam · Live event
      </div>

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
      <Handle type="source" position={Position.Bottom} id="trigger" style={{ background: INK.wireHi, width: 8, height: 8 }} />
    </NodeShell>
  );
});
WebinarNode.displayName = 'WebinarNode';

const nodeTypes = {
  ad: AdNode,
  page: PageNode,
  email: EmailNode,
  sms: SmsNode,
  telegram: TelegramNode,
  tag: TagNode,
  webinar: WebinarNode,
};

// =============================================================================
// SEED_NODES
// =============================================================================

const AD_IMAGE = '/funnels/luke-alexander/hero.jpg';

// Default node sizes used when measured sizes aren't available yet
const defaultSize = (kind: string) => {
  switch (kind) {
    case 'ad':       return { w: W.primary, h: R.ad };
    case 'page':     return { w: W.primary, h: R.page };
    case 'email':    return { w: W.primary, h: R.email };
    case 'sms':      return { w: W.phone,   h: R.phone };
    case 'telegram': return { w: W.phone,   h: R.phone };
    case 'tag':      return { w: W.tag,     h: R.tag };
    case 'webinar':  return { w: W.primary, h: R.webinar };
    default:         return { w: W.primary, h: 100 };
  }
};

// Real page sequence of this funnel:
//   Capture → SLO → Whop checkout → Thank You → Live Webinar → Main Offer Checkout
//
// Column layout (L→R):
//   00 Traffic · 01 Capture · 02 Opt-in · phone · 03 Opt-in · email
//   04 Offer (SLO) · 05 Whop checkout · 06 Purchase · SLO · 07 Recovery · SLO
//   08 Confirmation (Thank You) · 09 Reminders · 10 Live event + Replay
//   11 Main offer checkout · 12 Purchase · Main · 13 Recovery · Main

const SEED_NODES: any[] = [
  // ==========================================================================
  // C0 · Traffic — 3 ads
  // ==========================================================================
  { id: 'ad-meta',    type: 'ad', position: { x: col(0), y: Y.spine },                         data: { kind: 'ad', label: 'Cold',          platform: 'Meta', image: AD_IMAGE, headline: 'AI Insiders — Free Briefing', primaryText: 'The 3 AI workflows quietly replacing entire marketing teams. Free 60-min briefing.', cta: 'Sign Up',      spend: 420, leads: 68,  cpl: 6.18 } },
  { id: 'ad-ig',      type: 'ad', position: { x: col(0), y: Y.spine + R.ad + SP.huge },        data: { kind: 'ad', label: 'IG Retarget',   platform: 'Meta', image: AD_IMAGE, headline: 'Still thinking about it?',     primaryText: 'You looked, you left. The AI Insiders briefing starts tomorrow. Last call.',       cta: 'Save My Seat', spend: 180, leads: 41,  cpl: 4.39 } },
  { id: 'ad-organic', type: 'ad', position: { x: col(0), y: Y.spine + (R.ad + SP.huge) * 2 },  data: { kind: 'ad', label: 'Kit broadcast', platform: 'Kit',  image: AD_IMAGE, headline: 'List broadcast',               primaryText: "Broadcast to Luke's subscriber list announcing the free AI Insiders briefing.",    cta: 'Open',         spend: 0,   leads: 112, cpl: 0    } },

  // ==========================================================================
  // C1 · Capture
  // ==========================================================================
  { id: 'pg-optin', type: 'page', position: { x: col(1), y: Y.spine }, data: {
    kind: 'page', label: 'Capture Page', url: 'aureumfunnels.com/luke/optin',
    openHref: '/funnels/luke-alexander/optin/index.html',
    views: 1240, clicks: 221, conversionPct: 17.8, cta: 'SAVE MY SEAT',
    pixelEvents: [
      { name: 'PageView', trigger: 'on load' },
      { name: 'Lead',     trigger: 'on opt-in', value: '$6' },
    ],
  } },

  // ==========================================================================
  // C2 · Opt-in · phone
  // ==========================================================================
  { id: 'tag-lead', type: 'tag', position: { x: col(2), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'Close', label: 'ai-insiders-lead', trigger: 'on opt-in',
    syncsTo: ['Supabase', 'Close'],
  } },
  { id: 'msg-welcome-sms', type: 'sms', position: { x: col(2), y: Y.msgBand }, data: {
    kind: 'sms', contactName: 'Luke Alexander',
    body: `Hey, Luke here 👋

You're in for tomorrow's AI Insiders briefing — 3pm ET.

Save this link:
aiinsiders.com/join

Reply STOP to opt out.`,
    trigger: 'on opt-in', sendingFrom: 'Twilio', sent: 198, clickedPct: 31, time: '9:41',
  } },
  { id: 'msg-welcome-tg', type: 'telegram', position: { x: col(2), y: Y.msgBand + R.phone + SP.xxl }, data: {
    kind: 'telegram', botName: 'AI Insiders', botSubtitle: 'channel · 1 240 subscribers',
    body: `Welcome to AI Insiders 🎯

Join the private channel for behind-the-scenes drops:
t.me/aiinsiders

Briefing kicks off tomorrow at 3pm ET.`,
    trigger: 'on opt-in', sent: 174, clickedPct: 58, time: '9:41',
  } },

  // ==========================================================================
  // C3 · Opt-in · email — 3-email welcome sequence
  // ==========================================================================
  { id: 'tag-kit', type: 'tag', position: { x: col(3), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'Kit', label: 'AI Insiders', trigger: 'on opt-in',
    syncsTo: ['Kit', 'Supabase'],
  } },
  { id: 'msg-welcome-1', type: 'email', position: { x: col(3), y: Y.msgBand }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: "You're in — AI Insiders briefing details inside",
    body: `Hey {{first_name}},

You're locked in for the AI Insiders briefing. Here's everything you need:

📅  When: ${'${date}'}
🔗  Join: [ AI Insiders Briefing → ]
⏱   Duration: 60 minutes

Save this email. Add it to your calendar.

— Luke`,
    trigger: 'on opt-in · welcome 1/3', sendingFrom: 'Kit', sent: 221, openedPct: 68, clickedPct: 42,
  } },
  { id: 'msg-welcome-2', type: 'email', position: { x: col(3), y: Y.msgBand + R.email + SP.xxl }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'What you\'ll actually learn at AI Insiders',
    body: `{{first_name}} —

Quick preview of what I'm unpacking at the briefing:

1. The content-to-client workflow that replaced a 6-person team
2. How to use AI in your sales calls without sounding robotic
3. The 30-minute daily AI routine that compounds

If any of these feel relevant, you're in the right place.

— Luke`,
    trigger: 'T+1d · welcome 2/3', sendingFrom: 'Kit', sent: 221, openedPct: 51, clickedPct: 34,
  } },
  { id: 'msg-welcome-3', type: 'email', position: { x: col(3), y: Y.msgBand + (R.email + SP.xxl) * 2 }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Last prep before the briefing',
    body: `{{first_name}} —

One more thing before we go live: bring a notepad and a specific question.

I'm keeping the Q&A open at the end and I answer the best questions by name.

Join link: [ AI Insiders Briefing → ]

See you inside.

— Luke`,
    trigger: 'T+2d · welcome 3/3', sendingFrom: 'Kit', sent: 221, openedPct: 58, clickedPct: 39,
  } },

  // ==========================================================================
  // C4 · Offer (SLO page) — user opts in, clicks through to SLO
  // ==========================================================================
  { id: 'pg-slo', type: 'page', position: { x: col(4), y: Y.spine }, data: {
    kind: 'page', label: 'SLO Page', url: 'aureumfunnels.com/luke/slo',
    openHref: '/funnels/luke-alexander/slo/index.html',
    views: 1100, clicks: 221, conversionPct: 20.1, cta: 'CONTINUE TO CHECKOUT',
    pixelEvents: [
      { name: 'PageView',    trigger: 'on load' },
      { name: 'ViewContent', trigger: 'on scroll to offer' },
    ],
  } },

  // ==========================================================================
  // C5 · Whop checkout — actual payment happens here
  // ==========================================================================
  { id: 'pg-whop', type: 'page', position: { x: col(5), y: Y.spine }, data: {
    kind: 'page', label: 'Whop Checkout', url: 'whop.com/ai-insiders-toolkit',
    openHref: 'https://whop.com',
    views: 221, clicks: 34, conversionPct: 15.4, cta: 'COMPLETE PURCHASE',
    pixelEvents: [
      { name: 'PageView',         trigger: 'on load' },
      { name: 'InitiateCheckout', trigger: 'on load',              value: '$47' },
      { name: 'Purchase',         trigger: 'on successful payment', value: '$47' },
    ],
  } },

  // ==========================================================================
  // C6 · Purchase · SLO — receipt + Calendly booking
  // ==========================================================================
  { id: 'tag-buyer', type: 'tag', position: { x: col(6), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'Close', label: 'ai-insiders-buyer', trigger: 'on Whop purchase',
    syncsTo: ['Close', 'Supabase', 'Kit'],
  } },
  { id: 'msg-slo-receipt', type: 'email', position: { x: col(6), y: Y.msgBand }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Your AI Insiders access is confirmed',
    body: `{{first_name}} —

You're in. Your AI Insiders access is active and the replay library is unlocked.

Access your portal: [ AI Insiders Portal → ]

You also got a call with me as part of buying — booking link is in the next email.

— Luke`,
    trigger: 'on purchase', sendingFrom: 'Kit', sent: 34, openedPct: 88, clickedPct: 61,
  } },
  { id: 'msg-calendly-email', type: 'email', position: { x: col(6), y: Y.msgBand + R.email + SP.xxl }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Book your AI Insiders strategy session, {{first_name}}',
    body: `{{first_name}} —

You just secured your spot in AI Insiders — which means you've also earned a 1-on-1 strategy session with an expert from our team. It's included with what you paid for.

Grab your slot here:
https://calendly.com/d/ctyk-fnj-nr6/ai-toolkit-strategy-session-

Heads up: the team's calendar is going to be slammed over the next week — everyone who just joined is trying to book. If you want a good time (and you want to actually get one this week), lock it in the next 24-48 hours before slots disappear.

Looking forward to it, {{first_name}}.

— Luke`,
    trigger: 'T+5min post-purchase', sendingFrom: 'Kit', sent: 34, openedPct: 91, clickedPct: 74,
  } },
  { id: 'msg-calendly-sms', type: 'sms', position: { x: col(6), y: Y.msgBand + (R.email + SP.xxl) * 2 }, data: {
    kind: 'sms', contactName: 'Luke Alexander',
    body: `{{first_name}} — Luke here 👊

Your AI Insiders 1-on-1 strategy session is unlocked. Book it now before the team calendar fills up this week:

https://calendly.com/d/ctyk-fnj-nr6/ai-toolkit-strategy-session-

Grab an early slot, {{first_name}} — the next 48h will be packed.`,
    trigger: 'T+30min post-purchase', sendingFrom: 'Twilio', sent: 34, clickedPct: 62, time: '3:45',
  } },

  // ==========================================================================
  // C7 · Recovery · SLO — abandon tag + recovery email + SMS
  // ==========================================================================
  { id: 'tag-slo-abandoned', type: 'tag', position: { x: col(7), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'Close', label: 'slo-abandoned', trigger: 'InitiateCheckout w/o Purchase',
    syncsTo: ['Close', 'Supabase'],
  } },
  { id: 'msg-slo-recovery-email', type: 'email', position: { x: col(7), y: Y.msgBand }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Your order is almost done',
    body: `{{first_name}} —

Saw you started checkout for AI Insiders but didn't finish. Happens. 🙂

The briefing + workflow templates + the strategy call are all waiting:
[ Finish your order → ]

If you have a question before you commit, just hit reply.

— Luke`,
    trigger: 'T+1h abandon', sendingFrom: 'Kit', sent: 18, openedPct: 66, clickedPct: 39,
  } },
  { id: 'msg-slo-recovery-sms', type: 'sms', position: { x: col(7), y: Y.msgBand + R.email + SP.xxl }, data: {
    kind: 'sms', contactName: 'Luke Alexander',
    body: `Hey, Luke here. Looks like you stopped mid-checkout for AI Insiders — link's still live:

aiinsiders.com/slo

Text back if you had a question.`,
    trigger: 'T+24h abandon', sendingFrom: 'Twilio', sent: 18, clickedPct: 28, time: '11:20',
  } },

  // ==========================================================================
  // C8 · Confirmation (Thank You) — landed here after Whop success
  // ==========================================================================
  { id: 'pg-ty', type: 'page', position: { x: col(8), y: Y.spine }, data: {
    kind: 'page', label: 'Thank You', url: 'aureumfunnels.com/luke/ty',
    openHref: '/funnels/luke-alexander/thank-you/index.html',
    views: 34, clicks: 34, conversionPct: 100, cta: 'JOIN THE LIVE EVENT',
    pixelEvents: [{ name: 'PageView', trigger: 'on load' }],
  } },

  // ==========================================================================
  // C9 · Reminders — Meta reach ad + 24h/1h emails + live SMS (pre-webinar)
  // ==========================================================================
  { id: 'ad-retarget', type: 'ad', position: { x: col(9), y: Y.tagBand }, data: {
    kind: 'ad', label: 'Reminder (reach)', platform: 'Meta', image: AD_IMAGE, variant: 'reach',
    headline: 'AI Insiders starts in 48h',
    primaryText: 'The briefing you registered for is almost here. Quick reminder to block your calendar and save the link.',
    cta: 'Remind Me',
    spend: 140, leads: 34, cpl: 0,
  } },
  { id: 'msg-24h', type: 'email', position: { x: col(9), y: Y.tagBand + R.ad + SP.xxl }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Tomorrow · AI Insiders briefing',
    body: `{{first_name}} —

Quick reminder: the AI Insiders briefing is tomorrow at 3pm ET.

If you haven't blocked your calendar, do it now.

Join here: [ AI Insiders Briefing → ]

— Luke`,
    trigger: 'T-24h', sendingFrom: 'Kit', sent: 34, openedPct: 79, clickedPct: 52,
  } },
  { id: 'msg-1h', type: 'email', position: { x: col(9), y: Y.tagBand + R.ad + SP.xxl + R.email + SP.xxl }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: '1 hour · final reminder',
    body: `{{first_name}} —

60 minutes out. Make sure you're at your desk, bring questions, and grab a notepad.

Join: [ AI Insiders Briefing → ]

— Luke`,
    trigger: 'T-1h', sendingFrom: 'Kit', sent: 34, openedPct: 82, clickedPct: 64,
  } },
  { id: 'msg-live', type: 'sms', position: { x: col(9), y: Y.tagBand + R.ad + SP.xxl + (R.email + SP.xxl) * 2 }, data: {
    kind: 'sms', contactName: 'Luke Alexander',
    body: `{{first_name}} — we're LIVE.

Tap to join:
aiinsiders.com/join

(Starts in 2 min.)`,
    trigger: 'T-0', sendingFrom: 'Twilio', sent: 34, clickedPct: 88, time: '3:00',
  } },

  // ==========================================================================
  // C10 · Live event — webinar + attended tag + replay email
  // ==========================================================================
  { id: 'webinar', type: 'webinar', position: { x: col(10), y: Y.spine }, data: {
    kind: 'webinar', platform: 'WebinarJam', title: 'AI Insiders Briefing',
    date: 'Apr 19, 2026', time: '3:00 PM ET', duration: '60 min',
    registered: 34, showRate: 82,
  } },
  { id: 'tag-attended', type: 'tag', position: { x: col(10), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'Close', label: 'webinar-attended', trigger: 'on webinar end',
    syncsTo: ['Close', 'Supabase'],
  } },
  { id: 'msg-ty-replay', type: 'email', position: { x: col(10), y: Y.msgBand }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Replay + resources from AI Insiders',
    body: `Hey {{first_name}} —

Here's the full replay and every resource I promised from the briefing:

▶  Full replay: [ Watch → ]
📦  Resource pack: [ Download → ]

Let me know what lands.

— Luke`,
    trigger: 'T+24h post-event', sendingFrom: 'Kit', sent: 34, openedPct: 71, clickedPct: 44,
  } },

  // ==========================================================================
  // C11 · Main offer checkout — pitched during/after the webinar
  // ==========================================================================
  { id: 'pg-main-offer', type: 'page', position: { x: col(11), y: Y.spine }, data: {
    kind: 'page', label: 'Main Offer Checkout', url: 'whop.com/ai-insiders-program',
    openHref: 'https://whop.com',
    views: 28, clicks: 8, conversionPct: 28.6, cta: 'JOIN THE PROGRAM',
    pixelEvents: [
      { name: 'PageView',         trigger: 'on load' },
      { name: 'InitiateCheckout', trigger: 'on load',              value: '$997' },
      { name: 'Purchase',         trigger: 'on successful payment', value: '$997' },
    ],
  } },

  // ==========================================================================
  // C12 · Purchase · Main — onboarding email
  // ==========================================================================
  { id: 'tag-main-buyer', type: 'tag', position: { x: col(12), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'Close', label: 'ai-insiders-main-buyer', trigger: 'on main purchase',
    syncsTo: ['Close', 'Supabase', 'Kit'],
  } },
  { id: 'msg-main-onboarding', type: 'email', position: { x: col(12), y: Y.msgBand }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Welcome to the AI Insiders program',
    body: `{{first_name}} —

Welcome to the program. You're officially in.

Here's what happens next:
1. Your portal login is at [ portal.aiinsiders.com ]
2. Your first kickoff call is scheduled — check your calendar
3. The week-one materials are unlocked in the portal now

Start with the "Install order" video. It sets the sequence.

— Luke`,
    trigger: 'on purchase', sendingFrom: 'Kit', sent: 8, openedPct: 100, clickedPct: 88,
  } },

  // ==========================================================================
  // C13 · Recovery · Main — abandon tag + recovery email + SMS
  // ==========================================================================
  { id: 'tag-main-abandoned', type: 'tag', position: { x: col(13), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'Close', label: 'main-abandoned', trigger: 'InitiateCheckout w/o Purchase',
    syncsTo: ['Close', 'Supabase'],
  } },
  { id: 'msg-main-recovery-email', type: 'email', position: { x: col(13), y: Y.msgBand }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Your enrollment is still open',
    body: `{{first_name}} —

You stepped into checkout for the AI Insiders program and stopped short. Could be anything — wrong time, needed to think, question still unanswered.

I'm around. Hit reply with the question or pick up where you left off:
[ Finish enrollment → ]

— Luke`,
    trigger: 'T+2h abandon', sendingFrom: 'Kit', sent: 3, openedPct: 100, clickedPct: 33,
  } },
  { id: 'msg-main-recovery-sms', type: 'sms', position: { x: col(13), y: Y.msgBand + R.email + SP.xxl }, data: {
    kind: 'sms', contactName: 'Luke Alexander',
    body: `Hey — Luke here. Enrollment for the program is still open on my end. If it was timing, no rush. If it was a question, just text me back.

Link to finish: aiinsiders.com/program`,
    trigger: 'T+24h abandon', sendingFrom: 'Twilio', sent: 3, clickedPct: 33, time: '10:15',
  } },

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
const triggered = () => ({ style: { stroke: INK.wire,   strokeWidth: 1.1, strokeDasharray: '4 4' }, animated: false, markerEnd: arrow(INK.wire), ...labelTheme });

const SEED_EDGES: any[] = [
  // Spine L→R — matches the real page sequence:
  // Ads → Capture → SLO → Whop checkout → Thank You → Webinar → Main Offer Checkout
  { id: 'sp-ad-meta',    source: 'ad-meta',    target: 'pg-optin',      label: 'CPL $6.18',        ...spine() },
  { id: 'sp-ad-ig',      source: 'ad-ig',      target: 'pg-optin',      label: 'CPL $4.39',        ...spine() },
  { id: 'sp-ad-organic', source: 'ad-organic', target: 'pg-optin',      label: 'organic',          ...spine() },
  { id: 'sp-optin-slo',  source: 'pg-optin',   target: 'pg-slo',        label: '20.1% CTR',        ...spine() },
  { id: 'sp-slo-whop',   source: 'pg-slo',     target: 'pg-whop',       label: 'to checkout',      ...spine() },
  { id: 'sp-whop-ty',    source: 'pg-whop',    target: 'pg-ty',         label: 'on purchase',      ...spine() },
  { id: 'sp-ty-webinar', source: 'pg-ty',      target: 'webinar',       label: 'access granted',   ...spine() },
  { id: 'sp-webinar-main', source: 'webinar',  target: 'pg-main-offer', label: 'post-event pitch', ...spine() },

  // Page → Tag (side-effect)
  { id: 'e-optin-tag-lead',   source: 'pg-optin',       sourceHandle: 'trigger', target: 'tag-lead',           ...triggered() },
  { id: 'e-optin-tag-kit',    source: 'pg-optin',       sourceHandle: 'trigger', target: 'tag-kit',            ...triggered() },
  { id: 'e-whop-buyer',       source: 'pg-whop',        sourceHandle: 'trigger', target: 'tag-buyer',          ...triggered() },
  { id: 'e-whop-abandoned',   source: 'pg-whop',        sourceHandle: 'trigger', target: 'tag-slo-abandoned',  ...triggered() },
  { id: 'e-ty-reminders',     source: 'pg-ty',          sourceHandle: 'trigger', target: 'ad-retarget',        ...triggered() },
  { id: 'e-webinar-attended', source: 'webinar',        sourceHandle: 'trigger', target: 'tag-attended',       ...triggered() },
  { id: 'e-main-buyer',       source: 'pg-main-offer',  sourceHandle: 'trigger', target: 'tag-main-buyer',     ...triggered() },
  { id: 'e-main-abandoned',   source: 'pg-main-offer',  sourceHandle: 'trigger', target: 'tag-main-abandoned', ...triggered() },

  // Phone chain (C2) — opt-in
  { id: 'c2-1', source: 'tag-lead',        target: 'msg-welcome-sms', ...triggered() },
  { id: 'c2-2', source: 'msg-welcome-sms', target: 'msg-welcome-tg',  ...triggered() },

  // Email chain (C3) — 3-email welcome sequence
  { id: 'c3-1', source: 'tag-kit',       target: 'msg-welcome-1', ...triggered() },
  { id: 'c3-2', source: 'msg-welcome-1', target: 'msg-welcome-2', ...triggered() },
  { id: 'c3-3', source: 'msg-welcome-2', target: 'msg-welcome-3', ...triggered() },

  // SLO Purchase chain (C6) — receipt → Calendly email → Calendly SMS
  { id: 'c6-1', source: 'tag-buyer',          target: 'msg-slo-receipt',    ...triggered() },
  { id: 'c6-2', source: 'msg-slo-receipt',    target: 'msg-calendly-email', ...triggered() },
  { id: 'c6-3', source: 'msg-calendly-email', target: 'msg-calendly-sms',   ...triggered() },

  // SLO Recovery chain (C7)
  { id: 'c7-1', source: 'tag-slo-abandoned',      target: 'msg-slo-recovery-email', ...triggered() },
  { id: 'c7-2', source: 'msg-slo-recovery-email', target: 'msg-slo-recovery-sms',   ...triggered() },

  // Reminders chain (C9) — fires after Thank You, pre-webinar
  { id: 'c9-1', source: 'ad-retarget', target: 'msg-24h',  ...triggered() },
  { id: 'c9-2', source: 'msg-24h',     target: 'msg-1h',   ...triggered() },
  { id: 'c9-3', source: 'msg-1h',      target: 'msg-live', ...triggered() },

  // Live event (C10) — tag-attended fires replay email
  { id: 'c10-1', source: 'tag-attended', target: 'msg-ty-replay', ...triggered() },

  // Main Purchase (C12)
  { id: 'c12-1', source: 'tag-main-buyer', target: 'msg-main-onboarding', ...triggered() },

  // Main Recovery chain (C13)
  { id: 'c13-1', source: 'tag-main-abandoned',      target: 'msg-main-recovery-email', ...triggered() },
  { id: 'c13-2', source: 'msg-main-recovery-email', target: 'msg-main-recovery-sms',   ...triggered() },
];

// =============================================================================
// Alignment toolbar
// =============================================================================

type AlignOp = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'distH' | 'distV';

const AlignButton: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 30, height: 30, borderRadius: 6,
      background: 'transparent', color: INK.text,
      border: `1px solid transparent`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = INK.surfaceHi; e.currentTarget.style.borderColor = INK.border; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
  >
    {children}
  </button>
);

const AlignToolbar: React.FC<{ count: number; onAlign: (op: AlignOp) => void }> = ({ count, onAlign }) => {
  if (count < 2) return null;
  const divider = <div style={{ width: 1, height: 20, background: INK.border }} />;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SP.sm,
      padding: `${SP.xs + 2}px ${SP.sm}px`,
      background: INK.surface, border: `1px solid ${INK.border}`,
      borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
    }}>
      <span style={{ ...labelStyle, padding: `0 ${SP.xs}px` }}>{count} selected</span>
      {divider}
      <AlignButton title="Align left"   onClick={() => onAlign('left')}>   <AlignStartVertical size={14} /></AlignButton>
      <AlignButton title="Center horiz" onClick={() => onAlign('centerH')}><AlignCenterVertical size={14} /></AlignButton>
      <AlignButton title="Align right"  onClick={() => onAlign('right')}>  <AlignEndVertical size={14} /></AlignButton>
      {divider}
      <AlignButton title="Align top"    onClick={() => onAlign('top')}>    <AlignStartHorizontal size={14} /></AlignButton>
      <AlignButton title="Center vert"  onClick={() => onAlign('centerV')}><AlignCenterHorizontal size={14} /></AlignButton>
      <AlignButton title="Align bottom" onClick={() => onAlign('bottom')}> <AlignEndHorizontal size={14} /></AlignButton>
      {count >= 3 && (
        <>
          {divider}
          <AlignButton title="Distribute horizontally" onClick={() => onAlign('distH')}>
            <AlignHorizontalDistributeCenter size={14} />
          </AlignButton>
          <AlignButton title="Distribute vertically" onClick={() => onAlign('distV')}>
            <AlignVerticalDistributeCenter size={14} />
          </AlignButton>
        </>
      )}
    </div>
  );
};

// =============================================================================
// Stats
// =============================================================================

interface Stats { adSpend: number; leads: number; cpl: number; sales: number; revenue: number; roas: number }

const useFunnelStats = (): Stats => {
  // TODO: Meta Ads API (spend/leads/CPL) + Whop API (sales/revenue)
  const adSpend = 740, leads = 221;
  const cpl = +(adSpend / leads).toFixed(2);
  const sales = 34, revenue = sales * 47 + 8 * 997; // SLO + Main
  const roas = +(revenue / adSpend).toFixed(2);
  return { adSpend, leads, cpl, sales, revenue, roas };
};

const StatItem: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div style={{
    flex: 1, minWidth: 0, padding: `${SP.md}px ${SP.lg}px`,
    display: 'flex', flexDirection: 'column', gap: SP.xs,
  }}>
    <div style={labelStyle}>{label}</div>
    <div style={{
      fontSize: TYPE.display, fontWeight: 600,
      color: accent ? INK.accent : INK.text,
      fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3, lineHeight: 1,
    }}>
      {value}
    </div>
  </div>
);

const StatsBar: React.FC<{ stats: Stats }> = ({ stats }) => {
  const divider = <div style={{ width: 1, alignSelf: 'stretch', background: INK.border }} />;
  return (
    <div style={{
      display: 'flex', background: INK.surface,
      border: `1px solid ${INK.border}`, borderRadius: 12, overflow: 'hidden',
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleMetrics = useCallback(() => {
    setShowMetrics(v => {
      const next = !v;
      setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, __showMetrics: next } })));
      return next;
    });
  }, [setNodes]);

  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
    setSelectedIds(selected.map(n => n.id));
  }, []);

  const alignSelected = useCallback((op: AlignOp) => {
    setNodes(ns => {
      const selected = ns.filter(n => selectedIds.includes(n.id));
      if (selected.length < 2) return ns;

      const sizeOf = (n: Node) => {
        if (n.width && n.height) return { w: n.width, h: n.height };
        return defaultSize(n.type ?? '');
      };

      const bounds = selected.map(n => {
        const { w, h } = sizeOf(n);
        return {
          id: n.id,
          left: n.position.x,
          right: n.position.x + w,
          top: n.position.y,
          bottom: n.position.y + h,
          w, h,
          centerX: n.position.x + w / 2,
          centerY: n.position.y + h / 2,
        };
      });

      const minLeft   = Math.min(...bounds.map(b => b.left));
      const maxRight  = Math.max(...bounds.map(b => b.right));
      const minTop    = Math.min(...bounds.map(b => b.top));
      const maxBottom = Math.max(...bounds.map(b => b.bottom));
      const midX      = (minLeft + maxRight) / 2;
      const midY      = (minTop + maxBottom) / 2;

      const patch: Record<string, { x?: number; y?: number }> = {};

      if (op === 'left')    selected.forEach(n => { patch[n.id] = { x: minLeft }; });
      if (op === 'right')   selected.forEach(n => { const w = sizeOf(n).w; patch[n.id] = { x: maxRight - w }; });
      if (op === 'centerH') selected.forEach(n => { const w = sizeOf(n).w; patch[n.id] = { x: midX - w / 2 }; });
      if (op === 'top')     selected.forEach(n => { patch[n.id] = { y: minTop }; });
      if (op === 'bottom')  selected.forEach(n => { const h = sizeOf(n).h; patch[n.id] = { y: maxBottom - h }; });
      if (op === 'centerV') selected.forEach(n => { const h = sizeOf(n).h; patch[n.id] = { y: midY - h / 2 }; });

      if (op === 'distH' && selected.length >= 3) {
        const sorted = [...bounds].sort((a, b) => a.centerX - b.centerX);
        const first = sorted[0].centerX;
        const last  = sorted[sorted.length - 1].centerX;
        const step  = (last - first) / (sorted.length - 1);
        sorted.forEach((b, i) => {
          const targetCenterX = first + step * i;
          patch[b.id] = { x: targetCenterX - b.w / 2 };
        });
      }
      if (op === 'distV' && selected.length >= 3) {
        const sorted = [...bounds].sort((a, b) => a.centerY - b.centerY);
        const first = sorted[0].centerY;
        const last  = sorted[sorted.length - 1].centerY;
        const step  = (last - first) / (sorted.length - 1);
        sorted.forEach((b, i) => {
          const targetCenterY = first + step * i;
          patch[b.id] = { y: targetCenterY - b.h / 2 };
        });
      }

      return ns.map(n => {
        const p = patch[n.id];
        if (!p) return n;
        return { ...n, position: { x: p.x ?? n.position.x, y: p.y ?? n.position.y } };
      });
    });
  }, [selectedIds, setNodes]);

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ gap: SP.md }}>
      <StatsBar stats={stats} />

      <div
        className="flex-1 min-h-0 rounded-xl overflow-hidden border relative"
        style={{ background: INK.bg, borderColor: INK.border }}
      >
        <div style={{
          position: 'absolute', top: SP.md, right: SP.md, zIndex: 10,
          display: 'flex', gap: SP.sm, alignItems: 'flex-start',
        }}>
          <AlignToolbar count={selectedIds.length} onAlign={alignSelected} />
          <button
            onClick={toggleMetrics}
            style={{
              padding: `${SP.xs + 2}px ${SP.md}px`, borderRadius: 6,
              fontSize: TYPE.body, fontWeight: 500,
              background: INK.surface,
              color: showMetrics ? INK.text : INK.textMuted,
              border: `1px solid ${INK.border}`,
              height: 38,
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
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.04}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          onlyRenderVisibleElements
          nodesDraggable
          nodesConnectable={false}
          panOnScroll
          panOnScrollSpeed={1.8}
          zoomOnScroll={false}
          zoomOnPinch
          zoomActivationKeyCode="Meta"
          panOnDrag
          selectionOnDrag={false}
          selectionKeyCode="Shift"
          multiSelectionKeyCode={['Meta', 'Control']}
          zoomOnDoubleClick={false}
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
