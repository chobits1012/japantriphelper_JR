import { TripSeason } from '../types';

export const SEASON_IMAGES: Record<TripSeason, string[]> = {
    spring: [
        "/seasons/spring_01.jpg",
        "/seasons/spring_02.jpg",
        "/seasons/spring_03.jpg"
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
        "/seasons/winter_01.jpg",
        "/seasons/winter_02.jpg",
        "/seasons/winter_03.jpg"
    ]
};

export const getRandomSeasonImage = (season: TripSeason): string => {
    const images = SEASON_IMAGES[season] || SEASON_IMAGES.winter;
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
};
