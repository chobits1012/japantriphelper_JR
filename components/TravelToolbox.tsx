import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Wallet, CheckSquare, Plus, Trash2, RefreshCw, TrendingUp, Coins, Cloud, FileJson, ChevronDown, ChevronRight, FolderPlus, Pencil, Save, Upload, Copy, Check, AlertTriangle, Sparkles } from 'lucide-react';
import LZString from 'lz-string';
import type { ExpenseItem, ChecklistCategory, ChecklistItem, TripSettings, ItineraryDay } from '../types';
import ConfirmModal from './ConfirmModal';
import { EXCHANGE_RATE_API_URL, CLOUD_SYNC_CONFIG_KEY } from '../constants';
import { uploadToCloud, downloadFromCloud, FirebaseConfig } from '../lib/firebaseSync';
import { calculateDataSizeMB, STORAGE_LIMITS, formatSize } from '../lib/storageCalculator';

interface TravelToolboxProps {
  isOpen: boolean;
  onClose: () => void;
  tripSettings: TripSettings;
  onUpdateTripSettings: (settings: TripSettings) => void;
  itineraryData: ItineraryDay[];
  onUpdateItinerary: (data: ItineraryDay[]) => void;
  expenses: ExpenseItem[];
  onUpdateExpenses: (items: ExpenseItem[]) => void;
  checklist: ChecklistCategory[];
  onUpdateChecklist: (categories: ChecklistCategory[]) => void;
}

const DEFAULT_CATEGORIES = [
  { title: "證件/錢財", items: ["護照 (效期6個月以上)", "JR PASS 兌換券", "日幣現金", "信用卡 (海外回饋高)"] },
  { title: "衣物/穿搭", items: ["換洗衣物", "好走的鞋子", "保暖衣物/發熱衣", "帽子/太陽眼鏡"] },
  { title: "電子產品", items: ["手機", "充電器", "行動電源", "網卡/eSIM/漫遊", "轉接頭 (日本雙孔)"] },
  { title: "盥洗/藥品", items: ["個人藥品", "牙刷牙膏", "保養品/化妝品"] },
  { title: "其他", items: ["雨傘", "筆", "Visit Japan Web 截圖"] }
];

// Define type for expense categories to avoid implicit any errors
type ExpenseCategoryKey = 'food' | 'shopping' | 'transport' | 'hotel' | 'other';

const EXPENSE_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  food: { label: '美食', color: '#fb923c', bg: 'bg-orange-400' },
  shopping: { label: '購物', color: '#c084fc', bg: 'bg-purple-400' },
  transport: { label: '交通', color: '#9ca3af', bg: 'bg-gray-400' },
  hotel: { label: '住宿', color: '#818cf8', bg: 'bg-indigo-400' },
  other: { label: '其他', color: '#60a5fa', bg: 'bg-blue-400' }
};

const TravelToolbox: React.FC<TravelToolboxProps> = ({
  isOpen, onClose,
  tripSettings, onUpdateTripSettings,
  itineraryData, onUpdateItinerary,
  expenses, onUpdateExpenses,
  checklist, onUpdateChecklist
}) => {
  const [activeTab, setActiveTab] = useState<'currency' | 'expense' | 'checklist' | 'backup' | 'cloud'>('expense');

  // --- Confirm Modal State ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDangerous?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });


  // --- Currency State ---
  const [rate, setRate] = useState<number>(0.215);
  const [jpyInput, setJpyInput] = useState<string>('1000');
  const [twdInput, setTwdInput] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loadingRate, setLoadingRate] = useState(false);

  // --- Expense State ---
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCat, setNewExpCat] = useState<string>('food');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(tripSettings.budgetJPY?.toString() || '');

  // --- Backup State ---
  const [importCode, setImportCode] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Checklist State ---
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // --- Cloud Sync State ---
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

  // Initialize Checklist if empty
  useEffect(() => {
    if (checklist.length === 0) {
      // Direct init if empty, no confirm needed
      const initialList: ChecklistCategory[] = DEFAULT_CATEGORIES.map(cat => ({
        id: Math.random().toString(36).substr(2, 9),
        title: cat.title,
        items: cat.items.map(text => ({
          id: Math.random().toString(36).substr(2, 9),
          text,
          checked: false
        })),
        isCollapsed: false
      }));
      onUpdateChecklist(initialList);
    }
  }, []);

  // Fetch Exchange Rate
  useEffect(() => {
    if (isOpen) {
      fetchRate();
    }
  }, [isOpen]);

  const fetchRate = async () => {
    if (activeTab !== 'currency' && rate !== 0.215) return; // Only fetch if needed or if using default
    setLoadingRate(true);
    try {
      const res = await fetch(EXCHANGE_RATE_API_URL);
      const data = await res.json();
      const currentRate = data.rates.TWD;
      setRate(currentRate);
      setLastUpdated(new Date().toLocaleTimeString());
      setTwdInput((parseFloat(jpyInput) * currentRate).toFixed(0));
    } catch (e) {
      console.error("Failed to fetch rate", e);
    } finally {
      setLoadingRate(false);
    }
  };

  const handleJpyChange = (val: string) => {
    setJpyInput(val);
    if (!isNaN(parseFloat(val))) {
      setTwdInput((parseFloat(val) * rate).toFixed(0));
    } else {
      setTwdInput('');
    }
  };

  const handleTwdChange = (val: string) => {
    setTwdInput(val);
    if (!isNaN(parseFloat(val))) {
      setJpyInput((parseFloat(val) / rate).toFixed(0));
    } else {
      setJpyInput('');
    }
  };

  // --- EXPENSE LOGIC ---
  const handleAddExpense = () => {
    if (!newExpTitle || !newExpAmount) return;
    const newItem: ExpenseItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: newExpTitle,
      amountJPY: parseInt(newExpAmount),
      category: newExpCat,
      date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    };
    onUpdateExpenses([newItem, ...expenses]);
    setNewExpTitle('');
    setNewExpAmount('');
  };

  const handleDeleteExpense = (id: string) => {
    onUpdateExpenses(expenses.filter(e => e.id !== id));
  };

  const handleClearExpenses = () => {
    setConfirmModal({
      isOpen: true,
      title: "清空記帳",
      message: "確定要清空所有記帳紀錄嗎？此動作無法復原。",
      isDangerous: true,
      onConfirm: () => {
        onUpdateExpenses([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveBudget = () => {
    const budget = parseInt(budgetInput);
    if (!isNaN(budget)) {
      onUpdateTripSettings({ ...tripSettings, budgetJPY: budget });
    }
    setIsEditingBudget(false);
  };

  // Calculate Expense Stats
  const totalJPY = expenses.reduce((sum, item) => sum + (item.amountJPY || 0), 0);
  const budget = tripSettings.budgetJPY || 0;
  const remaining = budget - totalJPY;
  const percentSpent = budget > 0 ? Math.min((totalJPY / budget) * 100, 100) : 0;

  const toTWD = (jpy: number) => `NT$ ${Math.round(jpy * rate).toLocaleString()}`;

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { food: 0, shopping: 0, transport: 0, hotel: 0, other: 0 };
    expenses.forEach(item => {
      // Use fallback 'other' if category is undefined or not in list
      const cat = EXPENSE_CATEGORIES[item.category] ? item.category : 'other';
      if (stats[cat] !== undefined) {
        stats[cat] += (item.amountJPY || 0);
      }
    });
    return stats;
  }, [expenses]);

  // --- CHECKLIST LOGIC ---

  const handleResetChecklist = () => {
    setConfirmModal({
      isOpen: true,
      title: "重置清單",
      message: "確定要重置檢查清單嗎？這將會恢復為預設項目並清除自訂項目。",
      isDangerous: true,
      onConfirm: () => {
        const initialList: ChecklistCategory[] = DEFAULT_CATEGORIES.map(cat => ({
          id: Math.random().toString(36).substr(2, 9),
          title: cat.title,
          items: cat.items.map(text => ({
            id: Math.random().toString(36).substr(2, 9),
            text,
            checked: false
          })),
          isCollapsed: false
        }));
        onUpdateChecklist(initialList);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const toggleCategoryCollapse = (catId: string) => {
    onUpdateChecklist(checklist.map(cat =>
      cat.id === catId ? { ...cat, isCollapsed: !cat.isCollapsed } : cat
    ));
  };

  const handleDeleteCategory = (catId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "刪除分類",
      message: "確定要刪除這個分類嗎？",
      isDangerous: true,
      onConfirm: () => {
        onUpdateChecklist(checklist.filter(c => c.id !== catId));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: ChecklistCategory = {
      id: Math.random().toString(36).substr(2, 9),
      title: newCategoryName,
      items: [],
      isCollapsed: false
    };
    onUpdateChecklist([...checklist, newCat]);
    setNewCategoryName('');
    setShowNewCatInput(false);
  };

  const handleStartEditTitle = (cat: ChecklistCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCatId(cat.id);
    setEditingTitle(cat.title);
  };

  const handleSaveTitle = (catId: string) => {
    if (editingTitle.trim()) {
      onUpdateChecklist(checklist.map(c => c.id === catId ? { ...c, title: editingTitle } : c));
    }
    setEditingCatId(null);
    setEditingTitle('');
  };

  const handleAddItemInput = (catId: string, val: string) => {
    setNewItemInputs(prev => ({ ...prev, [catId]: val }));
  };

  const handleAddItemSubmit = (catId: string) => {
    const text = newItemInputs[catId];
    if (!text || !text.trim()) return;

    onUpdateChecklist(checklist.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          items: [...cat.items, { id: Math.random().toString(36).substr(2, 9), text: text.trim(), checked: false }]
        };
      }
      return cat;
    }));

    // Keep focus logic relies on the input remaining rendered
    setNewItemInputs(prev => ({ ...prev, [catId]: '' }));
  };

  const handleToggleItem = (catId: string, itemId: string) => {
    onUpdateChecklist(checklist.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          items: cat.items.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          )
        };
      }
      return cat;
    }));
  };

  const handleDeleteItem = (catId: string, itemId: string) => {
    onUpdateChecklist(checklist.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          items: cat.items.filter(item => item.id !== itemId)
        };
      }
      return cat;
    }));
  };

  // --- BACKUP & SHARE LOGIC ---

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

  const handleDownloadFile = () => {
    const data = getExportData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${tripSettings.name}_行程備份.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processImportData = (data: any) => {
    if (!data.itineraryData || !data.tripSettings) {
      throw new Error("無效的行程資料格式");
    }

    setConfirmModal({
      isOpen: true,
      title: "確認匯入",
      message: `⚠️ 確定要匯入行程「${data.tripSettings.name}」嗎？\n\n您目前手機上的所有資料將會被覆蓋！`,
      isDangerous: true,
      onConfirm: () => {
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

        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        // Show success message (reusing modal as info)
        setTimeout(() => {
          setConfirmModal({
            isOpen: true,
            title: "匯入成功",
            message: "您的行程資料已成功匯入！",
            isDangerous: false,
            onConfirm: () => {
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
              setImportCode('');
              onClose();
            }
          });
        }, 100);
      }
    });
  };

  const handleImportCode = () => {
    try {
      if (!importCode.trim()) return;
      let jsonString = importCode.trim();
      if (!jsonString.startsWith('{')) {
        const decompressed = LZString.decompressFromEncodedURIComponent(jsonString);
        if (decompressed) jsonString = decompressed;
      }
      const data = JSON.parse(jsonString);
      processImportData(data);
    } catch (e) {
      setConfirmModal({
        isOpen: true,
        title: "匯入失敗",
        message: "無效的代碼或格式錯誤。",
        isDangerous: false,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const data = JSON.parse(result);
        processImportData(data);
      } catch (err) {
        setConfirmModal({
          isOpen: true,
          title: "讀取失敗",
          message: "檔案格式錯誤或損毀。",
          isDangerous: false,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
      }
      reader.readAsText(file);
    };
  };


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
      // Pass existing cloudId to update it
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

  const handleDownloadCloud = async () => {
    if (!firebaseConfig) {
      setShowConfigEdit(true);
      return;
    }
    if (!cloudIdInput.trim()) return;
    setIsSyncing(true);
    setSyncStage('準備中...');
    setSyncError(null);
    try {
      const data = await downloadFromCloud(firebaseConfig, cloudIdInput.trim(), (stage) => setSyncStage(stage));
      processImportData(data);
    } catch (e: any) {
      setSyncError(e.message);
      alert("下載失敗: " + e.message);
    } finally {
      setIsSyncing(false);
      setSyncStage('');
    }
  };


  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={confirmModal.isDangerous}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-gray-900 p-4 flex items-center justify-between text-white">
          <h3 className="font-serif font-bold text-lg tracking-wide flex items-center gap-2">
            <Wallet size={20} className="text-yellow-400" />
            旅遊工具箱
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex-1 min-w-[80px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'expense' ? 'text-japan-blue border-b-2 border-japan-blue bg-blue-50/50 dark:bg-slate-800 dark:text-sky-400 dark:border-sky-500' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <Coins size={16} /> <span className="hidden sm:inline">記帳</span>
          </button>
          <button
            onClick={() => setActiveTab('currency')}
            className={`flex-1 min-w-[80px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'currency' ? 'text-japan-blue border-b-2 border-japan-blue bg-blue-50/50 dark:bg-slate-800 dark:text-sky-400 dark:border-sky-500' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <RefreshCw size={16} /> <span className="hidden sm:inline">匯率</span>
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 min-w-[80px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'checklist' ? 'text-japan-blue border-b-2 border-japan-blue bg-blue-50/50 dark:bg-slate-800 dark:text-sky-400 dark:border-sky-500' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <CheckSquare size={16} /> <span className="hidden sm:inline">清單</span>
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 min-w-[80px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'cloud' ? 'text-japan-blue border-b-2 border-japan-blue bg-blue-50/50 dark:bg-slate-800 dark:text-sky-400 dark:border-sky-500' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <Cloud size={16} /> <span className="hidden sm:inline">雲端</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 min-w-[80px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'backup' ? 'text-japan-blue border-b-2 border-japan-blue bg-blue-50/50 dark:bg-slate-800 dark:text-sky-400 dark:border-sky-500' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <Copy size={16} /> <span className="hidden sm:inline">備份</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 bg-paper dark:bg-slate-950">

          {/* --- EXPENSE TAB --- */}
          {activeTab === 'expense' && (
            <div className="space-y-4 pb-20">

              {/* 1. Budget Settings */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Budget</span>
                  {isEditingBudget ? (
                    <button onClick={handleSaveBudget} className="text-japan-blue bg-blue-50 px-2 py-1 rounded text-xs font-bold dark:bg-slate-800 dark:text-sky-400">儲存</button>
                  ) : (
                    <button onClick={() => setIsEditingBudget(true)} className="text-gray-400 hover:text-japan-blue dark:hover:text-sky-400"><Pencil size={14} /></button>
                  )}
                </div>

                {isEditingBudget ? (
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    className="w-full text-2xl font-mono font-bold border-b-2 border-japan-blue outline-none bg-transparent dark:text-white"
                    autoFocus
                  />
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono font-bold text-ink dark:text-white">
                        ¥{(tripSettings.budgetJPY || 0).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">({toTWD(tripSettings.budgetJPY || 0)})</span>
                  </div>
                )}
              </div>

              {/* 2. Visual Chart (Stacked Bar) */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold text-gray-400">已支出</p>
                    <p className="text-xl font-mono font-bold text-japan-blue dark:text-sky-400">¥{totalJPY.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{toTWD(totalJPY)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400">剩餘</p>
                    <p className={`text-xl font-mono font-bold ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      ¥{remaining.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">{toTWD(remaining)}</p>
                  </div>
                </div>

                {/* Stacked Bar */}
                <div className="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  {totalJPY > 0 && Object.entries(categoryStats).map(([cat, amount]) => {
                    if (amount === 0) return null;
                    const pct = ((amount as number) / totalJPY) * 100;

                    const colorClass = EXPENSE_CATEGORIES[cat]?.bg || 'bg-gray-400';
                    return (
                      <div key={cat} style={{ width: `${pct}%` }} className={`h-full ${colorClass}`} title={`${cat}: ¥${amount}`} />
                    );
                  })}
                </div>

                {/* Breakdown Legend */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(categoryStats).map(([cat, amount]) => {
                    if (amount === 0) return null;
                    const conf = EXPENSE_CATEGORIES[cat] || { label: cat, bg: 'bg-gray-400', color: '#9ca3af' };
                    return (
                      <div key={cat} className="flex items-center gap-1.5 text-xs bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded border border-gray-100 dark:border-slate-700">
                        <div className={`w-2 h-2 rounded-full ${conf.bg}`} />
                        <span className="text-gray-600 dark:text-slate-300 font-bold">{conf.label}</span>
                        <span className="font-mono text-gray-400">¥{amount.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Action Header */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-gray-400 uppercase">新增記帳</span>
                {expenses.length > 0 && (
                  <button
                    onClick={handleClearExpenses}
                    className="text-xs font-bold text-red-400 hover:text-red-500 flex items-center gap-1 bg-red-50 dark:bg-slate-800 px-2 py-1 rounded-md"
                  >
                    <Trash2 size={12} /> 清空
                  </button>
                )}
              </div>

              {/* 4. Add Expense Input (Wrapped for Mobile) */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[140px]">
                  <input
                    type="text"
                    placeholder="項目 (如: 拉麵)"
                    value={newExpTitle}
                    onChange={e => setNewExpTitle(e.target.value)}
                    className="w-full text-sm font-bold border-b border-gray-200 dark:border-slate-700 focus:border-japan-blue dark:focus:border-sky-500 outline-none py-1 mb-2 bg-transparent dark:text-white placeholder-gray-400"
                  />
                  <input
                    type="number"
                    placeholder="金額 (JPY)"
                    value={newExpAmount}
                    onChange={e => setNewExpAmount(e.target.value)}
                    className="w-full text-sm font-mono border-b border-gray-200 dark:border-slate-700 focus:border-japan-blue dark:focus:border-sky-500 outline-none py-1 bg-transparent dark:text-white placeholder-gray-400"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <select
                    value={newExpCat}
                    onChange={(e: any) => setNewExpCat(e.target.value)}
                    className="flex-1 text-xs bg-gray-50 dark:bg-slate-800 dark:text-white rounded px-2 py-2 border-none outline-none h-10"
                  >
                    <option value="food">美食</option>
                    <option value="shopping">購物</option>
                    <option value="transport">交通</option>
                    <option value="hotel">住宿</option>
                    <option value="other">其他</option>
                  </select>
                  <button
                    onClick={handleAddExpense}
                    className="bg-japan-blue text-white w-10 h-10 rounded-lg flex items-center justify-center hover:bg-japan-blue/90 shadow-sm flex-shrink-0 dark:bg-sky-600 dark:hover:bg-sky-500"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* 5. Expense List */}
              <div className="space-y-2">
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">還沒有記帳紀錄</div>
                ) : (
                  expenses.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3">
                        <div className={`
                           w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0
                           ${item.category === 'food' ? 'bg-orange-400' :
                            item.category === 'shopping' ? 'bg-purple-400' :
                              item.category === 'transport' ? 'bg-gray-400' :
                                item.category === 'hotel' ? 'bg-indigo-400' : 'bg-blue-400'}
                        `}>
                          {item.category[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-ink dark:text-white text-sm truncate">{item.title}</p>
                          <p className="text-[10px] text-gray-400">{item.date} • {item.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-mono font-bold text-japan-blue dark:text-sky-400">¥{item.amountJPY.toLocaleString()}</span>
                        <button onClick={() => handleDeleteExpense(item.id)} className="text-gray-300 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- CURRENCY TAB --- */}
          {activeTab === 'currency' && (
            <div className="space-y-6 pt-4">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Current Rate (JPY/TWD)</p>
                <div className="flex items-center justify-center gap-2 text-japan-blue dark:text-sky-400">
                  <TrendingUp size={20} />
                  <span className="text-4xl font-mono font-bold">{rate}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {loadingRate ? 'Updating...' : `Updated: ${lastUpdated}`}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl space-y-4 border border-gray-100 dark:border-slate-800">
                {/* JPY Input */}
                <div className="relative">
                  <label className="text-xs font-bold text-gray-400 absolute left-3 top-2">JPY 日幣</label>
                  <input
                    type="number"
                    value={jpyInput}
                    onChange={e => handleJpyChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 p-3 pt-6 rounded-xl border border-gray-200 dark:border-slate-700 text-2xl font-mono font-bold text-ink dark:text-white focus:ring-2 focus:ring-japan-blue dark:focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full p-1.5 shadow-sm text-gray-400">
                    <RefreshCw size={16} />
                  </div>
                </div>

                {/* TWD Input */}
                <div className="relative">
                  <label className="text-xs font-bold text-gray-400 absolute left-3 top-2">TWD 台幣 (約)</label>
                  <input
                    type="number"
                    value={twdInput}
                    onChange={e => handleTwdChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 p-3 pt-6 rounded-xl border border-gray-200 dark:border-slate-700 text-2xl font-mono font-bold text-ink dark:text-white focus:ring-2 focus:ring-japan-blue dark:focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- CHECKLIST TAB (Categorized) --- */}
          {activeTab === 'checklist' && (
            <div className="space-y-4 pb-20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-ink dark:text-white">檢查清單</h4>
                  <span className="text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-1 rounded-full">
                    {checklist.reduce((acc, cat) => acc + cat.items.filter(i => i.checked).length, 0)} / {checklist.reduce((acc, cat) => acc + cat.items.length, 0)}
                  </span>
                </div>
                <button
                  onClick={handleResetChecklist}
                  className="text-xs font-bold text-gray-400 hover:text-japan-blue flex items-center gap-1"
                >
                  <RefreshCw size={12} /> 重置
                </button>
              </div>

              {/* Categories */}
              <div className="space-y-4">
                {checklist.map(cat => {
                  const total = cat.items.length;
                  const checkedCount = cat.items.filter(i => i.checked).length;
                  const progress = total > 0 ? (checkedCount / total) * 100 : 0;
                  const isEditingTitle = editingCatId === cat.id;

                  return (
                    <div key={cat.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                      {/* Cat Header */}
                      <div
                        onClick={() => toggleCategoryCollapse(cat.id)}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors select-none"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {cat.isCollapsed ? <ChevronRight size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}

                          {isEditingTitle ? (
                            <div className="flex items-center gap-2 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={e => setEditingTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveTitle(cat.id);
                                  }}
                                  className="text-sm font-bold p-1 border border-japan-blue rounded outline-none w-full bg-white dark:bg-slate-900 dark:text-white min-w-0"
                                  autoFocus
                                />
                              </div>
                              <button
                                onClick={() => handleSaveTitle(cat.id)}
                                className="p-1.5 bg-blue-50 text-japan-blue rounded hover:bg-japan-blue hover:text-white transition-colors flex-shrink-0"
                              >
                                <Save size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group min-w-0">
                              <span className="font-bold text-sm text-ink dark:text-white truncate">{cat.title}</span>
                              <button
                                onClick={(e) => handleStartEditTitle(cat, e)}
                                className="text-gray-300 hover:text-japan-blue p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              >
                                <Pencil size={12} />
                              </button>
                              <span className="text-xs text-gray-400 font-mono flex-shrink-0">({checkedCount}/{total})</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                          className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1 bg-gray-100 dark:bg-slate-800 w-full">
                        <div className="h-full bg-japan-blue dark:bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>

                      {/* Cat Items */}
                      {!cat.isCollapsed && (
                        <div className="p-3 space-y-2">
                          {cat.items.map(item => (
                            <div
                              key={item.id}
                              onClick={() => handleToggleItem(cat.id, item.id)}
                              className="flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`
                                         w-4 h-4 rounded border border-gray-300 dark:border-slate-600 flex items-center justify-center transition-colors flex-shrink-0
                                         ${item.checked ? 'bg-japan-blue border-japan-blue dark:bg-sky-500 dark:border-sky-500 text-white' : 'bg-white dark:bg-slate-800'}
                                      `}>
                                  {item.checked && <Check size={10} />}
                                </div>
                                <span className={`text-sm truncate ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-slate-300'}`}>
                                  {item.text}
                                </span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(cat.id, item.id); }}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity flex-shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}

                          {/* Add Item Input */}
                          <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-800 flex items-center gap-2">
                            <Plus size={14} className="text-gray-300 flex-shrink-0" />
                            <input
                              type="text"
                              placeholder="新增項目..."
                              className="flex-1 text-xs bg-transparent outline-none py-1 min-w-0 dark:text-white placeholder-gray-400"
                              value={newItemInputs[cat.id] || ''}
                              onChange={(e) => handleAddItemInput(cat.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddItemSubmit(cat.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleAddItemSubmit(cat.id)}
                              className="p-1 rounded bg-blue-50 text-japan-blue hover:bg-japan-blue hover:text-white transition-colors flex-shrink-0 dark:bg-slate-800 dark:text-sky-400"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Category Button */}
              {showNewCatInput ? (
                <div className="flex gap-2 items-center bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="新分類名稱..."
                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none focus:border-japan-blue min-w-0 dark:text-white"
                    autoFocus
                  />
                  <button onClick={handleAddCategory} className="text-japan-blue dark:text-sky-400 font-bold text-sm flex-shrink-0">新增</button>
                  <button onClick={() => setShowNewCatInput(false)} className="text-gray-400 flex-shrink-0"><X size={16} /></button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewCatInput(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 hover:border-japan-blue hover:text-japan-blue hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                >
                  <FolderPlus size={16} /> 新增分類
                </button>
              )}
            </div>
          )}

          {/* --- CLOUD SYNC TAB --- */}
          {activeTab === 'cloud' && (
            <div className="space-y-6 pt-2 pb-10">
              {/* Tutorial / Help Link */}
              <div className="bg-blue-50 dark:bg-sky-900/10 border border-blue-100 dark:border-sky-900/30 rounded-xl p-4 flex items-start gap-3">
                <div className="text-blue-500 mt-1 flex-shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="text-xs text-blue-700 dark:text-sky-400 leading-relaxed">
                  <p className="font-bold mb-1">如何使用雲端同步？</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>前往 <a href="https://console.firebase.google.com/" target="_blank" className="underline font-bold">Firebase 控制台</a> 建立專案。</li>
                    <li>開啟 **Firestore** 與 **Anonymous Auth**。</li>
                    <li>在專案設定中複製 **Config JSON** 貼到下方。</li>
                  </ol>
                </div>
              </div>

              {/* STORAGE INDICATOR */}
              {(() => {
                const totalData = { settings: tripSettings, itinerary: itineraryData, expenses, checklist };
                const sizeMB = calculateDataSizeMB(totalData);
                const percent = Math.min((sizeMB / STORAGE_LIMITS.CLOUD_MAX) * 100, 100);
                const isWarning = sizeMB > STORAGE_LIMITS.CLOUD_WARNING;

                return (
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400">目前資料大小</h4>
                      <span className={`text-xs font-mono font-bold ${isWarning ? 'text-orange-500' : 'text-japan-blue dark:text-sky-400'}`}>
                        {formatSize(sizeMB)} / {STORAGE_LIMITS.CLOUD_MAX}.0 MB
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isWarning ? 'bg-orange-500' : 'bg-japan-blue dark:bg-sky-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {isWarning && (
                      <p className="text-[10px] text-orange-500 mt-2 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        接近雲端傳輸上限，建議移除部分照片以確保同步成功。
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Config Section */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-ink dark:text-white flex items-center gap-2">
                    <Save size={14} /> Firebase 設定
                  </h4>
                  <button
                    onClick={() => setShowConfigEdit(!showConfigEdit)}
                    className="text-xs font-bold text-japan-blue dark:text-sky-400"
                  >
                    {showConfigEdit ? '取消' : '修改設定'}
                  </button>
                </div>

                {showConfigEdit || !firebaseConfig ? (
                  <div className="space-y-3">
                    <textarea
                      value={configInput}
                      onChange={e => setConfigInput(e.target.value)}
                      placeholder='請貼上 Firebase Config JSON...'
                      className="w-full h-32 p-3 text-[10px] font-mono bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-japan-blue dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveConfig}
                        className="flex-1 py-2 bg-japan-blue text-white rounded-lg font-bold text-sm dark:bg-sky-600"
                      >
                        儲存設定
                      </button>
                      {firebaseConfig && (
                        <button
                          onClick={handleResetConfig}
                          className="px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="清除所有設定"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                      <span className="flex items-center gap-1"><Check size={14} /> 已連接專案: {firebaseConfig.projectId}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Section */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 text-center">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md text-japan-blue dark:text-sky-400">
                    <Cloud size={24} className={isSyncing ? "animate-bounce" : ""} />
                  </div>
                  <h4 className="font-bold text-ink dark:text-white mb-2">上傳至雲端</h4>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-4 px-4">
                    將目前的行程、記帳與清單上傳，並獲取一組 Cloud ID 分享給朋友。
                  </p>

                  {syncError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={14} />
                      <p className="text-[10px] text-red-600 dark:text-red-400 text-left leading-relaxed">
                        {syncError}
                      </p>
                    </div>
                  )}

                  {cloudId ? (
                    <div className="space-y-3">
                      <div className="bg-japan-blue/5 dark:bg-sky-400/5 p-3 rounded-xl border-2 border-dashed border-japan-blue/30 dark:border-sky-400/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">您的 Cloud ID</p>
                        <p className="text-3xl font-mono font-bold text-japan-blue dark:text-sky-400 tracking-widest">{cloudId}</p>
                      </div>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cloudId);
                            alert("Cloud ID 已複製到剪貼簿！");
                          }}
                          className="text-xs font-bold text-japan-blue dark:text-sky-400 flex items-center justify-center gap-1 bg-blue-50 dark:bg-slate-800 px-3 py-2 rounded-lg"
                        >
                          <Copy size={12} /> 複製 ID
                        </button>
                        <button
                          onClick={handleUpdateCloud}
                          disabled={isSyncing}
                          className="text-xs font-bold text-white bg-japan-blue dark:bg-sky-600 hover:bg-japan-blue/90 dark:hover:bg-sky-500 flex items-center justify-center gap-1 px-3 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          {isSyncing ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                          更新雲端資料
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleUploadCloud}
                      disabled={isSyncing || !firebaseConfig}
                      className="w-full py-3 bg-japan-blue text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 dark:bg-sky-600"
                    >
                      {isSyncing ? (syncStage || "同步中...") : "產生 Cloud ID 並上傳"}
                    </button>
                  )}
                </div>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-300 text-[10px] font-bold tracking-widest">或從雲端下載</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                </div>

                <div className="flex gap-2">
                  <input
                    value={cloudIdInput}
                    onChange={e => setCloudIdInput(e.target.value.toUpperCase())}
                    placeholder="輸入朋友的 Cloud ID..."
                    className="flex-1 p-3 text-sm font-mono border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:border-japan-blue dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleDownloadCloud}
                    disabled={isSyncing || !firebaseConfig || !cloudIdInput}
                    className="px-6 bg-gray-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : "下載"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- BACKUP TAB --- */}
          {activeTab === 'backup' && (
            <div className="space-y-6 pt-2">
              {/* WARNING ALERT */}
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-4 flex items-start gap-3">
                <div className="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-yellow-800 dark:text-yellow-400 text-sm mb-1">重要提示：請定期備份</h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500/80 leading-relaxed">
                    您的旅程資料目前僅儲存在這台裝置的瀏覽器中。
                    若清除瀏覽紀錄或遺失手機，資料可能會消失。
                    建議您定期點擊下方按鈕，將檔案下載保存或複製代碼傳給自己。
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 text-center">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-japan-blue dark:text-sky-400">
                  <Cloud size={24} />
                </div>
                <h4 className="font-bold text-ink dark:text-white mb-1">備份與分享行程</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed px-4">
                  將您的行程轉成代碼，或下載成小包裹檔案 (.json) 傳給朋友。
                </p>
              </div>

              {/* Export Section */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadFile}
                  className="flex flex-col items-center justify-center p-4 bg-japan-blue text-white rounded-xl shadow-md hover:bg-japan-blue/90 transition-all gap-2 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  <FileJson size={24} />
                  <div className="text-center">
                    <span className="block text-sm font-bold">下載檔案</span>
                    <span className="text-[10px] opacity-80">(推薦 LINE 分享)</span>
                  </div>
                </button>

                <button
                  onClick={handleCopyCode}
                  className={`
                     flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all gap-2
                     ${copied
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-japan-blue/30 text-japan-blue hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-slate-800'}
                   `}
                >
                  {copied ? <Check size={24} /> : <Copy size={24} />}
                  <div className="text-center">
                    <span className="block text-sm font-bold">{copied ? '已複製！' : '複製代碼'}</span>
                    <span className="text-[10px] opacity-70">(文字訊息)</span>
                  </div>
                </button>
              </div>

              {/* Import Section */}
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-gray-300 dark:text-slate-600 text-xs font-bold">OR IMPORT</span>
                <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
              </div>

              <div className="space-y-3 pb-8">
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={triggerFileUpload}
                  className="w-full py-3 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> 選擇檔案 (.json) 匯入
                </button>

                <div className="flex gap-2">
                  <input
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    placeholder="或貼上壓縮代碼..."
                    className="flex-1 p-3 text-sm font-mono border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:border-japan-blue dark:focus:border-sky-500 min-w-0 bg-transparent dark:text-white placeholder-gray-400"
                  />
                  <button
                    onClick={handleImportCode}
                    disabled={!importCode}
                    className="px-4 bg-gray-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-slate-600 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    讀取
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravelToolbox;