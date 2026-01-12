import React, { useState, useRef } from 'react';
import LZString from 'lz-string';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { TripSettings, ItineraryDay, ExpenseItem, ChecklistCategory } from '../types';

export const useBackup = (
    tripSettings: TripSettings,
    itineraryData: ItineraryDay[],
    expenses: ExpenseItem[],
    checklist: ChecklistCategory[],
    onUpdateTripSettings: (settings: TripSettings) => void,
    onUpdateItinerary: (data: ItineraryDay[]) => void,
    onUpdateExpenses: (items: ExpenseItem[]) => void,
    onUpdateChecklist: (categories: ChecklistCategory[]) => void
) => {
    const [importCode, setImportCode] = useState('');
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getExportData = () => {
        return {
            tripSettings,
            itineraryData,
            expenses,
            checklist,
            version: 2,
            timestamp: new Date().toISOString()
        };
    };

    const handleCopyCode = () => {
        const data = getExportData();
        const jsonString = JSON.stringify(data);
        const compressed = LZString.compressToEncodedURIComponent(jsonString);

        navigator.clipboard.writeText(compressed);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadFile = async () => {
        const data = getExportData();
        const jsonString = JSON.stringify(data, null, 2);
        const fileName = `${tripSettings.name}_行程備份.json`;

        if (Capacitor.isNativePlatform()) {
            try {
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: jsonString,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8,
                });

                await Share.share({
                    title: '備份行程',
                    text: `分享行程備份: ${tripSettings.name}`,
                    url: result.uri,
                    dialogTitle: '儲存或分享備份檔',
                });
            } catch (e) {
                console.error('File export failed', e);
                alert('匯出失敗，請稍後再試');
            }
        } else {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const processImportData = (data: any, onConfirm: (data: any) => void) => {
        if (!data.itineraryData || !data.tripSettings) {
            throw new Error("無效的行程資料格式");
        }
        onConfirm(data);
    };

    const handleImportCode = (onConfirm: (data: any) => void) => {
        try {
            if (!importCode.trim()) return;
            let jsonString = importCode.trim();
            if (!jsonString.startsWith('{')) {
                const decompressed = LZString.decompressFromEncodedURIComponent(jsonString);
                if (decompressed) jsonString = decompressed;
            }
            const data = JSON.parse(jsonString);
            processImportData(data, onConfirm);
        } catch (e) {
            throw new Error("無效的代碼或格式錯誤");
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, onConfirm: (data: any) => void) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const data = JSON.parse(result);
                processImportData(data, onConfirm);
            } catch (err: any) {
                throw new Error("檔案格式錯誤或損毀");
            }
        };
        reader.readAsText(file);
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const executeImport = (data: any) => {
        onUpdateTripSettings(data.tripSettings);
        onUpdateItinerary(data.itineraryData);
        if (data.expenses) onUpdateExpenses(data.expenses);

        if (data.checklist) {
            const cl = data.checklist;
            if (Array.isArray(cl) && cl.length > 0 && 'text' in cl[0]) {
                onUpdateChecklist([{
                    id: 'imported-legacy', title: '匯入的清單', items: cl, isCollapsed: false
                }]);
            } else {
                onUpdateChecklist(cl);
            }
        }
        setImportCode('');
    };

    return {
        importCode,
        setImportCode,
        copied,
        fileInputRef,
        getExportData,
        handleCopyCode,
        handleDownloadFile,
        handleImportCode,
        handleFileUpload,
        triggerFileUpload,
        executeImport,
    };
};
