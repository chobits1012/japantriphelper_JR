import { useState, useEffect } from 'react';
import useLocalStorage from './useLocalStorage';
import type { TripMetadata, TripSeason, ItineraryDay } from '../types';
import { ITINERARY_DATA } from '../constants';

const TRIPS_LIST_KEY = 'my-trips-list';

// Legacy keys for migration
const LEGACY_SETTINGS_KEY = 'kansai-trip-settings';
const LEGACY_ITINERARY_KEY = 'kansai-trip-2026-v4';
const LEGACY_EXPENSES_KEY = 'kansai-trip-expenses';
const LEGACY_CHECKLIST_KEY = 'kansai-trip-checklist';

export const useTripManager = () => {
  const [trips, setTrips] = useLocalStorage<TripMetadata[]>(TRIPS_LIST_KEY, []);

  // Auto-migration & Default Initialization
  useEffect(() => {
    const hasInitialized = localStorage.getItem('app-initialized-v3');

    if (!hasInitialized) {
      // 1. Try to migrate legacy data first
      const legacySettingsStr = localStorage.getItem(LEGACY_SETTINGS_KEY);
      let initialTrips: TripMetadata[] = [];

      if (legacySettingsStr) {
        try {
          const settings = JSON.parse(legacySettingsStr);
          const itineraryStr = localStorage.getItem(LEGACY_ITINERARY_KEY);
          const itinerary = itineraryStr ? JSON.parse(itineraryStr) : ITINERARY_DATA;

          const legacyId = 'legacy-trip';

          initialTrips.push({
            id: legacyId,
            name: settings.name || '我的舊旅程',
            startDate: settings.startDate || '2026-01-23',
            season: settings.season || 'winter',
            days: itinerary.length || 5,
            lastAccessed: Date.now(),
            coverImage: getSeasonCover(settings.season || 'winter')
          });

          // Migrate Data
          localStorage.setItem(`trip-${legacyId}-settings`, legacySettingsStr);
          localStorage.setItem(`trip-${legacyId}-itinerary`, JSON.stringify(itinerary));
          const expenses = localStorage.getItem(LEGACY_EXPENSES_KEY);
          if (expenses) localStorage.setItem(`trip-${legacyId}-expenses`, expenses);
          const checklist = localStorage.getItem(LEGACY_CHECKLIST_KEY);
          if (checklist) localStorage.setItem(`trip-${legacyId}-checklist`, checklist);
        } catch (e) {
          console.error("Migration failed:", e);
        }
      }

      // 2. Always ensure "Kansai Winter Trip" exists as a default/demo IF list is empty
      const defaultId = 'default-kansai';
      // Only create default if no legacy and no existing trips (clean slate)
      if (initialTrips.length === 0 && trips.length === 0) {
        initialTrips.push({
          id: defaultId,
          name: '關西冬之旅',
          startDate: '2026-01-23',
          season: 'winter',
          days: ITINERARY_DATA.length,
          lastAccessed: Date.now(),
          coverImage: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=2070"
        });

        // Initialize Default Data
        localStorage.setItem(`trip-${defaultId}-settings`, JSON.stringify({ name: '關西冬之旅', startDate: '2026-01-23', season: 'winter' }));
        localStorage.setItem(`trip-${defaultId}-itinerary`, JSON.stringify(ITINERARY_DATA));
        localStorage.setItem(`trip-${defaultId}-expenses`, '[]');
        localStorage.setItem(`trip-${defaultId}-checklist`, '[]');
      }

      if (initialTrips.length > 0) {
        setTrips(prev => [...initialTrips, ...prev]);
      }

      localStorage.setItem('app-initialized-v3', 'true');
    }
  }, []);

  const createTrip = (name: string, startDate: string, days: number, season: TripSeason) => {
    const newId = Math.random().toString(36).substr(2, 9);

    // Generate initial itinerary
    const newItinerary: ItineraryDay[] = Array.from({ length: days }, (_, i) => {
      const dateObj = new Date(startDate);
      dateObj.setDate(dateObj.getDate() + i);
      const dateStr = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      return {
        id: Math.random().toString(36).substr(2, 9),
        day: `Day ${i + 1}`,
        date: dateStr,
        weekday: weekday,
        title: "自由活動",
        desc: "點擊編輯來規劃行程",
        pass: false,
        bg: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000",
        location: "Japan",
        weatherIcon: season === 'winter' ? 'snow' : season === 'summer' ? 'sunny' : 'cloudy',
        temp: "--°C",
        events: []
      };
    });

    const newTripMeta: TripMetadata = {
      id: newId,
      name,
      startDate,
      season,
      days,
      lastAccessed: Date.now(),
      coverImage: getSeasonCover(season)
    };

    // Save Data
    setTrips(prev => [newTripMeta, ...prev]);
    localStorage.setItem(`trip-${newId}-settings`, JSON.stringify({ name, startDate, season }));
    localStorage.setItem(`trip-${newId}-itinerary`, JSON.stringify(newItinerary));
    localStorage.setItem(`trip-${newId}-expenses`, '[]');
    localStorage.setItem(`trip-${newId}-checklist`, '[]');

    return newId;
  };

  // NEW: Function to create a fresh copy of the Kansai Template
  const createTemplateTrip = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const templateName = "關西冬之旅 (範本)";
    const templateDate = "2026-01-23";
    const templateSeason: TripSeason = 'winter';

    // Clone ITINERARY_DATA with new IDs to avoid reference issues
    const newItinerary = ITINERARY_DATA.map(day => ({
      ...day,
      id: Math.random().toString(36).substr(2, 9)
    }));

    const newTripMeta: TripMetadata = {
      id: newId,
      name: templateName,
      startDate: templateDate,
      season: templateSeason,
      days: newItinerary.length,
      lastAccessed: Date.now(),
      coverImage: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=2070"
    };

    setTrips(prev => [newTripMeta, ...prev]);
    localStorage.setItem(`trip-${newId}-settings`, JSON.stringify({ name: templateName, startDate: templateDate, season: templateSeason }));
    localStorage.setItem(`trip-${newId}-itinerary`, JSON.stringify(newItinerary));
    localStorage.setItem(`trip-${newId}-expenses`, '[]');
    localStorage.setItem(`trip-${newId}-checklist`, '[]');

    return newId;
  };

  const deleteTrip = (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));

    // Cleanup keys
    localStorage.removeItem(`trip-${id}-settings`);
    localStorage.removeItem(`trip-${id}-itinerary`);
    localStorage.removeItem(`trip-${id}-expenses`);
    localStorage.removeItem(`trip-${id}-checklist`);
  };

  const updateTripMeta = (id: string, updates: Partial<TripMetadata>) => {
    setTrips(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  return {
    trips,
    createTrip,
    createTemplateTrip, // Export this
    deleteTrip,
    updateTripMeta
  };
};

function getSeasonCover(season: TripSeason) {
  switch (season) {
    case 'spring': return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop"; // Cherry Blossoms (Kiyomizu-dera)
    case 'summer': return "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?q=80&w=2070&auto=format&fit=crop"; // Summer Seaside (Enoshima/Kamakura)
    case 'autumn': return "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2070&auto=format&fit=crop"; // Autumn Leaves (Japan Temple)
    case 'winter': return "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=2070&auto=format&fit=crop"; // Winter Snow (Kyoto Street)
    default: return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop";
  }
}