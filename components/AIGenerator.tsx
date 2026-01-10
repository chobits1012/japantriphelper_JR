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
  const [targetPlan, setTargetPlan] = useState<string>('B'); // Default to Plan B for safety

  // Load saved API key on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      setSaveApiKey(true);
    }
  }, []);

  // Handle clearing saved API key
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
        // Full Trip Generation Logic
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

           JR PASS Logic: Do NOT set "pass": true automatically. Set "pass": false for all days. The user will manually configure transport passes using the specific tool.
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

        // Save or remove API key based on user preference
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-japan-blue p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-yellow-300" />
            <h3 className="font-serif font-bold text-lg tracking-wide">AI 旅遊規劃師</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">

          {/* API Key Section */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <KeyRound size={16} />
              Google Gemini API Key
            </label>

            {/* Quick Link to Get API Key */}
            <a
              href={GOOGLE_AI_STUDIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all text-sm"
            >
              <ExternalLink size={16} />
              免費申請 API Key（Google AI Studio）
            </a>

            {/* API Key Input */}
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="貼上您的 API Key (AIza...)"
                className="w-full p-3 pr-10 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-japan-blue focus:border-transparent outline-none transition-all text-sm font-mono bg-white dark:bg-slate-800 dark:text-white"
              />
              {saveApiKey && apiKey && (
                <button
                  type="button"
                  onClick={handleClearSavedKey}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all"
                  title="清除已儲存的 API Key"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Save API Key Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="saveApiKey"
                checked={saveApiKey}
                onChange={(e) => setSaveApiKey(e.target.checked)}
                className="w-4 h-4 accent-japan-blue cursor-pointer"
              />
              <label htmlFor="saveApiKey" className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none flex items-center gap-1">
                <Save size={12} />
                儲存 API Key 至瀏覽器（下次無需重新輸入）
              </label>
            </div>

            <p className="text-xs text-gray-400">
              {saveApiKey
                ? '✓ API Key 將在生成成功後儲存至您的瀏覽器中。'
                : '* 請至 Google AI Studio 免費申請 API Key。'}
            </p>

            {/* Collapsible Help Section */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-sm"
              >
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
                  <HelpCircle size={14} />
                  不知道如何複製 API Key？
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
              </button>
              {showHelp && (
                <div className="p-3 bg-white dark:bg-slate-900 space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    登入 Google AI Studio 後，在表格中找到您的 API Key，點擊下圖紅圈處的複製按鈕：
                  </p>
                  <img
                    src="/api-key-help.png"
                    alt="API Key 複製位置說明"
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <CalendarRange size={16} />
              生成範圍
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                onClick={() => setTargetDay('all')}
                className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${targetDay === 'all' ? 'bg-japan-blue text-white border-japan-blue' : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              >
                <CalendarRange size={16} />
                整趟旅程 ({existingDays.length} 天)
              </button>
              <div className="flex gap-2">
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(e.target.value)}
                  className={`flex-1 p-3 rounded-lg border text-sm font-bold outline-none transition-all ${targetDay !== 'all' ? 'bg-japan-blue text-white border-japan-blue' : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >
                  <option value="all" className="text-gray-800 bg-white">單日修改 (請選擇)...</option>
                  {existingDays.map(day => (
                    <option key={day.day} value={day.day} className="text-gray-800 bg-white">
                      {day.day} ({day.date})
                    </option>
                  ))}
                </select>

                {targetDay !== 'all' && (
                  <select
                    value={targetPlan}
                    onChange={(e) => setTargetPlan(e.target.value)}
                    className="w-24 p-3 rounded-lg border border-japan-blue bg-white text-japan-blue text-sm font-bold outline-none cursor-pointer"
                    title="選擇要存入的方案"
                  >
                    <option value="A">方案 A</option>
                    <option value="B">方案 B</option>
                    <option value="C">方案 C</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Send size={16} />
              {targetDay === 'all' ? `規劃 "${tripName}" (${startDate} 出發)` : `告訴 AI ${targetDay} 想去哪裡`}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={targetDay === 'all'
                ? "例如：我要去東京五天四夜。第一天去淺草雷門，第二天去迪士尼，第三天去新宿購物..."
                : "例如：早上我想去吃著名的鬆餅，下午去逛古著店，晚上要吃燒肉。"}
              className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-japan-blue focus:border-transparent outline-none transition-all h-32 resize-none text-sm leading-relaxed bg-white dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2">
              <X size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-all
              ${loading ? 'bg-gray-400 cursor-wait' : 'bg-japan-blue hover:bg-japan-blue/90 hover:scale-105'}
            `}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {targetDay === 'all' ? '正在規劃整趟旅程...' : '正在更新行程...'}
              </>
            ) : (
              <>
                <Sparkles size={18} />
                {targetDay === 'all' ? '開始生成' : '更新該日行程'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AIGenerator;