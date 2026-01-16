import { useState, useEffect } from 'react';

// Helper function to clean up location names for geocoding
// Helper function to clean up location names for geocoding
const getLocationQuery = (loc: string): string => {
    // 1. Handle "City (Description)" format
    let query = loc;
    if (loc.includes('(')) {
        const match = loc.match(/([^(]+)/);
        if (match) query = match[1].trim();
    }

    // 2. City Name Mapping (Chinese/Japanese -> English)
    // Prioritize longer matches to handle composite names correctly (e.g. "Shiga Takashima" -> matches "Takashima" if it's longer/specific)
    const mapping: Record<string, string> = {
        '京都': 'Kyoto, Japan', '大阪': 'Osaka, Japan', '東京': 'Tokyo, Japan', '奈良': 'Nara, Japan', '神戶': 'Kobe, Japan',
        '姬路': 'Himeji, Japan', '城崎': 'Kinosaki, Japan', '城崎溫泉': 'Kinosaki, Japan', '兵庫': 'Hyogo, Japan',
        '和歌山': 'Wakayama, Japan', '白濱': 'Shirahama, Japan', '滋賀': 'Otsu, Japan', '近江八幡': 'Omihachiman, Japan', // Shiga prefecture generic -> Otsu (capital)
        '高島': 'Takashima, Shiga, Japan', '白鬚': 'Takashima, Shiga, Japan', '伊根': 'Ine', '天橋立': 'Miyazu',
        '舞鶴': 'Maizuru, Japan', '岡山': 'Okayama, Japan', '倉敷': 'Kurashiki, Japan', '廣島': 'Hiroshima, Japan',
        '宮島': 'Hatsukaichi, Japan', '福岡': 'Fukuoka, Japan', '博多': 'Fukuoka, Japan', '札幌': 'Sapporo, Japan',
        '小樽': 'Otaru, Japan', '函館': 'Hakodate, Japan', '富良野': 'Furano, Japan', '美瑛': 'Biei, Japan',
        '名古屋': 'Nagoya, Japan', '高山': 'Takayama, Japan', '白川鄉': 'Shirakawa, Japan', '金澤': 'Kanazawa, Japan',
        '沖繩': 'Naha, Japan', '那霸': 'Naha, Japan', '嵐山': 'Kyoto, Japan', '宇治': 'Uji, Japan',
        '關西機場': 'Izumisano, Japan', '成田機場': 'Narita, Japan', '羽田機場': 'Ota, Japan', '中部國際機場': 'Tokoname, Japan',
        '清水寺': 'Kyoto, Japan', '金閣寺': 'Kyoto, Japan', '淺草': 'Tokyo, Japan', '新宿': 'Tokyo, Japan', '澀谷': 'Tokyo, Japan',
        '琵琶湖': 'Otsu, Japan', '滋賀高島': 'Takashima, Shiga, Japan',
        'Ine': 'Ine', 'Amanohashidate': 'Miyazu', 'Miyazu': 'Miyazu'
    };

    console.log('[Weather Debug] Input location:', loc, '-> Query:', query);

    let bestMatch = '';
    let bestMatchKey = '';

    for (const key in mapping) {
        if (query.includes(key)) {
            // If this match is longer than the current best match, take it
            if (key.length > bestMatchKey.length) {
                bestMatch = mapping[key];
                bestMatchKey = key;
            }
        }
    }

    if (bestMatch) return bestMatch;

    // 3. If contains space, take the last part (often "Japan Tokyo")
    if (query.includes(' ')) {
        const parts = query.split(' ');
        return parts[parts.length - 1];
    }

    return query;
};

export const useWeatherData = (location: string, date?: string) => {
    const [liveWeather, setLiveWeather] = useState<{ temp: number; code: number } | null>(null);
    const [forecast, setForecast] = useState<any[]>([]);
    const [loadingWeather, setLoadingWeather] = useState(false);
    const [weatherError, setWeatherError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<{ query: string; lat: number; lon: number } | null>(null);

    useEffect(() => {
        // Reset state when location changes
        setLiveWeather(null);
        setForecast([]);
        setWeatherError(null);
        setDebugInfo(null);

        if (!location) return;

        const fetchWeather = async () => {
            const queryLocation = getLocationQuery(location);
            setLoadingWeather(true);
            setWeatherError(null);

            try {

                // Hard-coded coordinates for problematic locations
                const hardcodedCoords: Record<string, { lat: number; lon: number }> = {
                    'Ine': { lat: 35.6718, lon: 135.2917 }, // Ine, Kyoto, Japan
                    '伊根': { lat: 35.6718, lon: 135.2917 }, // Ine, Kyoto, Japan
                    'Miyazu': { lat: 35.5359, lon: 135.1983 }, // Miyazu, Kyoto, Japan
                    '天橋立': { lat: 35.5359, lon: 135.1983 }, // Miyazu, Kyoto, Japan
                    '宮津': { lat: 35.5359, lon: 135.1983 }, // Miyazu, Kyoto, Japan
                };

                let latitude: number;
                let longitude: number;

                // Check if we have hardcoded coordinates for this location
                if (hardcodedCoords[queryLocation]) {
                    latitude = hardcodedCoords[queryLocation].lat;
                    longitude = hardcodedCoords[queryLocation].lon;
                    console.log('[Weather] Using hardcoded coords for:', queryLocation);
                } else {
                    // Step 1: Geocoding - Get coordinates from location name
                    const geoRes = await fetch(
                        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryLocation)}&count=1&language=en&format=json`
                    );
                    const geoData = await geoRes.json();

                    if (!geoData.results || geoData.results.length === 0) {
                        setWeatherError('Location not found');
                        console.error('[Weather] Geocoding failed for:', queryLocation);
                        return;
                    }

                    latitude = geoData.results[0].latitude;
                    longitude = geoData.results[0].longitude;
                }

                setDebugInfo({ query: queryLocation, lat: latitude, lon: longitude });

                // Step 2: Fetch weather data using coordinates
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&temperature_unit=celsius&t=${Date.now()}`;

                const weatherRes = await fetch(weatherUrl);
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
        debugInfo,
    };
};
