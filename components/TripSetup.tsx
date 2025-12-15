import React, { useState } from 'react';
import { Calendar, Map, Clock, ArrowRight, Flower2, Sun, Leaf, Snowflake, RotateCcw } from 'lucide-react';
import type { TripSeason } from '../types';

interface TripSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSetup: (name: string, startDate: string, days: number, season: TripSeason) => void;
}

// Helper to get local date string YYYY-MM-DD
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TripSetup: React.FC<TripSetupProps> = ({ isOpen, onClose, onSetup }) => {
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [duration, setDuration] = useState(5);
  const [season, setSeason] = useState<TripSeason>('spring');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!tripName || !startDate || duration < 1) {
      alert('請填寫完整旅程資訊');
      return;
    }
    onSetup(tripName, startDate, duration, season);
    onClose();
  };

  const handleReset = () => {
    setTripName('');
    setStartDate(getTodayString());
    setDuration(5);
    setSeason('spring');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Decorative Header - Fixed */}
        <div className={`h-32 relative overflow-hidden flex-shrink-0 flex items-center justify-center transition-colors duration-500
          ${season === 'spring' ? 'bg-pink-400' : 
            season === 'summer' ? 'bg-orange-400' : 
            season === 'autumn' ? 'bg-red-500' : 'bg-sky-500'}
        `}>
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
           
           {season === 'spring' && <Flower2 className="text-white/80 w-24 h-24 absolute -right-4 -top-4 animate-pulse" />}
           {season === 'summer' && <Sun className="text-white/80 w-24 h-24 absolute -right-4 -top-4 animate-spin-slow" />}
           {season === 'autumn' && <Leaf className="text-white/80 w-24 h-24 absolute -right-4 -top-4 animate-bounce" />}
           {season === 'winter' && <Snowflake className="text-white/80 w-24 h-24 absolute -right-4 -top-4 animate-pulse" />}

           <h2 className="text-2xl font-serif font-bold text-white absolute bottom-4 left-6 drop-shadow-md">
             開啟新旅程
           </h2>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-8 space-y-6 overflow-y-auto">
           {/* Trip Name */}
           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                 <Map size={14} /> 旅程名稱
              </label>
              <input 
                type="text" 
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="例如：2025 東京賞櫻團"
                className="w-full text-lg font-bold border-b-2 border-gray-200 dark:border-slate-700 focus:border-japan-blue dark:focus:border-sky-500 outline-none py-2 text-ink dark:text-white placeholder-gray-300 bg-transparent rounded-none"
              />
           </div>

           {/* Season Selector */}
           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                 選擇季節 (影響主題圖示)
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button 
                  onClick={() => setSeason('spring')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${season === 'spring' ? 'border-pink-400 bg-pink-50 text-pink-500' : 'border-gray-100 dark:border-slate-700 text-gray-400 hover:border-pink-200'}`}
                >
                   <Flower2 size={20} />
                   <span className="text-xs font-bold mt-1">春</span>
                </button>
                <button 
                  onClick={() => setSeason('summer')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${season === 'summer' ? 'border-orange-400 bg-orange-50 text-orange-500' : 'border-gray-100 dark:border-slate-700 text-gray-400 hover:border-orange-200'}`}
                >
                   <Sun size={20} />
                   <span className="text-xs font-bold mt-1">夏</span>
                </button>
                <button 
                  onClick={() => setSeason('autumn')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${season === 'autumn' ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-100 dark:border-slate-700 text-gray-400 hover:border-red-200'}`}
                >
                   <Leaf size={20} />
                   <span className="text-xs font-bold mt-1">秋</span>
                </button>
                <button 
                  onClick={() => setSeason('winter')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${season === 'winter' ? 'border-sky-500 bg-sky-50 text-sky-500' : 'border-gray-100 dark:border-slate-700 text-gray-400 hover:border-sky-200'}`}
                >
                   <Snowflake size={20} />
                   <span className="text-xs font-bold mt-1">冬</span>
                </button>
              </div>
           </div>

           {/* Start Date */}
           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                 <Calendar size={14} /> 出發日期
              </label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-lg font-mono font-bold border-b-2 border-gray-200 dark:border-slate-700 focus:border-japan-blue dark:focus:border-sky-500 outline-none py-2 text-ink dark:text-white bg-transparent rounded-none"
              />
           </div>

           {/* Duration */}
           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                 <Clock size={14} /> 天數
              </label>
              <div className="flex items-center gap-4">
                 <input 
                   type="range" 
                   min="1" 
                   max="30" 
                   value={duration}
                   onChange={(e) => setDuration(parseInt(e.target.value))}
                   className="flex-1 accent-japan-blue h-2 bg-gray-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                 />
                 <span className="text-2xl font-serif font-bold text-japan-blue dark:text-sky-400 w-12 text-center">
                    {duration}
                 </span>
                 <span className="text-sm font-bold text-gray-400">天</span>
              </div>
           </div>

           <button 
             onClick={handleSubmit}
             className="w-full bg-japan-blue text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-japan-blue/90 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 mt-4 dark:bg-sky-600 dark:hover:bg-sky-500"
           >
             開始規劃 <ArrowRight size={20} />
           </button>
           
           <div className="flex gap-3">
             <button 
               onClick={onClose}
               className="flex-1 text-gray-400 text-sm font-bold hover:text-gray-600 py-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
             >
               取消
             </button>
             <button 
               onClick={handleReset}
               className="flex-1 text-japan-blue dark:text-sky-400 text-sm font-bold hover:text-blue-600 py-2 border border-blue-100 dark:border-sky-900 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1"
             >
               <RotateCcw size={14} /> 重置
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TripSetup;