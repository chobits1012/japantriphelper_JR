import React, { useState } from 'react';
import type { ItineraryDay, TripSettings } from '../types';

interface ConfirmState {
    isOpen: boolean;
    type: 'deleteDay' | 'reset' | 'deleteTrip' | null;
    payload?: string;
}

interface UseTripActionsProps {
    itineraryData: ItineraryDay[];
    setItineraryData: React.Dispatch<React.SetStateAction<ItineraryDay[]>>;
    addDay: () => void;
    deleteDay: (id: string) => void;
    onDeleteTrip: () => void;
    tripSettings: TripSettings;
    tripId: string;
    updateTripMeta: (id: string, updates: { days?: number }) => void;
    setSelectedDayIndex: (index: number | null) => void;
}

export const useTripActions = ({
    itineraryData,
    setItineraryData,
    addDay,
    deleteDay,
    onDeleteTrip,
    tripSettings,
    tripId,
    updateTripMeta,
    setSelectedDayIndex
}: UseTripActionsProps) => {
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        type: null
    });

    // Add Day with scroll to bottom
    const handleAddDay = () => {
        addDay();
        setTimeout(() => {
            const listContainer = document.querySelector('.no-scrollbar');
            if (listContainer) listContainer.scrollTop = listContainer.scrollHeight;
        }, 100);
    };

    // Confirm Dialog Requests
    const requestDeleteDay = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConfirmState({ isOpen: true, type: 'deleteDay', payload: id });
    };

    const requestReset = () => {
        setConfirmState({ isOpen: true, type: 'reset' });
    };

    const requestDeleteTrip = () => {
        setConfirmState({ isOpen: true, type: 'deleteTrip' });
    };

    // Handle Confirm Actions
    const handleConfirmAction = () => {
        if (confirmState.type === 'deleteDay' && confirmState.payload) {
            deleteDay(confirmState.payload);
            setSelectedDayIndex(null);
        }
        else if (confirmState.type === 'reset') {
            // Soft reset: Clear content, keep settings
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

    // AI Generation Handler
    const handleAIGenerate = (
        newGeneratedDays: ItineraryDay[],
        isFullReplace: boolean,
        targetPlanId?: string
    ) => {
        const daysWithIds = newGeneratedDays.map(d => ({
            ...d,
            id: d.id || Math.random().toString(36).substr(2, 9)
        }));

        if (isFullReplace) {
            setItineraryData(daysWithIds);
            updateTripMeta(tripId, { days: daysWithIds.length });
            setSelectedDayIndex(null);
        } else {
            setItineraryData(prevData => {
                const newDaysMap = new Map(daysWithIds.map(d => [d.day, d]));
                return prevData.map(day => {
                    const newData = newDaysMap.get(day.day);
                    if (!newData) return day;

                    // Multi-Plan Logic
                    const currentActive = day.activePlanId || 'A';
                    const target = targetPlanId || currentActive;

                    if (target === currentActive) {
                        // Case 1: Update current plan events + shared info
                        return {
                            ...day,
                            title: newData.title,
                            desc: newData.desc,
                            bg: newData.bg,
                            weatherIcon: newData.weatherIcon,
                            temp: newData.temp,
                            accommodation: newData.accommodation,
                            events: newData.events
                        };
                    } else {
                        // Case 2: Switching Plans (e.g. A -> B)
                        const updatedSubPlans = { ...(day.subPlans || {}) };

                        // Save current events to the OLD plan slot
                        updatedSubPlans[currentActive] = {
                            events: day.events ? JSON.parse(JSON.stringify(day.events)) : [],
                            title: day.title,
                            desc: day.desc
                        };

                        return {
                            ...day,
                            title: newData.title,
                            desc: newData.desc,
                            bg: newData.bg,
                            weatherIcon: newData.weatherIcon,
                            temp: newData.temp,
                            accommodation: newData.accommodation,
                            subPlans: updatedSubPlans,
                            activePlanId: target,
                            events: newData.events
                        };
                    }
                });
            });

            // Auto-select day if only one was generated
            if (daysWithIds.length === 1) {
                const dayIndex = itineraryData.findIndex(d => d.day === daysWithIds[0].day);
                if (dayIndex !== -1) setSelectedDayIndex(dayIndex);
            }
        }
    };

    return {
        confirmState,
        setConfirmState,
        handleAddDay,
        requestDeleteDay,
        requestReset,
        requestDeleteTrip,
        handleConfirmAction,
        handleAIGenerate
    };
};
