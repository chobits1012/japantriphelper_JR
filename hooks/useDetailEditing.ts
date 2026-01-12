import { useState, useEffect } from 'react';
import type { ItineraryDay } from '../types';

export const useDetailEditing = (
    day: ItineraryDay,
    onUpdate: (updatedDay: ItineraryDay | ItineraryDay[]) => void
) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<ItineraryDay>(day);

    // Reset edit data when day changes
    useEffect(() => {
        setEditData(day);
        setIsEditing(false);
    }, [day]);

    const startEdit = () => {
        setEditData(day);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setEditData(day);
        setIsEditing(false);
    };

    const saveEdit = () => {
        onUpdate(editData);
        setIsEditing(false);
    };

    const updateTitle = (title: string) => {
        setEditData(prev => ({ ...prev, title }));
    };

    const updateDescription = (desc: string) => {
        setEditData(prev => ({ ...prev, desc }));
    };

    const updateLocation = (location: string) => {
        setEditData(prev => ({ ...prev, location }));
    };

    const updateWeatherIcon = (weatherIcon: string) => {
        setEditData(prev => ({ ...prev, weatherIcon }));
    };

    const updateEditData = (updates: Partial<ItineraryDay>) => {
        setEditData(prev => ({ ...prev, ...updates }));
    };

    return {
        isEditing,
        editData,
        setEditData,
        startEdit,
        cancelEdit,
        saveEdit,
        updateTitle,
        updateDescription,
        updateLocation,
        updateWeatherIcon,
        updateEditData,
    };
};
