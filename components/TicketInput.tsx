import React, { useState, useRef } from 'react';
import { Ticket, Image as ImageIcon, Link as LinkIcon, Trash2, X, Loader2, Plus, AlertTriangle } from 'lucide-react';
import type { ItineraryEvent } from '../types';
import { calculateDataSizeMB, STORAGE_LIMITS, formatSize } from '../lib/storageCalculator';

interface TicketInputProps {
    url?: string;
    imgs?: string[];
    // Legacy support
    legacyImg?: string;
    currentTotalSizeMB?: number; // New prop for storage check
    onUpdate: (updates: Partial<ItineraryEvent>) => void;
}

const TicketInput: React.FC<TicketInputProps> = ({ url, imgs = [], legacyImg, currentTotalSizeMB = 0, onUpdate }) => {
    const [showInput, setShowInput] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Merge legacy image into array if exists and standard array is empty
    const currentImgs = legacyImg && imgs.length === 0 ? [legacyImg] : imgs;

    // Determine Storage Status
    const isCloudRisk = currentTotalSizeMB > STORAGE_LIMITS.CLOUD_WARNING;
    const isLocalFull = currentTotalSizeMB > STORAGE_LIMITS.LOCAL_MAX;


    // Helper: Compress Image to Base64
    const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const MAX_WIDTH = 1200; // Increased resolution for better zoom
            const QUALITY = 0.7;   // Slightly higher quality for readability

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize logic
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG
                    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCompressing(true);
        try {
            const compressedData = await compressImage(file);
            const newImgs = [...currentImgs, compressedData];

            // Update both new field and clear legacy field to avoid duplication
            onUpdate({
                ticketImgs: newImgs,
                ticketImg: undefined
            });
        } catch (err) {
            console.error("Compression failed", err);
            alert("圖片處理失敗，請試著換一張圖片。");
        } finally {
            setIsCompressing(false);
            // Reset input so same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImgs = currentImgs.filter((_, i) => i !== index);
        onUpdate({
            ticketImgs: newImgs,
            ticketImg: undefined
        });
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ticketUrl: e.target.value });
    };

    // If no ticket data, show minimal "Add Ticket" button
    if (!showInput && !url && currentImgs.length === 0) {
        return (
            <button
                onClick={() => setShowInput(true)}
                className="text-xs font-bold text-gray-400 hover:text-japan-blue flex items-center gap-1 p-1 hover:bg-gray-50 rounded transition-colors dark:hover:bg-slate-800 dark:hover:text-sky-400"
            >
                <Ticket size={14} /> 新增票券
            </button>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-japan-blue dark:text-sky-400 uppercase flex items-center gap-1">
                    <Ticket size={14} /> 電子票券 (Links & Images)
                </label>
                {(!url && currentImgs.length === 0) && (
                    <button onClick={() => setShowInput(false)} className="text-gray-400 hover:text-red-500">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* URL Input */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1.5 focus-within:border-japan-blue dark:focus-within:border-sky-500 transition-colors">
                <LinkIcon size={14} className="text-gray-400 flex-shrink-0" />
                <input
                    type="url"
                    value={url || ''}
                    onChange={handleUrlChange}
                    placeholder="貼上票券或訂位網址..."
                    className="flex-1 text-xs bg-transparent outline-none dark:text-white placeholder-gray-400"
                />
            </div>

            {/* Image Gallery Grid */}
            <div className="grid grid-cols-3 gap-2">
                {currentImgs.map((imgSrc, index) => (
                    <div key={index} className="relative group aspect-square">
                        <img
                            src={imgSrc}
                            alt={`Ticket ${index + 1}`}
                            className="w-full h-full object-cover rounded-md border border-gray-200 dark:border-slate-600"
                        />
                        <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="刪除"
                        >
                            <Trash2 size={10} />
                        </button>
                    </div>
                ))}

                {/* Add Image Button */}
                <div className="aspect-square relative">
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isLocalFull}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressing || isLocalFull}
                        className={`w-full h-full border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
               ${isLocalFull
                                ? 'border-red-300 bg-red-50 text-red-400 dark:bg-red-900/10 dark:border-red-900/30'
                                : 'border-gray-300 dark:border-slate-600 text-gray-400 hover:bg-white hover:border-japan-blue hover:text-japan-blue dark:hover:bg-slate-800 dark:hover:border-sky-500 dark:hover:text-sky-400'
                            }`}
                    >
                        {isCompressing ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Plus size={24} />
                        )}
                        <span className="text-[9px] font-bold">
                            {isCompressing ? '處理中' : isLocalFull ? '已滿' : '新增圖片'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Storage Warning Indicators */}
            {isCloudRisk && !isLocalFull && (
                <div className="flex items-start gap-1.5 text-[10px] text-orange-500 bg-orange-50 dark:bg-orange-900/10 p-2 rounded border border-orange-100 dark:border-orange-900/20">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>
                        <b>資料量偏大 ({formatSize(currentTotalSizeMB)})</b><br />
                        接近雲端同步上限，建議減少圖片。
                    </span>
                </div>
            )}

            {isLocalFull && (
                <div className="flex items-start gap-1.5 text-[10px] text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/20">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>
                        <b>手機容量已滿 ({formatSize(currentTotalSizeMB)})</b><br />
                        無法再新增圖片，請刪除舊票券以釋放空間。
                    </span>
                </div>
            )}
        </div>
    );
};

export default TicketInput;
