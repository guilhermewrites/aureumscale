import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
};

// External resources
const RESOURCES = [
  { label: 'Figma', url: 'https://figma.com', icon: '✦' },
  { label: 'Google Calendar', url: 'https://calendar.google.com', icon: '📅' },
  { label: 'Email', url: 'https://mail.google.com', icon: '✉️' },
  { label: 'Slack', url: 'https://slack.com', icon: '💬' },
];

interface SidebarProps {
  activeUserId: string;
  onUserChange: (userId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSignOut?: () => void;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeUserId, onUserChange, collapsed, onToggleCollapse, onSignOut, userEmail }) => {
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

  const saveProfile = () => {
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
    { id: NavigationItem.CLIENTS, icon: Briefcase, label: 'Clients' },
    { id: NavigationItem.SWIPEFILE, icon: Library, label: 'Swipe File' },
    { id: NavigationItem.TEAM, icon: Users, label: 'Team' },
    { id: NavigationItem.CONTRACTS, icon: ScrollText, label: 'Contracts' },
    { id: NavigationItem.FINANCE, icon: DollarSign, label: 'Finance' },
    { id: NavigationItem.BRANDING, icon: Megaphone, label: 'Branding' },
    { id: NavigationItem.GENERAL_ROOM, icon: Crosshair, label: 'General Room' },
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
            <img src={customLogo} alt="Logo" className="w-8 h-8 object-contain rounded" />
          ) : (
            <img src="/aureum-logo.svg" alt="Aureum Logo" className="w-8 h-8 object-contain" />
          )}
          <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={12} className="text-white" />
          </div>
        </label>
        {!collapsed && <span className="text-xl tracking-wide text-[#ECECEC] flex-1 min-w-0 truncate" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 700 }}>Aureum</span>}
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
                  <span className="text-base w-[18px] text-center leading-none">{res.icon}</span>
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
                <span className="text-base leading-none">{res.icon}</span>
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
