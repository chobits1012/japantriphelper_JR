import React, { useState } from 'react';
import { Train, CheckCircle2, Eraser } from 'lucide-react';
import { REGIONS, REGIONAL_PASSES, PASS_COLORS } from '../constants';
import type { ItineraryDay } from '../types';

interface PassManagerProps {
  day: ItineraryDay;
  allDays: ItineraryDay[];
  onUpdate: (updatedDays: ItineraryDay[]) => void;
  onRequestRemove: () => void;
}

const PassManager: React.FC<PassManagerProps> = ({ day, allDays, onUpdate, onRequestRemove }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>(REGIONS[0]);
  const [selectedPass, setSelectedPass] = useState<string>('');
  const [customPassName, setCustomPassName] = useState<string>('');
  const [passDuration, setPassDuration] = useState<number>(1);
  const [passColor, setPassColor] = useState<string>(PASS_COLORS[0].value);
  const isCustomPass = selectedPass === 'custom';

  const handleBatchApplyPass = () => {
    const finalPassName = isCustomPass ? customPassName : selectedPass;
    if (!finalPassName) {
      alert('請選擇或輸入票券名稱');
      return;
    }

    const updates: ItineraryDay[] = [];
    const startIndex = allDays.findIndex(d => d.day === day.day);

    if (startIndex !== -1) {
      for (let i = 0; i < passDuration; i++) {
        if (startIndex + i < allDays.length) {
          const targetDay = allDays[startIndex + i];
          updates.push({
            ...targetDay,
            pass: true,
            passName: finalPassName,
            passColor: passColor,
            passDurationDays: passDuration,
          });
        }
      }
      onUpdate(updates);
      alert(`已成功將「${finalPassName}」套用到 ${updates.length} 天行程！`);
    }
  };

  return (
    <div className="bg-red-50 border border-red-100 p-4 rounded-xl space-y-3 dark:bg-red-900/10 dark:border-red-900/30">
      <div className="flex items-center justify-between text-japan-red dark:text-red-400">
        <div className="flex items-center gap-2">
          <Train size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">交通周遊券 (批次管理)</span>
        </div>
        {day.pass && (
          <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold dark:bg-red-900/30 dark:text-red-300">
            目前: {day.passName}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <select
            value={selectedRegion}
            onChange={(e) => { setSelectedRegion(e.target.value); setSelectedPass(''); setCustomPassName(''); }}
            className="w-full p-3 text-base border border-red-200 rounded-lg bg-white focus:outline-none focus:border-japan-red font-bold text-gray-600 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-700"
          >
            {REGIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
          <select
            value={selectedPass}
            onChange={(e) => { setSelectedPass(e.target.value); if (e.target.value !== 'custom') setCustomPassName(''); }}
            className="w-full p-3 text-base border border-red-200 rounded-lg bg-white focus:outline-none focus:border-japan-red shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-700"
          >
            <option value="">選擇票券...</option>
            {REGIONAL_PASSES[selectedRegion]?.map((pass) => (<option key={pass} value={pass}>{pass}</option>))}
            <option value="custom">✏️ 自行新增...</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          {isCustomPass ? (
            <input
              type="text"
              value={customPassName}
              onChange={(e) => setCustomPassName(e.target.value)}
              placeholder="輸入票券名稱..."
              className="flex-1 p-3 text-base border border-red-200 rounded-lg bg-white focus:outline-none focus:border-japan-red dark:bg-slate-800 dark:text-white dark:border-slate-700"
              autoFocus
            />
          ) : (<div className="flex-1"></div>)}
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">範圍:</span>
          <select
            value={passDuration}
            onChange={(e) => setPassDuration(parseInt(e.target.value))}
            className="w-24 p-3 text-base border border-red-200 rounded-lg bg-white focus:outline-none focus:border-japan-red dark:bg-slate-800 dark:text-white dark:border-slate-700"
          >
            {[1, 2, 3, 4, 5, 6, 7, 10, 14, 21].map((d) => (<option key={d} value={d}>{d} 天</option>))}
          </select>
        </div>

        <div className="flex items-center gap-3 py-2 border-t border-red-100/50 dark:border-red-900/20">
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500">標籤顏色:</span>
          <div className="flex gap-2">
            {PASS_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setPassColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${passColor === c.value ? 'border-gray-400 scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'}`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1 border-t border-red-100 mt-1 dark:border-red-900/20">
          <button
            onClick={handleBatchApplyPass}
            disabled={!selectedPass && !customPassName}
            className="flex-1 bg-japan-red text-white py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 dark:disabled:bg-slate-700"
          >
            <CheckCircle2 size={18} /> 立即套用
          </button>
          <button
            onClick={onRequestRemove}
            className="flex-1 bg-white text-gray-500 border border-gray-200 py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 hover:text-red-500 flex items-center justify-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Eraser size={18} /> 移除
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassManager;