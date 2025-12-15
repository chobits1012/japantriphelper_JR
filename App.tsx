import React, { useState } from 'react';
import { Plus, Map, Calendar, ChevronRight, Copy, Plane, Sparkles } from 'lucide-react';
import { WASHI_PATTERN, HERO_IMAGE } from './constants';
import { useTripManager } from './hooks/useTripManager';
import TripView from './components/TripView';
import TripSetup from './components/TripSetup';
import type { TripSeason } from './types';

const App: React.FC = () => {
  const { trips, createTrip, createTemplateTrip, deleteTrip, updateTripMeta } = useTripManager();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  // If a trip is selected, show the TripView
  if (selectedTripId) {
    return (
      <TripView 
        tripId={selectedTripId} 
        onBack={() => setSelectedTripId(null)}
        onDeleteTrip={() => {
          deleteTrip(selectedTripId);
          setSelectedTripId(null);
        }}
        updateTripMeta={updateTripMeta}
      />
    );
  }

  // Otherwise, show the Trip List (Manager)
  const handleSetupTrip = (name: string, startDate: string, days: number, season: TripSeason) => {
    const newId = createTrip(name, startDate, days, season);
    setIsSetupOpen(false);
    setSelectedTripId(newId);
  };

  const handleCreateTemplate = () => {
    const newId = createTemplateTrip();
    setSelectedTripId(newId);
  };

  const getSeasonColor = (season: TripSeason) => {
    switch(season) {
      case 'spring': return 'bg-pink-500';
      case 'summer': return 'bg-orange-500';
      case 'autumn': return 'bg-red-600';
      case 'winter': return 'bg-sky-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative min-h-screen w-full font-sans text-ink overflow-x-hidden">
      
      <TripSetup isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} onSetup={handleSetupTrip} />

      {/* --- Background Layers --- */}
      {/* 1. Base Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
      />
      
      {/* 2. Gradient Overlay (Darkens image for text readability) */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60 z-0 backdrop-blur-[2px]" />

      {/* 3. Washi Texture Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: `url("${WASHI_PATTERN}")` }}
      />

      {/* --- Main Content --- */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col min-h-screen">
        
        {/* Header Section */}
        <div className="mb-12 text-center md:text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold tracking-widest uppercase mb-4 shadow-lg">
            <Plane size={14} className="animate-pulse" />
            Travel Planner
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white drop-shadow-lg tracking-wide mb-2">
            我的旅程
          </h1>
          <p className="text-white/80 text-lg md:text-xl font-light tracking-wider drop-shadow-md">
            下一站，想去哪裡？
          </p>
        </div>

        {/* Trip List Grid */}
        <div className="grid gap-6 flex-1 content-start">
          {trips.map((trip, index) => (
            <div 
              key={trip.id}
              onClick={() => setSelectedTripId(trip.id)}
              className="group relative bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-in slide-in-from-bottom-4 border border-white/40"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col md:flex-row h-auto md:h-48">
                {/* Image Section */}
                <div className="w-full md:w-1/3 h-40 md:h-full relative overflow-hidden">
                   <div className={`absolute top-3 left-3 z-10 ${getSeasonColor(trip.season)} text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md uppercase tracking-wider`}>
                      {trip.season}
                   </div>
                   <img 
                     src={trip.coverImage} 
                     alt={trip.name} 
                     className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                   />
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6 flex flex-col justify-center relative">
                   {/* Decorative Washi BG for content */}
                   <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url("${WASHI_PATTERN}")` }} />
                   
                   <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink group-hover:text-japan-blue transition-colors line-clamp-1">
                          {trip.name}
                        </h2>
                        <ChevronRight size={24} className="text-gray-300 group-hover:text-japan-blue group-hover:translate-x-1 transition-transform" />
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 font-medium mb-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={16} className="text-japan-blue/70" />
                            <span className="font-mono pt-0.5">{trip.startDate}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>{trip.days} Days</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-400">
                         <span className="bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold">
                            {trip.days > 5 ? 'Long Trip' : 'Short Trip'}
                         </span>
                         {trip.name.includes('關西') && <span className="bg-blue-50 text-blue-500 px-2 py-1 rounded font-bold">Kansai</span>}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Action Buttons (or Bottom Area) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <button 
                onClick={() => setIsSetupOpen(true)}
                className="flex items-center justify-center gap-3 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-white/30 border-dashed rounded-2xl text-white font-bold transition-all group hover:border-white/60 hover:shadow-lg"
            >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-japan-blue transition-colors">
                  <Plus size={24} />
                </div>
                <span className="text-lg tracking-wide">建立新旅程</span>
            </button>

            <button 
                onClick={handleCreateTemplate}
                className="flex items-center justify-center gap-3 py-5 bg-japan-blue/80 hover:bg-japan-blue/90 backdrop-blur-md rounded-2xl text-white font-bold transition-all group shadow-lg hover:shadow-japan-blue/50 hover:-translate-y-1"
            >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-japan-blue transition-colors">
                  <Sparkles size={20} />
                </div>
                <div className="flex flex-col items-start">
                   <span className="text-lg tracking-wide leading-none">建立範本</span>
                   <span className="text-xs opacity-70 font-normal mt-1">複製「關西冬之旅」</span>
                </div>
            </button>
        </div>
        
        <div className="mt-16 text-center text-white/40 text-xs font-mono tracking-widest space-y-2 pb-8">
           <p>TRAVEL ASSISTANT v2.1</p>
           <div className="flex flex-col items-center gap-1">
             <p className="text-white/60 font-bold">James Wang</p>
             <a 
               href="https://www.threads.net/@jameswangwangwang" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-white/40 hover:text-white transition-colors border-b border-transparent hover:border-white/40"
             >
               threads: jameswangwangwang
             </a>
           </div>

           {/* PWA Tip */}
           <div className="mt-6 p-3 bg-white/10 rounded-lg backdrop-blur-sm inline-block max-w-xs mx-auto border border-white/10">
              <p className="text-white/90 font-sans font-bold mb-1 text-xs">防丟失小撇步 💡</p>
              <p className="text-white/60 leading-tight text-[10px]">
                在 Safari 點擊「分享」<br/>
                選擇「加入主畫面」<br/>
                可讓資料保存更長久！
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;