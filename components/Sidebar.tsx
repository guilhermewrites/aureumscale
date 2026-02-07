import React, { useState, useRef } from 'react';
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  PlaySquare,
  Layers,
  Mail,
  MonitorPlay,
  Users,
  DollarSign,
  Library,
  GitBranch,
  ChevronDown,
  Check,
  Camera,
  Settings,
  ClipboardList
} from 'lucide-react';
import { NavigationItem, AppUser } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

const DEFAULT_USERS: AppUser[] = [
  { id: 'guilherme', name: 'Guilherme', label: 'Guilherme', initials: 'GU', color: 'bg-emerald-500', firstName: 'Guilherme', lastName: '' },
  { id: 'ai_partner', name: 'The AI Partner', label: 'The AI Partner', initials: 'AI', color: 'bg-violet-500', firstName: 'The', lastName: 'AI Partner' },
];

interface SidebarProps {
  activeItem: NavigationItem;
  onNavigate: (item: NavigationItem) => void;
  activeUserId: string;
  onUserChange: (userId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onNavigate, activeUserId, onUserChange }) => {
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
    // Compress to save localStorage space
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
    { id: NavigationItem.PLANNER, icon: ClipboardList, label: 'Planner' },
    { id: NavigationItem.CONTENT, icon: FileText, label: 'Content' },
    { id: NavigationItem.ADS, icon: Megaphone, label: 'Ads' },
    { id: NavigationItem.FUNNELS, icon: GitBranch, label: 'Funnels' },
    { id: NavigationItem.SWIPEFILE, icon: Library, label: 'Swipefile' },
    { id: NavigationItem.VSLS, icon: PlaySquare, label: 'VSLs' },
    { id: NavigationItem.PAGES, icon: Layers, label: 'Pages' },
    { id: NavigationItem.NEWSLETTER, icon: Mail, label: 'Newsletter' },
    { id: NavigationItem.WEBINAR, icon: MonitorPlay, label: 'Webinar' },
    { id: NavigationItem.TEAM, icon: Users, label: 'Team' },
    { id: NavigationItem.FINANCE, icon: DollarSign, label: 'Finance' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#171717] border-r border-[#2f2f2f] flex flex-col z-20">
      <div className="p-6 flex items-center gap-3">
        <label className="cursor-pointer group relative">
          <input 
            ref={logoInputRef}
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleLogoUpload}
          />
          {customLogo ? (
            <img 
              src={customLogo} 
              alt="Logo" 
              className="w-8 h-8 object-contain rounded"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#2f2f2f] flex items-center justify-center group-hover:bg-[#3a3a3a] transition-colors">
              <div className="w-3 h-3 rounded-full bg-[#ECECEC]"></div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={12} className="text-white" />
          </div>
        </label>
        <span className="text-lg font-bold tracking-tight text-[#ECECEC]">Aureum Scale</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-none group ${
                isActive
                  ? 'bg-[rgba(255,255,255,0.1)] text-[#ECECEC]'
                  : 'text-[#9B9B9B] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <item.icon
                size={20}
                className={isActive ? 'text-[#ECECEC]' : 'text-[#9B9B9B] group-hover:text-[#ECECEC]'}
              />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Switcher */}
      <div className="p-4 border-t border-[#2f2f2f] relative">
        <button
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-[#2f2f2f] border border-[#3a3a3a] hover:bg-[#3a3a3a] transition-none"
        >
           {activeUser.photoUrl ? (
             <img src={activeUser.photoUrl} alt={activeUser.name} className="w-8 h-8 rounded-full object-cover" />
           ) : (
             <div className={`w-8 h-8 rounded-full ${activeUser.color} flex items-center justify-center text-xs font-bold text-white`}>
               {activeUser.initials}
             </div>
           )}
           <div className="flex flex-col text-left flex-1 min-w-0">
             <div className="flex items-center gap-2">
               <span className="text-xs font-semibold text-[#ECECEC] truncate">{activeUser.name}</span>
               <button
                 onClick={(e) => { e.stopPropagation(); openProfileEditor(); }}
                 className="p-0.5 text-[#9B9B9B] hover:text-[#ECECEC] transition-none"
                 title="Edit profile"
               >
                 <Settings size={12} />
               </button>
             </div>
             <span className="text-[10px] text-[#666666]">Switch workspace</span>
           </div>
           <ChevronDown size={14} className={`text-[#9B9B9B] transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {userDropdownOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
            <div className="px-3 py-2 border-b border-[#3a3a3a]">
              <p className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Workspace</p>
            </div>
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => { onUserChange(user.id); setUserDropdownOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[rgba(255,255,255,0.05)] transition-none ${
                  user.id === activeUserId ? 'bg-[rgba(255,255,255,0.08)]' : ''
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
          <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#3a3a3a]">
              <h3 className="text-sm font-semibold text-[#ECECEC]">Edit profile</h3>
              <p className="text-xs text-[#9B9B9B] mt-1">Update your name and photo.</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-16 h-16 rounded-full overflow-hidden bg-[#3a3a3a] border border-[#4a4a4a] flex items-center justify-center text-[#9B9B9B]"
                >
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={18} />
                  )}
                </button>
                <div>
                  <p className="text-xs text-[#9B9B9B]">Profile photo</p>
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
                  <label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">First name</label>
                  <input value={profileFirstName} onChange={e => setProfileFirstName(e.target.value)}
                    className="w-full mt-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Last name</label>
                  <input value={profileLastName} onChange={e => setProfileLastName(e.target.value)}
                    className="w-full mt-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-[#3a3a3a]">
              <button onClick={() => setIsProfileOpen(false)} className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#ECECEC] rounded-lg text-sm font-medium transition-none">Cancel</button>
              <button onClick={saveProfile} className="px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium transition-none">Save</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
