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
} from 'lucide-react';

// --- Data model for Luke's AI Insiders funnel (seed) ---

type Channel = 'email' | 'sms' | 'telegram';
type Platform = 'GHL' | 'Mailchimp' | 'Meta' | 'Telegram' | 'Twilio';

interface AdNodeData {
  kind: 'ad';
  label: string;
  platform: Platform;
  spend: number;
  leads: number;
  cpl: number;
}

interface PageNodeData {
  kind: 'page';
  label: string;
  url: string;
  views: number;
  clicks: number;
  conversionPct: number;
}

interface MessageNodeData {
  kind: 'message';
  channel: Channel;
  subject: string;
  trigger: string;
  tags: { platform: Platform; label: string }[];
  sent: number;
  openedPct?: number;
  clickedPct?: number;
}

type NodeData = AdNodeData | PageNodeData | MessageNodeData;

// --- Styling helpers ---

const CHANNEL = {
  email:    { icon: Mail,          color: '#bfdbfe', bg: 'rgba(191,219,254,0.10)', border: 'rgba(191,219,254,0.35)' },
  sms:      { icon: MessageSquare, color: '#fde68a', bg: 'rgba(253,230,138,0.10)', border: 'rgba(253,230,138,0.35)' },
  telegram: { icon: Send,          color: '#86efac', bg: 'rgba(134,239,172,0.10)', border: 'rgba(134,239,172,0.35)' },
} as const;

const PLATFORM_COLOR: Record<Platform, string> = {
  GHL:       '#f9a8d4',
  Mailchimp: '#fcd34d',
  Meta:      '#93c5fd',
  Telegram:  '#86efac',
  Twilio:    '#fca5a5',
};

// --- Custom node components ---

const AdNode: React.FC<NodeProps<AdNodeData>> = ({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 220,
        background: 'linear-gradient(180deg, rgba(147,197,253,0.10), rgba(147,197,253,0.04))',
        border: '1px solid rgba(147,197,253,0.35)',
        borderRadius: 12,
        padding: 12,
        color: '#ECECEC',
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Megaphone size={12} color="#93c5fd" />
        <span style={{ fontSize: 10, color: '#93c5fd', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {data.platform} · Ad
        </span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>{data.label}</div>
      {showMetrics && (
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#999' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <DollarSign size={9} />${data.spend}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Users size={9} />{data.leads}
          </span>
          <span style={{ color: '#86efac' }}>CPL ${data.cpl.toFixed(2)}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#93c5fd', width: 8, height: 8 }} />
    </div>
  );
};

const PageNode: React.FC<NodeProps<PageNodeData>> = ({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  return (
    <div
      style={{
        width: 240,
        background: 'linear-gradient(180deg, rgba(236,236,236,0.08), rgba(236,236,236,0.02))',
        border: '1px solid rgba(236,236,236,0.25)',
        borderRadius: 12,
        padding: 12,
        color: '#ECECEC',
        fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#ECECEC', width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <FileText size={12} color="#ECECEC" />
        <span style={{ fontSize: 10, color: '#999', letterSpacing: 0.5, textTransform: 'uppercase' }}>Page</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{data.label}</div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: showMetrics ? 8 : 0, wordBreak: 'break-all' }}>
        {data.url}
      </div>
      {showMetrics && (
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#999' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Eye size={9} />{data.views}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <MousePointerClick size={9} />{data.clicks}
          </span>
          <span style={{ color: '#86efac' }}>{data.conversionPct}%</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#ECECEC', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="msg" style={{ background: '#ECECEC', width: 8, height: 8 }} />
    </div>
  );
};

const MessageNode: React.FC<NodeProps<MessageNodeData>> = ({ data }) => {
  const showMetrics = (data as any).__showMetrics ?? true;
  const meta = CHANNEL[data.channel];
  const Icon = meta.icon;
  return (
    <div
      style={{
        width: 230,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 12,
        padding: 10,
        color: '#ECECEC',
        fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: meta.color, width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={11} color={meta.color} />
        <span style={{ fontSize: 9, color: meta.color, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {data.channel}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 9,
            color: '#999',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 6px',
            borderRadius: 6,
          }}
        >
          <Clock size={8} />
          {data.trigger}
        </span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, lineHeight: 1.3 }}>{data.subject}</div>
      {data.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: showMetrics ? 6 : 0 }}>
          {data.tags.map((t, i) => (
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
              <TagIcon size={8} />
              {t.platform}:{t.label}
            </span>
          ))}
        </div>
      )}
      {showMetrics && (
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#999' }}>
          <span>{data.sent} sent</span>
          {data.openedPct !== undefined && <span>·  {data.openedPct}% open</span>}
          {data.clickedPct !== undefined && <span>·  {data.clickedPct}% click</span>}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  ad: AdNode,
  page: PageNode,
  message: MessageNode,
};

// --- Seed data: Luke Alexander · AI Insiders ---

const SEED_NODES = [
  // Ads (left column)
  { id: 'ad-meta',   type: 'ad', position: { x: 0,   y: 40  }, data: { kind: 'ad', label: 'AI Insiders — Cold', platform: 'Meta',     spend: 420, leads: 68, cpl: 6.18 } },
  { id: 'ad-ig',     type: 'ad', position: { x: 0,   y: 180 }, data: { kind: 'ad', label: 'AI Insiders — IG Retarget', platform: 'Meta', spend: 180, leads: 41, cpl: 4.39 } },
  { id: 'ad-organic',type: 'ad', position: { x: 0,   y: 320 }, data: { kind: 'ad', label: 'Organic / Email blast', platform: 'Mailchimp', spend: 0, leads: 112, cpl: 0 } },

  // Pages (middle row)
  { id: 'pg-optin',  type: 'page', position: { x: 360, y: 180 }, data: { kind: 'page', label: 'Capture Page',  url: '/funnels/luke-alexander/optin',     views: 1240, clicks: 221, conversionPct: 17.8 } },
  { id: 'pg-slo',    type: 'page', position: { x: 720, y: 180 }, data: { kind: 'page', label: 'SLO Page',      url: '/funnels/luke-alexander/slo',       views: 221,  clicks: 34,  conversionPct: 15.4 } },
  { id: 'pg-ty',     type: 'page', position: { x: 1080,y: 180 }, data: { kind: 'page', label: 'Thank You',     url: '/funnels/luke-alexander/thank-you', views: 221,  clicks: 198, conversionPct: 89.6 } },

  // Messages off Capture Page (opt-in sequence)
  { id: 'msg-welcome-email', type: 'message', position: { x: 200, y: 500 }, data: { kind: 'message', channel: 'email',    subject: 'You\'re in — AI Insiders link inside', trigger: 'immediate',  tags: [{ platform: 'GHL', label: 'ai-insiders-lead' }, { platform: 'Mailchimp', label: 'AI Insiders' }], sent: 221, openedPct: 68, clickedPct: 42 } },
  { id: 'msg-welcome-sms',   type: 'message', position: { x: 460, y: 500 }, data: { kind: 'message', channel: 'sms',      subject: 'Save this link for tomorrow',          trigger: 'immediate',  tags: [{ platform: 'Twilio', label: 'ai-insiders' }], sent: 198, clickedPct: 31 } },
  { id: 'msg-welcome-tg',    type: 'message', position: { x: 720, y: 500 }, data: { kind: 'message', channel: 'telegram', subject: 'Join the AI Insiders channel',         trigger: 'immediate',  tags: [{ platform: 'Telegram', label: 'invite' }], sent: 174, clickedPct: 58 } },
  { id: 'msg-24h',           type: 'message', position: { x: 200, y: 660 }, data: { kind: 'message', channel: 'email',    subject: 'Tomorrow · AI Insiders briefing',       trigger: 'T-24h',      tags: [{ platform: 'GHL', label: 'reminder-sent' }], sent: 221, openedPct: 54, clickedPct: 28 } },
  { id: 'msg-1h',            type: 'message', position: { x: 460, y: 660 }, data: { kind: 'message', channel: 'email',    subject: '1 hour · final reminder',               trigger: 'T-1h',       tags: [{ platform: 'GHL', label: 'reminder-sent' }], sent: 221, openedPct: 62, clickedPct: 36 } },
  { id: 'msg-live',          type: 'message', position: { x: 720, y: 660 }, data: { kind: 'message', channel: 'sms',      subject: 'Starting now — tap to join',            trigger: 'T-0',        tags: [{ platform: 'Twilio', label: 'live' }], sent: 198, clickedPct: 71 } },

  // Message off SLO Page
  { id: 'msg-slo-receipt',   type: 'message', position: { x: 960, y: 500 }, data: { kind: 'message', channel: 'email',    subject: 'Your AI Insiders access is confirmed',  trigger: 'on purchase', tags: [{ platform: 'GHL', label: 'ai-insiders-buyer' }, { platform: 'Mailchimp', label: 'Buyers' }], sent: 34, openedPct: 88, clickedPct: 61 } },

  // Message off Thank You
  { id: 'msg-ty-tag',        type: 'message', position: { x: 1240, y: 500 }, data: { kind: 'message', channel: 'email',   subject: 'Replay + resources',                    trigger: 'T+24h post-event', tags: [{ platform: 'GHL', label: 'attended' }], sent: 0, openedPct: 0, clickedPct: 0 } },
] as any[];

const SEED_EDGES = [
  { id: 'e-meta-optin',    source: 'ad-meta',    target: 'pg-optin', label: 'CPL $6.18', animated: true, style: { stroke: '#93c5fd' } },
  { id: 'e-ig-optin',      source: 'ad-ig',      target: 'pg-optin', label: 'CPL $4.39', animated: true, style: { stroke: '#93c5fd' } },
  { id: 'e-organic-optin', source: 'ad-organic', target: 'pg-optin', label: 'organic',   animated: true, style: { stroke: '#86efac' } },

  { id: 'e-optin-slo',  source: 'pg-optin', target: 'pg-slo',  label: '17.8% CTR', style: { stroke: '#ECECEC' } },
  { id: 'e-slo-ty',     source: 'pg-slo',   target: 'pg-ty',   label: '15.4% CVR', style: { stroke: '#ECECEC' } },

  // Optin → messages (opt-in trigger)
  { id: 'e-optin-welcome-email', source: 'pg-optin', sourceHandle: 'msg', target: 'msg-welcome-email', style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },
  { id: 'e-optin-welcome-sms',   source: 'pg-optin', sourceHandle: 'msg', target: 'msg-welcome-sms',   style: { stroke: '#fde68a', strokeDasharray: '4 4' } },
  { id: 'e-optin-welcome-tg',    source: 'pg-optin', sourceHandle: 'msg', target: 'msg-welcome-tg',    style: { stroke: '#86efac', strokeDasharray: '4 4' } },
  { id: 'e-optin-24h',           source: 'pg-optin', sourceHandle: 'msg', target: 'msg-24h',           style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },
  { id: 'e-optin-1h',            source: 'pg-optin', sourceHandle: 'msg', target: 'msg-1h',            style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },
  { id: 'e-optin-live',          source: 'pg-optin', sourceHandle: 'msg', target: 'msg-live',          style: { stroke: '#fde68a', strokeDasharray: '4 4' } },

  // SLO → receipt
  { id: 'e-slo-receipt', source: 'pg-slo', sourceHandle: 'msg', target: 'msg-slo-receipt', style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },

  // TY → replay email
  { id: 'e-ty-replay',   source: 'pg-ty',  sourceHandle: 'msg', target: 'msg-ty-tag',      style: { stroke: '#bfdbfe', strokeDasharray: '4 4' } },
].map(e => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed, color: (e.style as any)?.stroke || '#ECECEC' }, labelStyle: { fill: '#999', fontSize: 10 }, labelBgStyle: { fill: '#1a1a1a' }, labelBgPadding: [4, 2] as [number, number], labelBgBorderRadius: 4 }));

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
    // initial-only; metrics toggle handled via setNodes below
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
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#222" gap={24} size={1} />
        <Controls style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />
        <MiniMap
          nodeColor={n => {
            const k = (n.data as any)?.kind;
            if (k === 'ad') return '#93c5fd';
            if (k === 'page') return '#ECECEC';
            const ch = (n.data as any)?.channel;
            if (ch === 'email') return '#bfdbfe';
            if (ch === 'sms') return '#fde68a';
            if (ch === 'telegram') return '#86efac';
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
