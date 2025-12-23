
export type TripSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TripSettings {
  name: string;
  startDate: string;
  season: TripSeason;
  budgetJPY?: number;
}

export interface TripMetadata {
  id: string;
  name: string;
  startDate: string;
  season: TripSeason;
  days: number;
  coverImage?: string;
  lastAccessed: number;
}

export type EventCategory = 'sightseeing' | 'food' | 'transport' | 'shopping' | 'activity' | 'flight' | 'hotel';

export interface ItineraryEvent {
  time: string;
  title: string;
  desc: string;
  transport?: string;
  highlight?: boolean;
  category?: EventCategory;
  mapQuery?: string;
  ticketUrl?: string; // Website Link
  ticketImg?: string; // Base64 Image (Compressed)
}

export interface Accommodation {
  name: string;
  checkIn?: string;
}

export interface ItineraryDay {
  id: string; // Added ID for dnd-kit
  day: string;
  date: string;
  weekday: string;
  title: string;
  desc: string;
  pass: boolean;
  passName?: string; // e.g. "Kansai Thru Pass"
  passDurationDays?: number; // New: For Pass label
  passColor?: string; // New: Custom color for pass label
  bg: string;
  location?: string;

  weatherIcon?: 'sunny' | 'cloudy' | 'rain' | 'snow';
  temp?: string;
  tips?: string;
  accommodation?: Accommodation;

  events: ItineraryEvent[];
}

export interface ExpenseItem {
  id: string;
  date: string;
  title: string;
  amountJPY: number; // Reverted to amountJPY to match user legacy data
  category: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistCategory {
  id: string;
  title: string;
  items: ChecklistItem[];
  isCollapsed: boolean;
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
