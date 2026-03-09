import { useEffect, useMemo, useState } from 'react';

export const DATA_SAVER_STORAGE_KEY = 'fgarola_data_saver';
const DATA_SAVER_EVENT = 'fgarola-data-saver-change';

type DataSaverEventPayload = {
    enabled: boolean;
};

type NavigatorWithConnection = Navigator & {
    connection?: {
        saveData?: boolean;
        addEventListener?: (type: 'change', listener: () => void) => void;
        removeEventListener?: (type: 'change', listener: () => void) => void;
    };
};

const readStoredDataSaverPreference = (): boolean | null => {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(DATA_SAVER_STORAGE_KEY);
        if (stored === '1') return true;
        if (stored === '0') return false;
    } catch {
        return null;
    }

    return null;
};

const readSystemDataSaver = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const connection = (navigator as NavigatorWithConnection).connection;
    return Boolean(connection?.saveData);
};

export const setDataSaverPreference = (enabled: boolean) => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(DATA_SAVER_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
        // ignore storage failures (private mode / restricted contexts)
    }

    window.dispatchEvent(
        new CustomEvent<DataSaverEventPayload>(DATA_SAVER_EVENT, {
            detail: { enabled },
        })
    );
};

const useDataSaver = () => {
    const [storedPreference, setStoredPreference] = useState<boolean | null>(() => readStoredDataSaverPreference());
    const [systemDataSaver, setSystemDataSaver] = useState<boolean>(() => readSystemDataSaver());

    useEffect(() => {
        const syncFromEnvironment = () => {
            setStoredPreference(readStoredDataSaverPreference());
            setSystemDataSaver(readSystemDataSaver());
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key !== DATA_SAVER_STORAGE_KEY) return;
            syncFromEnvironment();
        };

        const onCustomChange = () => {
            syncFromEnvironment();
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener(DATA_SAVER_EVENT, onCustomChange as EventListener);

        const connection = (navigator as NavigatorWithConnection).connection;
        const onConnectionChange = () => setSystemDataSaver(readSystemDataSaver());
        if (typeof connection?.addEventListener === 'function') {
            connection.addEventListener('change', onConnectionChange);
        }

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(DATA_SAVER_EVENT, onCustomChange as EventListener);
            if (typeof connection?.removeEventListener === 'function') {
                connection.removeEventListener('change', onConnectionChange);
            }
        };
    }, []);

    const dataSaverEnabled = useMemo(() => {
        if (storedPreference !== null) {
            return storedPreference;
        }
        return systemDataSaver;
    }, [storedPreference, systemDataSaver]);

    return {
        dataSaverEnabled,
        systemDataSaver,
        hasStoredPreference: storedPreference !== null,
        setDataSaverEnabled: setDataSaverPreference,
    };
};

export default useDataSaver;
