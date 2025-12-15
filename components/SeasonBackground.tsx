import React from 'react';
import type { TripSeason } from '../types';

interface SeasonBackgroundProps {
  season: TripSeason;
  weather?: 'sunny' | 'cloudy' | 'rain' | 'snow';
}

export const SeasonBackground: React.FC<SeasonBackgroundProps> = ({ season, weather }) => {
  // 1. 定義季節漸層色票 (含深色模式)
  const getGradient = () => {
    switch (season) {
      case 'spring': // 日：櫻色 -> 淺藍 | 夜：深紫 -> 深粉 (夜櫻)
        return 'bg-gradient-to-b from-pink-200 via-pink-100 to-blue-50 dark:from-slate-900 dark:via-fuchsia-950 dark:to-slate-900';
      case 'summer': // 日：亮藍 -> 翠綠 | 夜：深藍 -> 深靛 (夏夜)
        return 'bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900';
      case 'autumn': // 日：楓紅 -> 橙黃 | 夜：深褐 -> 暗紅 (夜楓)
        return 'bg-gradient-to-b from-orange-400 via-amber-200 to-yellow-50 dark:from-slate-900 dark:via-red-950 dark:to-slate-900';
      case 'winter': // 日：冰藍 -> 灰白 | 夜：黑藍 -> 深灰 (雪夜)
        return 'bg-gradient-to-b from-slate-300 via-blue-100 to-white dark:from-slate-950 dark:via-slate-900 dark:to-black';
      default:
        return 'bg-gradient-to-b from-blue-200 to-white dark:from-slate-900 dark:to-black';
    }
  };

  // 2. 定義粒子特效內容
  const renderParticles = () => {
    // 根據季節決定粒子符號
    let particleSymbol = '';
    let particleColor = '';
    
    switch (season) {
      case 'spring': 
        particleSymbol = '🌸'; // 花瓣
        particleColor = 'text-pink-300 dark:text-pink-400/50';
        break;
      case 'summer':
        particleSymbol = '✨'; // 光點/螢火蟲
        particleColor = 'text-yellow-200 dark:text-yellow-400/50';
        break;
      case 'autumn':
        particleSymbol = '🍁'; // 紅葉
        particleColor = 'text-orange-500 dark:text-orange-600/50';
        break;
      case 'winter':
        particleSymbol = '❄️'; // 雪花
        particleColor = 'text-white dark:text-slate-500/50';
        break;
    }

    // 如果天氣是下雨，覆蓋為雨滴
    if (weather === 'rain') {
        particleSymbol = '💧';
        particleColor = 'text-blue-400 dark:text-blue-500/50';
    }

    // 產生 10-15 個隨機粒子
    return Array.from({ length: 12 }).map((_, i) => {
      const left = Math.random() * 100; // 隨機水平位置
      const delay = Math.random() * 5;  // 隨機動畫延遲
      const duration = 5 + Math.random() * 5; // 隨機動畫時間
      const size = 0.5 + Math.random(); // 隨機大小

      return (
        <div
          key={i}
          className={`absolute top-[-10%] select-none pointer-events-none animate-fall ${particleColor}`}
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            fontSize: `${size}rem`,
            opacity: 0.6,
          }}
        >
          {particleSymbol}
        </div>
      );
    });
  };

  return (
    <div className={`absolute inset-0 z-0 overflow-hidden ${getGradient()} transition-colors duration-1000`}>
      {/* 粒子層 */}
      <div className="absolute inset-0 w-full h-full">
        {renderParticles()}
      </div>
      
      {/* 底部白色漸層遮罩，讓內容區文字更清晰 */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/90 dark:to-transparent pointer-events-none" />
      
      {/* CSS Animation Keyframes (Inline for simplicity) */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg) translateX(0); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(110vh) rotate(360deg) translateX(20px); opacity: 0; }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
};