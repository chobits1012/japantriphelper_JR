import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface ImageModalProps {
    isOpen: boolean;
    imageUrls: string[]; // Supports multiple images
    initialIndex?: number;
    linkUrl?: string; // Optional link
    onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrls, initialIndex = 0, linkUrl, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const imageRef = useRef<HTMLImageElement>(null);

    // Reset state when opening or changing image
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            resetZoom();
        }
    }, [isOpen, initialIndex]);

    // Reset zoom helper
    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex < imageUrls.length - 1) {
            setCurrentIndex(prev => prev + 1);
            resetZoom();
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            resetZoom();
        }
    };

    // Zoom Logic
    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.5, 4)); // Max 4x
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.5, 1)); // Min 1x
        if (scale <= 1.5) setPosition({ x: 0, y: 0 }); // Recenter if zoomed out
    };

    // Drag Logic (for Pan)
    const onPointerDown = (e: React.PointerEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const onPointerUp = () => {
        setIsDragging(false);
    };

    if (!isOpen || imageUrls.length === 0) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black animate-in fade-in duration-300"
            onClick={onClose}
        >
            {/* Top Bar: Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent" onClick={e => e.stopPropagation()}>
                <div className="text-white text-sm font-bold opacity-80 flex items-center gap-2">
                    <ImageIcon size={16} />
                    {currentIndex + 1} / {imageUrls.length}
                </div>
                <div className="flex gap-4">
                    {linkUrl && (
                        <a href={linkUrl} target="_blank" rel="noreferrer" className="text-white bg-white/10 p-2 rounded-full hover:bg-white/20">
                            <ExternalLink size={20} />
                        </a>
                    )}
                    <button onClick={onClose} className="text-white bg-white/10 p-2 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Main Image Area */}
            <div
                className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            >
                <img
                    ref={imageRef}
                    src={imageUrls[currentIndex]}
                    alt="Ticket"
                    className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        cursor: scale > 1 ? 'grab' : 'default'
                    }}
                    onClick={e => e.stopPropagation()}
                />

                {/* Navigation Arrows (Desktop / visual cue) */}
                {currentIndex > 0 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                    >
                        <ChevronLeft size={32} />
                    </button>
                )}
                {currentIndex < imageUrls.length - 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                    >
                        <ChevronRight size={32} />
                    </button>
                )}
            </div>

            {/* Bottom Bar: Zoom Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 z-50" onClick={e => e.stopPropagation()}>
                <button
                    onClick={resetZoom}
                    className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 font-bold text-xs hover:bg-white/20"
                >
                    重置
                </button>
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                    <button onClick={handleZoomOut} disabled={scale <= 1} className={`text-white ${scale <= 1 ? 'opacity-30' : 'hover:scale-110'}`}><ZoomOut size={20} /></button>
                    <span className="text-white font-mono text-xs w-8 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} disabled={scale >= 4} className={`text-white ${scale >= 4 ? 'opacity-30' : 'hover:scale-110'}`}><ZoomIn size={20} /></button>
                </div>
            </div>
        </div>
    );
};

export default ImageModal;
