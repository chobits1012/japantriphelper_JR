import React, { useState } from 'react';
import { Train, Plane, MapPin, Camera, Utensils, ShoppingBag, BedDouble, Ticket, ExternalLink, Copy, Check, Image as ImageIcon } from 'lucide-react';
import type { ItineraryEvent, EventCategory } from '../types';
import ImageModal from './ImageModal';

interface TimelineEventProps {
  event: ItineraryEvent;
  isLast?: boolean; // New prop to control the connector line
}

const getCategoryIcon = (category?: EventCategory) => {
  switch (category) {
    case 'food': return <Utensils size={14} className="text-orange-500" />;
    case 'sightseeing': return <Camera size={14} className="text-japan-blue dark:text-sky-400" />;
    case 'shopping': return <ShoppingBag size={14} className="text-purple-500" />;
    case 'hotel': return <BedDouble size={14} className="text-indigo-500" />;
    case 'transport': return <Train size={14} className="text-gray-500 dark:text-slate-400" />;
    case 'flight': return <Plane size={14} className="text-blue-400" />;
    case 'activity': return <Ticket size={14} className="text-red-400" />;
    default: return <MapPin size={14} className="text-gray-400 dark:text-slate-500" />;
  }
};

const getCategoryLabel = (category?: EventCategory) => {
  switch (category) {
    case 'food': return '美食';
    case 'sightseeing': return '景點';
    case 'shopping': return '購物';
    case 'hotel': return '住宿';
    case 'transport': return '交通';
    case 'flight': return '航班';
    case 'activity': return '體驗';
    default: return null;
  }
};

const TimelineEvent: React.FC<TimelineEventProps> = ({ event, isLast }) => {
  const [copied, setCopied] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const query = event.mapQuery || event.title;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = event.mapQuery || event.title;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const imgs = event.ticketImgs || (event.ticketImg ? [event.ticketImg] : []);
  // Consolidate links: use new array if present, otherwise fallback to legacy url
  const links = event.links && event.links.length > 0 ? event.links : (event.ticketUrl ? [event.ticketUrl] : []);
  const hasTicket = links.length > 0 || imgs.length > 0;

  return (
    <div className={`relative pl-8 pb-8 group ${isLast ? '' : ''}`}>
      {/* Vertical Connector Line */}
      {!isLast && (
        <div className="absolute left-[-1px] top-6 bottom-[-10px] w-[2px] bg-gray-200 dark:bg-slate-700 transition-colors duration-700" />
      )}

      {/* Time Dot */}
      <div
        className={`absolute -left-[11px] top-1 w-[22px] h-[22px] rounded-full border-[3px] z-10 bg-white dark:bg-slate-900 transition-all duration-700 flex items-center justify-center ${event.highlight
          ? 'border-japan-red shadow-lg scale-110'
          : 'border-japan-blue group-hover:border-japan-blue/70 dark:border-sky-500 dark:group-hover:border-sky-400'
          }`}
      >
        <div className={`w-2 h-2 rounded-full ${event.highlight ? 'bg-japan-red' : 'bg-transparent'}`} />
      </div>

      {/* Content */}
      <div className="flex flex-col items-start w-full -mt-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-bold text-gray-400 font-sans tracking-wide dark:text-slate-500 transition-colors duration-700">
            {event.time}
          </span>
          {event.category && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-600 uppercase tracking-wider dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-colors duration-700">
              {getCategoryIcon(event.category)}
              <span>{getCategoryLabel(event.category)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-start w-full gap-4">
          <h4 className={`text-lg md:text-xl font-serif font-bold text-ink leading-tight dark:text-slate-100 transition-colors duration-700 ${event.highlight ? 'text-japan-blue underline decoration-japan-blue/20 decoration-2 underline-offset-4 dark:text-sky-400 dark:decoration-sky-500/30' : ''}`}>
            {event.title}
          </h4>

          {/* Action Buttons Container */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-japan-blue transition-colors duration-300 dark:hover:bg-slate-800 dark:text-slate-500 dark:hover:text-sky-400"
              title="複製地點/標題"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>

            {/* Google Map Button */}
            {(event.mapQuery || event.category === 'sightseeing' || event.category === 'food' || event.category === 'hotel') && (
              <button
                onClick={handleMapClick}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-japan-blue transition-colors duration-300 dark:hover:bg-slate-800 dark:text-slate-500 dark:hover:text-sky-400"
                title="在 Google 地圖中查看"
              >
                <ExternalLink size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 text-sm md:text-base text-gray-600 leading-relaxed bg-white/60 backdrop-blur-sm px-4 py-3 rounded-lg shadow-sm border border-white/50 w-full md:w-auto hover:bg-white/80 transition-colors duration-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/80">
          {event.desc}
        </div>

        {/* Badges Container */}
        <div className="flex flex-wrap gap-2 mt-2">
          {/* Transport Badge */}
          {event.transport && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8c7b6c] text-white text-xs rounded-full shadow-sm dark:bg-slate-700 transition-colors duration-700">
              {event.category === 'flight' ? <Plane size={12} /> : <Train size={12} />}
              <span className="font-medium font-sans tracking-wide">{event.transport === 'Airport' ? 'Airport Transfer' : event.transport}</span>
            </div>
          )}

          {/* Ticket Badge */}
          {hasTicket && (
            <>
              {/* Render Link Buttons */}
              {links.map((link, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!/^https?:\/\//i.test(link)) {
                      alert("無效的連結：請確認網址開頭包含 http:// 或 https://");
                      return;
                    }
                    window.open(link, '_blank');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-japan-red text-white text-xs rounded-full shadow-sm hover:bg-japan-red/90 transition-transform active:scale-95"
                >
                  <ExternalLink size={12} />
                  <span className="font-bold">
                    {links.length > 1 ? `連結 ${index + 1}` : '開啟連結'}
                  </span>
                </button>
              ))}

              {/* Render Image Button */}
              {imgs.length > 0 && (
                <button
                  onClick={() => setShowTicketModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-japan-red text-white text-xs rounded-full shadow-sm hover:bg-japan-red/90 transition-transform active:scale-95"
                >
                  <ImageIcon size={12} />
                  <span className="font-bold">
                    查看票券 ({imgs.length})
                  </span>
                </button>
              )}

              {/* Image Modal */}
              <ImageModal
                isOpen={showTicketModal}
                imageUrls={imgs}
                linkUrl={event.ticketUrl}
                onClose={() => setShowTicketModal(false)}
              />


            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineEvent;