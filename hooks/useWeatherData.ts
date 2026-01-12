import { useState, useEffect } from 'react';

// Helper function to clean up location names for geocoding
const getLocationQuery = (loc: string): string => {
    if (loc.includes('(')) {
        const match = loc.match(/\(([^)]+)\)/);
        return match ? match[1] : loc;
    }
    return loc;
};

export const useWeatherData = (location: string, date?: string) => {
    const [liveWeather, setLiveWeather] = useState<{ temp: number; code: number } | null>(null);
    const [forecast, setForecast] = useState<any[]>([]);
    const [loadingWeather, setLoadingWeather] = useState(false);
    const [weatherError, setWeatherError] = useState<string | null>(null);

    useEffect(() => {
        // Reset state when location changes
        setLiveWeather(null);
        setForecast([]);
        setWeatherError(null);

        if (!location) return;

        const fetchWeather = async () => {
            const queryLocation = getLocationQuery(location);
            setLoadingWeather(true);
            setWeatherError(null);

            try {
                // Step 1: Geocoding - Get coordinates from location name
                const geoRes = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryLocation)}&count=1&language=en&format=json`
                );
                const geoData = await geoRes.json();

                if (!geoData.results || geoData.results.length === 0) {
                    setWeatherError('Location not found');
                    return;
                }

                const { latitude, longitude } = geoData.results[0];

                // Step 2: Fetch weather data using coordinates
                const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
                );
                const data = await weatherRes.json();

                // Set current weather
                if (data.current) {
                    setLiveWeather({
                        temp: data.current.temperature_2m,
                        code: data.current.weather_code
                    });
                }

                // Set forecast
                if (data.daily) {
                    const dailyData = data.daily.time.map((time: string, index: number) => ({
                        date: time.slice(5).replace('-', '/'), // Convert "2024-01-15" to "01/15"
                        code: data.daily.weather_code[index],
                        max: data.daily.temperature_2m_max[index],
                        min: data.daily.temperature_2m_min[index],
                    }));
                    setForecast(dailyData);
                }
            } catch (error) {
                console.error('Weather fetch failed', error);
                setWeatherError('Failed to fetch weather data');
            } finally {
                setLoadingWeather(false);
            }
        };

        fetchWeather();
    }, [location]);

    const refreshWeather = () => {
        if (location) {
            setLiveWeather(null);
            setForecast([]);
            setWeatherError(null);
            setLoadingWeather(true);
        }
    };

    return {
        liveWeather,
        forecast,
        loadingWeather,
        weatherError,
        refreshWeather,
    };
};
