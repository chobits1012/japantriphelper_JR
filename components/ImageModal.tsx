import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface ImageModalProps {
    isOpen: boolean;
    imageUrl: string;
    linkUrl?: string; // Optional link to show alongside
    onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, linkUrl, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
            >
                <X size={24} />
            </button>

            <div className="max-w-[95vw] max-h-[80vh] flex flex-col gap-4" onClick={e => e.stopPropagation()}>

                {/* The Image */}
                <img
                    src={imageUrl}
                    alt="Full Size Ticket"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                />

                {/* Action Bar */}
                {(linkUrl) && (
                    <div className="flex justify-center">
                        <a
                            href={linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-6 py-3 bg-japan-blue text-white rounded-full font-bold shadow-lg hover:bg-japan-blue/90"
                        >
                            <ExternalLink size={18} /> 開啟連結
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageModal;
