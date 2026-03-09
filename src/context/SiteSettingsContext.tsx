import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import db, { SiteSettings } from '../services/DatabaseService';

interface SiteSettingsContextType {
    settings: SiteSettings;
    isLoading: boolean;
    refreshSettings: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

interface SiteSettingsProviderProps {
    children: ReactNode;
}

export const SiteSettingsProvider = ({ children }: SiteSettingsProviderProps) => {
    const [settings, setSettings] = useState<SiteSettings>(db.getDefaultSiteSettings());
    const [isLoading, setIsLoading] = useState(true);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const data = await db.getSiteSettings();
            setSettings(data);

            // Apply theme colors globally
            document.documentElement.style.setProperty('--color-accent-primary', data.accentPrimary);
            document.documentElement.style.setProperty('--color-accent-secondary', data.accentSecondary);
        } catch (error) {
            console.error('Error loading site settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const refreshSettings = async () => {
        await loadSettings();
    };

    return (
        <SiteSettingsContext.Provider value={{ settings, isLoading, refreshSettings }}>
            {children}
        </SiteSettingsContext.Provider>
    );
};

export const useSiteSettings = () => {
    const context = useContext(SiteSettingsContext);
    if (!context) {
        throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
    }
    return context;
};

export default SiteSettingsContext;
