import React, { useState } from 'react';
import { Plus, Map, Calendar, ChevronRight, Copy, Plane, Sparkles, Palette } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { WASHI_PATTERN, HERO_IMAGE } from './constants';
import { useTripManager } from './hooks/useTripManager';
import TripView from './components/TripView';
import TripSetup from './components/TripSetup';
import { SortableTripCard } from './components/SortableTripCard';
import { TripCard } from './components/TripCard';
import type { TripSeason } from './types';

// ... imports
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const App: React.FC = () => {
  // ... existing hooks

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

// Extracting the main content to a separate component to use the hook if needed inside
const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { trips, createTrip, createTemplateTrip, deleteTrip, updateTripMeta, reorderTrips } = useTripManager();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (over && active.id !== over.id) {
      reorderTrips(active.id as string, over.id as string);
    }
  };

  const activeDragTrip = activeDragId ? trips.find(t => t.id === activeDragId) : null;

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
    switch (season) {
      case 'spring': return 'bg-pink-500';
      case 'summer': return 'bg-orange-500';
      case 'autumn': return 'bg-red-600';
      case 'winter': return 'bg-sky-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`
      relative min-h-screen w-full font-sans overflow-x-hidden transition-colors duration-500
      ${theme === 'comfort' ? 'bg-comfort-beige text-comfort-dark' : 'text-ink'}
    `}>

      <TripSetup isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} onSetup={handleSetupTrip} />

      {/* --- Background Layers --- */}
      {theme === 'classic' && (
        <>
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
        </>
      )}

      {/* --- Main Content --- */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col min-h-screen">

        {/* Header Section */}
        <div className={`
          mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700
          ${theme === 'comfort' ? 'text-left' : 'text-center md:text-left'}
        `}>
          <div className={`
             inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 shadow-lg
             ${theme === 'comfort'
              ? 'bg-transparent border border-comfort-dark text-comfort-dark'
              : 'bg-white/20 backdrop-blur-md border border-white/30 text-white'}
          `}>
            <Plane size={14} className="animate-pulse" />
            Travel Planner
          </div>

          <button
            onClick={toggleTheme}
            className={`
               ml-4 inline-flex items-center gap-2 px-3 py-1 rounded-full transition-all text-xs font-bold uppercase tracking-widest shadow-lg mb-4
               ${theme === 'comfort'
                ? 'bg-white border border-comfort-dark text-comfort-dark hover:bg-comfort-dark hover:text-comfort-beige'
                : 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30'
              }
             `}
          >
            {theme === 'comfort' ? <Palette size={12} /> : <Palette size={12} />}
            {theme === 'comfort' ? 'Comfort Mode' : 'Classic Mode'}
          </button>

          <h1 className={`
            text-4xl md:text-6xl font-bold tracking-wide mb-2
            ${theme === 'comfort' ? 'text-comfort-dark font-sans' : 'text-white font-serif drop-shadow-lg'}
          `}>
            {theme === 'comfort' ? 'My Trips' : '我的旅程'}
          </h1>
          <p className={`
            text-lg md:text-xl font-light tracking-wider
            ${theme === 'comfort' ? 'text-comfort-dark/60' : 'text-white/80 drop-shadow-md'}
          `}>
            {theme === 'comfort' ? 'Where to next?' : '下一站，想去哪裡？'}
          </p>
        </div>

        {/* Trip List Grid */}
        <div className="flex-1 content-start">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
          >
            <SortableContext
              items={trips.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-6">
                {trips.map((trip) => (
                  <SortableTripCard
                    key={trip.id}
                    trip={trip}
                    onClick={() => {
                      // prevent click if we just dragged is handled by dnd-kit usually, 
                      // but pointer sensor helps.
                      setSelectedTripId(trip.id);
                    }}
                    getSeasonColor={getSeasonColor}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeDragTrip ? (
                <TripCard
                  trip={activeDragTrip}
                  getSeasonColor={getSeasonColor}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Explicit Spacer to prevent sticking */}
        <div className="h-20 shrink-0" aria-hidden="true" />

        {/* Floating Action Buttons (or Bottom Area) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          {/* Card 1: Plan a Trip */}
          <button
            onClick={() => setIsSetupOpen(true)}
            className={`
              relative flex flex-col justify-between p-8 rounded-[40px] font-bold transition-all group overflow-hidden text-left min-h-[180px]
              ${theme === 'comfort'
                ? 'bg-[#E5DDD0] text-[#1A1A1A] hover:brightness-[0.97] shadow-none'
                : 'bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-white/30 border-dashed rounded-2xl text-white hover:border-white/60 hover:shadow-lg'
              }
            `}
          >
            {theme === 'comfort' ? (
              <>
                {/* Top Section */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.15em] opacity-50">開始新旅程</span>
                  <span className="text-3xl font-extrabold tracking-tight leading-tight">Plan a Trip</span>
                </div>
                {/* Bottom Section with Pill Badge */}
                <div className="flex items-end justify-between mt-4">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#1A1A1A]/10 text-[11px] font-bold tracking-wide">
                    自訂行程
                  </span>
                  <div className="w-14 h-14 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-all">
                    <Plus size={24} strokeWidth={2.5} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3 w-full h-full">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-japan-blue transition-colors">
                  <Plus size={24} />
                </div>
                <span className="text-lg tracking-wide">建立新旅程</span>
              </div>
            )}
          </button>

          {/* Card 2: Use Template */}
          <button
            onClick={handleCreateTemplate}
            className={`
              relative flex flex-col justify-between p-8 rounded-[40px] font-bold transition-all group overflow-hidden text-left min-h-[180px]
              ${theme === 'comfort'
                ? 'bg-[#E5DDD0] text-[#1A1A1A] hover:brightness-[0.97] shadow-none'
                : 'bg-japan-blue/80 hover:bg-japan-blue/90 backdrop-blur-md rounded-2xl text-white shadow-lg hover:shadow-japan-blue/50 hover:-translate-y-1'
              }
            `}
          >
            {theme === 'comfort' ? (
              <>
                {/* Top Section */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.15em] opacity-50">快速開始</span>
                  <span className="text-3xl font-extrabold tracking-tight leading-tight">Use Template</span>
                </div>
                {/* Bottom Section with Pill Badge */}
                <div className="flex items-end justify-between mt-4">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#1A1A1A]/10 text-[11px] font-bold tracking-wide">
                    關西冬之旅
                  </span>
                  <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                    <Sparkles size={22} strokeWidth={2.5} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3 w-full h-full">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-japan-blue transition-colors">
                  <Sparkles size={20} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-lg tracking-wide leading-none">建立範本</span>
                  <span className="text-xs opacity-70 font-normal mt-1">複製「關西冬之旅」</span>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Footer Section */}
        <div className={`
             mt-16 text-center text-xs tracking-widest space-y-3 pb-8
             ${theme === 'comfort' ? 'text-[#1A1A1A]/40 font-sans' : 'text-white/40 font-mono'}
        `}>
          <p className="uppercase tracking-[0.2em]">Travel Assistant v2.3</p>
          <div className="flex flex-col items-center gap-1">
            <p className={`font-bold ${theme === 'comfort' ? 'text-[#1A1A1A]/60' : 'text-white/60'}`}>James Wang</p>
            <a
              href="https://www.threads.net/@jameswangwangwang"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                transition-colors border-b border-transparent 
                ${theme === 'comfort'
                  ? 'text-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:border-[#1A1A1A]/40'
                  : 'text-white/40 hover:text-white hover:border-white/40'}
              `}
            >
              threads: jameswangwangwang
            </a>
          </div>

          {/* PWA Tip - M.cares Style Card */}
          <div className={`
             mt-8 p-6 rounded-[30px] inline-block max-w-sm mx-auto text-left
             ${theme === 'comfort'
              ? 'bg-[#E5DDD0] text-[#1A1A1A]'
              : 'bg-white/10 border border-white/10 text-white backdrop-blur-sm'
            }
          `}>
            <p className={`font-bold mb-2 text-sm ${theme === 'comfort' ? 'text-[#1A1A1A]/90' : 'text-white/90'}`}>
              💡 防丟失小撇步
            </p>
            <p className={`leading-relaxed text-xs ${theme === 'comfort' ? 'text-[#1A1A1A]/60' : 'text-white/60'}`}>
              在 Safari 點擊「分享」→ 選擇「加入主畫面」<br />
              可讓資料保存更長久！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;