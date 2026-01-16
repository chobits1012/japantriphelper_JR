import React, { forwardRef } from 'react';
import { GripVertical, ArrowUpRight, Calendar, Clock } from 'lucide-react';
import type { TripMetadata, TripSeason } from '../types';

interface ComfortTripCardProps {
    trip: TripMetadata;
    onClick?: () => void;
    getSeasonColor: (season: TripSeason) => string;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    isOverlay?: boolean;
}

export const ComfortTripCard = forwardRef<HTMLDivElement, ComfortTripCardProps>(({
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
            className={`
                group relative bg-transparent 
                border-[3px] border-[#1A1A1A]
                rounded-[30px] overflow-hidden 
                transition-transform duration-300
                ${isOverlay ? 'scale-105 bg-[#FDF6E5] z-50' : 'hover:scale-[1.01]'}
            `}
        >
            {/* Drag Handle - Top Right */}
            {!isOverlay && listeners && (
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute top-4 right-4 z-30 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full cursor-grab active:cursor-grabbing touch-none transition-colors backdrop-blur-sm"
                >
                    <GripVertical size={20} />
                </div>
            )}

            <div className="flex flex-col h-auto cursor-pointer" onClick={onClick}>
                {/* 1. Image Section (Top, Large) */}
                <div className="relative w-full h-56 overflow-hidden border-b-[3px] border-[#1A1A1A]">
                    <img
                        src={trip.coverImage}
                        alt={trip.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Season Tag - Floating Pill */}
                    <div className="absolute top-4 left-4 z-10">
                        <span className={`
                             inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white border border-white/20 shadow-sm
                             ${getSeasonColor(trip.season)}
                        `}>
                            {trip.season}
                        </span>
                    </div>

                    {/* Overlay for contrast on image */}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>

                {/* 2. Content Section (Bottom, Clean) */}
                <div className={`p-6 bg-[#FDF6E5] flex flex-col justify-between relative`}>

                    {/* Title Area */}
                    <div className="mb-6 pr-12">
                        <h2 className="text-3xl font-bold text-[#1A1A1A] leading-tight line-clamp-2">
                            {trip.name}
                        </h2>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex items-center justify-between border-t border-[#1A1A1A]/10 pt-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[#1A1A1A]/70 text-xs font-bold uppercase tracking-wider">
                                <Calendar size={14} />
                                START DATE
                            </div>
                            <span className="font-mono text-lg font-bold text-[#1A1A1A]">
                                {trip.startDate.replace(/-/g, '.')}
                            </span>
                        </div>

                        <div className="flex flex-col gap-1 pl-6 border-l border-[#1A1A1A]/10">
                            <div className="flex items-center gap-2 text-[#1A1A1A]/70 text-xs font-bold uppercase tracking-wider">
                                <Clock size={14} />
                                DURATION
                            </div>
                            <span className="font-sans text-lg font-bold text-[#1A1A1A]">
                                {trip.days} <span className="text-sm font-normal text-[#1A1A1A]/50">Days</span>
                            </span>
                        </div>
                    </div>

                    {/* CTA Button - Floating Circle */}
                    <div className="absolute top-6 right-6">
                        <div className="
                            w-12 h-12 rounded-full 
                            bg-[#1A1A1A] text-white 
                            border-2 border-transparent
                            flex items-center justify-center 
                            transition-all duration-300
                            group-hover:-translate-y-1 group-hover:scale-110 
                            shadow-none
                        ">
                            <ArrowUpRight size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

ComfortTripCard.displayName = 'ComfortTripCard';
