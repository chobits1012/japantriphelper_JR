import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { TripSettings, ItineraryDay, ExpenseItem, ChecklistCategory } from '../types';

// UUID v4 format check — Supabase trips.id is type uuid
const isValidUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const useCloudSync = (
    tripId: string,
    getExportData: () => any
) => {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStage, setSyncStage] = useState<string>('');
    const [syncError, setSyncError] = useState<string | null>(null);

    // Whether cloud sync is actually active for this trip
    const isCloudEnabled = !!user && isValidUUID(tripId);

    // Auto-save debouncer
    useEffect(() => {
        if (!user || !tripId) return;
        // Skip sync for legacy non-UUID trip IDs (e.g. "default-kansai", "legacy-trip")
        if (!isValidUUID(tripId)) return;

        const saveTimeout = setTimeout(async () => {
            const data = getExportData();
            // Don't sync if empty (initial load race condition protection)
            if (!data.settings || !data.settings.name) return;

            setIsSyncing(true);
            setSyncStage('自動存檔中...');
            try {
                // Use upsert so it works even if the trip doesn't exist in cloud yet
                const { error } = await supabase
                    .from('trips')
                    .upsert({
                        id: tripId,
                        owner_id: user.id,
                        title: data.settings.name,
                        data: data,
                        updated_at: new Date().toISOString()
                    });

                if (error) throw error;

                // Also ensure trip_members entry exists
                await supabase
                    .from('trip_members')
                    .upsert({
                        trip_id: tripId,
                        user_id: user.id,
                        role: 'owner'
                    }, { onConflict: 'trip_id,user_id' });

                setSyncError(null);
            } catch (err: any) {
                console.error("Auto-save failed:", err);
                setSyncError(err.message);
            } finally {
                setIsSyncing(false);
                setSyncStage('');
            }
        }, 1500); // 1.5s debounce

        return () => clearTimeout(saveTimeout);
    }, [getExportData, user, tripId]); // Re-run when data snapshot changes

    // Manual upload is now essentially just forcing a save
    const handleUpdateCloud = async () => {
        if (!user || !tripId) return;
        if (!isValidUUID(tripId)) {
            setSyncError('此行程尚未同步至雲端（需要新建行程才能同步）');
            return;
        }
        setIsSyncing(true);
        setSyncStage('強制同步中...');
        setSyncError(null);
        try {
            const data = getExportData();
            const { error } = await supabase
                .from('trips')
                .upsert({
                    id: tripId,
                    owner_id: user.id,
                    title: data.settings.name,
                    data: data,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;

            await supabase
                .from('trip_members')
                .upsert({
                    trip_id: tripId,
                    user_id: user.id,
                    role: 'owner'
                }, { onConflict: 'trip_id,user_id' });

            setSyncError(null);
        } catch (e: any) {
            setSyncError(e.message);
        } finally {
            setIsSyncing(false);
            setSyncStage('');
        }
    };

    return {
        isSyncing,
        syncStage,
        syncError,
        isCloudEnabled,
        handleUpdateCloud,
        // Expose a dummy config/id for compatibility with the existing UI for now, 
        // to avoid breaking the TravelToolbox component entirely before we refactor it.
        firebaseConfig: user ? {} as any : null,
        cloudId: tripId,
        cloudIdInput: '',
        setCloudIdInput: () => { },
        showConfigEdit: !user,
        setShowConfigEdit: () => { },
        handleSaveConfig: () => { },
        handleResetConfig: () => { },
        handleUploadCloud: handleUpdateCloud, // Map to update
        handleDownloadCloud: async () => { }, // Disabled for now
    };
};

