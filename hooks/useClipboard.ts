import { useState } from 'react';
import type { ItineraryDay, TripSettings } from '../types';

interface UseClipboardProps {
    tripSettings: TripSettings;
    itineraryData: ItineraryDay[];
}

export const useClipboard = ({ tripSettings, itineraryData }: UseClipboardProps) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyText = () => {
        let text = `【${tripSettings.name}】\n日期：${tripSettings.startDate} 出發\n\n`;

        itineraryData.forEach(day => {
            text += `📅 ${day.day} (${day.date} ${day.weekday}) - ${day.title}\n`;
            text += `📍 ${day.desc}\n`;
            if (day.accommodation) text += `🏨 住宿：${day.accommodation.name}\n`;

            day.events.forEach(event => {
                text += `   - ${event.time} ${event.title}`;
                if (event.desc) text += ` : ${event.desc}`;
                text += '\n';
            });
            text += '\n------------------\n\n';
        });

        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return {
        isCopied,
        handleCopyText
    };
};
