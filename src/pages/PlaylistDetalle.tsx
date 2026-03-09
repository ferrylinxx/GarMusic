import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaCopy, FaHeart, FaPlay, FaPlus, FaRegHeart } from 'react-icons/fa';
import type { Playlist, Track, Album } from '../types/music';
import db from '../services/DatabaseService';
import { useDiscography } from '../context/DiscographyContext';
import { usePlayer } from '../context/PlayerContext';
import './PlaylistDetalle.css';

type PlaylistTrackEntry = {
    track: Track;
    album: Album;
};

const formatDuration = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlaylistDetalle = () => {
    const { playlistId } = useParams<{ playlistId: string }>();
    const { albums } = useDiscography();
    const { playTrack, addToQueue, isFavoriteTrack, toggleFavoriteTrack } = usePlayer();
    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [shareMessage, setShareMessage] = useState('');

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            try {
                if (!playlistId) {
                    if (!cancelled) setPlaylist(null);
                    return;
                }
                const data = await db.getPlaylist(playlistId, false);
                if (!cancelled) setPlaylist(data);
            } catch (error) {
                console.error('Error loading playlist:', error);
                if (!cancelled) setPlaylist(null);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [playlistId]);

    const trackLookup = useMemo(() => {
        const map = new Map<string, PlaylistTrackEntry>();
        for (const album of albums) {
            for (const track of album.tracks) {
                map.set(track.id, { track, album });
            }
        }
        return map;
    }, [albums]);

    const entries = useMemo(() => {
        if (!playlist) return [] as PlaylistTrackEntry[];
        return playlist.trackIds
            .map((trackId) => trackLookup.get(trackId))
            .filter((item): item is PlaylistTrackEntry => Boolean(item));
    }, [playlist, trackLookup]);

    const totalDuration = useMemo(
        () => entries.reduce((sum, item) => sum + item.track.duration, 0),
        [entries]
    );

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            setShareMessage('URL copiada');
        } catch {
            setShareMessage('No se pudo copiar la URL');
        }
        window.setTimeout(() => setShareMessage(''), 1800);
    };

    const playAll = () => {
        if (entries.length === 0) return;
        void playTrack(entries[0].track, entries[0].album);
        entries.slice(1).forEach((entry) => addToQueue(entry.track));
    };

    if (isLoading) {
        return (
            <div className="playlist-page container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Cargando playlist...</p>
                </div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="playlist-page container">
                <div className="playlist-not-found glass">
                    <h1>Playlist no encontrada</h1>
                    <p>Puede estar en privado o no existir.</p>
                    <Link to="/musica" className="btn-secondary">Ir a musica</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="playlist-page container">
            <Link to="/musica" className="playlist-back-link">
                <FaArrowLeft /> Volver a musica
            </Link>

            <motion.section
                className="playlist-hero glass-strong"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {playlist.coverArt ? (
                    <img src={playlist.coverArt} alt={playlist.title} className="playlist-cover" />
                ) : (
                    <div className="playlist-cover fallback">{playlist.title.slice(0, 2).toUpperCase()}</div>
                )}
                <div className="playlist-copy">
                    <span className="playlist-type">Playlist curada</span>
                    <h1>{playlist.title}</h1>
                    {playlist.description && <p>{playlist.description}</p>}
                    <div className="playlist-meta">
                        <span>{entries.length} canciones</span>
                        <span>{formatDuration(totalDuration)}</span>
                    </div>
                    <div className="playlist-actions">
                        <button type="button" className="btn-primary" onClick={playAll}>
                            <FaPlay /> Reproducir
                        </button>
                        <button type="button" className="btn-secondary" onClick={handleShare}>
                            <FaCopy /> Compartir URL
                        </button>
                        {shareMessage && <span className="playlist-share-message">{shareMessage}</span>}
                    </div>
                </div>
            </motion.section>

            <section className="playlist-tracks glass">
                {entries.length === 0 ? (
                    <p className="playlist-empty">Esta playlist no tiene canciones disponibles.</p>
                ) : (
                    entries.map(({ track, album }, index) => {
                        const isFav = isFavoriteTrack(track.id);
                        return (
                            <article key={`${track.id}-${index}`} className="playlist-track-row">
                                <button type="button" className="playlist-track-main" onClick={() => playTrack(track, album)}>
                                    <span className="playlist-track-index">{index + 1}</span>
                                    <span className="playlist-track-copy">
                                        <strong>{track.title}</strong>
                                        <small>{album.title}</small>
                                    </span>
                                    <span className="playlist-track-duration">{formatDuration(track.duration)}</span>
                                </button>
                                <div className="playlist-track-actions">
                                    <button
                                        type="button"
                                        className={`track-mini-btn ${isFav ? 'is-favorite' : ''}`}
                                        onClick={() => toggleFavoriteTrack(track.id)}
                                    >
                                        {isFav ? <FaHeart /> : <FaRegHeart />}
                                    </button>
                                    <button
                                        type="button"
                                        className="track-mini-btn"
                                        onClick={() => addToQueue(track)}
                                        title="Anadir a cola"
                                    >
                                        <FaPlus />
                                    </button>
                                </div>
                            </article>
                        );
                    })
                )}
            </section>
        </div>
    );
};

export default PlaylistDetalle;

