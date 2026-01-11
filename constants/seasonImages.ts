import { TripSeason } from '../types';

export const SEASON_IMAGES: Record<TripSeason, string[]> = {
    spring: [
        // Custom User Images
        "https://github.com/user-attachments/assets/1c95dc05-f06e-4091-acd2-3317bb6287b4",
        "https://github.com/user-attachments/assets/19fdac90-bbf3-44cf-9227-03ab227b488c",
        "https://github.com/user-attachments/assets/a366178a-4366-4e06-94af-74650e442b4b"
    ],
    summer: [
        // Custom User Images
        "https://github.com/user-attachments/assets/edfb8d26-e895-4958-beb0-04e0b23b102e",
        "https://github.com/user-attachments/assets/cd58ae44-0dca-4619-ad92-7156993ed042",
        "https://github.com/user-attachments/assets/a321e5e5-3c89-43ad-9866-58ab528015ae"
    ],
    autumn: [
        // Custom User Images
        "https://github.com/user-attachments/assets/54060fe5-d344-41f6-9f64-eb5b0dae962d",
        "https://github.com/user-attachments/assets/18fb5f96-57e8-444d-8704-8d79f0b70803",
        "https://github.com/user-attachments/assets/3205580e-b7ca-4ed9-892d-683cd46ad745"
    ],
    winter: [
        // Custom User Images
        "https://github.com/user-attachments/assets/ab0690b5-8faa-47a7-8e1f-bdd0058d04f6",
        "https://github.com/user-attachments/assets/2848aed7-fbf7-446c-b874-6d399d99afb7",
        "https://github.com/user-attachments/assets/ea7dfdd0-21d2-4f1d-833a-baf52647de40"
    ]
};

export const getRandomSeasonImage = (season: TripSeason): string => {
    const images = SEASON_IMAGES[season] || SEASON_IMAGES.winter;
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
};
