import React, { useState, useEffect } from 'react';
import {
  Home, Cloud, Sun, CloudRain, Snowflake, BedDouble, Lightbulb, ChevronLeft, ChevronRight,
  ExternalLink, Pencil, Save, X, Plus, Trash2, Loader2, Train, CheckCircle2, Eraser, Map as MapIcon, Search, MapPin, LayoutList, Coffee, Camera, Utensils, ShoppingBag, Plane
} from 'lucide-react';
import type { ItineraryDay, ItineraryEvent, TripSeason } from '../types';
import TimelineEvent from './TimelineEvent';
import ConfirmModal from './ConfirmModal';
import PassManager from './PassManager';
import { SeasonBackground } from './SeasonBackground';
import TicketInput from './TicketInput';
import { calculateDataSizeMB } from '../lib/storageCalculator';
import { useWeatherData } from '../hooks/useWeatherData';
import { useDetailEditing } from '../hooks/useDetailEditing';
import { useEventTimeline } from '../hooks/useEventTimeline';
import { useMultiplePlans } from '../hooks/useMultiplePlans';

interface DetailPanelProps {
  day: ItineraryDay;
  allDays: ItineraryDay[];
  season: TripSeason; // New prop
  onUpdate: (updatedDay: ItineraryDay | ItineraryDay[]) => void;
  onHome: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  className?: string;
}

const getWeatherIcon = (icon?: string) => {
  switch (icon) {
    case 'sunny': return <Sun className="text-orange-400" size={20} />;
    case 'rain': return <CloudRain className="text-blue-400" size={20} />;
    case 'snow': return <Snowflake className="text-sky-300" size={20} />;
    default: return <Cloud className="text-gray-400" size={20} />;
  }
};

const getLiveWeatherIcon = (code: number, size = 16) => {
  if (code === 0 || code === 1) return <Sun className="text-orange-500 animate-pulse" size={size} />;
  if (code === 2 || code === 3) return <Cloud className="text-gray-400" size={size} />;
  if (code >= 51 && code <= 67) return <CloudRain className="text-blue-500" size={size} />;
  if (code >= 71 && code <= 77) return <Snowflake className="text-sky-400 animate-bounce" size={size} />;
  if (code >= 80 && code <= 82) return <CloudRain className="text-blue-600" size={size} />;
  if (code >= 85 && code <= 86) return <Snowflake className="text-sky-500" size={size} />;
  return <Cloud className="text-gray-400" size={size} />;
};

const getLocationQuery = (loc: string) => {
  if (!loc) return '';
  const mapping: Record<string, string> = {
    '京都': 'Kyoto', '大阪': 'Osaka', '東京': 'Tokyo', '奈良': 'Nara', '神戶': 'Kobe', '姬路': 'Himeji', '城崎': 'Kinosaki', '城崎溫泉': 'Kinosaki', '兵庫': 'Hyogo', '和歌山': 'Wakayama', '白濱': 'Shirahama', '滋賀': 'Shiga', '近江八幡': 'Omihachiman', '高島': 'Takashima', '白鬚': 'Takashima', '伊根': 'Ine', '天橋立': 'Miyazu', '舞鶴': 'Maizuru', '岡山': 'Okayama', '倉敷': 'Kurashiki', '廣島': 'Hiroshima', '宮島': 'Hatsukaichi', '福岡': 'Fukuoka', '博多': 'Fukuoka', '札幌': 'Sapporo', '小樽': 'Otaru', '函館': 'Hakodate', '富良野': 'Furano', '美瑛': 'Biei', '名古屋': 'Nagoya', '高山': 'Takayama', '白川鄉': 'Shirakawa', '金澤': 'Kanazawa', '沖繩': 'Naha', '那霸': 'Naha', '嵐山': 'Kyoto', '宇治': 'Uji', '關西機場': 'Izumisano', '成田機場': 'Narita', '羽田機場': 'Ota',
  };
  for (const key in mapping) { if (loc.includes(key)) return mapping[key]; }
  if (loc.includes(' ')) { const parts = loc.split(' '); return parts[parts.length - 1]; }
  return loc;
};

// Force HMR update
const DetailPanel: React.FC<DetailPanelProps> = ({ day, allDays, season, onUpdate, onHome, onNext, onPrev, hasPrev, hasNext, className }) => {
  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'deleteEvent' | 'removePass' | null; payload?: any; }>({ isOpen: false, type: null });

  // Use custom hooks
  const { liveWeather, forecast, loadingWeather, weatherError, debugInfo } = useWeatherData(day.location);
  const editingHook = useDetailEditing(day, onUpdate);
  const { isEditing, editData, setEditData, startEdit, cancelEdit, saveEdit, updateEditData } = editingHook;

  const eventHook = useEventTimeline(editData, setEditData, onUpdate);
  const {
    editingEventIndex, setEditingEventIndex,
    handleEventChange, handleAddEvent, handleQuickAdd, handleRemoveEvent
  } = eventHook;

  const plansHook = useMultiplePlans(day, allDays, editData, setEditData, onUpdate, isEditing);
  const { currentPlanId, PLANS, handleSwitchPlan, handleClearPlan } = plansHook;

  useEffect(() => {
    setEditingEventIndex(null);
  }, [day]);

  const handleSaveText = () => {
    const sortedEvents = [...editData.events].sort((a, b) => a.time.localeCompare(b.time));
    updateEditData({ events: sortedEvents });
    setEditingEventIndex(null);
    // Use a timeout to ensure state is updated before saving
    setTimeout(() => saveEdit(), 0);
  };

  const handleViewRoute = () => {
    const validLocations = day.events.filter(e => e.mapQuery && e.mapQuery.trim() !== '').map(e => e.mapQuery!);
    if (validLocations.length < 2) { alert('今日行程地點不足兩個，無法規劃路線。'); return; }
    const origin = encodeURIComponent(validLocations[0]);
    const destination = encodeURIComponent(validLocations[validLocations.length - 1]);
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
    if (validLocations.length > 2) {
      const waypoints = validLocations.slice(1, -1).map(loc => encodeURIComponent(loc)).join('|');
      url += `&waypoints=${waypoints}`;
    }
    window.open(url, '_blank');
  };

  const handleJorudanSearch = () => { window.open('https://world.jorudan.co.jp/mln/zh-tw/', '_blank'); };
  const handleCancel = () => { cancelEdit(); setEditingEventIndex(null); };

  const requestRemoveEvent = (index: number) => { setConfirmState({ isOpen: true, type: 'deleteEvent', payload: index }); };

  const handleConfirmAction = () => {
    if (confirmState.type === 'deleteEvent' && typeof confirmState.payload === 'number') {
      const newEvents = editData.events.filter((_, i) => i !== confirmState.payload);
      setEditData({ ...editData, events: newEvents });
      setEditingEventIndex(null);
    } else if (confirmState.type === 'removePass') {
      const updates: ItineraryDay[] = [];
      const startIndex = allDays.findIndex(d => d.day === day.day);
      if (startIndex !== -1) {
        const targetDay = allDays[startIndex];
        updates.push({
          ...targetDay,
          pass: false,
          passName: undefined,
          passColor: undefined,
          passDurationDays: undefined,
        });
        onUpdate(updates);
        cancelEdit();
      }
    }
    setConfirmState({ isOpen: false, type: null });
  };

  const key = day.day;
  const weatherUrl = `https://www.google.com/search?q=${encodeURIComponent(day.location + ' 天氣')}`;
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div key={key} className={`h-full w-full flex flex-col bg-white dark:bg-slate-950 relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 pt-[env(safe-area-inset-top)] transition-colors duration-1000 ${className || ''}`}>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.type === 'deleteEvent' ? "刪除行程" : "移除票券"}
        message={confirmState.type === 'deleteEvent' ? "確定要刪除此行程嗎？" : `確定要移除當天的交通票券設定嗎？`}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ isOpen: false, type: null })}
        isDangerous={true}
      />

      {!isEditing && (
        <SeasonBackground season={season} weather={day.weatherIcon} />
      )}

      {/* Floating Action Buttons */}
      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-5 md:top-8 md:right-8 z-50 flex items-center gap-2 transition-all">
        {isEditing ? (
          <>
            <button onClick={handleSaveText} className="p-2 rounded-full bg-japan-blue text-white shadow-lg hover:bg-japan-blue/90 transition-transform hover:scale-105 dark:bg-sky-600 dark:hover:bg-sky-500" title="儲存文字修改"><Save size={20} /></button>
            <button onClick={handleCancel} className="p-2 rounded-full bg-white text-gray-500 hover:bg-gray-100 shadow-lg transition-transform hover:scale-105 border border-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700" title="取消"><X size={20} /></button>
          </>
        ) : (
          <button onClick={startEdit} className="p-2 rounded-full bg-white text-gray-400 hover:text-japan-blue hover:bg-gray-50 shadow-lg transition-transform hover:scale-105 border border-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-700" title="編輯行程"><Pencil size={20} /></button>
        )}
        <button onClick={onHome} className="p-2 rounded-full bg-white text-japan-blue hover:bg-gray-50 shadow-lg transition-transform hover:scale-105 border border-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-sky-400 dark:hover:bg-slate-700" title="回到首頁"><Home size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto relative z-10 px-6 py-8 md:px-12 md:py-10 no-scrollbar pb-32 safe-area-bottom">
        {/* Navigation Bar Info */}
        <div className="mb-8 pt-4">

          <div className="flex items-center gap-4">
            <span className="text-4xl font-serif font-bold text-japan-blue/20 dark:text-sky-400/20 select-none">{day.day}</span>
            <div className="h-8 w-px bg-japan-blue/20 dark:bg-slate-700"></div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex gap-2 w-full sm:w-auto mt-2">
                <span className="text-xs font-bold tracking-widest text-japan-blue dark:text-sky-400 uppercase">{day.date} • {day.weekday}</span>
                {day.weatherIcon && !isEditing && (
                  <div className="flex flex-col gap-2 mt-1 w-full">
                    <a href={weatherUrl} target="_blank" rel="noreferrer" title={debugInfo ? `Lat: ${debugInfo.lat}, Lon: ${debugInfo.lon}` : ''} className="group flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-slate-400 cursor-pointer transition-transform active:scale-95 origin-left">
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">{getWeatherIcon(day.weatherIcon)}<span>{day.temp}</span></div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm border border-gray-200/60 dark:border-slate-700/60 text-ink dark:text-slate-200 group-hover:border-japan-blue/50 group-hover:text-japan-blue transition-colors">
                        {loadingWeather ? <Loader2 size={12} className="animate-spin text-japan-blue dark:text-sky-400" /> : liveWeather ? <>{getLiveWeatherIcon(liveWeather.code)}<span className="text-xs font-bold font-mono">Live: {liveWeather.temp}°</span></> : <div className="flex items-center gap-1 text-xs text-gray-400"><ExternalLink size={10} /><span>{day.location}</span></div>}
                      </div>
                    </a>
                    {forecast.length > 0 && (
                      <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-2 pb-1 mask-linear-fade pr-12">
                        {forecast.map((f, i) => (
                          <div key={i} className="flex-shrink-0 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-800/40 p-1.5 rounded-lg border border-white/60 dark:border-slate-700 min-w-[50px]">
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono">{f.date}</span>
                            <div className="my-1">{getLiveWeatherIcon(f.code, 14)}</div>
                            <span className="text-[10px] font-bold text-gray-600 dark:text-slate-300">{Math.round(f.max)}°</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Plan Selector - Compact Dropdown */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative inline-flex items-center gap-2">
              <select
                value={currentPlanId}
                onChange={(e) => handleSwitchPlan(e.target.value)}
                className="
                  pl-3 pr-8 py-2 min-h-[44px]
                  text-xs font-medium text-gray-700 dark:text-gray-300
                  bg-white dark:bg-slate-800
                  border border-gray-200 dark:border-slate-700
                  rounded-lg
                  cursor-pointer
                  appearance-none
                  hover:border-japan-blue dark:hover:border-sky-500
                  focus:outline-none focus:ring-2 focus:ring-japan-blue/20 dark:focus:ring-sky-500/20
                  transition-colors
                "
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                }}
              >
                {PLANS.map(plan => {
                  const hasContent = plan === currentPlanId
                    ? editData.events.length > 0
                    : (editData.subPlans?.[plan]?.events.length || 0) > 0;
                  return (
                    <option key={plan} value={plan}>
                      方案 {plan}{hasContent ? ' ●' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Clear Plan Button - Only show when current plan has content */}
              {editData.events.length > 0 && (
                <button
                  onClick={handleClearPlan}
                  className="p-2 min-h-[44px] min-w-[44px] rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center"
                  title={`清空方案 ${currentPlanId}`}
                >
                  <Eraser size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* EDIT MODE CONTENT */}
        {isEditing ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* New PassManager Component */}
            <PassManager
              day={day}
              allDays={allDays}
              onUpdate={(updates) => { onUpdate(updates); cancelEdit(); }}
              onRequestRemove={() => setConfirmState({ isOpen: true, type: 'removePass' })}
            />

            {/* Header Edit */}
            <div className="space-y-4 border-b border-gray-100 pb-6 dark:border-slate-800">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">標題</label>
                  <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full text-xl font-serif font-bold text-ink border-b-2 border-gray-200 focus:border-japan-blue outline-none py-2 bg-transparent dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:focus:border-sky-500 rounded-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">地點 (影響天氣)</label>
                  <input type="text" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })} className="w-full text-lg font-bold text-japan-blue border-b-2 border-gray-200 focus:border-japan-blue outline-none py-2 bg-transparent dark:bg-slate-800 dark:text-sky-400 dark:border-slate-700 dark:focus:border-sky-500 rounded-none" placeholder="例如: 東京" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">描述</label>
                <textarea value={editData.desc} onChange={e => setEditData({ ...editData, desc: e.target.value })} className="w-full p-3 bg-gray-50 rounded-lg text-base text-gray-700 outline-none focus:ring-2 focus:ring-japan-blue/20 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-500/20" rows={2} />
              </div>
            </div>

            {/* Events Edit - Click to Focus Mode */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center justify-between">
                行程列表
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">* 點擊單項進行編輯</span>
                  <button onClick={handleAddEvent} className="text-japan-blue hover:underline flex items-center gap-1 dark:text-sky-400 font-bold px-2 py-1 bg-blue-50 rounded dark:bg-slate-800"><Plus size={16} /> 新增</button>
                </div>
              </label>

              <div className="space-y-3">
                {editData.events.map((event, index) => {
                  const isFocused = editingEventIndex === index;
                  if (isFocused) {
                    return (
                      <div key={index} className="flex flex-col gap-3 bg-white shadow-md p-4 rounded-xl border-l-4 border-japan-blue relative animate-in zoom-in-95 duration-200 dark:bg-slate-800 dark:border-sky-500">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-japan-blue dark:text-sky-400 uppercase">Editing Event #{index + 1}</span>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingEventIndex(null)} className="text-gray-400 hover:text-green-600 p-2" title="完成編輯"><CheckCircle2 size={24} /></button>
                            <button onClick={() => requestRemoveEvent(index)} className="text-gray-400 hover:text-red-500 p-2" title="刪除"><Trash2 size={24} /></button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="w-full sm:w-[120px] sm:flex-shrink-0">
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">時間 (24h)</label>
                            <input
                              type="time"
                              value={event.time}
                              onChange={e => handleEventChange(index, 'time', e.target.value)}
                              onFocus={(e) => {
                                setTimeout(() => {
                                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 300);
                              }}
                              inputMode="numeric"
                              autoComplete="off"
                              className="w-full p-3 text-base font-bold border rounded-lg bg-gray-50 dark:bg-slate-900 dark:text-white dark:border-slate-600 focus:outline-none focus:border-japan-blue"
                            />
                          </div>
                          <div className="w-full sm:flex-1 sm:min-w-0">
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">類別</label>
                            <select
                              value={event.category || 'sightseeing'}
                              onChange={e => handleEventChange(index, 'category', e.target.value)}
                              className="w-full p-3 pr-10 text-base border rounded-lg bg-gray-50 dark:bg-slate-900 dark:text-white dark:border-slate-600 focus:outline-none focus:border-japan-blue appearance-none"
                            >
                              <option value="sightseeing">景點</option>
                              <option value="food">美食</option>
                              <option value="shopping">購物</option>
                              <option value="transport">交通</option>
                              <option value="hotel">住宿</option>
                              <option value="flight">航班</option>
                              <option value="activity">體驗</option>
                            </select>
                          </div>
                        </div>
                        <div><label className="text-[10px] font-bold text-gray-400 block mb-1">標題</label><input type="text" value={event.title} onChange={e => handleEventChange(index, 'title', e.target.value)} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} autoComplete="off" className="w-full p-3 font-bold border rounded-lg bg-gray-50 dark:bg-slate-900 dark:text-white dark:border-slate-600 focus:outline-none focus:border-japan-blue text-base" /></div>
                        <div><label className="text-[10px] font-bold text-gray-400 block mb-1">地圖關鍵字</label><div className="flex items-center gap-2 border rounded-lg bg-gray-50 dark:bg-slate-900 dark:border-slate-600 px-3 py-1"><MapPin size={16} className="text-gray-400 flex-shrink-0" /><input type="text" value={event.mapQuery || ''} onChange={e => handleEventChange(index, 'mapQuery', e.target.value)} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} inputMode="search" autoComplete="off" className="w-full p-2 text-base bg-transparent dark:text-white focus:outline-none" placeholder="例如: 清水寺" /></div></div>
                        <div><label className="text-[10px] font-bold text-gray-400 block mb-1">備註</label><textarea value={event.desc} onChange={e => handleEventChange(index, 'desc', e.target.value)} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} className="w-full p-3 text-base border rounded-lg h-24 resize-none bg-gray-50 dark:bg-slate-900 dark:text-white dark:border-slate-600 focus:outline-none focus:border-japan-blue" /></div>

                        {/* Ticket Input Section */}
                        <TicketInput
                          url={event.ticketUrl}
                          links={event.links}
                          imgs={event.ticketImgs}
                          legacyImg={event.ticketImg}
                          currentTotalSizeMB={calculateDataSizeMB(allDays) - calculateDataSizeMB(day) + calculateDataSizeMB(editData)}
                          onUpdate={(updates) => {
                            const newEvents = [...editData.events];
                            newEvents[index] = { ...newEvents[index], ...updates };
                            setEditData({ ...editData, events: newEvents });
                          }}
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div key={index} onClick={() => setEditingEventIndex(index)} className="flex items-center gap-3 bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 p-4 rounded-xl cursor-pointer transition-[background-color,box-shadow] group dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800 min-h-[60px]">
                        <div className="text-sm font-bold text-gray-400 w-12 flex-shrink-0 dark:text-slate-500">{event.time}</div>
                        <div className="flex-1 min-w-0"><h4 className="font-bold text-base text-ink truncate dark:text-slate-200">{event.title}</h4><p className="text-xs text-gray-500 truncate dark:text-slate-400">{event.desc}</p></div>
                        <div className="text-gray-300 group-hover:text-japan-blue dark:group-hover:text-sky-400 transition-colors p-2"><Pencil size={18} /></div>
                      </div>
                    );
                  }
                })}
                {/* Empty State / Prompt */}
                {editData.events.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                    <div className="relative w-24 h-24 mx-auto mb-4 opacity-50">
                      <div className="absolute top-0 left-4 text-japan-blue dark:text-sky-500 animate-bounce" style={{ animationDelay: '0s' }}><Plane size={32} /></div>
                      <div className="absolute top-8 right-2 text-orange-400 animate-bounce" style={{ animationDelay: '0.2s' }}><Camera size={28} /></div>
                      <div className="absolute bottom-0 left-8 text-gray-400 dark:text-slate-500"><LayoutList size={40} /></div>
                    </div>
                    <p className="text-sm font-bold mb-6">這天還沒有安排行程，想要做什麼呢？</p>
                    <div className="flex flex-wrap justify-center gap-2 px-4">
                      <button onClick={() => handleQuickAdd({ title: '早餐', time: '08:00', category: 'food' })} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-300 hover:border-orange-300 hover:text-orange-500 transition-colors shadow-sm"><Coffee size={14} /> 早餐</button>
                      <button onClick={() => handleQuickAdd({ title: '景點觀光', time: '10:00', category: 'sightseeing' })} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-500 transition-colors shadow-sm"><Camera size={14} /> 景點</button>
                      <button onClick={() => handleQuickAdd({ title: '午餐', time: '12:00', category: 'food' })} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-300 hover:border-orange-300 hover:text-orange-500 transition-colors shadow-sm"><Utensils size={14} /> 午餐</button>
                      <button onClick={() => handleQuickAdd({ title: '購物行程', time: '15:00', category: 'shopping' })} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-300 hover:border-purple-300 hover:text-purple-500 transition-colors shadow-sm"><ShoppingBag size={14} /> 購物</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-400 uppercase">住宿資訊</label>
                <input type="text" value={editData.accommodation?.name || ''} onChange={e => setEditData({ ...editData, accommodation: { ...editData.accommodation, name: e.target.value } })} className="w-full p-3 border rounded-lg text-base bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600" placeholder="飯店名稱" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-400 uppercase">小撇步</label>
                <textarea value={editData.tips || ''} onChange={e => setEditData({ ...editData, tips: e.target.value })} className="w-full p-3 border rounded-lg text-base h-24 resize-none bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600" placeholder="旅遊小提醒" />
              </div>
            </div>
          </div>
        ) : (
          /* VIEW MODE CONTENT */
          <>
            <div className="max-w-3xl mx-auto mb-10 border-b border-japan-blue/10 pb-6 dark:border-sky-500/10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-4 leading-tight dark:text-slate-100">{day.title}</h2>
              <p className="text-base md:text-lg text-gray-700 font-medium leading-relaxed bg-white/40 p-3 rounded-lg backdrop-blur-sm border border-white/40 dark:bg-slate-800/40 dark:border-slate-700/40 dark:text-slate-300">{day.desc}</p>
            </div>
            {(day.pass || day.events.length > 0) && (
              <div className="max-w-3xl mx-auto mb-10 pl-2 md:pl-4 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                {day.pass && (
                  <div className="inline-flex items-center gap-2 pr-3 pl-1.5 py-1.5 rounded-lg border shadow-sm dark:border-white/10" style={{ backgroundColor: hexToRgba(day.passColor || '#c93a40', 0.05), borderColor: hexToRgba(day.passColor || '#c93a40', 0.2) }}>
                    <div className="text-white p-1 rounded" style={{ backgroundColor: day.passColor || '#c93a40' }}><Train size={12} /></div>
                    <span className="font-bold text-xs" style={{ color: day.passColor || '#c93a40' }}>{day.passName || 'JR PASS'}</span>
                  </div>
                )}
                {day.events.filter(e => e.mapQuery).length >= 2 && (
                  <button onClick={handleViewRoute} className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-japan-blue hover:border-japan-blue/30 transition-[color,border-color] shadow-sm group dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-sky-400 dark:hover:border-sky-500/30"><MapIcon size={14} className="group-hover:scale-110 transition-transform text-japan-blue dark:text-sky-400" /><span>查看路線</span></button>
                )}
                <button onClick={handleJorudanSearch} className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-green-600 hover:border-green-200 transition-[color,border-color] shadow-sm group dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-green-400 dark:hover:border-green-500/30"><Search size={14} className="group-hover:scale-110 transition-transform text-green-500 dark:text-green-400" /><span>乘換案內</span></button>
              </div>
            )}
            <div className="max-w-3xl mx-auto pl-2 md:pl-4 mb-12">
              <div className="relative border-l-[2px] border-transparent pl-8 pb-4 space-y-2">
                {day.events.map((event, index) => (<TimelineEvent key={index} event={event} isLast={index === day.events.length - 1} />))}
              </div>
            </div>
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {day.accommodation && (
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-100 shadow-sm flex items-start gap-3 dark:bg-slate-800/80 dark:border-indigo-900/30">
                  <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg dark:bg-indigo-900/30 dark:text-indigo-400"><BedDouble size={20} /></div>
                  <div><h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Accommodation</h5><p className="font-bold text-ink text-sm dark:text-slate-200">{day.accommodation.name}</p>{day.accommodation.checkIn && <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">Check-in after {day.accommodation.checkIn}</p>}</div>
                </div>
              )}
              {day.tips && (
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-amber-100 shadow-sm flex items-start gap-3 dark:bg-slate-800/80 dark:border-amber-900/30">
                  <div className="p-2 bg-amber-50 text-amber-500 rounded-lg dark:bg-amber-900/30 dark:text-amber-400"><Lightbulb size={20} /></div>
                  <div><h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Travel Tip</h5><p className="text-sm text-gray-700 leading-relaxed dark:text-slate-300">{day.tips}</p></div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-4 pb-8 z-20 flex justify-between items-center safe-area-bottom dark:bg-slate-900/90 dark:border-slate-800">
        <button onClick={onPrev} disabled={!hasPrev || isEditing} className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 min-h-[44px] rounded-lg transition-[background-color,color] ${hasPrev && !isEditing ? 'text-japan-blue hover:bg-japan-blue/5 dark:text-sky-400 dark:hover:bg-slate-800' : 'text-gray-300 cursor-not-allowed dark:text-slate-700'}`}><ChevronLeft size={16} /><span className="hidden md:inline">上一天</span></button>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap dark:text-slate-500">{day.day}</span>
        <button onClick={onNext} disabled={!hasNext || isEditing} className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 min-h-[44px] rounded-lg transition-[background-color,color] ${hasNext && !isEditing ? 'text-japan-blue hover:bg-japan-blue/5 dark:text-sky-400 dark:hover:bg-slate-800' : 'text-gray-300 cursor-not-allowed dark:text-slate-700'}`}><span className="hidden md:inline">下一天</span><ChevronRight size={16} /></button>
      </div>
    </div >
  );
};

export default DetailPanel;