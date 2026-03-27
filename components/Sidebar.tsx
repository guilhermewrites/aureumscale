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
  ExternalLink,
  Globe,
  CalendarDays,
  Brain,
} from 'lucide-react';
import { NavigationItem, AppUser } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

const DEFAULT_USERS: AppUser[] = [
  { id: 'guilherme', name: 'Guilherme', label: 'Guilherme', initials: 'GU', color: 'bg-emerald-500', firstName: 'Guilherme', lastName: '' },
];

const navToRoute: Record<string, string> = {
  [NavigationItem.DASHBOARD]: '/dashboard',
  [NavigationItem.CLIENTS]: '/clients',
  [NavigationItem.SWIPEFILE]: '/swipefile',
  [NavigationItem.TEAM]: '/team',
  [NavigationItem.CONTRACTS]: '/contracts',
  [NavigationItem.FINANCE]: '/finance',
  [NavigationItem.BRANDING]: '/branding',
  [NavigationItem.GENERAL_ROOM]: '/general-room',
  [NavigationItem.ARNAS_GINTALAS]: '/arnas-gintalas',
  [NavigationItem.CALENDAR]: '/calendar',
  [NavigationItem.MENTOR]: '/mentor',
};

const routeToNavItem: Record<string, NavigationItem> = {
  '/dashboard': NavigationItem.DASHBOARD,
  '/clients': NavigationItem.CLIENTS,
  '/swipefile': NavigationItem.SWIPEFILE,
  '/team': NavigationItem.TEAM,
  '/contracts': NavigationItem.CONTRACTS,
  '/finance': NavigationItem.FINANCE,
  '/branding': NavigationItem.BRANDING,
  '/general-room': NavigationItem.GENERAL_ROOM,
  '/arnas-gintalas': NavigationItem.ARNAS_GINTALAS,
  '/calendar': NavigationItem.CALENDAR,
  '/mentor': NavigationItem.MENTOR,
};

// Brand SVG icons for resources
const FigmaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 38 57" fill="none">
    <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
    <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
    <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
    <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
    <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
  </svg>
);

const GoogleCalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
    <path d="M36 4H12C7.58 4 4 7.58 4 12V36C4 40.42 7.58 44 12 44H36C40.42 44 44 40.42 44 36V12C44 7.58 40.42 4 36 4Z" fill="#fff"/>
    <path d="M36 4H12C7.58 4 4 7.58 4 12V36C4 40.42 7.58 44 12 44H36C40.42 44 44 40.42 44 36V12C44 7.58 40.42 4 36 4Z" stroke="#4285F4" strokeWidth="2"/>
    <path d="M33 14H15C14.45 14 14 14.45 14 15V33C14 33.55 14.45 34 15 34H33C33.55 34 34 33.55 34 33V15C34 14.45 33.55 14 33 14Z" fill="#4285F4" fillOpacity="0.12"/>
    <rect x="14" y="14" width="20" height="4" fill="#4285F4"/>
    <text x="24" y="29" textAnchor="middle" fill="#4285F4" fontSize="11" fontWeight="bold" fontFamily="sans-serif">22</text>
  </svg>
);

const GmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
    <path d="M6 12L24 26L42 12V36C42 37.1 41.1 38 40 38H8C6.9 38 6 37.1 6 36V12Z" fill="#fff"/>
    <path d="M42 12L24 26L6 12C6 10.9 6.9 10 8 10H40C41.1 10 42 10.9 42 12Z" fill="#EA4335"/>
    <path d="M6 12L24 26L42 12" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
    <path d="M6 12V36C6 37.1 6.9 38 8 38H12V18L24 26L36 18V38H40C41.1 38 42 37.1 42 36V12L24 26L6 12Z" fill="#FBBC05" fillOpacity="0"/>
    <rect x="6" y="10" width="36" height="28" rx="2" stroke="#ccc" strokeWidth="1.5" fill="none"/>
  </svg>
);

const SlackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 54 54" fill="none">
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

// External resources
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

const Sidebar: React.FC<SidebarProps> = ({ activeUserId, onUserChange, collapsed, onToggleCollapse, onSignOut, userEmail, storagePrefix }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem = (() => {
    const path = location.pathname;
    if (path.startsWith('/clients')) return NavigationItem.CLIENTS;
    return routeToNavItem[path] || NavigationItem.DASHBOARD;
  })();
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

    // Persist to Supabase
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
    { id: NavigationItem.CLIENTS, icon: Briefcase, label: 'Clients' },
    { id: NavigationItem.SWIPEFILE, icon: Library, label: 'Swipe File' },
    { id: NavigationItem.TEAM, icon: Users, label: 'Team' },
    { id: NavigationItem.CONTRACTS, icon: ScrollText, label: 'Contracts' },
    { id: NavigationItem.FINANCE, icon: DollarSign, label: 'Finance' },
    { id: NavigationItem.BRANDING, icon: Megaphone, label: 'Branding' },
    { id: NavigationItem.CALENDAR, icon: CalendarDays, label: 'Calendar' },
    { id: NavigationItem.MENTOR, icon: Brain, label: 'Mentor' },
  ];

  const funnelItems = [
    { id: NavigationItem.ARNAS_GINTALAS, icon: Globe, label: 'Arnas Gintalas' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full ${collapsed ? 'w-16' : 'w-64'} bg-[#171717] border-r border-[#2a2a2a] flex flex-col z-20 transition-none`}>
      {/* Logo / Brand */}
      <div className={`px-5 py-5 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} relative`}>
        <label className="cursor-pointer group relative flex-shrink-0">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          {customLogo ? (
            <img src={customLogo} alt="Logo" className="w-6 h-6 object-contain rounded" />
          ) : (
            <img src="/aureum-logo.svg" alt="Aureum Logo" className="w-6 h-6 object-contain" />
          )}
          <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={10} className="text-white" />
          </div>
        </label>
        {!collapsed && <span className="text-[15px] font-semibold tracking-wide text-[#ECECEC] flex-1 min-w-0 truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Aureum</span>}
        <button
          onClick={onToggleCollapse}
          className={`${collapsed ? 'absolute -right-3 top-5' : ''} w-6 h-6 rounded-full bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-[#666] hover:text-[#ECECEC] hover:bg-[#333] flex-shrink-0`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2 overflow-y-auto custom-scrollbar">
        <div className="space-y-0">
          {menuItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(navToRoute[item.id] || '/dashboard')}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-4 px-3'} py-3 rounded-lg transition-none group ${
                  isActive
                    ? 'text-[#ECECEC]'
                    : 'text-[#888] hover:text-[#ECECEC]'
                }`}
              >
                <item.icon
                  size={18}
                  strokeWidth={1.75}
                  className={isActive ? 'text-[#ECECEC]' : 'text-[#888] group-hover:text-[#ECECEC]'}
                />
                {!collapsed && <span className="text-[15px] font-normal tracking-[-0.01em]">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Funnels section */}
        {!collapsed && (
          <div className="mt-6 pt-5 border-t border-[#2a2a2a]">
            <p className="px-3 mb-3 text-[11px] uppercase tracking-[0.08em] text-[#555] font-medium">Funnels</p>
            <div className="space-y-0">
              {funnelItems.map((item) => {
                const isActive = activeItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(navToRoute[item.id] || '/dashboard')}
                    className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-none group ${
                      isActive ? 'text-[#ECECEC]' : 'text-[#888] hover:text-[#ECECEC]'
                    }`}
                  >
                    <item.icon
                      size={18}
                      strokeWidth={1.75}
                      className={isActive ? 'text-[#ECECEC]' : 'text-[#888] group-hover:text-[#ECECEC]'}
                    />
                    <span className="text-[15px] font-normal tracking-[-0.01em]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mt-4 pt-4 border-t border-[#2a2a2a] space-y-0">
            {funnelItems.map((item) => {
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(navToRoute[item.id] || '/dashboard')}
                  title={item.label}
                  className={`w-full flex items-center justify-center px-2 py-3 rounded-lg transition-none ${
                    isActive ? 'text-[#ECECEC]' : 'text-[#888] hover:text-[#ECECEC]'
                  }`}
                >
                  <item.icon size={18} strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
        )}

        {/* Resources section */}
        {!collapsed && (
          <div className="mt-6 pt-5 border-t border-[#2a2a2a]">
            <p className="px-3 mb-3 text-[11px] uppercase tracking-[0.08em] text-[#555] font-medium">Resources</p>
            <div className="space-y-0">
              {RESOURCES.map(res => (
                <a
                  key={res.label}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-lg text-[#888] hover:text-[#ECECEC] transition-none group"
                >
                  <span className="w-[18px] flex items-center justify-center flex-shrink-0">{res.icon}</span>
                  <span className="text-[15px] font-normal tracking-[-0.01em] flex-1">{res.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mt-4 pt-4 border-t border-[#2a2a2a] space-y-0">
            {RESOURCES.map(res => (
              <a
                key={res.label}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                title={res.label}
                className="w-full flex items-center justify-center px-2 py-3 rounded-lg text-[#888] hover:text-[#ECECEC] transition-none"
              >
                <span className="flex items-center justify-center">{res.icon}</span>
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* User Switcher */}
      <div className="px-3 py-3 border-t border-[#2a2a2a] relative">
        <button
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          title={collapsed ? activeUser.name : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2' : 'gap-3 px-3 py-2'} rounded-lg bg-[#1e1e1e] hover:bg-[#252525] transition-none`}
        >
           {activeUser.photoUrl ? (
             <img src={activeUser.photoUrl} alt={activeUser.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
           ) : (
             <div className={`w-8 h-8 rounded-full ${activeUser.color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
               {activeUser.initials}
             </div>
           )}
           {!collapsed && (
             <>
               <div className="flex flex-col text-left flex-1 min-w-0">
                 <div className="flex items-center gap-2">
                   <span className="text-xs font-semibold text-[#ECECEC] truncate">{activeUser.name}</span>
                   <button
                     onClick={(e) => { e.stopPropagation(); openProfileEditor(); }}
                     className="p-0.5 text-[#666] hover:text-[#ECECEC] transition-none"
                     title="Edit profile"
                   >
                     <Settings size={12} />
                   </button>
                 </div>
                 <span className="text-[10px] text-[#555]">Switch workspace</span>
               </div>
               <ChevronDown size={14} className={`text-[#666] transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
             </>
           )}
        </button>

        {userDropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-2 border-b border-[#2a2a2a]">
              <p className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Workspace</p>
            </div>
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => { onUserChange(user.id); setUserDropdownOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[rgba(255,255,255,0.05)] transition-none ${
                  user.id === activeUserId ? 'bg-[rgba(255,255,255,0.05)]' : ''
                }`}
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className={`w-7 h-7 rounded-full ${user.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                    {user.initials}
                  </div>
                )}
                <span className="text-xs font-medium text-[#ECECEC] flex-1 text-left">{user.name}</span>
                {user.id === activeUserId && <Check size={14} className="text-[#ECECEC]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {isProfileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a]">
              <h3 className="text-sm font-semibold text-[#ECECEC]">Edit profile</h3>
              <p className="text-xs text-[#888] mt-1">Update your name and photo.</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-16 h-16 rounded-full overflow-hidden bg-[#2a2a2a] flex items-center justify-center text-[#888]"
                >
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={18} />
                  )}
                </button>
                <div>
                  <p className="text-xs text-[#888]">Profile photo</p>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="text-xs text-[#ECECEC] hover:text-white"
                  >
                    Upload photo
                  </button>
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">First name</label>
                  <input value={profileFirstName} onChange={e => setProfileFirstName(e.target.value)}
                    className="w-full mt-1 bg-[#2a2a2a] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#444]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Last name</label>
                  <input value={profileLastName} onChange={e => setProfileLastName(e.target.value)}
                    className="w-full mt-1 bg-[#2a2a2a] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#444]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-[#2a2a2a]">
              <button onClick={() => setIsProfileOpen(false)} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] rounded-lg text-sm font-medium transition-none">Cancel</button>
              <button onClick={saveProfile} className="px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium transition-none">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Button */}
      {onSignOut && (
        <div className="px-3 pb-3">
          <button
            onClick={onSignOut}
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-1 py-2' : 'gap-3 px-3 py-2'} rounded-lg text-[#666] hover:text-[#ECECEC] transition-none`}
          >
            <LogOut size={16} strokeWidth={1.75} />
            {!collapsed && (
              <div className="flex flex-col text-left flex-1 min-w-0">
                <span className="text-xs font-normal">Sign out</span>
                {userEmail && <span className="text-[10px] text-[#444] truncate">{userEmail}</span>}
              </div>
            )}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
