import { useMemo } from 'react';
import type { ItineraryDay } from '../types';

export const useMultiplePlans = (
    day: ItineraryDay,
    allDays: ItineraryDay[],
    editData: ItineraryDay,
    setEditData: (data: ItineraryDay) => void,
    onUpdate: (updatedDay: ItineraryDay | ItineraryDay[]) => void,
    isEditing: boolean
) => {
    const currentPlanId = editData.activePlanId || 'A';
    const PLANS = ['A', 'B', 'C'];

    const handleSwitchPlan = (targetPlanId: string) => {
        if (targetPlanId === currentPlanId) return;

        console.log(`[DetailModal] Switching from ${currentPlanId} to ${targetPlanId}`);

        // Save current events AND title/desc to the "outgoing" plan storage
        const updatedSubPlans = { ...(editData.subPlans || {}) };

        updatedSubPlans[currentPlanId] = {
            events: editData.events,
            title: editData.title,
            desc: editData.desc
        };

        // Load target events, title, and desc
        const targetSubPlan = updatedSubPlans[targetPlanId];
        const targetEvents = targetSubPlan?.events || [];

        // Inherit from day if first time visiting this plan
        const targetTitle = targetSubPlan?.title !== undefined ? targetSubPlan.title : day.title;
        const targetDesc = targetSubPlan?.desc !== undefined ? targetSubPlan.desc : day.desc;

        console.log(`[DetailModal] Loading ${targetPlanId}: ${targetEvents.length} events, Title: ${targetTitle}`);

        const newData = {
            ...editData,
            subPlans: updatedSubPlans,
            activePlanId: targetPlanId,
            events: targetEvents,
            title: targetTitle,
            desc: targetDesc
        };

        setEditData(newData);

        // If in View Mode, persist the change immediately
        if (!isEditing) {
            console.log(`[DetailModal] View Mode Switch: Persisting change to parent immediately.`);
            onUpdate(newData);
        }
    };

    const handleClearPlan = () => {
        const clearedData = {
            ...editData,
            events: [],
            title: `${day.title} (${currentPlanId})`,
            desc: ''
        };

        const updatedSubPlans = { ...(editData.subPlans || {}) };
        updatedSubPlans[currentPlanId] = {
            events: [],
            title: clearedData.title,
            desc: ''
        };

        const finalData = { ...clearedData, subPlans: updatedSubPlans };
        setEditData(finalData);
        if (!isEditing) {
            onUpdate(finalData);
        }
    };

    return {
        currentPlanId,
        PLANS,
        handleSwitchPlan,
        handleClearPlan,
    };
};
