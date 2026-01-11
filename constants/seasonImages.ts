import { TripSeason } from '../types';

export const SEASON_IMAGES: Record<TripSeason, string[]> = {
    spring: [
        "/seasons/spring_01.jpg",
        "/seasons/spring_02.jpg"
    ],
    summer: [
        "/seasons/summer_01.jpg",
        "/seasons/summer_02.jpg",
        "/seasons/summer_03.jpg"
    ],
    autumn: [
        "/seasons/autumn_01.jpg",
        "/seasons/autumn_02.jpg",
        "/seasons/autumn_03.jpg"
    ],
    winter: [
        // Waiting for uploads...
        "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=2070&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1518331327725-d9124bece653?q=80&w=2069&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1517411654406-38374d271954?q=80&w=2070&auto=format&fit=crop"
    ]
};

export const getRandomSeasonImage = (season: TripSeason): string => {
    const images = SEASON_IMAGES[season] || SEASON_IMAGES.winter;
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
};
