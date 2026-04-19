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
  Wifi,
  BatteryFull,
  Signal,
  ChevronLeft,
  ExternalLink,
  Video,
  PlayCircle,
  Calendar,
  ArrowRight,
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
};

const BRAND = {
  meta:     '#1877f2',
  telegram: '#6AB3F3',
};

// 4pt spacing scale
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64, jumbo: 96 };

// 5-step type scale
const TYPE = {
  label:   9,
  body:    11,
  title:   13,
  display: 20,
};

// Node widths
const W = {
  primary: 320, // ads, pages, emails, webinar
  phone:   280, // sms, telegram
  tag:     260, // tag + destination chips
};

// Horizontal grid — generous stride so columns breathe
const STRIDE = 520;
const col = (i: number) => i * STRIDE;

// Vertical layout bands
const Y = {
  colLabel: -72, // above all cards
  spine:    0,   // page & ad tops
  tagBand:  520, // tags sit below the spine band
  msgBand:  680, // first message beneath tag
};

// Column headers
const COLUMNS: { label: string; i: number }[] = [
  { label: 'Traffic',         i: 0 },
  { label: 'Capture',         i: 1 },
  { label: 'Opt-in · phone',  i: 2 },
  { label: 'Opt-in · email',  i: 3 },
  { label: 'Live event',      i: 4 },
  { label: 'Offer',           i: 5 },
  { label: 'Purchase',        i: 6 },
  { label: 'Confirmation',    i: 7 },
  { label: 'Post-event',      i: 8 },
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
  syncsTo: Platform[]; // destinations the tagged contact is pushed to
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
// Email node — Gmail preview inside neutral chrome
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
// Tag node — now with inline destination chips (no more cross-canvas edges)
// =============================================================================

const TagNode = memo<NodeProps<TagNodeData>>(({ data }) => (
  <div style={{
    width: W.tag, background: INK.surface, border: `1px solid ${INK.border}`,
    borderRadius: 10, color: INK.text, boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  }}>
    <Handle type="target" position={Position.Top} style={{ background: INK.wireHi, width: 7, height: 7 }} />
    <div style={{ padding: `${SP.sm + 2}px ${SP.md}px ${SP.sm}px` }}>
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

    {data.syncsTo.length > 0 && (
      <div style={{
        padding: `${SP.sm}px ${SP.md}px`,
        borderTop: `1px solid ${INK.border}`,
        background: INK.bgSoft,
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
              background: INK.surface,
              border: `1px solid ${INK.border}`,
              borderRadius: 4,
              color: INK.text,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}>{p}</span>
          ))}
        </div>
      </div>
    )}

    <Handle type="source" position={Position.Bottom} style={{ background: INK.wireHi, width: 7, height: 7 }} />
  </div>
));
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
    </NodeShell>
  );
});
WebinarNode.displayName = 'WebinarNode';

// =============================================================================
// Column label node
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
      ...labelStyle, color: INK.text,
      fontSize: TYPE.label + 1, letterSpacing: 1.2,
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
  colLabel: ColumnLabelNode,
};

// =============================================================================
// Row-height reference values (used for stacking maths)
// =============================================================================

const R = {
  ad:      400,
  page:    440,
  email:   460,
  phone:   400,
  webinar: 330,
  tag:     140, // includes "Syncs to" footer
};

const AD_IMAGE = '/funnels/luke-alexander/hero.jpg';

// =============================================================================
// SEED_NODES
// =============================================================================

const SEED_NODES: any[] = [
  // ---- Column headers ----
  ...COLUMNS.map(c => ({
    id: `col-${c.i}`, type: 'colLabel',
    position: { x: col(c.i), y: Y.colLabel },
    data: { label: c.label, index: c.i },
    draggable: false, selectable: false, connectable: false,
  })),

  // ---- C0 · Ads (stacked with huge gaps) ----
  { id: 'ad-meta',    type: 'ad', position: { x: col(0), y: Y.spine },                          data: { kind: 'ad', label: 'Cold',          platform: 'Meta', image: AD_IMAGE, headline: 'AI Insiders — Free Briefing', primaryText: 'The 3 AI workflows quietly replacing entire marketing teams. Free 60-min briefing. Seats limited.', cta: 'Sign Up',      spend: 420, leads: 68,  cpl: 6.18 } },
  { id: 'ad-ig',      type: 'ad', position: { x: col(0), y: Y.spine + R.ad + SP.huge },         data: { kind: 'ad', label: 'IG Retarget',   platform: 'Meta', image: AD_IMAGE, headline: 'Still thinking about it?',     primaryText: 'You looked, you left. The AI Insiders briefing starts tomorrow. Last call.',                   cta: 'Save My Seat', spend: 180, leads: 41,  cpl: 4.39 } },
  { id: 'ad-organic', type: 'ad', position: { x: col(0), y: Y.spine + (R.ad + SP.huge) * 2 },   data: { kind: 'ad', label: 'Kit broadcast', platform: 'Kit',  image: AD_IMAGE, headline: 'List broadcast',               primaryText: "Broadcast to Luke's subscriber list announcing the free AI Insiders briefing.",                cta: 'Open',         spend: 0,   leads: 112, cpl: 0    } },

  // ---- C1 · Capture ----
  { id: 'pg-optin', type: 'page', position: { x: col(1), y: Y.spine },
    data: {
      kind: 'page', label: 'Capture Page', url: 'aureumfunnels.com/luke/optin',
      openHref: '/funnels/luke-alexander/optin/index.html',
      views: 1240, clicks: 221, conversionPct: 17.8, cta: 'SAVE MY SEAT',
      pixelEvents: [
        { name: 'PageView', trigger: 'on load' },
        { name: 'Lead',     trigger: 'on opt-in', value: '$6' },
      ],
    },
  },

  // ---- C2 · Opt-in · phone (tag + 3 messages) ----
  { id: 'tag-lead', type: 'tag', position: { x: col(2), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'GHL', label: 'ai-insiders-lead', trigger: 'on opt-in',
    syncsTo: ['Supabase', 'Close', 'GHL'],
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
  { id: 'msg-live', type: 'sms', position: { x: col(2), y: Y.msgBand + (R.phone + SP.xxl) * 2 }, data: {
    kind: 'sms', contactName: 'Luke Alexander',
    body: `We're LIVE.

Tap to join:
aiinsiders.com/join

(Starts in 2 min — don't wait.)`,
    trigger: 'T-0', sendingFrom: 'Twilio', sent: 198, clickedPct: 71, time: '3:00',
  } },

  // ---- C3 · Opt-in · email (tag + 3 emails) ----
  { id: 'tag-kit', type: 'tag', position: { x: col(3), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'Kit', label: 'AI Insiders', trigger: 'on opt-in',
    syncsTo: ['Kit', 'Supabase'],
  } },
  { id: 'msg-welcome-email', type: 'email', position: { x: col(3), y: Y.msgBand }, data: {
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
  { id: 'msg-24h', type: 'email', position: { x: col(3), y: Y.msgBand + R.email + SP.xxl }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: 'Tomorrow · AI Insiders briefing (save your seat)',
    body: `{{first_name}} —

Quick reminder: the AI Insiders briefing is tomorrow at 3pm ET.

If you haven't blocked your calendar, do it now.

Join here: [ AI Insiders Briefing → ]

— Luke`,
    trigger: 'T-24h', sendingFrom: 'Kit', sent: 221, openedPct: 54, clickedPct: 28,
  } },
  { id: 'msg-1h', type: 'email', position: { x: col(3), y: Y.msgBand + (R.email + SP.xxl) * 2 }, data: {
    kind: 'email', fromName: 'Luke Alexander', fromEmail: 'luke@aiinsiders.com', toDisplay: 'me',
    subject: '1 hour · final reminder',
    body: `{{first_name}} —

60 minutes out. Make sure you're at your desk, bring questions, and grab a notepad.

Join: [ AI Insiders Briefing → ]

— Luke`,
    trigger: 'T-1h', sendingFrom: 'Kit', sent: 221, openedPct: 62, clickedPct: 36,
  } },

  // ---- C4 · Live event ----
  { id: 'webinar', type: 'webinar', position: { x: col(4), y: Y.spine }, data: {
    kind: 'webinar', platform: 'WebinarJam', title: 'AI Insiders Briefing',
    date: 'Apr 19, 2026', time: '3:00 PM ET', duration: '60 min',
    registered: 221, showRate: 64,
  } },

  // ---- C5 · Offer ----
  { id: 'pg-slo', type: 'page', position: { x: col(5), y: Y.spine }, data: {
    kind: 'page', label: 'SLO Page', url: 'aureumfunnels.com/luke/slo',
    openHref: '/funnels/luke-alexander/slo/index.html',
    views: 221, clicks: 34, conversionPct: 15.4, cta: 'GET ACCESS',
    pixelEvents: [
      { name: 'PageView', trigger: 'on load' },
      { name: 'Purchase', trigger: 'on checkout', value: '$47' },
    ],
  } },

  // ---- C6 · Purchase (tag + receipt) ----
  { id: 'tag-buyer', type: 'tag', position: { x: col(6), y: Y.tagBand }, data: {
    kind: 'tag', platform: 'GHL', label: 'ai-insiders-buyer', trigger: 'on purchase',
    syncsTo: ['Close', 'GHL', 'Supabase'],
  } },
  { id: 'msg-slo-receipt', type: 'email', position: { x: col(6), y: Y.msgBand }, data: {
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

  // ---- C7 · Confirmation ----
  { id: 'pg-ty', type: 'page', position: { x: col(7), y: Y.spine }, data: {
    kind: 'page', label: 'Thank You', url: 'aureumfunnels.com/luke/ty',
    openHref: '/funnels/luke-alexander/thank-you/index.html',
    views: 221, clicks: 198, conversionPct: 89.6, cta: 'VIEW REPLAY',
    pixelEvents: [
      { name: 'PageView', trigger: 'on load' },
    ],
  } },

  // ---- C8 · Post-event ----
  { id: 'msg-ty-replay', type: 'email', position: { x: col(8), y: Y.spine }, data: {
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
];

// =============================================================================
// Edges — minimal, no crossings
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
  // Spine L→R
  { id: 'sp-ad-meta',       source: 'ad-meta',    target: 'pg-optin',      label: 'CPL $6.18',        ...spine() },
  { id: 'sp-ad-ig',         source: 'ad-ig',      target: 'pg-optin',      label: 'CPL $4.39',        ...spine() },
  { id: 'sp-ad-organic',    source: 'ad-organic', target: 'pg-optin',      label: 'organic',          ...spine() },
  { id: 'sp-optin-webinar', source: 'pg-optin',   target: 'webinar',       label: 'registers',        ...spine() },
  { id: 'sp-webinar-slo',   source: 'webinar',    target: 'pg-slo',        label: 'post-event offer', ...spine() },
  { id: 'sp-slo-ty',        source: 'pg-slo',     target: 'pg-ty',         label: '15.4% CVR',        ...spine() },
  { id: 'sp-ty-replay',     source: 'pg-ty',      target: 'msg-ty-replay', label: 'T+24h',            ...spine() },

  // Page → Tag (side-effect, straight down)
  { id: 'e-optin-tag-lead', source: 'pg-optin', sourceHandle: 'trigger', target: 'tag-lead', ...triggered() },
  { id: 'e-optin-tag-kit',  source: 'pg-optin', sourceHandle: 'trigger', target: 'tag-kit',  ...triggered() },
  { id: 'e-slo-tag-buyer',  source: 'pg-slo',   sourceHandle: 'trigger', target: 'tag-buyer',...triggered() },

  // Phone chain (C2): tag → welcome-sms → welcome-tg → live-sms
  { id: 'e-taglead-sms',  source: 'tag-lead',         target: 'msg-welcome-sms', ...triggered() },
  { id: 'e-sms-tg',       source: 'msg-welcome-sms',  target: 'msg-welcome-tg',  ...triggered() },
  { id: 'e-tg-live',      source: 'msg-welcome-tg',   target: 'msg-live',        ...triggered() },

  // Email chain (C3): tag → welcome-email → 24h → 1h
  { id: 'e-tagkit-email', source: 'tag-kit',            target: 'msg-welcome-email', ...triggered() },
  { id: 'e-welcome-24h',  source: 'msg-welcome-email',  target: 'msg-24h',           ...triggered() },
  { id: 'e-24h-1h',       source: 'msg-24h',            target: 'msg-1h',            ...triggered() },

  // Purchase (C6): tag → receipt
  { id: 'e-tagbuyer-receipt', source: 'tag-buyer', target: 'msg-slo-receipt', ...triggered() },
];

// =============================================================================
// Stats
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
              padding: `${SP.xs + 2}px ${SP.md}px`, borderRadius: 6,
              fontSize: TYPE.body, fontWeight: 500,
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
          panOnScrollSpeed={1.8}
          zoomOnScroll={false}
          zoomOnPinch
          zoomActivationKeyCode="Meta"
          panOnDrag
          selectionOnDrag={false}
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
