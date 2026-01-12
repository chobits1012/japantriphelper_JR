import { useState, useEffect } from 'react';
import { EXCHANGE_RATE_API_URL } from '../constants';

export const useCurrency = (isOpen: boolean) => {
    const [rate, setRate] = useState<number>(0.215);
    const [jpyInput, setJpyInput] = useState<string>('1000');
    const [twdInput, setTwdInput] = useState<string>('');
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [loadingRate, setLoadingRate] = useState(false);

    const fetchRate = async () => {
        setLoadingRate(true);
        try {
            const res = await fetch(EXCHANGE_RATE_API_URL);
            const data = await res.json();
            const currentRate = data.rates.TWD;
            setRate(currentRate);
            setLastUpdated(new Date().toLocaleTimeString());
            setTwdInput((parseFloat(jpyInput) * currentRate).toFixed(0));
        } catch (e) {
            console.error("Failed to fetch rate", e);
        } finally {
            setLoadingRate(false);
        }
    };

    const handleJpyChange = (val: string) => {
        setJpyInput(val);
        if (!isNaN(parseFloat(val))) {
            setTwdInput((parseFloat(val) * rate).toFixed(0));
        } else {
            setTwdInput('');
        }
    };

    const handleTwdChange = (val: string) => {
        setTwdInput(val);
        if (!isNaN(parseFloat(val))) {
            setJpyInput((parseFloat(val) / rate).toFixed(0));
        } else {
            setJpyInput('');
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRate();
        }
    }, [isOpen]);

    return {
        rate,
        jpyInput,
        setJpyInput,
        twdInput,
        setTwdInput,
        lastUpdated,
        loadingRate,
        handleJpyChange,
        handleTwdChange,
        fetchRate,
    };
};
