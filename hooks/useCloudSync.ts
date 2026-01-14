import { useState } from 'react';
import { CLOUD_SYNC_CONFIG_KEY } from '../constants';
import { uploadToCloud, downloadFromCloud, FirebaseConfig } from '../lib/firebaseSync';
import type { TripSettings, ItineraryDay, ExpenseItem, ChecklistCategory } from '../types';

export const useCloudSync = (
    getExportData: () => any
) => {
    const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(() => {
        const saved = localStorage.getItem(CLOUD_SYNC_CONFIG_KEY);
        return saved ? JSON.parse(saved) : null;
    });
    const [configInput, setConfigInput] = useState<string>(() => {
        const saved = localStorage.getItem(CLOUD_SYNC_CONFIG_KEY);
        return saved ? JSON.stringify(JSON.parse(saved), null, 2) : '';
    });
    const [cloudId, setCloudId] = useState('');
    const [cloudIdInput, setCloudIdInput] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStage, setSyncStage] = useState<string>('');
    const [showConfigEdit, setShowConfigEdit] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const handleSaveConfig = () => {
        try {
            const config = JSON.parse(configInput);
            setFirebaseConfig(config);
            localStorage.setItem(CLOUD_SYNC_CONFIG_KEY, JSON.stringify(config));
            setShowConfigEdit(false);
            setSyncError(null);
        } catch (e) {
            alert("Firebase Config 格式錯誤，請貼上正確的 JSON 格式。");
        }
    };

    const handleResetConfig = () => {
        setFirebaseConfig(null);
        setConfigInput('');
        localStorage.removeItem(CLOUD_SYNC_CONFIG_KEY);
        setShowConfigEdit(true);
        setSyncError(null);
    };

    const handleUploadCloud = async () => {
        if (!firebaseConfig) {
            setShowConfigEdit(true);
            return;
        }
        setIsSyncing(true);
        setSyncStage('準備中...');
        setSyncError(null);
        try {
            const data = getExportData();
            const id = await uploadToCloud(firebaseConfig, data, (stage) => setSyncStage(stage));
            setCloudId(id);
        } catch (e: any) {
            let msg = e.message;
            if (msg.includes('auth/api-key-not-valid')) {
                msg = "Firebase API Key 無效。請檢查：1. 是否已在 Firebase Console 啟用『匿名登入』並儲存？ 2. JSON 是否正確？";
            } else if (msg.includes('Missing or insufficient permissions')) {
                msg = "資料庫權限不足。請檢查 Firebase Console 的 Firestore Rules，是否已改為『測試模式』或允許寫入。";
            }
            setSyncError(msg);
            alert("上傳失敗: " + msg);
        } finally {
            setIsSyncing(false);
            setSyncStage('');
        }
    };

    const handleUpdateCloud = async () => {
        if (!firebaseConfig || !cloudId) return;
        setIsSyncing(true);
        setSyncStage('更新中...');
        setSyncError(null);
        try {
            const data = getExportData();
            await uploadToCloud(firebaseConfig, data, (stage) => setSyncStage(stage), cloudId);
            alert("更新成功！您的雲端資料已同步。");
        } catch (e: any) {
            setSyncError(e.message);
            alert("更新失敗: " + e.message);
        } finally {
            setIsSyncing(false);
            setSyncStage('');
        }
    };

    const handleDownloadCloud = async (onConfirm: (data: any) => void) => {
        if (!firebaseConfig) {
            setShowConfigEdit(true);
            return;
        }
        const idToDownload = cloudIdInput.trim().toUpperCase();
        if (!idToDownload) return;

        if (idToDownload.length !== 6) {
            alert(`雲端 ID 格式錯誤\n\n請輸入 6 碼英數字。\n您輸入的 ID 長度為：${idToDownload.length}`);
            return;
        }

        alert(`[除錯模式] 正在連線下載 ID: [${idToDownload}]\n請確認括號內的 ID 是否正確，且前後無空白。`);

        setIsSyncing(true);
        setSyncStage('準備中...');
        setSyncError(null);
        try {
            const data = await downloadFromCloud(firebaseConfig, idToDownload, (stage) => setSyncStage(stage));
            onConfirm(data);
        } catch (e: any) {
            setSyncError(e.message);
            alert("下載失敗: " + e.message);
        } finally {
            setIsSyncing(false);
            setSyncStage('');
        }
    };

    return {
        firebaseConfig,
        configInput,
        setConfigInput,
        cloudId,
        cloudIdInput,
        setCloudIdInput,
        isSyncing,
        syncStage,
        syncError,
        showConfigEdit,
        setShowConfigEdit,
        handleSaveConfig,
        handleResetConfig,
        handleUploadCloud,
        handleUpdateCloud,
        handleDownloadCloud,
    };
};
