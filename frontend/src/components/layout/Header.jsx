import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Moon, 
  Sun, 
  Monitor, 
  User, 
  LayoutDashboard, 
  Wrench, 
  CreditCard, 
  Gift, 
  Settings, 
  LogOut,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const ThemeSelector = ({ currentTheme, onThemeChange }) => {
  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'gray', label: 'Gray', icon: Monitor },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          data-testid="theme-selector-btn"
          className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        >
          <Moon className="w-5 h-5 text-zinc-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border-white/10">
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            data-testid={`theme-option-${theme.id}`}
            onClick={() => onThemeChange(theme.id)}
            className={`flex items-center gap-2 cursor-pointer ${
              currentTheme === theme.id ? 'text-white' : 'text-zinc-400'
            }`}
          >
            <theme.icon className="w-4 h-4" />
            {theme.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const UserMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', action: () => navigate('/') },
    { icon: Wrench, label: 'Download Plugin', action: () => window.open('/plugin', '_blank') },
    { icon: CreditCard, label: 'Billing', action: () => navigate('/pricing') },
    { icon: Gift, label: 'Redeem Code', action: () => {} },
    { icon: Settings, label: 'Manage Account', action: () => {} },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          data-testid="user-menu-btn"
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-all"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500 to-orange-600">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'user'}`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            {user?.subscription_tier === 'premium' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFD60A] rounded-full flex items-center justify-center">
                <span className="text-[8px] text-black font-bold">★</span>
              </div>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10">
        <div className="px-3 py-2 border-b border-white/5">
          <p className="font-medium text-white">{user?.username || 'User'}</p>
        </div>
        
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
            onClick={item.action}
            className="flex items-center gap-3 cursor-pointer text-zinc-300 hover:text-white"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator className="bg-white/5" />
        
        <DropdownMenuItem
          data-testid="logout-btn"
          onClick={onLogout}
          className="flex items-center gap-3 cursor-pointer text-red-400 hover:text-red-300"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </DropdownMenuItem>

        {/* Discord CTA in dropdown */}
        <div className="p-2 mt-1">
          <a
            href="https://discord.gg/notfox"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-[#5865F2] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Discord</p>
              <p className="text-xs text-zinc-500">Join for gifts</p>
            </div>
            <span className="text-zinc-500">→</span>
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Header = ({ showBackButton, projectName }) => {
  const navigate = useNavigate();
  const { user, theme, setTheme, logout } = useAuthStore();

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    try {
      await authAPI.updateTheme(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header 
      data-testid="header"
      className="fixed top-0 right-0 left-64 h-16 z-30 flex items-center justify-between px-6 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl"
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            data-testid="back-btn"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span className="text-sm">Back</span>
          </button>
        )}
        {projectName && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#FFD60A] flex items-center justify-center">
              <span className="text-xs">🦊</span>
            </div>
            <span className="text-sm text-zinc-400">beta</span>
            <span className="font-medium text-white">{projectName}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Store Purchases Button */}
        <motion.button
          data-testid="store-purchases-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-medium shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          Store Purchases
        </motion.button>

        {/* Theme Selector */}
        <ThemeSelector currentTheme={theme} onThemeChange={handleThemeChange} />

        {/* User Menu */}
        <UserMenu user={user} onLogout={handleLogout} />
      </div>
    </header>
  );
};

export default Header;
