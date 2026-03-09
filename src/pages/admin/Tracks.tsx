import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMusic, FaSearch, FaPlay, FaPause, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import db from '../../services/DatabaseService';
import { Album, Track } from '../../types/music';
import './admin.css';

interface TrackWithAlbum extends Track {
    albumId: string;
    albumTitle: string;
}

type FeedbackKind = 'success' | 'error' | 'info';

const splitCreditsList = (value: string): string[] =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const joinCreditsList = (values?: string[]): string => (Array.isArray(values) ? values.join(', ') : '');

const Tracks = () => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [tracks, setTracks] = useState<TrackWithAlbum[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTrack, setEditingTrack] = useState<TrackWithAlbum | null>(null);
    const [pendingDeleteTrack, setPendingDeleteTrack] = useState<TrackWithAlbum | null>(null);
    const [playingTrack, setPlayingTrack] = useState<string | null>(null);
    const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeletingTrackId, setIsDeletingTrackId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ kind: FeedbackKind; message: string } | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const feedbackTimeoutRef = useRef<number | null>(null);

    const showFeedback = (kind: FeedbackKind, message: string) => {
        if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
        }
        setFeedback({ kind, message });
        feedbackTimeoutRef.current = window.setTimeout(() => {
            setFeedback(null);
            feedbackTimeoutRef.current = null;
        }, 3200);
    };

    const updateEditingTrack = (updates: Partial<TrackWithAlbum>) => {
        setEditingTrack((previous) => (previous ? { ...previous, ...updates } : previous));
    };

    const updateCreditsField = (
        field: keyof NonNullable<Track['credits']>,
        rawValue: string
    ) => {
        setEditingTrack((previous) => {
            if (!previous) return previous;
            return {
                ...previous,
                credits: {
                    ...(previous.credits || {}),
                    [field]: splitCreditsList(rawValue),
                },
            };
        });
    };

    const updateMetadataField = (
        field: keyof NonNullable<Track['metadata']>,
        value: string | boolean | number | undefined
    ) => {
        setEditingTrack((previous) => {
            if (!previous) return previous;
            return {
                ...previous,
                metadata: {
                    ...(previous.metadata || {}),
                    [field]: value,
                },
            };
        });
    };

    useEffect(() => {
        void loadData();

        return () => {
            if (feedbackTimeoutRef.current) {
                window.clearTimeout(feedbackTimeoutRef.current);
            }
        };
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const albumsData = await db.getAllAlbums(true);
            setAlbums(albumsData);

            const allTracks: TrackWithAlbum[] = albumsData.flatMap((album) =>
                album.tracks.map((track) => ({
                    ...track,
                    albumId: album.id,
                    albumTitle: album.title,
                }))
            );

            const audioPairs = await Promise.all(
                allTracks.map(async (track) => {
                    try {
                        const url = await db.getAudioFileUrl(track.id);
                        return [track.id, url] as const;
                    } catch (error) {
                        console.error('Error loading audio URL for track:', track.id, error);
                        return [track.id, null] as const;
                    }
                })
            );

            const urls: Record<string, string> = {};
            for (const [trackId, url] of audioPairs) {
                if (url) {
                    urls[trackId] = url;
                }
            }

            setTracks(allTracks);
            setAudioUrls(urls);
        } catch (error) {
            console.error('Error loading tracks:', error);
            showFeedback('error', 'No se pudieron cargar las canciones.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTrack = async () => {
        if (!editingTrack) return;

        const album = albums.find((item) => item.id === editingTrack.albumId);
        if (!album) {
            showFeedback('error', 'No se encontro el album de la cancion.');
            return;
        }

        setIsSaving(true);
        try {
            const updatedAlbum = {
                ...album,
                tracks: album.tracks.map((track) =>
                    track.id === editingTrack.id
                        ? {
                            ...track,
                            title: editingTrack.title,
                            duration: editingTrack.duration,
                            audioFile: editingTrack.audioFile,
                            coverArt: editingTrack.coverArt,
                            spotifyUrl: editingTrack.spotifyUrl,
                            description: editingTrack.description,
                            lyrics: editingTrack.lyrics,
                            credits: editingTrack.credits,
                            metadata: editingTrack.metadata,
                        }
                        : track
                ),
            };

            await db.saveAlbum(updatedAlbum);
            setEditingTrack(null);
            await loadData();
            showFeedback('success', 'Cancion actualizada correctamente.');
        } catch (error) {
            console.error('Error saving track:', error);
            showFeedback('error', 'No se pudo guardar la cancion.');
        } finally {
            setIsSaving(false);
        }
    };

    const requestDeleteTrack = (track: TrackWithAlbum) => {
        setPendingDeleteTrack(track);
    };

    const confirmDeleteTrack = async () => {
        if (!pendingDeleteTrack) return;

        const album = albums.find((item) => item.id === pendingDeleteTrack.albumId);
        if (!album) {
            showFeedback('error', 'No se encontro el album de la cancion.');
            setPendingDeleteTrack(null);
            return;
        }

        setIsDeletingTrackId(pendingDeleteTrack.id);
        try {
            const updatedAlbum = {
                ...album,
                tracks: album.tracks.filter((track) => track.id !== pendingDeleteTrack.id),
            };

            await db.deleteAudioFile(pendingDeleteTrack.id);
            await db.saveAlbum(updatedAlbum);
            setPendingDeleteTrack(null);
            if (editingTrack?.id === pendingDeleteTrack.id) {
                setEditingTrack(null);
            }
            await loadData();
            showFeedback('success', 'Cancion eliminada.');
        } catch (error) {
            console.error('Error deleting track:', error);
            showFeedback('error', 'No se pudo eliminar la cancion.');
        } finally {
            setIsDeletingTrackId(null);
        }
    };

    const playTrackPreview = (trackId: string) => {
        const audio = audioRef.current;
        if (!audio) return;

        if (playingTrack === trackId) {
            audio.pause();
            setPlayingTrack(null);
            return;
        }

        const nextUrl = audioUrls[trackId];
        if (!nextUrl) {
            showFeedback('info', 'Esta cancion no tiene audio subido.');
            return;
        }

        audio.src = nextUrl;
        void audio
            .play()
            .then(() => {
                setPlayingTrack(trackId);
            })
            .catch((error) => {
                console.error('Error playing preview audio:', error);
                showFeedback('error', 'No se pudo reproducir la vista previa.');
                setPlayingTrack(null);
            });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const filteredTracks = tracks.filter((track) =>
        track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.albumTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div
            className="admin-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <audio
                ref={audioRef}
                onEnded={() => setPlayingTrack(null)}
                onPause={() => setPlayingTrack(null)}
            />

            <div className="page-header">
                <div className="header-left">
                    <h1><FaMusic /> Gestion de canciones</h1>
                    <p>{tracks.length} canciones en total</p>
                </div>
            </div>

            {feedback && <div className={`admin-inline-feedback ${feedback.kind}`}>{feedback.message}</div>}

            <div className="search-bar glass">
                <FaSearch />
                <input
                    type="text"
                    placeholder="Buscar canciones..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Cargando canciones...</p>
                </div>
            ) : (
                <div className="tracks-table-container glass">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Titulo</th>
                                <th>Album</th>
                                <th>Duracion</th>
                                <th>Audio</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredTracks.map((track, index) => (
                                    <motion.tr
                                        key={track.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td>{index + 1}</td>
                                        <td className="title-cell">
                                            <strong>{track.title}</strong>
                                        </td>
                                        <td>
                                            <span className="album-badge">{track.albumTitle}</span>
                                        </td>
                                        <td>{formatDuration(track.duration)}</td>
                                        <td>
                                            {audioUrls[track.id] ? (
                                                <button
                                                    className={`btn-play-small ${playingTrack === track.id ? 'playing' : ''}`}
                                                    onClick={() => playTrackPreview(track.id)}
                                                >
                                                    {playingTrack === track.id ? <FaPause /> : <FaPlay />}
                                                </button>
                                            ) : (
                                                <span className="no-audio">Sin audio</span>
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn-icon edit"
                                                onClick={() => setEditingTrack(track)}
                                                title="Editar"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="btn-icon delete"
                                                onClick={() => requestDeleteTrack(track)}
                                                title="Eliminar"
                                                disabled={isDeletingTrackId === track.id}
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>

                    {filteredTracks.length === 0 && (
                        <div className="empty-state">
                            <FaMusic className="empty-icon" />
                            <h3>No hay canciones</h3>
                            <p>
                                {searchTerm
                                    ? 'No se encontraron canciones con esa busqueda'
                                    : 'Anade canciones desde la gestion de albumes'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {editingTrack && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingTrack(null)}
                    >
                        <motion.div
                            className="modal edit-modal glass-strong"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Editar cancion</h2>
                                <button className="btn-close" onClick={() => setEditingTrack(null)}>
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Titulo</label>
                                    <input
                                        type="text"
                                        value={editingTrack.title}
                                        onChange={(event) => updateEditingTrack({ title: event.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Descripcion de la cancion</label>
                                    <textarea
                                        value={editingTrack.description || ''}
                                        onChange={(event) => updateEditingTrack({ description: event.target.value })}
                                        rows={3}
                                        placeholder="Texto que aparece en la ficha de informacion de la cancion..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Letra</label>
                                    <textarea
                                        value={editingTrack.lyrics || ''}
                                        onChange={(event) => updateEditingTrack({ lyrics: event.target.value })}
                                        rows={6}
                                        placeholder="Anade la letra de la cancion..."
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Compositores</label>
                                        <input
                                            type="text"
                                            value={joinCreditsList(editingTrack.credits?.composers)}
                                            onChange={(event) => updateCreditsField('composers', event.target.value)}
                                            placeholder="Nombre 1, Nombre 2"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Productores</label>
                                        <input
                                            type="text"
                                            value={joinCreditsList(editingTrack.credits?.producers)}
                                            onChange={(event) => updateCreditsField('producers', event.target.value)}
                                            placeholder="Nombre 1, Nombre 2"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Ingenieria de mezcla</label>
                                        <input
                                            type="text"
                                            value={joinCreditsList(editingTrack.credits?.mixingEngineers)}
                                            onChange={(event) => updateCreditsField('mixingEngineers', event.target.value)}
                                            placeholder="Nombre 1, Nombre 2"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Musicos</label>
                                        <input
                                            type="text"
                                            value={joinCreditsList(editingTrack.credits?.musicians)}
                                            onChange={(event) => updateCreditsField('musicians', event.target.value)}
                                            placeholder="Nombre 1, Nombre 2"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Genero</label>
                                        <input
                                            type="text"
                                            value={editingTrack.metadata?.genre || ''}
                                            onChange={(event) => updateMetadataField('genre', event.target.value)}
                                            placeholder="Ej: Pop"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Idioma</label>
                                        <input
                                            type="text"
                                            value={editingTrack.metadata?.language || ''}
                                            onChange={(event) => updateMetadataField('language', event.target.value)}
                                            placeholder="Ej: Espanol"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Tonalidad</label>
                                        <input
                                            type="text"
                                            value={editingTrack.metadata?.musicalKey || ''}
                                            onChange={(event) => updateMetadataField('musicalKey', event.target.value)}
                                            placeholder="Ej: C#m"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setEditingTrack(null)}
                                    disabled={isSaving}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={() => void handleSaveTrack()}
                                    disabled={isSaving}
                                >
                                    <FaSave /> {isSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {pendingDeleteTrack && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPendingDeleteTrack(null)}
                    >
                        <motion.div
                            className="modal glass-strong"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <h2>Eliminar cancion?</h2>
                            <p>
                                Se eliminara <strong>{pendingDeleteTrack.title}</strong> y su archivo de audio asociado.
                            </p>
                            <div className="modal-actions">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setPendingDeleteTrack(null)}
                                    disabled={isDeletingTrackId === pendingDeleteTrack.id}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => void confirmDeleteTrack()}
                                    disabled={isDeletingTrackId === pendingDeleteTrack.id}
                                >
                                    {isDeletingTrackId === pendingDeleteTrack.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Tracks;
