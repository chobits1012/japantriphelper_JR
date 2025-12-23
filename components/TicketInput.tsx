import React, { useState, useRef } from 'react';
import { Ticket, Image as ImageIcon, Link as LinkIcon, Trash2, X, Loader2, Upload } from 'lucide-react';
import type { ItineraryEvent } from '../types';

interface TicketInputProps {
    url?: string;
    img?: string;
    onUpdate: (updates: Partial<ItineraryEvent>) => void;
}

const TicketInput: React.FC<TicketInputProps> = ({ url, img, onUpdate }) => {
    const [showInput, setShowInput] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper: Compress Image to Base64
    const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const MAX_WIDTH = 800; // Safe for mobile, enough for QR codes
            const QUALITY = 0.6;   // Good balance

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
            onUpdate({ ticketImg: compressedData });
        } catch (err) {
            console.error("Compression failed", err);
            alert("圖片處理失敗，請試著換一張圖片。");
        } finally {
            setIsCompressing(false);
        }
    };

    const handleRemoveImage = () => {
        onUpdate({ ticketImg: undefined });
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ticketUrl: e.target.value });
    };

    // If no ticket data, show minimal "Add Ticket" button
    if (!showInput && !url && !img) {
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
                    <Ticket size={14} /> 電子票券 (Link / Image)
                </label>
                {(!url && !img) && (
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

            {/* Image Input */}
            <div className="flex items-start gap-3">
                {img ? (
                    <div className="relative group">
                        <img
                            src={img}
                            alt="Ticket Preview"
                            className="h-20 w-auto rounded-md border border-gray-200 dark:border-slate-600 object-cover"
                        />
                        <button
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={10} />
                        </button>
                        <div className="text-[10px] text-gray-400 mt-1 text-center font-mono">已壓縮</div>
                    </div>
                ) : (
                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment" // Defines it as a capture if on mobile
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isCompressing}
                            className="w-full h-20 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-md flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-white hover:border-japan-blue hover:text-japan-blue dark:hover:bg-slate-800 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {isCompressing ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span className="text-[10px] font-bold">處理中...</span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon size={20} />
                                    <span className="text-[10px] font-bold">上傳圖片/截圖</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketInput;
