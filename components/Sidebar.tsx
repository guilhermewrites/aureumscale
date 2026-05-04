import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  LayoutDashboard,
  Briefcase,
  Library,
  Users,
  ScrollText,
  DollarSign,
  Megaphone,
  Crosshair,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Camera,
  Settings,
  LogOut,
  Globe,
  CalendarDays,
  Brain,
  Target,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { NavigationItem, AppUser } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

const DEFAULT_USERS: AppUser[] = [
  { id: 'guilherme', name: 'Guilherme', label: 'Guilherme', initials: 'GU', color: 'bg-emerald-500', firstName: 'Guilherme', lastName: '' },
];

const navToRoute: Record<string, string> = {
  [NavigationItem.DASHBOARD]: '/dashboard',
  [NavigationItem.CRM]: '/crm',
  [NavigationItem.CLIENTS]: '/clients',
  [NavigationItem.SWIPEFILE]: '/swipefile',
  [NavigationItem.TEAM]: '/team',
  [NavigationItem.CONTRACTS]: '/contracts',
  [NavigationItem.FINANCE]: '/finance',
  [NavigationItem.BRANDING]: '/branding',
  [NavigationItem.GENERAL_ROOM]: '/general-room',
  [NavigationItem.ARNAS_GINTALAS]: '/arnas-gintalas',
  [NavigationItem.AUREUM_WEBINARS]: '/aureum-webinars',
  [NavigationItem.LUKE_ALEXANDER]: '/luke-alexander',
  [NavigationItem.LUKE_ALEXANDER_DATA]: '/luke-alexander/data',
  [NavigationItem.THERESA_THE_READER]: '/theresa-the-reader',
  [NavigationItem.THERESA_THE_READER_DATA]: '/theresa-the-reader/data',
  [NavigationItem.CALENDAR]: '/calendar',
  [NavigationItem.MENTOR]: '/mentor',
  [NavigationItem.STUDY]: '/study',
};

const routeToNavItem: Record<string, NavigationItem> = {
  '/dashboard': NavigationItem.DASHBOARD,
  '/crm': NavigationItem.CRM,
  '/clients': NavigationItem.CLIENTS,
  '/swipefile': NavigationItem.SWIPEFILE,
  '/team': NavigationItem.TEAM,
  '/contracts': NavigationItem.CONTRACTS,
  '/finance': NavigationItem.FINANCE,
  '/branding': NavigationItem.BRANDING,
  '/general-room': NavigationItem.GENERAL_ROOM,
  '/arnas-gintalas': NavigationItem.ARNAS_GINTALAS,
  '/aureum-webinars': NavigationItem.AUREUM_WEBINARS,
  '/luke-alexander': NavigationItem.LUKE_ALEXANDER,
  '/luke-alexander/data': NavigationItem.LUKE_ALEXANDER_DATA,
  '/theresa-the-reader': NavigationItem.THERESA_THE_READER,
  '/theresa-the-reader/data': NavigationItem.THERESA_THE_READER_DATA,
  '/calendar': NavigationItem.CALENDAR,
  '/mentor': NavigationItem.MENTOR,
  '/study': NavigationItem.STUDY,
};

// Brand SVG icons for resources (kept colored — they're brand marks)
const FigmaIcon = () => (
  <svg width="14" height="14" viewBox="0 0 38 57" fill="none">
    <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
    <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
    <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
    <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
    <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
  </svg>
);

const GoogleCalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
    <path d="M36 4H12C7.58 4 4 7.58 4 12V36C4 40.42 7.58 44 12 44H36C40.42 44 44 40.42 44 36V12C44 7.58 40.42 4 36 4Z" fill="#fff"/>
    <path d="M36 4H12C7.58 4 4 7.58 4 12V36C4 40.42 7.58 44 12 44H36C40.42 44 44 40.42 44 36V12C44 7.58 40.42 4 36 4Z" stroke="#4285F4" strokeWidth="2"/>
    <rect x="14" y="14" width="20" height="4" fill="#4285F4"/>
    <text x="24" y="29" textAnchor="middle" fill="#4285F4" fontSize="11" fontWeight="bold" fontFamily="sans-serif">22</text>
  </svg>
);

const GmailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
    <path d="M6 12L24 26L42 12V36C42 37.1 41.1 38 40 38H8C6.9 38 6 37.1 6 36V12Z" fill="#fff"/>
    <path d="M42 12L24 26L6 12C6 10.9 6.9 10 8 10H40C41.1 10 42 10.9 42 12Z" fill="#EA4335"/>
    <rect x="6" y="10" width="36" height="28" rx="2" stroke="#ccc" strokeWidth="1.5" fill="none"/>
  </svg>
);

const SlackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 54 54" fill="none">
    <path d="M19.7 34.3C19.7 36.9 17.6 39 15 39C12.4 39 10.3 36.9 10.3 34.3C10.3 31.7 12.4 29.6 15 29.6H19.7V34.3Z" fill="#E01E5A"/>
    <path d="M22.1 34.3C22.1 31.7 24.2 29.6 26.8 29.6C29.4 29.6 31.5 31.7 31.5 34.3V42.2C31.5 44.8 29.4 46.9 26.8 46.9C24.2 46.9 22.1 44.8 22.1 42.2V34.3Z" fill="#E01E5A"/>
    <path d="M26.8 19.7C24.2 19.7 22.1 17.6 22.1 15C22.1 12.4 24.2 10.3 26.8 10.3C29.4 10.3 31.5 12.4 31.5 15V19.7H26.8Z" fill="#36C5F0"/>
    <path d="M26.8 22.1C29.4 22.1 31.5 24.2 31.5 26.8C31.5 29.4 29.4 31.5 26.8 31.5H18.8C16.2 31.5 14.1 29.4 14.1 26.8C14.1 24.2 16.2 22.1 18.8 22.1H26.8Z" fill="#36C5F0"/>
    <path d="M41.3 26.8C41.3 24.2 43.4 22.1 46 22.1C48.6 22.1 50.7 24.2 50.7 26.8C50.7 29.4 48.6 31.5 46 31.5H41.3V26.8Z" fill="#2EB67D"/>
    <path d="M38.9 26.8C38.9 29.4 36.8 31.5 34.2 31.5C31.6 31.5 29.5 29.4 29.5 26.8V18.8C29.5 16.2 31.6 14.1 34.2 14.1C36.8 14.1 38.9 16.2 38.9 18.8V26.8Z" fill="#2EB67D"/>
    <path d="M34.2 41.3C36.8 41.3 38.9 43.4 38.9 46C38.9 48.6 36.8 50.7 34.2 50.7C31.6 50.7 29.5 48.6 29.5 46V41.3H34.2Z" fill="#ECB22E"/>
    <path d="M34.2 38.9C31.6 38.9 29.5 36.8 29.5 34.2C29.5 31.6 31.6 29.5 34.2 29.5H42.2C44.8 29.5 46.9 31.6 46.9 34.2C46.9 36.8 44.8 38.9 42.2 38.9H34.2Z" fill="#ECB22E"/>
  </svg>
);

const RESOURCES: { label: string; url: string; icon: React.ReactNode }[] = [
  { label: 'Figma', url: 'https://figma.com', icon: <FigmaIcon /> },
  { label: 'Google Calendar', url: 'https://calendar.google.com', icon: <GoogleCalIcon /> },
  { label: 'Email', url: 'https://mail.google.com', icon: <GmailIcon /> },
  { label: 'Slack', url: 'https://slack.com', icon: <SlackIcon /> },
];

interface SidebarProps {
  activeUserId: string;
  onUserChange: (userId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSignOut?: () => void;
  userEmail?: string;
  storagePrefix?: string;
}

// ── Reusable nav item with vertical accent border on active ────────
interface NavItemProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  count?: number;
  small?: boolean;
}
const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, collapsed, onClick, count, small }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: collapsed ? 0 : 11,
      justifyContent: collapsed ? 'center' : 'flex-start',
      padding: collapsed ? '8px 0' : (small ? '6px 10px' : '7px 10px'),
      background: active ? '#0a0a0a' : 'transparent',
      color: active ? 'var(--au-text)' : 'var(--au-text-2)',
      borderLeft: active ? '2px solid var(--au-text)' : '2px solid transparent',
      borderRadius: 0,
      fontSize: small ? 12 : 12.5,
      cursor: 'pointer',
      transition: 'color 0.12s, background 0.12s, border-color 0.12s',
      textAlign: 'left',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--au-text)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--au-text-2)'; }}
  >
    <span style={{ display: 'inline-flex', opacity: active ? 1 : 0.75 }}>
      <Icon size={small ? 12 : 14} strokeWidth={1.75} />
    </span>
    {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
    {!collapsed && count != null && (
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--au-text-3)', letterSpacing: '0.05em' }}>
        {String(count).padStart(2, '0')}
      </span>
    )}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeUserId, onUserChange, collapsed, onToggleCollapse, onSignOut, userEmail, storagePrefix }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem = (() => {
    const path = location.pathname;
    if (path.startsWith('/clients')) return NavigationItem.CLIENTS;
    if (path === '/luke-alexander/data') return NavigationItem.LUKE_ALEXANDER_DATA;
    if (path.startsWith('/luke-alexander')) return NavigationItem.LUKE_ALEXANDER;
    if (path === '/theresa-the-reader/data') return NavigationItem.THERESA_THE_READER_DATA;
    if (path.startsWith('/theresa-the-reader')) return NavigationItem.THERESA_THE_READER;
    return routeToNavItem[path] || NavigationItem.DASHBOARD;
  })();
  const lukeOpen = location.pathname.startsWith('/luke-alexander');
  const theresaOpen = location.pathname.startsWith('/theresa-the-reader');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [users, setUsers] = useLocalStorage<AppUser[]>('writestakeover_users', DEFAULT_USERS);
  const [customLogo, setCustomLogo] = useLocalStorage<string | null>('aureum_custom_logo', null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>(undefined);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load profile from Supabase on mount
  useEffect(() => {
    if (!storagePrefix) return;
    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', storagePrefix)
        .single();
      if (data && (data.first_name || data.last_name || data.photo_url)) {
        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Guilherme';
        const initials = firstName && lastName
          ? (firstName[0] + lastName[0]).toUpperCase()
          : fullName.slice(0, 2).toUpperCase();
        setUsers(prev => prev.map((u, i) => i === 0 ? {
          ...u,
          firstName,
          lastName,
          name: fullName,
          label: fullName,
          initials,
          photoUrl: data.photo_url || undefined,
        } : u));
      }
    })();
  }, [storagePrefix]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const activeUser = users.find(u => u.id === activeUserId) || users[0];

  const getInitials = (first: string, last: string, fallback: string) => {
    const cleanFirst = first.trim();
    const cleanLast = last.trim();
    if (cleanFirst && cleanLast) return (cleanFirst[0] + cleanLast[0]).toUpperCase();
    if (cleanFirst) return cleanFirst.slice(0, 2).toUpperCase();
    if (cleanLast) return cleanLast.slice(0, 2).toUpperCase();
    return fallback.slice(0, 2).toUpperCase();
  };

  const openProfileEditor = () => {
    setProfileFirstName(activeUser.firstName || activeUser.name.split(' ')[0] || '');
    setProfileLastName(activeUser.lastName || activeUser.name.split(' ').slice(1).join(' ') || '');
    setProfilePhotoUrl(activeUser.photoUrl);
    setIsProfileOpen(true);
    setUserDropdownOpen(false);
  };

  const saveProfile = async () => {
    const nextFirst = profileFirstName.trim();
    const nextLast = profileLastName.trim();
    const fullName = `${nextFirst} ${nextLast}`.trim();
    const nextName = fullName || activeUser.name;
    const nextInitials = getInitials(nextFirst, nextLast, nextName);
    setUsers(prev => prev.map(u => u.id === activeUser.id ? {
      ...u,
      firstName: nextFirst,
      lastName: nextLast,
      name: nextName,
      label: nextName,
      initials: nextInitials,
      photoUrl: profilePhotoUrl
    } : u));
    setIsProfileOpen(false);

    if (storagePrefix) {
      await supabase.from('user_profiles').upsert({
        user_id: storagePrefix,
        first_name: nextFirst,
        last_name: nextLast,
        photo_url: profilePhotoUrl || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const scale = Math.min(150 / img.width, 150 / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setProfilePhotoUrl(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = url;
  };

  const menuItems = [
    { id: NavigationItem.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { id: NavigationItem.GENERAL_ROOM, icon: Crosshair, label: 'General Room' },
    { id: NavigationItem.CRM, icon: Target, label: 'CRM' },
    { id: NavigationItem.CLIENTS, icon: Briefcase, label: 'Clients' },
    { id: NavigationItem.SWIPEFILE, icon: Library, label: 'Swipe File' },
    { id: NavigationItem.TEAM, icon: Users, label: 'Team' },
    { id: NavigationItem.CONTRACTS, icon: ScrollText, label: 'Contracts' },
    { id: NavigationItem.FINANCE, icon: DollarSign, label: 'Finance' },
    { id: NavigationItem.BRANDING, icon: Megaphone, label: 'Branding' },
    { id: NavigationItem.CALENDAR, icon: CalendarDays, label: 'Calendar' },
    { id: NavigationItem.MENTOR, icon: Brain, label: 'Mentor' },
    { id: NavigationItem.STUDY, icon: BookOpen, label: 'Study' },
  ];

  type FunnelChild = { id: NavigationItem; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; label: string };
  type FunnelItem = FunnelChild & { children?: { items: FunnelChild[]; open: boolean } };

  const funnelItems: FunnelItem[] = [
    { id: NavigationItem.ARNAS_GINTALAS, icon: Globe, label: 'Arnas Gintalas' },
    { id: NavigationItem.AUREUM_WEBINARS, icon: Globe, label: 'Aureum Webinars' },
    {
      id: NavigationItem.LUKE_ALEXANDER, icon: Globe, label: 'Luke Alexander',
      children: {
        open: lukeOpen,
        items: [
          { id: NavigationItem.LUKE_ALEXANDER_DATA, icon: BarChart3, label: 'Data' },
        ],
      },
    },
    {
      id: NavigationItem.THERESA_THE_READER, icon: Globe, label: 'Theresa The Reader',
      children: {
        open: theresaOpen,
        items: [
          { id: NavigationItem.THERESA_THE_READER_DATA, icon: BarChart3, label: 'Data' },
        ],
      },
    },
  ];

  const sidebarWidth = collapsed ? 56 : 220;

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0, top: 0,
        height: '100vh',
        width: sidebarWidth,
        background: '#000',
        borderRight: '1px solid var(--au-line)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Brand row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: '18px 14px 16px',
          borderBottom: '1px solid var(--au-line)',
          color: 'var(--au-text)',
          position: 'relative',
        }}
      >
        <label style={{ cursor: 'pointer', position: 'relative', flexShrink: 0, display: 'inline-flex' }} className="group">
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
          {customLogo ? (
            <img src={customLogo} alt="Logo" style={{ width: 18, height: 18, objectFit: 'contain' }} />
          ) : (
            <img src="/aureum-logo.svg" alt="Aureum" style={{ width: 18, height: 18, objectFit: 'contain' }} />
          )}
        </label>
        {!collapsed && (
          <>
            <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Aureum</span>
            <span
              style={{
                marginLeft: 'auto',
                minWidth: 18, height: 18,
                background: 'transparent',
                border: '1px solid var(--au-line-2)',
                display: 'grid', placeItems: 'center',
                color: 'var(--au-text-2)',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              03
            </span>
          </>
        )}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            position: 'absolute',
            right: collapsed ? -10 : 6,
            top: collapsed ? 18 : 18,
            width: 18, height: 18,
            background: '#000',
            border: '1px solid var(--au-line-2)',
            color: 'var(--au-text-3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </div>

      {/* Scroll area */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 6px' }}>
        {menuItems.map(item => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeItem === item.id}
            collapsed={collapsed}
            onClick={() => navigate(navToRoute[item.id] || '/dashboard')}
          />
        ))}

        {/* Funnels */}
        {!collapsed && (
          <div style={{ padding: '14px 8px 6px', color: 'var(--au-text-3)', fontSize: 10, letterSpacing: '0.18em', fontWeight: 500, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
            — Funnels
          </div>
        )}
        {collapsed && <div style={{ height: 1, background: 'var(--au-line)', margin: '10px 8px' }} />}
        {funnelItems.map(item => {
          const isActive = activeItem === item.id || (item.children?.items.some(c => c.id === activeItem) ?? false);
          return (
            <React.Fragment key={item.id}>
              <NavItem
                icon={item.icon}
                label={item.label}
                active={isActive}
                collapsed={collapsed}
                onClick={() => navigate(navToRoute[item.id] || '/dashboard')}
              />
              {!collapsed && item.children?.open && (
                <div style={{ marginLeft: 14, paddingLeft: 8, borderLeft: '1px solid var(--au-line)' }}>
                  {item.children.items.map(child => (
                    <NavItem
                      key={child.id}
                      icon={child.icon}
                      label={child.label}
                      active={activeItem === child.id}
                      collapsed={false}
                      small
                      onClick={() => navigate(navToRoute[child.id] || '/dashboard')}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Resources */}
        {!collapsed && (
          <div style={{ padding: '14px 8px 6px', color: 'var(--au-text-3)', fontSize: 10, letterSpacing: '0.18em', fontWeight: 500, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
            — Resources
          </div>
        )}
        {collapsed && <div style={{ height: 1, background: 'var(--au-line)', margin: '10px 8px' }} />}
        {RESOURCES.map(res => (
          <a
            key={res.label}
            href={res.url}
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? res.label : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 11,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '8px 0' : '7px 10px',
              color: 'var(--au-text-2)',
              fontSize: 12.5,
              borderLeft: '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--au-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--au-text-2)'}
          >
            <span style={{ display: 'inline-flex', width: 14, justifyContent: 'center' }}>{res.icon}</span>
            {!collapsed && <span style={{ flex: 1 }}>{res.label}</span>}
          </a>
        ))}
      </nav>

      {/* Profile box */}
      <div style={{ padding: '10px 8px 6px', position: 'relative' }}>
        <button
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          title={collapsed ? activeUser.name : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '8px' : '10px',
            background: 'transparent',
            border: '1px solid var(--au-line)',
            color: 'var(--au-text)',
            cursor: 'pointer',
            borderRadius: 0,
            textAlign: 'left',
          }}
        >
          {activeUser.photoUrl ? (
            <img src={activeUser.photoUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 24, height: 24, background: '#111', border: '1px solid var(--au-line-2)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, color: 'var(--au-text)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
              {activeUser.initials}
            </div>
          )}
          {!collapsed && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--au-text)' }}>{activeUser.name}</span>
                <span style={{ fontSize: 10, color: 'var(--au-text-3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>OWNER</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openProfileEditor(); }}
                style={{ background: 'transparent', border: 'none', padding: 2, color: 'var(--au-text-3)', cursor: 'pointer', display: 'inline-flex' }}
                title="Edit profile"
              >
                <Settings size={11} />
              </button>
              <ChevronDown size={11} style={{ color: 'var(--au-text-3)', transform: userDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
            </>
          )}
        </button>

        {userDropdownOpen && !collapsed && (
          <div style={{ position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 6, background: '#000', border: '1px solid var(--au-line-2)', zIndex: 50 }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--au-line)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: 'var(--au-text-3)', textTransform: 'uppercase' }}>
              — Workspace
            </div>
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => { onUserChange(user.id); setUserDropdownOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: user.id === activeUserId ? '#0a0a0a' : 'transparent',
                  color: 'var(--au-text)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" style={{ width: 20, height: 20, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 20, height: 20, background: '#111', border: '1px solid var(--au-line-2)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, color: 'var(--au-text)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {user.initials}
                  </div>
                )}
                <span style={{ fontSize: 12, flex: 1 }}>{user.name}</span>
                {user.id === activeUserId && <Check size={12} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sign out */}
      {onSignOut && (
        <button
          onClick={onSignOut}
          title={collapsed ? 'Sign out' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '12px' : '12px 14px 14px',
            color: 'var(--au-text-3)',
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid var(--au-line)',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textAlign: 'left',
          }}
        >
          <LogOut size={12} />
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span>Sign out</span>
              {userEmail && <span style={{ fontSize: 9, color: 'var(--au-text-4)', textTransform: 'none', letterSpacing: 0, fontFamily: 'Inter, sans-serif' }}>{userEmail}</span>}
            </div>
          )}
        </button>
      )}

      {/* Profile editor modal */}
      {isProfileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: '#000', border: '1px solid var(--au-line-2)', width: '100%', maxWidth: 420, borderRadius: 0 }}>
            <div style={{ padding: 18, borderBottom: '1px solid var(--au-line)' }}>
              <div className="au-eyebrow" style={{ marginBottom: 6 }}>— Edit · Profile</div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.015em' }}>Update your details</h3>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  style={{ width: 56, height: 56, background: '#0a0a0a', border: '1px solid var(--au-line-2)', display: 'grid', placeItems: 'center', color: 'var(--au-text-3)', cursor: 'pointer', overflow: 'hidden', borderRadius: 0 }}
                >
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
                <div>
                  <div className="au-label" style={{ marginBottom: 4 }}>— Profile photo</div>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    style={{ background: 'transparent', border: 'none', color: 'var(--au-text)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                  >
                    Upload photo
                  </button>
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div className="au-label" style={{ marginBottom: 6 }}>— First name</div>
                  <input
                    value={profileFirstName}
                    onChange={e => setProfileFirstName(e.target.value)}
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid var(--au-line-2)', padding: '8px 10px', color: 'var(--au-text)', fontSize: 13, borderRadius: 0, outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
                <div>
                  <div className="au-label" style={{ marginBottom: 6 }}>— Last name</div>
                  <input
                    value={profileLastName}
                    onChange={e => setProfileLastName(e.target.value)}
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid var(--au-line-2)', padding: '8px 10px', color: 'var(--au-text)', fontSize: 13, borderRadius: 0, outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 14, borderTop: '1px solid var(--au-line)' }}>
              <button onClick={() => setIsProfileOpen(false)} className="au-btn-ghost">Cancel</button>
              <button onClick={saveProfile} className="au-btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
