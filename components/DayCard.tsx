import React from 'react';
import { GripVertical, Trash2, Clock, BedDouble } from 'lucide-react';
import { ItineraryDay } from '../types';

// 根據 Day 資料產生顯示用的票券短標籤
const getPassShortLabel = (day: ItineraryDay): string => {
  if (day.passDurationDays && day.passDurationDays > 0) {
    return `${day.passDurationDays}日券`;
  }
  if (!day.passName) return '';
  const trimmed = day.passName.trim();
  return trimmed.length > 8 ? trimmed.slice(0, 8) + '…' : trimmed;
};

interface DayCardProps {
  day: ItineraryDay;
  isSelected: boolean;
  isHome: boolean;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  attributes?: any;
  listeners?: any;
  innerRef?: (element: HTMLElement | null) => void;
  isOverlay?: boolean;
  passUsageMap?: Map<string, number>;
}

export const DayCard: React.FC<DayCardProps> = ({
  day,
  isSelected,
  isHome,
  onClick,
  onDelete,
  style,
  attributes,
  listeners,
  innerRef,
  isOverlay,
  passUsageMap,
}) => {
  const startTime = day.events.length > 0 ? day.events[0].time : null;
  const endTime = day.events.length > 0 ? day.events[day.events.length - 1].time : null;
  const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime;

  return (
    <div
      ref={innerRef}
      style={style}
      className={`
        relative transition-[transform,background-color,box-shadow] duration-1000 group
        ${isHome
          ? 'bg-white/85 backdrop-blur-sm rounded-xl p-4 border border-white/20 mb-3 dark:bg-slate-800/90 dark:border-slate-700'
          : isSelected
            ? 'bg-japan-blue text-white p-5 pl-6 dark:bg-sky-700'
            : 'hover:bg-gray-50 text-ink p-5 pl-6 border-b border-gray-100 last:border-0 dark:text-slate-100 dark:hover:bg-slate-800 dark:border-slate-800'
        }
        ${isHome && !isOverlay ? 'hover:bg-white hover:shadow-xl hover:scale-[1.01] dark:hover:bg-slate-800' : ''}
        ${isOverlay
          ? 'shadow-2xl scale-105 bg-white ring-2 ring-japan-blue rotate-2 cursor-grabbing dark:bg-slate-800 dark:ring-sky-500'
          : ''
        }
        ${!isHome && 'h-[80px] flex justify-center items-center lg:block lg:h-auto'}
      `}
    >
      {/* Drag Handle & Delete Button Container - ONLY SHOW ON HOME */}
      {isHome && (
        <div className="absolute right-2 top-2 flex items-center gap-1 z-20">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-full transition-colors text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
              title="刪除此日行程"
            >
              <Trash2 size={14} />
            </button>
          )}

          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 touch-none dark:hover:bg-slate-700"
          >
            <GripVertical size={16} />
          </div>
        </div>
      )}

      {/* Main Click Area */}
      <div onClick={onClick} className="cursor-pointer w-full">
        {/* Home Mode Layout */}
        {isHome && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-gray-300 pr-3 dark:border-slate-600">
              <span className="text-xl font-serif font-bold text-japan-blue dark:text-sky-400">
                {day.date.split('/')[1]}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-bold dark:text-slate-400">
                {day.weekday}
              </span>
            </div>
            {/* Increased padding-right to pr-16 to avoid overlap with delete/drag icons */}
            <div className="flex-1 pr-16">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="font-serif font-bold text-lg text-ink dark:text-slate-100 truncate">
                  {day.title}
                </h3>
                {day.pass && (
                  <span
                    className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full whitespace-nowrap ml-2 flex-shrink-0"
                    style={{ backgroundColor: day.passColor || '#c93a40' }}
                  >
                    {getPassShortLabel(day)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-1.5 text-xs font-bold text-gray-400 dark:text-slate-400">
                {timeRange && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{timeRange}</span>
                  </div>
                )}
                {day.accommodation && (
                  <div className="flex items-center gap-1">
                    <BedDouble size={12} />
                    <span className="truncate max-w-[120px]">
                      {day.accommodation.name}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 line-clamp-4 dark:text-slate-300 leading-relaxed">
                {day.desc}
              </p>
            </div>
          </div>
        )}

        {/* Sidebar Mode Layout */}
        {!isHome && (
          <div className={`flex items-center ${!isHome ? 'flex-col lg:flex-row' : 'flex-row'}`}>
            {isSelected && (
              <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-1 bg-japan-red dark:bg-sky-400" />
            )}

            <div
              className={`flex flex-col items-center justify-center transition-all ${!isHome ? 'lg:mr-4' : 'mr-5'
                } ${!isSelected && !isHome ? 'text-gray-400 dark:text-slate-500' : ''}`}
            >
              <span
                className={`font-serif font-bold leading-none ${isSelected ? 'text-lg lg:text-2xl' : 'text-2xl'
                  }`}
              >
                {day.date.split('/')[1]}
              </span>
              <span
                className={`text-[10px] uppercase mt-1 ${isSelected ? 'text-white/80' : 'text-gray-400 dark:text-slate-500'
                  }`}
              >
                {day.weekday}
              </span>
            </div>

            <div className="hidden lg:block flex-1 min-w-0 pr-2">
              <div className="flex justify-between items-center mb-1">
                <h3
                  className={`font-bold text-lg font-serif truncate ${isSelected ? 'text-white' : 'text-ink dark:text-slate-200'
                    }`}
                >
                  {day.title}
                </h3>

                {day.pass && (
                  <span
                    className="text-[10px] font-bold px-1.5 rounded whitespace-nowrap border"
                    style={{
                      color: isSelected ? (day.passColor || '#c93a40') : (day.passColor || '#c93a40'),
                      borderColor: (day.passColor || '#c93a40') + '80',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.9)' : (day.passColor || '#c93a40') + '1a',
                    }}
                  >
                    {getPassShortLabel(day)}
                  </span>
                )}
              </div>

              <p
                className={`text-sm truncate ${isSelected ? 'text-white/70' : 'text-gray-500 dark:text-slate-400'
                  }`}
              >
                {day.desc}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};