
// Constants for Storage Limits (in MB)
export const STORAGE_LIMITS = {
    CLOUD_WARNING: 0.9, // 90% of 1MB Firestore limit
    CLOUD_MAX: 1.0,     // 1MB Firestore limit
    LOCAL_MAX: 4.5      // ~5MB LocalStorage limit (safe buffer)
};

/**
 * Calculates the rough size of a JSON object in Megabytes (MB).
 * This is an approximation based on string length, which is close enough for
 * checking storage quotas for UTF-16 strings in JS/LocalStorage.
 */
export const calculateDataSizeMB = (data: any): number => {
    try {
        const jsonString = JSON.stringify(data);
        // 1 character = 1 byte (roughly for ASCII key/values) 
        // but in JS runtime it's 2 bytes (UTF-16). 
        // However, LocalStorage usually counts characters or UTF-16 code units.
        // Firestore counts bytes (UTF-8).
        // A safe approximation for "Storage Risk" is checking the UTF-8 byte size.

        // Encoder to get actual byte length (UTF-8) - accurate for Firestore
        const encoder = new TextEncoder();
        const bytes = encoder.encode(jsonString).length;

        return bytes / (1024 * 1024);
    } catch (e) {
        console.warn("Failed to calculate data size", e);
        return 0;
    }
};

/**
 * Formats bytes/MB for display
 */
export const formatSize = (mb: number): string => {
    if (mb < 0.1) return "< 0.1 MB";
    return `${mb.toFixed(1)} MB`;
};
