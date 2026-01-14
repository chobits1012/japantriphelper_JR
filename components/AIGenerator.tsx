import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, KeyRound, Send, CalendarRange, Calendar, Save, Trash2, ExternalLink, HelpCircle, ChevronDown } from 'lucide-react';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ItineraryDay } from '../types';

const API_KEY_STORAGE_KEY = 'gemini_api_key_saved';
const GOOGLE_AI_STUDIO_URL = 'https://aistudio.google.com/app/apikey';

interface AIGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: ItineraryDay[], isFullReplace: boolean, targetPlan?: string) => void;
  existingDays: ItineraryDay[];
  startDate: string; // New: Trip start date
  tripName: string;  // New: Trip name for context
}

const ITINERARY_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: { type: Type.STRING, description: "Format: Day X" },
      date: { type: Type.STRING, description: "Format: MM/DD" },
      weekday: { type: Type.STRING, description: "Format: Mon, Tue..." },
      title: { type: Type.STRING, description: "Theme of the day OR 1-2 main highlights. MAX 10 chars." },
      desc: { type: Type.STRING, description: "Brief summary of locations only. Example: 'Loc A ➔ Loc B ➔ Loc C'" },
      pass: { type: Type.BOOLEAN, description: "Always set to false. User manually configures passes." },
      bg: { type: Type.STRING, description: "Unsplash Image URL relating to the location" },
      weatherIcon: { type: Type.STRING, enum: ['sunny', 'cloudy', 'rain', 'snow'] },
      temp: { type: Type.STRING, description: "e.g. 5°C / 10°C" },
      location: { type: Type.STRING, description: "City name for weather search" },
      tips: { type: Type.STRING },
      accommodation: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          checkIn: { type: Type.STRING }
        }
      },
      events: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            title: { type: Type.STRING },
            desc: { type: Type.STRING },
            transport: { type: Type.STRING, nullable: true },
            highlight: { type: Type.BOOLEAN, nullable: true },
            category: { type: Type.STRING, enum: ['sightseeing', 'food', 'transport', 'shopping', 'activity', 'flight', 'hotel'] },
            mapQuery: { type: Type.STRING, description: "Query for Google Maps" }
          },
          required: ['time', 'title', 'desc', 'category', 'mapQuery']
        }
      }
    },
    required: ['day', 'date', 'weekday', 'title', 'desc', 'pass', 'bg', 'weatherIcon', 'temp', 'location', 'events']
  }
};

// Helper function to strip Markdown code blocks
const cleanJsonString = (str: string) => {
  // Remove ```json and ``` or just ```
  return str.replace(/```json\n?|```/g, '').trim();
};

const AIGenerator: React.FC<AIGeneratorProps> = ({ isOpen, onClose, onGenerate, existingDays, startDate, tripName }) => {
  const [apiKey, setApiKey] = useState('');
  const [saveApiKey, setSaveApiKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const [targetDay, setTargetDay] = useState<string>('all');
  const [targetPlan, setTargetPlan] = useState<string>('B');

  // Load saved API key
  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      setSaveApiKey(true);
    }
  }, []);

  const handleClearSavedKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setSaveApiKey(false);
  };

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setError('請輸入 Google Gemini API Key');
      return;
    }
    if (!prompt.trim()) {
      setError('請輸入您的旅遊需求');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const isSingleDay = targetDay !== 'all';
      const selectedDayInfo = isSingleDay ? existingDays.find(d => d.day === targetDay) : null;

      let systemPrompt = `
        You are an expert travel planner.
        Generate a detailed itinerary based on the user's request.
        The trip name/theme is: "${tripName}".
        Ensure real locations, realistic travel times, and high-quality Unsplash image URLs.
        Strictly follow the JSON schema provided.
        Language: Traditional Chinese (zh-TW).

        IMPORTANT FORMATTING RULES:
        1. 'desc' field (Day Summary): 
           - MUST be extremely concise. 
           - ONLY list 3-4 main location names separated by arrows (➔).
           - DO NOT write full sentences or long descriptions here.
           - Example: "桃園機場 ➔ 關西機場 ➔ 京都" or "清水寺 ➔ 祇園 ➔ 鴨川"
        3. 'title' field:
           - MUST be very short. Max 10 characters.
           - Use a Theme (e.g. "京都古都巡禮") or 1-2 Main Highlights (e.g. "清水寺與祇園").
           - Do NOT list all locations.
           - NO arrows (➔) or long dividers.
        4. 'events' (Detailed Itinerary):
           - This is where you put the detailed descriptions and activities.
      `;

      if (isSingleDay && selectedDayInfo) {
        systemPrompt += `
           CRITICAL INSTRUCTION: You are ONLY modifying ${targetDay} (${selectedDayInfo.date}).
           Do NOT generate any other days.
           Return an array containing ONLY ONE object for ${targetDay}.
           Keep the date as ${selectedDayInfo.date} and weekday as ${selectedDayInfo.weekday}.
           Focus on the user's specific request for this day.
           JR PASS Logic: Do NOT set "pass": true automatically. Set "pass": false.
         `;
      } else {
        const totalDays = existingDays.length;
        systemPrompt += `
           CRITICAL INSTRUCTION: Generate the FULL itinerary for ${totalDays} days (Day 1 to Day ${totalDays}).
           The start date is ${startDate}. 
           Please calculate the correct date (MM/DD) and weekday for each day starting from ${startDate}.
           
           Example:
           If start date is 2025-04-01:
           Day 1 = 04/01 (Tue)
           Day 2 = 04/02 (Wed)
           ...and so on.

           JR PASS Logic: Do NOT set "pass": true automatically. Set "pass": false for all days.
         `;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          responseMimeType: 'application/json',
          responseSchema: ITINERARY_SCHEMA,
          systemInstruction: systemPrompt,
        },
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ]
      });

      if (response.text) {
        const cleanedText = cleanJsonString(response.text);
        const data = JSON.parse(cleanedText) as ItineraryDay[];

        if (saveApiKey) {
          localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
        } else {
          localStorage.removeItem(API_KEY_STORAGE_KEY);
        }

        onGenerate(data, !isSingleDay, targetPlan);
        onClose();
      } else {
        throw new Error('No data returned');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '生成失敗，請檢查 API Key 或重試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">

      {/* Container with Glassmorphism */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh] border border-white/20 dark:border-slate-700 ring-1 ring-black/5 relative transition-all duration-300">

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-japan-blue/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 p-6 pb-2 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-japan-blue to-blue-600 text-white rounded-2xl shadow-lg shadow-japan-blue/30">
              <Sparkles size={20} className="text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-2xl text-ink dark:text-white tracking-wide">
                AI 旅遊規劃師
              </h3>
              <p className="text-[10px] text-ink-lighter dark:text-slate-400 font-bold tracking-[0.2em] uppercase mt-0.5">
                Powered by Gemini 2.5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-ink dark:hover:text-white transition-all duration-200 active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto relative z-10">

          {/* API Key Section */}
          <div className="space-y-3 bg-gray-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-2">
              <KeyRound size={14} />
              Configuration
            </label>

            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="貼上您的 Google Gemini API Key"
                className="w-full p-3 pr-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-japan-blue/50 focus:border-japan-blue outline-none transition-all text-sm font-mono text-ink dark:text-white placeholder-gray-400 shadow-sm"
              />
              {saveApiKey && apiKey && (
                <button
                  type="button"
                  onClick={handleClearSavedKey}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="清除已儲存的 API Key"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveApiKey"
                  checked={saveApiKey}
                  onChange={(e) => setSaveApiKey(e.target.checked)}
                  className="w-4 h-4 accent-japan-blue cursor-pointer rounded"
                />
                <label htmlFor="saveApiKey" className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                  記住 API Key
                </label>
              </div>

              <a
                href={GOOGLE_AI_STUDIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-japan-blue dark:text-sky-400 flex items-center gap-1 hover:underline"
              >
                免費申請 <ExternalLink size={10} />
              </a>
            </div>

            {/* Collapsible Help Section */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden mt-3 transition-all duration-300">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors text-xs group"
              >
                <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-japan-blue dark:group-hover:text-sky-400 font-bold transition-colors">
                  <HelpCircle size={14} />
                  不知道如何複製 API Key？
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${showHelp ? 'rotate-180' : ''}`} />
              </button>

              <div className={`
                overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out
                ${showHelp ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
              `}>
                <div className="p-3 bg-white/40 dark:bg-slate-900/40 space-y-3 border-t border-gray-100 dark:border-slate-700 backdrop-blur-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                    1. 請登入 <a href={GOOGLE_AI_STUDIO_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-japan-blue hover:underline">Google AI Studio</a>。<br />
                    2. 如下圖所示複製你的 API KEY。
                  </p>
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm">
                    <img
                      src="/api-key-help.png"
                      alt="API Key 複製位置說明"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <CalendarRange size={14} />
              Planning Scope
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setTargetDay('all')}
                className={`
                  p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200
                  ${targetDay === 'all'
                    ? 'bg-japan-blue text-white border-japan-blue shadow-md shadow-japan-blue/20'
                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-japan-blue/50 hover:bg-gray-50 dark:hover:bg-slate-700'}
                `}
              >
                <CalendarRange size={16} />
                整趟旅程 ({existingDays.length} 天)
              </button>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={targetDay}
                    onChange={(e) => setTargetDay(e.target.value)}
                    className={`
                      w-full appearance-none p-3 pl-4 pr-8 rounded-xl border text-sm font-bold outline-none transition-all duration-200
                      ${targetDay !== 'all'
                        ? 'bg-japan-blue text-white border-japan-blue shadow-md shadow-japan-blue/20'
                        : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-japan-blue/50 hover:bg-gray-50 dark:hover:bg-slate-700'}
                    `}
                  >
                    <option value="all" className="text-gray-800 bg-white">單日修改...</option>
                    {existingDays.map(day => (
                      <option key={day.day} value={day.day} className="text-gray-800 bg-white">
                        {day.day} ({day.date})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${targetDay !== 'all' ? 'text-white' : 'text-gray-400'}`} />
                </div>

                {targetDay !== 'all' && (
                  <select
                    value={targetPlan}
                    onChange={(e) => setTargetPlan(e.target.value)}
                    className="w-20 p-3 rounded-xl border border-japan-blue bg-white text-japan-blue text-sm font-bold outline-none cursor-pointer text-center"
                    title="選擇要存入的方案"
                  >
                    <option value="A">Plan A</option>
                    <option value="B">Plan B</option>
                    <option value="C">Plan C</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Send size={14} />
              Your Request
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={targetDay === 'all'
                ? "例如：\n我要去東京五天四夜。\nDay 1 住新宿，想去淺草和晴空塔。\nDay 2 想去迪士尼樂園玩整天。\nDay 3..."
                : "例如：\n早上想去築地市場吃壽司，\n下午去銀座逛街，\n晚上想看夜景（請推薦地點）。"}
              className="w-full p-4 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-japan-blue/50 focus:border-japan-blue outline-none transition-all h-40 resize-none text-sm leading-relaxed bg-white dark:bg-slate-800 dark:text-white placeholder-gray-400 shadow-sm"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-sm p-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <X size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end relative z-20">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`
              relative overflow-hidden group flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-xl transition-all duration-300
              ${loading ? 'bg-gray-400 cursor-wait' : 'bg-gradient-to-r from-japan-blue to-blue-600 hover:shadow-japan-blue/30 hover:scale-[1.02]'}
            `}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span className="animate-pulse">
                  {targetDay === 'all' ? '規劃旅程中...' : '更新行程中...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                {targetDay === 'all' ? '開始生成行程' : '更新該日行程'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AIGenerator;