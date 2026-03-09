import { useState, useRef, useEffect } from 'react';
import { Album } from '../../types/music';
import { usePlayer } from '../../context/PlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaClock, FaVolumeUp, FaEllipsisH, FaPlus, FaHeart, FaRegHeart, FaShareAlt } from 'react-icons/fa';
import { Howl } from 'howler';
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

const inferPreviewFormats = (source: string): string[] | undefined => {
    const normalized = String(source || '').trim().split('?')[0].toLowerCase();
    const extension = normalized.includes('.') ? normalized.slice(normalized.lastIndexOf('.') + 1) : '';

    const byExtension: Record<string, string> = {
        mp3: 'mp3',
        m4a: 'm4a',
        aac: 'aac',
        wav: 'wav',
        ogg: 'ogg',
        oga: 'ogg',
        flac: 'flac',
        webm: 'webm',
        opus: 'opus',
    };

    if (extension && byExtension[extension]) {
        return [byExtension[extension]];
    }

    if (normalized.includes('/api/tracks/') && normalized.includes('/audio')) {
        return ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac', 'webm', 'opus'];
    }

    return undefined;
};

const AlbumCard = ({ album, badges = [], isFavorite = false, onAddToQueue, onToggleFavorite }: AlbumCardProps) => {
    const { playAlbum } = usePlayer();
    const { dataSaverEnabled } = useDataSaver();
    const navigate = useNavigate();
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewProgress, setPreviewProgress] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const previewRef = useRef<Howl | null>(null);
    const progressIntervalRef = useRef<number | null>(null);
    const hoverTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const PREVIEW_DURATION = 30; // 30 seconds preview

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (previewRef.current) {
                previewRef.current.unload();
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
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
        }
    }, [dataSaverEnabled]);

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

    const startPreview = async () => {
        if (album.tracks.length === 0) return;
        if (dataSaverEnabled) return;

        // Small delay before starting preview
        hoverTimeoutRef.current = window.setTimeout(async () => {
            const track = album.tracks[0];
            const audioUrl = await db.getAudioFileUrl(track.id);

            if (!audioUrl) return;
            const previewFormats = inferPreviewFormats(audioUrl);

            previewRef.current = new Howl({
                src: [audioUrl],
                ...(previewFormats ? { format: previewFormats } : {}),
                volume: 0.4,
                onplay: () => {
                    setIsPreviewing(true);
                    // Update progress
                    progressIntervalRef.current = window.setInterval(() => {
                        if (previewRef.current) {
                            const seek = previewRef.current.seek() as number;
                            const progress = (seek / PREVIEW_DURATION) * 100;
                            setPreviewProgress(Math.min(progress, 100));

                            // Stop after 30 seconds
                            if (seek >= PREVIEW_DURATION) {
                                stopPreview();
                            }
                        }
                    }, 100);
                },
                onend: () => {
                    stopPreview();
                },
                onloaderror: () => {
                    stopPreview();
                },
            });

            previewRef.current.play();
        }, 500); // 500ms delay before preview starts
    };

    const stopPreview = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (previewRef.current) {
            previewRef.current.stop();
            previewRef.current.unload();
            previewRef.current = null;
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
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

    return (
        <motion.div
            className={`album-card glass ${isPreviewing ? 'previewing' : ''}`}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={startPreview}
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
