import React, { useState, useEffect } from 'react';
import type { TripSettings } from '../types';

interface UseTitleEditorProps {
    tripSettings: TripSettings;
    setTripSettings: React.Dispatch<React.SetStateAction<TripSettings>>;
    tripId: string;
    updateTripMeta: (id: string, updates: { name?: string }) => void;
}

export const useTitleEditor = ({
    tripSettings,
    setTripSettings,
    tripId,
    updateTripMeta
}: UseTitleEditorProps) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');

    // Sync title to edit state when not editing
    useEffect(() => {
        if (!isEditingTitle) {
            setTempTitle(tripSettings.name);
        }
    }, [tripSettings.name, isEditingTitle]);

    const handleSaveTitle = () => {
        if (tempTitle.trim()) {
            setTripSettings(prev => ({ ...prev, name: tempTitle }));
            updateTripMeta(tripId, { name: tempTitle });
        }
        setIsEditingTitle(false);
    };

    const handleCancelEdit = () => {
        setTempTitle(tripSettings.name);
        setIsEditingTitle(false);
    };

    const startEditing = () => {
        setTempTitle(tripSettings.name);
        setIsEditingTitle(true);
    };

    return {
        isEditingTitle,
        tempTitle,
        setTempTitle,
        handleSaveTitle,
        handleCancelEdit,
        startEditing
    };
};
