
import React from 'react';
import { X, CalendarRange, MapPin } from 'lucide-react';
import { ItineraryDay } from '../types';

interface OverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  days: ItineraryDay[];
  onSelectDay: (index: number) => void;
}

const OverviewModal: React.FC<OverviewModalProps> = ({ isOpen, onClose, days, onSelectDay }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-japan-blue p-4 flex items-center justify-between text-white shadow-md z-10">
          <div className="flex items-center gap-2">
            <CalendarRange size={20} className="text-yellow-300" />
            <h3 className="font-serif font-bold text-lg tracking-wide">行程總覽 ({days.length} 天)</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-paper dark:bg-slate-950">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {days.map((day, index) => (
              <button
                key={day.id}
                onClick={() => {
                  onSelectDay(index);
                  onClose();
                }}
                className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left"
              >
                {/* Image Header */}
                <div className="h-24 w-full overflow-hidden relative">
                   <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700 animate-pulse" />
                   <img 
                      src={day.bg} 
                      alt={day.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                   <span className="absolute bottom-2 left-3 text-white font-serif font-bold text-lg drop-shadow-md">
                      {day.day}
                   </span>
                </div>

                {/* Content */}
                <div className="p-3 flex-1 flex flex-col gap-1">
                   <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <span>{day.date}</span>
                      <span>{day.weekday}</span>
                   </div>
                   <h4 className="font-bold text-ink dark:text-slate-100 line-clamp-1 group-hover:text-japan-blue dark:group-hover:text-sky-400 transition-colors">
                      {day.title}
                   </h4>
                   <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400 mt-auto pt-2">
                      <MapPin size={10} />
                      <span className="truncate">{day.location || 'Japan'}</span>
                   </div>
                </div>
                
                {/* Selection Indicator */}
                <div className="absolute inset-0 border-2 border-japan-blue opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewModal;
