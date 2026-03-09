import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaBullhorn, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import db, { Popup } from '../../services/DatabaseService';
import './PopupHost.css';

const DISMISSED_POPUPS_KEY = 'fgarola_dismissed_popups_session';

const getPopupToken = (popup: Popup): string => {
    return `${popup.id}|${popup.startDate}|${popup.endDate}|${popup.title}|${popup.triggerVersion ?? 0}`;
};

const readDismissedTokens = (): Set<string> => {
    try {
        const raw = sessionStorage.getItem(DISMISSED_POPUPS_KEY);
        if (!raw) return new Set<string>();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set<string>();
        return new Set(parsed.filter((item) => typeof item === 'string'));
    } catch {
        return new Set<string>();
    }
};

const writeDismissedTokens = (tokens: Set<string>) => {
    sessionStorage.setItem(DISMISSED_POPUPS_KEY, JSON.stringify(Array.from(tokens)));
};

const PopupHost = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [queue, setQueue] = useState<Popup[]>([]);

    useEffect(() => {
        const loadPopups = async () => {
            setIsLoading(true);
            try {
                const activePopups = await db.getActivePopups();
                activePopups.sort((a, b) => {
                    const aTriggered = Date.parse(a.lastTriggeredAt || '') || 0;
                    const bTriggered = Date.parse(b.lastTriggeredAt || '') || 0;
                    if (aTriggered !== bTriggered) return bTriggered - aTriggered;
                    return (b.startDate || '').localeCompare(a.startDate || '');
                });
                const dismissed = readDismissedTokens();
                const filtered = activePopups.filter((popup) => !dismissed.has(getPopupToken(popup)));
                setQueue(filtered);
            } catch (error) {
                console.error('Error loading active popups:', error);
                setQueue([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadPopups();

        const intervalId = window.setInterval(() => {
            void loadPopups();
        }, 20000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const currentPopup = useMemo(() => {
        if (queue.length === 0) return null;
        return queue[0];
    }, [queue]);

    const dismissCurrentPopup = () => {
        if (!currentPopup) return;
        const dismissed = readDismissedTokens();
        dismissed.add(getPopupToken(currentPopup));
        writeDismissedTokens(dismissed);
        setQueue((previous) => previous.slice(1));
    };

    if (isLoading || !currentPopup) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                className="site-popup-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={dismissCurrentPopup}
            >
                <motion.article
                    className="site-popup-card glass-strong"
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 18, scale: 0.96 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        className="site-popup-close"
                        type="button"
                        onClick={dismissCurrentPopup}
                        aria-label="Cerrar popup"
                    >
                        <FaTimes />
                    </button>

                    <header className="site-popup-header">
                        <span className="site-popup-icon"><FaBullhorn /></span>
                        <h3>{currentPopup.title}</h3>
                    </header>

                    {currentPopup.imageUrl && (
                        <div className="site-popup-image-wrap">
                            <img src={currentPopup.imageUrl} alt={currentPopup.title} className="site-popup-image" />
                        </div>
                    )}

                    {currentPopup.description && (
                        <p className="site-popup-description">{currentPopup.description}</p>
                    )}

                    <footer className="site-popup-actions">
                        <button className="site-popup-btn ghost" type="button" onClick={dismissCurrentPopup}>
                            Cerrar
                        </button>
                        {currentPopup.linkUrl && (
                            <a
                                className="site-popup-btn primary"
                                href={currentPopup.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={dismissCurrentPopup}
                            >
                                {currentPopup.linkText?.trim() || 'Ver mas'} <FaExternalLinkAlt />
                            </a>
                        )}
                    </footer>
                </motion.article>
            </motion.div>
        </AnimatePresence>
    );
};

export default PopupHost;
