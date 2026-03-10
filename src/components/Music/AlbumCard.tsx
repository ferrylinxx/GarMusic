import { useState, useRef, useEffect } from 'react';
import { Album } from '../../types/music';
import { usePlayer } from '../../context/PlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaClock, FaVolumeUp, FaEllipsisH, FaPlus, FaHeart, FaRegHeart, FaShareAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import db from '../../services/DatabaseService';
import useDataSaver from '../../hooks/useDataSaver';
import './AlbumCard.css';

interface AlbumCardProps {
    album: Album;
    badges?: string[];
    isFavorite?: boolean;
    onAddToQueue?: () => void;
    onToggleFavorite?: () => void;
}

const AlbumCard = ({ album, badges = [], isFavorite = false, onAddToQueue, onToggleFavorite }: AlbumCardProps) => {
    const { playAlbum } = usePlayer();
    const { dataSaverEnabled } = useDataSaver();
    const navigate = useNavigate();
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewProgress, setPreviewProgress] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const previewRef = useRef<HTMLAudioElement | null>(null);
    const preloadedPreviewRef = useRef<HTMLAudioElement | null>(null);
    const progressFrameRef = useRef<number | null>(null);
    const hoverTimeoutRef = useRef<number | null>(null);
    const warmupTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const hoveredRef = useRef(false);
    const previewUrlRef = useRef('');
    const previewPreparationRef = useRef<Promise<void> | null>(null);

    const PREVIEW_DURATION = 30; // 30 seconds preview

    const disposeAudio = (audio: HTMLAudioElement | null) => {
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
            audio.onended = null;
            audio.onerror = null;
            audio.src = '';
            audio.load();
        } catch {
            // ignore cleanup failures on restrictive browsers
        }
    };

    useEffect(() => {
        return () => {
            disposeAudio(previewRef.current);
            disposeAudio(preloadedPreviewRef.current);
            if (progressFrameRef.current !== null) {
                cancelAnimationFrame(progressFrameRef.current);
            }
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            if (warmupTimeoutRef.current) {
                clearTimeout(warmupTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!menuRef.current || !target) return;
            if (!menuRef.current.contains(target)) {
                setMenuOpen(false);
            }
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [menuOpen]);

    useEffect(() => {
        if (dataSaverEnabled) {
            stopPreview();
            disposeAudio(preloadedPreviewRef.current);
            preloadedPreviewRef.current = null;
        }
    }, [dataSaverEnabled]);

    useEffect(() => {
        stopPreview();
        disposeAudio(preloadedPreviewRef.current);
        preloadedPreviewRef.current = null;
        previewUrlRef.current = '';
        previewPreparationRef.current = null;
    }, [album.id, album.tracks]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (dataSaverEnabled || album.tracks.length === 0) return;
        if (!cardRef.current) return;

        const node = cardRef.current;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                warmupTimeoutRef.current = window.setTimeout(() => {
                    void preparePreview();
                }, 40);
            },
            { rootMargin: '220px 0px' }
        );

        observer.observe(node);

        return () => {
            observer.disconnect();
            if (warmupTimeoutRef.current) {
                clearTimeout(warmupTimeoutRef.current);
                warmupTimeoutRef.current = null;
            }
        };
    }, [album.id, album.tracks, dataSaverEnabled]);

    const syncPreviewProgress = () => {
        if (!previewRef.current) return;

        const currentTime = Number.isFinite(previewRef.current.currentTime) ? previewRef.current.currentTime : 0;
        const progress = (currentTime / PREVIEW_DURATION) * 100;
        setPreviewProgress(Math.min(progress, 100));

        if (currentTime >= PREVIEW_DURATION) {
            stopPreview();
            return;
        }

        progressFrameRef.current = window.requestAnimationFrame(syncPreviewProgress);
    };

    const handlePlayAlbum = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (album.tracks.length > 0) {
            stopPreview();
            playAlbum(album);
        }
    };

    const handleOpenAlbum = () => {
        stopPreview();
        navigate(`/musica/album/${album.id}`);
    };

    const resolvePreviewUrl = async (): Promise<string> => {
        const track = album.tracks[0];
        if (!track) return '';

        const preferred = db.getPreferredAudioUrl(track.id, track.audioFile);
        if (preferred) {
            previewUrlRef.current = preferred;
            return preferred;
        }

        if (previewUrlRef.current) return previewUrlRef.current;

        const nextUrl = (await db.prefetchAudioUrl(track.id, track.audioFile)) || '';
        previewUrlRef.current = nextUrl;
        return nextUrl;
    };

    const preparePreview = async () => {
        if (dataSaverEnabled || album.tracks.length === 0) return;
        if (preloadedPreviewRef.current || previewPreparationRef.current) return;

        previewPreparationRef.current = (async () => {
            const audioUrl = await resolvePreviewUrl();
            if (!audioUrl || previewRef.current) return;

            const audio = new Audio(audioUrl);
            audio.preload = 'auto';
            audio.muted = true;
            audio.volume = 0;
            audio.setAttribute('playsinline', 'true');

            try {
                audio.load();
            } catch {
                // ignore preload failures on restrictive browsers
            }

            preloadedPreviewRef.current = audio;
        })().finally(() => {
            previewPreparationRef.current = null;
        });

        await previewPreparationRef.current;
    };

    const startPreview = async (options: { immediate?: boolean } = {}) => {
        if (album.tracks.length === 0) return;
        if (dataSaverEnabled) return;
        if (previewRef.current || hoverTimeoutRef.current) return;
        hoveredRef.current = true;

        const audioUrl = await resolvePreviewUrl();
        if (!audioUrl || !hoveredRef.current) return;

        let audio = preloadedPreviewRef.current;
        if (audio) {
            preloadedPreviewRef.current = null;
            const activeSource = audio.currentSrc || audio.src;
            if (activeSource && activeSource !== audioUrl) {
                disposeAudio(audio);
                audio = null;
            }
        }

        if (!audio) {
            audio = new Audio(audioUrl);
            audio.preload = 'auto';
            audio.setAttribute('playsinline', 'true');
            try {
                audio.load();
            } catch {
                // ignore preload failures on restrictive browsers
            }
        }

        audio.volume = 0.4;
        audio.muted = false;
        audio.onended = () => {
            stopPreview();
        };
        audio.onerror = () => {
            stopPreview();
        };
        previewRef.current = audio;

        hoverTimeoutRef.current = window.setTimeout(async () => {
            hoverTimeoutRef.current = null;
            if (!hoveredRef.current) return;

            try {
                let started = false;

                try {
                    await audio.play();
                    started = true;
                } catch {
                    audio.muted = true;
                    try {
                        await audio.play();
                        started = true;
                        window.setTimeout(() => {
                            if (previewRef.current !== audio) return;
                            audio.muted = false;
                            audio.volume = 0.4;
                        }, 120);
                    } catch {
                        started = false;
                    }
                }

                if (!started || !hoveredRef.current) {
                    stopPreview();
                    return;
                }
                setIsPreviewing(true);
                syncPreviewProgress();
            } catch {
                stopPreview();
            }
        }, options.immediate ? 0 : 36);
    };

    const stopPreview = () => {
        hoveredRef.current = false;
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (previewRef.current) {
            try {
                previewRef.current.pause();
                previewRef.current.currentTime = 0;
            } catch {
                // ignore reset failures on restrictive browsers
            }
            previewRef.current = null;
        }
        if (progressFrameRef.current !== null) {
            cancelAnimationFrame(progressFrameRef.current);
            progressFrameRef.current = null;
        }
        setIsPreviewing(false);
        setPreviewProgress(0);
    };

    const getTotalDuration = () => {
        const total = album.tracks.reduce((sum, track) => sum + track.duration, 0);
        const mins = Math.floor(total / 60);
        return `${mins} min`;
    };

    const handleAddAlbumToQueue = (event: React.MouseEvent) => {
        event.stopPropagation();
        onAddToQueue?.();
        setMenuOpen(false);
    };

    const handleToggleAlbumFavorite = (event: React.MouseEvent) => {
        event.stopPropagation();
        onToggleFavorite?.();
        setMenuOpen(false);
    };

    const handleShareAlbum = async (event: React.MouseEvent) => {
        event.stopPropagation();
        const url = `${window.location.origin}/musica/album/${album.id}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: album.title, text: `Escucha ${album.title} en FGAROLA`, url });
            } catch {
                // ignore cancellation
            }
        } else if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(url);
            } catch {
                // clipboard can fail on restricted environments
            }
        }
        setMenuOpen(false);
    };

    const handlePreviewAlbum = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (isPreviewing) {
            stopPreview();
        } else {
            void startPreview({ immediate: true });
        }
        setMenuOpen(false);
    };

    return (
        <motion.div
            ref={cardRef}
            className={`album-card glass ${isPreviewing ? 'previewing' : ''}`}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => {
                hoveredRef.current = true;
                void startPreview();
            }}
            onMouseLeave={stopPreview}
            onClick={handleOpenAlbum}
        >
            <div className="album-cover-container">
                <img src={album.coverArt} alt={album.title} className="album-cover" />

                {badges.length > 0 && (
                    <div className="album-badges">
                        {badges.map((badge) => (
                            <span key={`${album.id}-${badge}`} className={`album-status-badge badge-${badge.toLowerCase()}`}>
                                {badge}
                            </span>
                        ))}
                    </div>
                )}

                {/* Preview progress ring */}
                <AnimatePresence>
                    {isPreviewing && (
                        <motion.div
                            className="preview-indicator"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="preview-ring">
                                <svg viewBox="0 0 36 36">
                                    <path
                                        className="preview-ring-bg"
                                        d="M18 2.0845
                                            a 15.9155 15.9155 0 0 1 0 31.831
                                            a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="preview-ring-progress"
                                        strokeDasharray={`${previewProgress}, 100`}
                                        d="M18 2.0845
                                            a 15.9155 15.9155 0 0 1 0 31.831
                                            a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <FaVolumeUp className="preview-icon" />
                            </div>
                            <span className="preview-label">Vista previa</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    className="play-overlay"
                    onClick={handlePlayAlbum}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaPlay />
                </motion.button>

                <div className="album-menu-wrap" ref={menuRef}>
                    <button
                        type="button"
                        className={`album-menu-trigger ${menuOpen ? 'open' : ''}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            setMenuOpen((previous) => !previous);
                        }}
                        aria-label="Opciones del album"
                    >
                        <FaEllipsisH />
                    </button>
                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                className="album-quick-menu"
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                transition={{ duration: 0.16 }}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <button type="button" onClick={handlePlayAlbum}>
                                    <FaPlay /> Reproducir
                                </button>
                                <button type="button" onClick={handlePreviewAlbum}>
                                    <FaVolumeUp /> Vista previa
                                </button>
                                <button type="button" onClick={handleAddAlbumToQueue}>
                                    <FaPlus /> Anadir cola
                                </button>
                                <button type="button" onClick={handleToggleAlbumFavorite}>
                                    {isFavorite ? <FaHeart /> : <FaRegHeart />} {isFavorite ? 'Quitar favorito' : 'Favorito'}
                                </button>
                                <button type="button" onClick={handleShareAlbum}>
                                    <FaShareAlt /> Compartir
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="album-info">
                <h3 className="album-title">{album.title}</h3>
                <div className="album-meta">
                    <span className="album-type">{album.type.toUpperCase()}</span>
                    <span className="album-year">{new Date(album.releaseDate).getFullYear()}</span>
                </div>
                <div className="album-stats">
                    <span>{album.tracks.length} canciones</span>
                    <span className="separator">&middot;</span>
                    <span className="duration">
                        <FaClock /> {getTotalDuration()}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

export default AlbumCard;
