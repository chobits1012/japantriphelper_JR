import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import useLocalStorage from './useLocalStorage';
import type { TripMetadata, TripSeason, ItineraryDay } from '../types';
import { ITINERARY_DATA } from '../constants';
import { getRandomSeasonImage } from '../constants/seasonImages';

const TRIPS_LIST_KEY = 'my-trips-list';

// Legacy keys for migration
const LEGACY_SETTINGS_KEY = 'kansai-trip-settings';
const LEGACY_ITINERARY_KEY = 'kansai-trip-2026-v4';
const LEGACY_EXPENSES_KEY = 'kansai-trip-expenses';
const LEGACY_CHECKLIST_KEY = 'kansai-trip-checklist';

export const useTripManager = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useLocalStorage<TripMetadata[]>(TRIPS_LIST_KEY, []);
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Sync with Supabase on Auth Change
  useEffect(() => {
    const fetchCloudTrips = async () => {
      if (!user) {
        setLoadingTrips(false);
        return;
      }

      setLoadingTrips(true);
      try {
        // Fetch trips that the user is a member of
        const { data: memberRows, error: memberError } = await supabase
          .from('trip_members')
          .select(`
            trip_id,
            role,
            trips (
              id,
              title,
              data,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        if (memberRows && memberRows.length > 0) {
          const cloudTrips: TripMetadata[] = memberRows
            .map((row: any) => {
              const tripData = row.trips?.data || {};
              const settings = tripData.settings || {};

              return {
                id: row.trips.id,
                name: row.trips.title,
                startDate: settings.startDate || '2026-01-01',
                season: settings.season || 'winter',
                days: tripData.itinerary?.length || 1,
                lastAccessed: new Date(row.trips.updated_at).getTime(),
                coverImage: settings.coverImage || getRandomSeasonImage(settings.season || 'winter')
              };
            })
            // Fallback for edge cases where trips relation might be broken
            .filter((t: any) => t.id)
            .sort((a: any, b: any) => b.lastAccessed - a.lastAccessed);

          // We replace the local list with the cloud list entirely for simplicity now
          // In a complex app, you'd want a smart merge strategy
          setTrips(cloudTrips);

          // Pre-populate LocalStorage with the complete data struct so TripView doesn't crash before syncing
          memberRows.forEach((row: any) => {
            const tripId = row.trips.id;
            const tripData = row.trips.data || {};
            if (tripData.settings) localStorage.setItem(`trip-${tripId}-settings`, JSON.stringify(tripData.settings));
            if (tripData.itinerary) localStorage.setItem(`trip-${tripId}-itinerary`, JSON.stringify(tripData.itinerary));
            if (tripData.expenses) localStorage.setItem(`trip-${tripId}-expenses`, JSON.stringify(tripData.expenses));
            if (tripData.checklist) localStorage.setItem(`trip-${tripId}-checklist`, JSON.stringify(tripData.checklist));
          });
        }
      } catch (err) {
        console.error("Error fetching trips from Supabase:", err);
      } finally {
        setLoadingTrips(false);
      }
    };

    fetchCloudTrips();
  }, [user]);

  // Auto-migration & Default Initialization (Only run if NO user, or after first cloud fetch if empty)
  useEffect(() => {
    // If we're loading cloud trips, wait
    if (user && loadingTrips) return;

    const hasInitialized = localStorage.getItem('app-initialized-v4');

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
            coverImage: settings.coverImage || getRandomSeasonImage(settings.season || 'winter')
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
          coverImage: getRandomSeasonImage('winter')
        });

        // Initialize Default Data
        localStorage.setItem(`trip-${defaultId}-settings`, JSON.stringify({ name: '關西冬之旅', startDate: '2026-01-23', season: 'winter' }));
        localStorage.setItem(`trip-${defaultId}-itinerary`, JSON.stringify(ITINERARY_DATA));
        localStorage.setItem(`trip-${defaultId}-expenses`, '[]');
        localStorage.setItem(`trip-${defaultId}-checklist`, '[]');
      }

      if (initialTrips.length > 0) {
        setTrips(prev => {
          // Avoid duplicate pushing if cloud already synced the same ID
          const existingIds = prev.map(p => p.id);
          const newTrips = initialTrips.filter(t => !existingIds.includes(t.id));
          return [...newTrips, ...prev];
        });
      }

      localStorage.setItem('app-initialized-v4', 'true');
    }
  }, [user, loadingTrips]);

  // Auto-fix: Update legacy/broken Unsplash images to local seasonal images
  useEffect(() => {
    // We only want to run this cleanup locally once. Cloud data should ideally be clean.
    setTrips(prev => {
      let hasChanges = false;
      const next = prev.map(trip => {
        if (!trip.coverImage || trip.coverImage.includes('images.unsplash.com')) {
          hasChanges = true;
          return { ...trip, coverImage: getRandomSeasonImage(trip.season) };
        }
        return trip;
      });
      return hasChanges ? next : prev;
    });
  }, []);

  const uploadTripToCloud = async (tripId: string, tripName: string, startDate: string, season: TripSeason, itinerary: any[]) => {
    if (!user) return; // Silent return if not logged in

    try {
      // Construct the full document payload
      const payload = {
        settings: { name: tripName, startDate, season },
        itinerary: itinerary,
        expenses: JSON.parse(localStorage.getItem(`trip-${tripId}-expenses`) || '[]'),
        checklist: JSON.parse(localStorage.getItem(`trip-${tripId}-checklist`) || '[]')
      };

      // 1. UPSERT Trip
      const { error: tripError } = await supabase
        .from('trips')
        .upsert({
          id: tripId,
          owner_id: user.id,
          title: tripName,
          data: payload,
          updated_at: new Date().toISOString()
        });

      if (tripError) throw tripError;

      // 2. INSERT Trip Member (if it's a new trip, this sets ownership)
      // Note: Our RLS policy allows inserting if auth.uid() == user_id
      const { error: memberError } = await supabase
        .from('trip_members')
        .upsert({
          trip_id: tripId,
          user_id: user.id,
          role: 'owner'
        }, { onConflict: 'trip_id,user_id' }); // Avoid duplicate key errors if already owner

      if (memberError) console.error("Error setting trip member:", memberError);

    } catch (err) {
      console.error("Failed to upload trip to cloud:", err);
    }
  };

  const createTrip = async (name: string, startDate: string, days: number, season: TripSeason) => {
    // Generate UUID v4 to match Supabase requirements
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

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
      coverImage: getRandomSeasonImage(season)
    };

    // Save Data Locally
    setTrips(prev => [newTripMeta, ...prev]);
    localStorage.setItem(`trip-${newId}-settings`, JSON.stringify({ name, startDate, season }));
    localStorage.setItem(`trip-${newId}-itinerary`, JSON.stringify(newItinerary));
    localStorage.setItem(`trip-${newId}-expenses`, '[]');
    localStorage.setItem(`trip-${newId}-checklist`, '[]');

    // Upload to Cloud
    if (user) {
      await uploadTripToCloud(newId, name, startDate, season, newItinerary);
    }

    return newId;
  };

  const createTemplateTrip = async () => {
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
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
      coverImage: getRandomSeasonImage(templateSeason)
    };

    setTrips(prev => [newTripMeta, ...prev]);
    localStorage.setItem(`trip-${newId}-settings`, JSON.stringify({ name: templateName, startDate: templateDate, season: templateSeason }));
    localStorage.setItem(`trip-${newId}-itinerary`, JSON.stringify(newItinerary));
    localStorage.setItem(`trip-${newId}-expenses`, '[]');
    localStorage.setItem(`trip-${newId}-checklist`, '[]');

    if (user) {
      await uploadTripToCloud(newId, templateName, templateDate, templateSeason, newItinerary);
    }

    return newId;
  };

  const deleteTrip = async (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));

    // Cleanup keys globally
    localStorage.removeItem(`trip-${id}-settings`);
    localStorage.removeItem(`trip-${id}-itinerary`);
    localStorage.removeItem(`trip-${id}-expenses`);
    localStorage.removeItem(`trip-${id}-checklist`);

    // Delete from Cloud
    if (user) {
      try {
        const { error } = await supabase.from('trips').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to delete trip from cloud:", err);
      }
    }
  };

  const updateTripMeta = (id: string, updates: Partial<TripMetadata>) => {
    setTrips(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    // Note: We don't automatically sync meta to cloud here.
    // The meta is usually derived from the settings/data jsonb column.
    // Full sync happens inside TripView when data actually changes.
  };

  const reorderTrips = (activeId: string, overId: string) => {
    setTrips((items) => {
      const oldIndex = items.findIndex((item) => item.id === activeId);
      const newIndex = items.findIndex((item) => item.id === overId);

      const newItems = [...items];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);

      return newItems;
    });
  };

  return {
    trips,
    loadingTrips,
    createTrip,
    createTemplateTrip, // Export this
    deleteTrip,
    updateTripMeta,
    reorderTrips
  };
};