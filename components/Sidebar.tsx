import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { NavigationItem, AppUser } from '../types';

const APP_USERS: AppUser[] = [
  { id: 'guilherme', name: 'Guilherme', label: 'Guilherme', initials: 'GU', color: 'bg-emerald-500' },
  { id: 'ai_partner', name: 'The AI Partner', label: 'The AI Partner', initials: 'AI', color: 'bg-violet-500' },
];

interface SidebarProps {
  activeItem: NavigationItem;
  onNavigate: (item: NavigationItem) => void;
  activeUserId: string;
  onUserChange: (userId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onNavigate, activeUserId, onUserChange }) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const activeUser = APP_USERS.find(u => u.id === activeUserId) || APP_USERS[0];

  const menuItems = [
    { id: NavigationItem.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
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
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
        <span className="text-lg font-bold tracking-tight text-white">Aureum Scale</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/50 border border-gray-800'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-900/50'
              }`}
            >
              <item.icon
                size={20}
                className={`transition-colors ${isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`}
              />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Switcher */}
      <div className="p-4 border-t border-gray-900 relative">
        <button
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-800/50 hover:bg-gray-900 transition-colors"
        >
           <div className={`w-8 h-8 rounded-full ${activeUser.color} flex items-center justify-center text-xs font-bold text-white`}>
             {activeUser.initials}
           </div>
           <div className="flex flex-col text-left flex-1 min-w-0">
             <span className="text-xs font-semibold text-gray-200 truncate">{activeUser.name}</span>
             <span className="text-[10px] text-gray-500">Switch workspace</span>
           </div>
           <ChevronDown size={14} className={`text-gray-500 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {userDropdownOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
            <div className="px-3 py-2 border-b border-gray-800">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Workspace</p>
            </div>
            {APP_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => { onUserChange(user.id); setUserDropdownOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800/50 transition-colors ${
                  user.id === activeUserId ? 'bg-gray-800/30' : ''
                }`}
              >
                <div className={`w-7 h-7 rounded-full ${user.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {user.initials}
                </div>
                <span className="text-xs font-medium text-gray-200 flex-1 text-left">{user.name}</span>
                {user.id === activeUserId && <Check size={14} className="text-emerald-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
