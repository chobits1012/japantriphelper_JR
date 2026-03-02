import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { TripSettings, ItineraryDay, ExpenseItem, ChecklistCategory } from '../types';

export const useCloudSync = (
    tripId: string,
    getExportData: () => any
) => {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStage, setSyncStage] = useState<string>('');
    const [syncError, setSyncError] = useState<string | null>(null);

    // Auto-save debouncer
    useEffect(() => {
        if (!user || !tripId) return;

        const saveTimeout = setTimeout(async () => {
            const data = getExportData();
            // Don't sync if empty (initial load race condition protection)
            if (!data.settings || !data.settings.name) return;

            setIsSyncing(true);
            setSyncStage('自動存檔中...');
            try {
                const { error } = await supabase
                    .from('trips')
                    .update({
                        data: data,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', tripId);

                if (error) throw error;
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
        setIsSyncing(true);
        setSyncStage('強制同步中...');
        setSyncError(null);
        try {
            const data = getExportData();
            const { error } = await supabase
                .from('trips')
                .update({
                    data: data,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tripId);
            if (error) throw error;
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
