import React from 'react';
import { Box, Sparkles } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Gemini Workbench</h1>
        </div>
        
        <div className="flex items-center gap-4">
           <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            System Ready
          </span>
        </div>
      </div>
    </header>
  );
};