import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

    // Touch/Drag State
    const imageRef = useRef<HTMLImageElement>(null);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const lastPositionRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);

    // Pinch Zoom State
    const initialPinchDistanceRef = useRef<number | null>(null);
    const initialScaleRef = useRef(1);

    // Lock Body Scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Prevent mobile address bar shenanigans
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

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
        lastPositionRef.current = { x: 0, y: 0 };
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < imageUrls.length - 1) {
            setCurrentIndex(prev => prev + 1);
            resetZoom();
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
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
        if (scale <= 1.5) {
            setPosition({ x: 0, y: 0 });
            lastPositionRef.current = { x: 0, y: 0 };
        }
    };

    // --- TOUCH HANDLERS (Manual implementation for better control) ---

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            // Single finger: Drag / Swipe
            isDraggingRef.current = true;
            dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            // Two fingers: Pinch Zoom
            isDraggingRef.current = false;
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialPinchDistanceRef.current = dist;
            initialScaleRef.current = scale;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // Prevent default to stop scrolling background (extra safety)
        if (scale > 1) e.preventDefault();

        if (e.touches.length === 1 && isDraggingRef.current) {
            // Drag Logic
            const dx = e.touches[0].clientX - dragStartRef.current.x;
            const dy = e.touches[0].clientY - dragStartRef.current.y;

            if (scale > 1) {
                // Pan image if zoomed in
                setPosition({
                    x: lastPositionRef.current.x + dx,
                    y: lastPositionRef.current.y + dy
                });
            }
        } else if (e.touches.length === 2 && initialPinchDistanceRef.current) {
            // Pinch Zoom Logic
            e.preventDefault(); // Always prevent logic on pinch
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const newScale = initialScaleRef.current * (dist / initialPinchDistanceRef.current);
            setScale(Math.min(Math.max(newScale, 1), 4));
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (isDraggingRef.current && scale === 1) {
            // Check for Swipe if not zoomed
            const dx = e.changedTouches[0].clientX - dragStartRef.current.x;
            const dy = e.changedTouches[0].clientY - dragStartRef.current.y;

            // Horizontal Swipe Threshold > 50px
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) handlePrev();
                else handleNext();
            }
        } else {
            // Save position for next drag
            lastPositionRef.current = position;
        }

        isDraggingRef.current = false;
        initialPinchDistanceRef.current = null;
    };

    if (!isOpen || imageUrls.length === 0) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black touch-none"
            onClick={onClose}
        >
            {/* Top Bar: Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center z-50 bg-gradient-to-b from-black/90 to-transparent" onClick={e => e.stopPropagation()}>
                <div className="text-white text-base font-bold flex items-center gap-2 drop-shadow-md">
                    <ImageIcon size={18} />
                    {currentIndex + 1} / {imageUrls.length}
                </div>
                <div className="flex gap-4">
                    {linkUrl && (
                        <a href={linkUrl} target="_blank" rel="noreferrer" className="text-white bg-white/20 p-2 rounded-full hover:bg-white/30 backdrop-blur-md">
                            <ExternalLink size={24} />
                        </a>
                    )}
                    <button onClick={onClose} className="text-white bg-red-500/80 p-2 rounded-full hover:bg-red-600 transition-colors backdrop-blur-md">
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Main Image Area */}
            <div
                className="w-full h-full flex items-center justify-center overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={e => e.stopPropagation()} // Prevent closing when tapping image area
            >
                <img
                    ref={imageRef}
                    src={imageUrls[currentIndex]}
                    alt="Ticket"
                    className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out will-change-transform"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
                    }}
                    draggable={false}
                />

                {/* Navigation Arrows (Desktop / visual cue) - Only show if not zoomed for clarity */}
                {scale === 1 && (
                    <>
                        {currentIndex > 0 && (
                            <button
                                onClick={(e) => handlePrev(e)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white backdrop-blur-sm transition-all hidden md:block"
                            >
                                <ChevronLeft size={40} />
                            </button>
                        )}
                        {currentIndex < imageUrls.length - 1 && (
                            <button
                                onClick={(e) => handleNext(e)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white backdrop-blur-sm transition-all hidden md:block"
                            >
                                <ChevronRight size={40} />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Bar: Zoom Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 z-50 safe-area-bottom" onClick={e => e.stopPropagation()}>
                <button
                    onClick={resetZoom}
                    className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 font-bold text-sm hover:bg-white/20 active:scale-95 transition-transform"
                >
                    重置
                </button>
                <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
                    <button
                        onClick={handleZoomOut}
                        disabled={scale <= 1}
                        className={`text-white p-1 ${scale <= 1 ? 'opacity-30' : 'active:scale-95'}`}
                    >
                        <ZoomOut size={24} />
                    </button>
                    <span className="text-white font-mono text-sm w-12 text-center select-none">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={handleZoomIn}
                        disabled={scale >= 4}
                        className={`text-white p-1 ${scale >= 4 ? 'opacity-30' : 'active:scale-95'}`}
                    >
                        <ZoomIn size={24} />
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ImageModal;
