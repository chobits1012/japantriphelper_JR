import React, { useEffect, useMemo, useState } from 'react';
import { Snowflake, Sparkles, RotateCcw, Briefcase, Flower2, Sun, Leaf, Plus, Moon, ArrowLeft, Trash2, Pencil, Check, X, ClipboardCopy } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { WASHI_PATTERN, HERO_IMAGE, ITINERARY_DATA } from '../constants';
import type { ItineraryDay, ExpenseItem, ChecklistCategory, TripSeason, TripSettings, TripMetadata } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { useItinerary } from '../hooks/useItinerary';
import { useUIState } from '../hooks/useUIState';
import DetailPanel from './DetailModal';
import AIGenerator from './AIGenerator';
import TravelToolbox from './TravelToolbox';
import ConfirmModal from './ConfirmModal';
import { SortableDayCard } from './SortableDayCard';
import { DayCard } from './DayCard';
import BottomSheet from './BottomSheet';

interface TripViewProps {
  tripId: string;
  onBack: () => void;
  onDeleteTrip: () => void;
  updateTripMeta: (id: string, updates: Partial<TripMetadata>) => void;
}

const DARK_MODE_KEY = 'kansai-trip-dark-mode';

const TripView: React.FC<TripViewProps> = ({ tripId, onBack, onDeleteTrip, updateTripMeta }) => {
  const SETTINGS_KEY = `trip-${tripId}-settings`;
  const EXPENSE_KEY = `trip-${tripId}-expenses`;
  const CHECKLIST_KEY = `trip-${tripId}-checklist`;

  const [tripSettings, setTripSettings] = useLocalStorage<TripSettings>(SETTINGS_KEY, { name: "新旅程", startDate: "2026-01-01", season: 'spring' });

  const {
    itineraryData,
    setItineraryData,
    addDay,
    deleteDay,
    reorderDays,
    updateDay,
  } = useItinerary(tripId, tripSettings, (newCount) => {
    updateTripMeta(tripId, { days: newCount });
  });

  const {
    selectedDayIndex,
    setSelectedDayIndex,
    isAIModalOpen,
    setIsAIModalOpen,
    isToolboxOpen,
    setIsToolboxOpen,
    activeDragId,
    setActiveDragId,
    handleHome, handleDaySelect, handleNext, handlePrev, isHome
  } = useUIState(itineraryData.length);

  const [expenses, setExpenses] = useLocalStorage<ExpenseItem[]>(EXPENSE_KEY, []);

  const [checklist, setChecklist] = useLocalStorage<ChecklistCategory[]>(CHECKLIST_KEY, () => []);

  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>(DARK_MODE_KEY, false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    type: 'reset' | 'deleteDay' | 'deleteTrip' | null;
    payload?: string;
  }>({ isOpen: false, type: null });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!isEditingTitle) {
      setTempTitle(tripSettings.name);
    }
  }, [tripSettings.name, isEditingTitle]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (over && active.id !== over.id) {
      reorderDays(active.id as string, over.id as string);
    }
  };

  const handleAddDay = () => {
    addDay();
    setTimeout(() => {
      const listContainer = document.querySelector('.no-scrollbar');
      if (listContainer) listContainer.scrollTop = listContainer.scrollHeight;
    }, 100);
  };

  const requestDeleteDay = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmState({ isOpen: true, type: 'deleteDay', payload: id });
  };

  const requestReset = () => {
    setConfirmState({ isOpen: true, type: 'reset' });
  };

  const requestDeleteTrip = () => {
    setConfirmState({ isOpen: true, type: 'deleteTrip' });
  }

  const handleConfirmAction = () => {
    if (confirmState.type === 'deleteDay' && confirmState.payload) {
      deleteDay(confirmState.payload);
      if (selectedDayIndex !== null) setSelectedDayIndex(null);
    }
    else if (confirmState.type === 'reset') {
      const dateObj = new Date(tripSettings.startDate);
      const dateStr = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const emptyDay: ItineraryDay = {
        id: Math.random().toString(36).substr(2, 9),
        day: 'Day 1',
        date: dateStr,
        weekday: weekday,
        title: "自由活動",
        desc: "點擊編輯來規劃行程",
        pass: false,
        bg: "https://picsum.photos/id/28/1000/600",
        location: "Japan",
        weatherIcon: tripSettings.season === 'winter' ? 'snow' : 'sunny',
        temp: "--°C",
        events: []
      };

      setItineraryData([emptyDay]);
      updateTripMeta(tripId, { days: 1 });
      setSelectedDayIndex(null);
    }
    else if (confirmState.type === 'deleteTrip') {
      onDeleteTrip();
    }
    setConfirmState({ isOpen: false, type: null });
  };

  const handleAIGenerate = (newGeneratedDays: ItineraryDay[], isFullReplace: boolean) => {
    const daysWithIds = newGeneratedDays.map(d => ({ ...d, id: d.id || Math.random().toString(36).substr(2, 9) }));
    if (isFullReplace) {
      setItineraryData(daysWithIds);
      updateTripMeta(tripId, { days: daysWithIds.length });
      setSelectedDayIndex(null);
    } else {
      setItineraryData(prevData => {
        const newDaysMap = new Map(daysWithIds.map(d => [d.day, d]));
        return prevData.map(day => {
          const newData = newDaysMap.get(day.day);
          return newData ? { ...newData, id: day.id } : day;
        });
      });
      if (daysWithIds.length === 1) {
        const dayIndex = itineraryData.findIndex(d => d.day === daysWithIds[0].day);
        if (dayIndex !== -1) setSelectedDayIndex(dayIndex);
      }
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      setTripSettings(prev => ({ ...prev, name: tempTitle }));
      updateTripMeta(tripId, { name: tempTitle });
    }
    setIsEditingTitle(false);
  };

  const handleCopyText = () => {
    let text = `【${tripSettings.name}】\n日期：${tripSettings.startDate} 出發\n\n`;
    itineraryData.forEach(day => {
      text += `📅 ${day.day} (${day.date} ${day.weekday}) - ${day.title}\n`;
      text += `📍 ${day.desc}\n`;
      if (day.accommodation) text += `🏨 住宿：${day.accommodation.name}\n`;
      day.events.forEach(event => {
        text += `   - ${event.time} ${event.title}`;
        if (event.desc) text += ` : ${event.desc}`;
        text += '\n';
      });
      text += '\n------------------\n\n';
    });
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const selectedDay = selectedDayIndex !== null ? itineraryData[selectedDayIndex] : null;
  const activeDragItem = activeDragId ? itineraryData.find(d => d.id === activeDragId) : null;

  const getSeasonIcon = (season: TripSeason, size: number, className?: string) => {
    switch (season) {
      case 'spring': return <Flower2 size={size} className={`text-pink-400 ${className}`} />;
      case 'summer': return <Sun size={size} className={`text-orange-400 ${className}`} />;
      case 'autumn': return <Leaf size={size} className={`text-red-500 ${className}`} />;
      case 'winter': return <Snowflake size={size} className={`text-sky-400 ${className}`} />;
      default: return <Snowflake size={size} className={`text-sky-400 ${className}`} />;
    }
  };

  const passUsageMap = useMemo(() => {
    const usage = new Map<string, number>();
    itineraryData.forEach(day => {
      if (day.passName) {
        usage.set(day.passName, (usage.get(day.passName) || 0) + 1);
      }
    });
    return usage;
  }, [itineraryData]);

  // Mobile Bottom Sheet Close Handler
  const handleCloseDetail = () => {
    handleHome(); // Resets selectedDayIndex to null
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans text-ink bg-paper dark:bg-slate-950 dark:text-slate-100 transition-colors duration-1000">

      {/* Background Texture */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000 ${isDarkMode ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundImage: `url("${WASHI_PATTERN}")` }}
      />

      {/* Hero Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear transform scale-105"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
      />

      {/* Dark Overlay Gradients */}
      <div className={`absolute inset-0 bg-gradient-to-t from-japan-blue/90 via-black/40 to-black/30 transition-opacity duration-1000 ${!isDarkMode ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute inset-0 bg-gradient-to-t from-slate-950/90 via-black/60 to-black/40 transition-opacity duration-1000 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`} />

      {/* Main Content Area */}
      <div className="absolute inset-0 flex flex-row overflow-hidden">

        {/* Left Panel / Main List Panel */}
        {/* Changed: Always visible on Mobile, but width varies on Desktop */}
        <div
          className={`relative z-10 flex flex-col transition-all duration-1000 ease-[cubic-bezier(0.25,0.8,0.25,1)] flex-shrink-0 pt-[env(safe-area-inset-top)] w-full lg:w-[380px] bg-transparent lg:bg-white/90 lg:backdrop-blur-md lg:border-r lg:border-gray-200/60 lg:dark:bg-slate-900/90 lg:dark:border-slate-700/60`}
        >

          {/* Header Section */}
          <div className={`transition-all duration-1000 flex-shrink-0 relative h-[25vh] flex flex-col justify-end items-center pb-8 text-white text-shadow-lg`}>
            <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50 flex justify-between w-[calc(100%-2rem)] md:w-[calc(100%-4rem)]">
              <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold transition-all">
                <ArrowLeft size={16} /> 我的旅程
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold transition-all group"
                >
                  <span className="hidden md:inline text-xs opacity-80 group-hover:opacity-100">
                    {isCopied ? '已複製' : '複製文字'}
                  </span>
                  {isCopied ? <Check size={16} className="text-green-400" /> : <ClipboardCopy size={16} />}
                </button>

                <button
                  onClick={requestDeleteTrip}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 text-white text-sm font-bold transition-all group"
                >
                  <span className="hidden md:inline text-xs opacity-80 group-hover:opacity-100">刪除旅程</span>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              {getSeasonIcon(tripSettings.season, 24, "animate-pulse")}
              <span className="text-sm font-bold tracking-[0.4em] uppercase">{tripSettings.startDate.split('-')[0]} Trip</span>
            </div>

            {isEditingTitle ? (
              <div className="flex items-center justify-center gap-2 px-4 w-full max-w-lg mx-auto relative z-20">
                <input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="flex-1 min-w-0 text-3xl md:text-5xl font-serif font-bold tracking-widest leading-tight text-center drop-shadow-md bg-transparent border-b-2 border-white/50 text-white outline-none"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); }}
                />
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={handleSaveTitle} className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-green-400 transition-colors"><Check size={20} /></button>
                  <button onClick={() => setIsEditingTitle(false)} className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"><X size={20} /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full max-w-4xl mx-auto px-4 group/title relative">
                <div className="flex-1"></div>
                <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-widest leading-tight text-center drop-shadow-md shrink-0">
                  {tripSettings.name}
                </h1>
                <div className="flex-1 flex justify-start pl-4">
                  <button
                    onClick={() => { setTempTitle(tripSettings.name); setIsEditingTitle(true); }}
                    className="opacity-0 group-hover/title:opacity-100 transition-opacity p-2 rounded-full hover:bg-white/20 text-white/80"
                  >
                    <Pencil size={20} />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 w-16 h-1 bg-japan-red shadow-lg rounded-full"></div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-28 px-4 pt-4 lg:pb-0">
              <div className="max-w-2xl mx-auto lg:max-w-none">
                <SortableContext items={itineraryData.map(d => d.id)} strategy={verticalListSortingStrategy}>
                  {itineraryData.map((item, index) => (
                    <SortableDayCard
                      key={item.id}
                      day={item}
                      index={index}
                      isSelected={selectedDayIndex === index}
                      isHome={true} // Always render as "Home" style in list now
                      onClick={() => handleDaySelect(index)}
                      onDelete={(e) => requestDeleteDay(e, item.id)}
                      passUsageMap={passUsageMap}
                    />
                  ))}
                </SortableContext>

                <button
                  onClick={handleAddDay}
                  className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-japan-blue hover:text-japan-blue hover:bg-white/50 transition-all flex items-center justify-center gap-2 font-bold mb-20 dark:border-slate-600 dark:text-slate-500 dark:hover:border-sky-400 dark:hover:text-sky-400 dark:hover:bg-slate-800"
                >
                  <Plus size={20} />
                  新增行程日
                </button>
              </div>
            </div>

            <DragOverlay>
              {activeDragItem ? (
                <DayCard
                  day={activeDragItem}
                  isSelected={false}
                  isHome={true}
                  passUsageMap={passUsageMap}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Floating Dock (Bottom Toolbar) */}
          <div
            className="absolute z-30 flex items-center gap-3 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-300 hover:scale-105 hover:border-white/40"
            style={{ bottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            <button onClick={toggleDarkMode} title={isDarkMode ? "Switch Light" : "Switch Dark"} className="p-2 rounded-full text-white/70 hover:text-yellow-300 transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="w-px h-6 bg-white/20 mx-1"></div>

            <button onClick={requestReset} title="Reset Trip" className="p-2 rounded-full text-white/70 hover:text-white transition-colors">
              <RotateCcw size={20} />
            </button>

            <button onClick={() => setIsToolboxOpen(true)} title="Toolbox" className="p-3 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-full text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 transition-all mx-1">
              <Briefcase size={20} />
            </button>

            <button onClick={() => setIsAIModalOpen(true)} className="p-3 bg-gradient-to-tr from-japan-blue to-blue-600 rounded-full text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all mx-1 dark:from-sky-600 dark:to-sky-500">
              <Sparkles size={20} />
            </button>
          </div>
        </div>

        {/* Right Panel (Desktop Detail View) */}
        {selectedDay && selectedDayIndex !== null && (
          <div className="hidden lg:flex flex-1 relative overflow-hidden bg-paper shadow-2xl z-20">
            <DetailPanel
              day={selectedDay}
              allDays={itineraryData}
              season={tripSettings.season}
              onUpdate={updateDay}
              onHome={handleHome}
              onNext={handleNext}
              onPrev={handlePrev}
              hasNext={selectedDayIndex < itineraryData.length - 1}
              hasPrev={selectedDayIndex > 0}
            />
          </div>
        )}

        {/* Mobile Bottom Sheet (Mobile Detail View) */}
        <BottomSheet
          isOpen={selectedDay !== null && window.innerWidth < 1024} // Only show if selected and screen is small
          onClose={handleCloseDetail}
        >
          {selectedDay && (
            <DetailPanel
              day={selectedDay}
              allDays={itineraryData}
              season={tripSettings.season}
              onUpdate={updateDay}
              onHome={handleHome}
              onNext={handleNext}
              onPrev={handlePrev}
              hasNext={selectedDayIndex < itineraryData.length - 1}
              hasPrev={selectedDayIndex > 0}
              className="bg-transparent" // Override background to let sheet handle it if needed
              isSheet={true}
            />
          )}
        </BottomSheet>

        {/* Modals */}
        <AIGenerator
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          onGenerate={handleAIGenerate}
          existingDays={itineraryData}
          startDate={tripSettings.startDate}
          tripName={tripSettings.name}
        />

        <TravelToolbox
          isOpen={isToolboxOpen}
          onClose={() => setIsToolboxOpen(false)}
          tripSettings={tripSettings}
          onUpdateTripSettings={setTripSettings}
          itineraryData={itineraryData}
          onUpdateItinerary={setItineraryData}
          expenses={expenses}
          onUpdateExpenses={setExpenses}
          checklist={checklist}
          onUpdateChecklist={setChecklist}
        />

        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.type === 'reset' ? "重置目前旅程" : confirmState.type === 'deleteTrip' ? "刪除整趟旅程" : "刪除行程日"}
          message={
            confirmState.type === 'reset'
              ? "確定要重置這個旅程嗎？\n所有的編輯將會還原為預設範本。\n(您的記帳與清單會保留)"
              : confirmState.type === 'deleteTrip'
                ? "⚠️ 確定要刪除這趟旅程嗎？\n所有行程、記帳、清單都會被永久刪除，無法復原！"
                : "確定要刪除這一整天的行程嗎？刪除後無法復原。"
          }
          confirmText={confirmState.type === 'deleteTrip' ? "確認刪除旅程" : confirmState.type === 'reset' ? "確認重置" : "確認刪除"}
          isDangerous={true}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmState({ isOpen: false, type: null })}
        />
      </div>
    </div>
  );
};

export default TripView;