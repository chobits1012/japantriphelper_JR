import React, { forwardRef } from 'react';
import { ChevronRight, Calendar } from 'lucide-react';
import { WASHI_PATTERN } from '../constants';
import type { TripMetadata, TripSeason } from '../types';

interface TripCardProps {
    trip: TripMetadata;
    onClick?: () => void;
    getSeasonColor: (season: TripSeason) => string;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    isOverlay?: boolean;
}

export const TripCard = forwardRef<HTMLDivElement, TripCardProps>(({
    trip,
    onClick,
    getSeasonColor,
    style,
    attributes,
    listeners,
    isOverlay
}, ref) => {
    return (
        <div
            ref={ref}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`
                group relative bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden cursor-pointer shadow-lg transition-all duration-300 border border-white/40 mb-6
                ${isOverlay ? 'scale-105 shadow-2xl rotate-2 ring-4 ring-japan-blue/50 z-50' : 'hover:shadow-2xl hover:scale-[1.01]'}
            `}
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
    );
});

TripCard.displayName = 'TripCard';
