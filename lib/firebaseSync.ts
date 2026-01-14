import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

import { deleteApp } from 'firebase/app';

let app: FirebaseApp | null = null;
let currentConfigString: string | null = null;

const initFirebase = async (config: FirebaseConfig) => {
    const configString = JSON.stringify(config);

    // If we have an existing app, check if the config has changed
    if (getApps().length > 0) {
        if (currentConfigString !== configString) {
            // Config changed, delete old app to re-initialize
            await deleteApp(getApps()[0]);
            app = initializeApp(config);
            currentConfigString = configString;
        } else {
            app = getApps()[0];
        }
    } else {
        // First time initialization
        app = initializeApp(config);
        currentConfigString = configString;
    }
    return app;
};

export const uploadToCloud = async (config: FirebaseConfig, data: any, onProgress?: (stage: string) => void, customId?: string) => {
    const timeout = setTimeout(() => {
        throw new Error("連線逾時（30秒），請檢查網路狀況或 Firestore 是否已建立。");
    }, 30000);

    try {
        onProgress?.('正在啟動 Firebase...');
        const app = await initFirebase(config);
        const db = getFirestore(app);
        const auth = getAuth(app);

        // DEBUG: Alert Project ID
        alert(`[DEBUG] Firebase Initialized\nProject ID: ${app.options.projectId}\nAuth Domain: ${app.options.authDomain}`);

        onProgress?.('正在進行匿名認證...');
        await signInAnonymously(auth);

        onProgress?.('正在上傳資料...');
        // Use customId if provided, otherwise generate a random 6-character Cloud ID
        const cloudId = customId || Math.random().toString(36).substring(2, 8).toUpperCase();

        const sanitizeForFirestore = (obj: any): any => {
            if (obj === undefined) return null;
            if (obj === null) return null;
            if (typeof obj !== 'object') return obj;

            if (Array.isArray(obj)) {
                return obj.map(sanitizeForFirestore);
            }

            const newObj: any = {};
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    newObj[key] = sanitizeForFirestore(obj[key]);
                }
            }
            return newObj;
        };

        const cleanData = sanitizeForFirestore(data);

        // DEBUG: Alert Path
        alert(`[DEBUG] Uploading to:\nCollection: trips\nDocument ID: ${cloudId}\n\nClean Data Keys: ${Object.keys(cleanData).join(', ')}`);

        await setDoc(doc(db, "trips", cloudId), {
            data: cleanData,
            updatedAt: new Date().toISOString()
        });

        // DEBUG: Success
        alert(`[DEBUG] Write Success!\nCloud ID: ${cloudId}`);

        clearTimeout(timeout);
        return cloudId;
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
};

export const downloadFromCloud = async (config: FirebaseConfig, cloudId: string, onProgress?: (stage: string) => void) => {
    const timeout = setTimeout(() => {
        throw new Error("連線逾時（30秒），請檢查網路狀況或雲端 ID 是否正確。");
    }, 30000);

    try {
        onProgress?.('正在啟動 Firebase...');
        const app = await initFirebase(config);
        const db = getFirestore(app);
        const auth = getAuth(app);

        // DEBUG: Alert Project ID
        alert(`[DEBUG] Firebase Initialized for Download\nProject ID: ${app.options.projectId}`);

        onProgress?.('正在進行匿名認證...');
        await signInAnonymously(auth);

        onProgress?.('正在下載資料...');
        const docRef = doc(db, "trips", cloudId.toUpperCase());

        // DEBUG: Alert Path
        alert(`[DEBUG] Reading from:\nCollection: trips\nDocument ID: ${cloudId.toUpperCase()}`);

        const docSnap = await getDoc(docRef);

        clearTimeout(timeout);
        if (docSnap.exists()) {
            return docSnap.data().data;
        } else {
            throw new Error("找不到該雲端 ID 的資料，請確認 ID 是否正確。");
        }
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
};
