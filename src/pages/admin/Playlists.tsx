import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    FaArrowDown,
    FaArrowUp,
    FaCompactDisc,
    FaCopy,
    FaEdit,
    FaGlobe,
    FaListUl,
    FaLock,
    FaMusic,
    FaPlus,
    FaSave,
    FaTrash,
    FaTimes,
} from 'react-icons/fa';
import db from '../../services/DatabaseService';
import type { Album, Playlist, Track } from '../../types/music';
import './admin.css';

type EditablePlaylist = Playlist & {
    trackIds: string[];
};

type TrackRef = {
    track: Track;
    album: Album;
};

type FeedbackKind = 'success' | 'error' | 'info';

const createEmptyPlaylist = (): EditablePlaylist => ({
    id: `playlist-${Date.now()}`,
    title: '',
    description: '',
    coverArt: '',
    isPublic: true,
    trackIds: [],
});

const Playlists = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [editing, setEditing] = useState<EditablePlaylist | null>(null);
    const [trackQuery, setTrackQuery] = useState('');
    const [feedback, setFeedback] = useState<{ kind: FeedbackKind; message: string } | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
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
            const [allPlaylists, allAlbums] = await Promise.all([
                db.getAllPlaylists(true),
                db.getAllAlbums(true),
            ]);
            setPlaylists(allPlaylists);
            setAlbums(allAlbums);
        } catch (error) {
            console.error('Error loading playlists:', error);
            showFeedback('error', 'No se pudieron cargar las playlists.');
        } finally {
            setIsLoading(false);
        }
    };

    const trackLookup = useMemo(() => {
        const map = new Map<string, TrackRef>();
        for (const album of albums) {
            for (const track of album.tracks) {
                map.set(track.id, { track, album });
            }
        }
        return map;
    }, [albums]);

    const selectedTracks = useMemo(() => {
        if (!editing) return [] as TrackRef[];
        return editing.trackIds
            .map((trackId) => trackLookup.get(trackId))
            .filter((item): item is TrackRef => Boolean(item));
    }, [editing, trackLookup]);

    const filteredLibraryTracks = useMemo(() => {
        const query = trackQuery.trim().toLowerCase();
        const rows = Array.from(trackLookup.values());
        if (!query) return rows.slice(0, 60);
        return rows
            .filter((item) => {
                const inTitle = item.track.title.toLowerCase().includes(query);
                const inAlbum = item.album.title.toLowerCase().includes(query);
                return inTitle || inAlbum;
            })
            .slice(0, 60);
    }, [trackLookup, trackQuery]);

    const beginCreate = () => {
        setTrackQuery('');
        setValidationError(null);
        setEditing(createEmptyPlaylist());
    };

    const beginEdit = (playlist: Playlist) => {
        setTrackQuery('');
        setValidationError(null);
        setEditing({
            ...playlist,
            trackIds: Array.isArray(playlist.trackIds) ? [...playlist.trackIds] : [],
        });
    };

    const closeEditor = () => {
        setEditing(null);
        setTrackQuery('');
        setValidationError(null);
    };

    const updateField = <K extends keyof EditablePlaylist>(field: K, value: EditablePlaylist[K]) => {
        if (!editing) return;
        setEditing({ ...editing, [field]: value });
    };

    const addTrackToPlaylist = (trackId: string) => {
        if (!editing) return;
        if (editing.trackIds.includes(trackId)) return;
        setEditing({
            ...editing,
            trackIds: [...editing.trackIds, trackId],
        });
    };

    const removeTrackFromPlaylist = (trackId: string) => {
        if (!editing) return;
        setEditing({
            ...editing,
            trackIds: editing.trackIds.filter((id) => id !== trackId),
        });
    };

    const moveTrack = (trackId: string, direction: -1 | 1) => {
        if (!editing) return;
        const index = editing.trackIds.findIndex((id) => id === trackId);
        if (index < 0) return;
        const target = index + direction;
        if (target < 0 || target >= editing.trackIds.length) return;
        const next = [...editing.trackIds];
        [next[index], next[target]] = [next[target], next[index]];
        setEditing({
            ...editing,
            trackIds: next,
        });
    };

    const savePlaylist = async () => {
        if (!editing) return;

        const title = editing.title.trim();
        if (!title) {
            setValidationError('El titulo es obligatorio.');
            return;
        }
        if (editing.trackIds.length === 0) {
            setValidationError('Agrega al menos una cancion.');
            return;
        }

        setValidationError(null);
        setIsSaving(true);
        try {
            const payload: Playlist = {
                ...editing,
                id: editing.id,
                title,
                description: editing.description?.trim() || '',
                coverArt: editing.coverArt?.trim() || '',
                isPublic: editing.isPublic !== false,
                trackIds: editing.trackIds,
            };
            await db.savePlaylist(payload);
            await loadData();
            closeEditor();
            showFeedback('success', 'Playlist guardada correctamente.');
        } catch (error) {
            console.error('Error saving playlist:', error);
            showFeedback('error', 'No se pudo guardar la playlist.');
        } finally {
            setIsSaving(false);
        }
    };

    const requestDeletePlaylist = (playlistId: string) => {
        setPendingDeleteId(playlistId);
    };

    const confirmDeletePlaylist = async () => {
        if (!pendingDeleteId) return;

        setDeletingPlaylistId(pendingDeleteId);
        try {
            await db.deletePlaylist(pendingDeleteId);
            await loadData();
            if (editing?.id === pendingDeleteId) {
                closeEditor();
            }
            showFeedback('success', 'Playlist eliminada.');
        } catch (error) {
            console.error('Error deleting playlist:', error);
            showFeedback('error', 'No se pudo eliminar la playlist.');
        } finally {
            setDeletingPlaylistId(null);
            setPendingDeleteId(null);
        }
    };

    const copyPlaylistUrl = async (playlistId: string) => {
        const url = `${window.location.origin}/playlist/${encodeURIComponent(playlistId)}`;
        try {
            await navigator.clipboard.writeText(url);
            showFeedback('success', 'URL copiada al portapapeles.');
        } catch {
            showFeedback('error', 'No se pudo copiar la URL.');
        }
    };

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Cargando playlists...</p>
            </div>
        );
    }

    return (
        <motion.div className="admin-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="page-header">
                <div className="header-left">
                    <h1><FaListUl /> Playlists curadas</h1>
                    <p>Crea playlists publicas y compartelas con URL directa.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-add" onClick={beginCreate}>
                        <FaPlus /> Nueva playlist
                    </button>
                </div>
            </div>

            {feedback && <div className={`admin-inline-feedback ${feedback.kind}`}>{feedback.message}</div>}

            <section className="playlists-grid">
                {playlists.map((playlist) => (
                    <article key={playlist.id} className="playlist-admin-card glass">
                        <div className="playlist-admin-cover">
                            {playlist.coverArt ? (
                                <img src={playlist.coverArt} alt={playlist.title} />
                            ) : (
                                <div className="playlist-admin-cover-fallback">
                                    <FaMusic />
                                </div>
                            )}
                        </div>
                        <div className="playlist-admin-copy">
                            <strong>{playlist.title}</strong>
                            <small>{playlist.trackIds?.length || 0} canciones</small>
                            <p>{playlist.description || 'Sin descripcion'}</p>
                        </div>
                        <div className="playlist-admin-state">
                            {playlist.isPublic === false ? (
                                <span className="status-badge inactive"><FaLock /> Privada</span>
                            ) : (
                                <span className="status-badge active"><FaGlobe /> Publica</span>
                            )}
                        </div>
                        <div className="playlist-admin-actions">
                            <button className="btn-icon" onClick={() => void copyPlaylistUrl(playlist.id)} title="Copiar URL">
                                <FaCopy />
                            </button>
                            <button className="btn-icon edit" onClick={() => beginEdit(playlist)} title="Editar">
                                <FaEdit />
                            </button>
                            <button
                                className="btn-icon delete"
                                onClick={() => requestDeletePlaylist(playlist.id)}
                                title="Eliminar"
                                disabled={deletingPlaylistId === playlist.id}
                            >
                                <FaTrash />
                            </button>
                        </div>
                    </article>
                ))}
                {playlists.length === 0 && (
                    <div className="empty-state glass">
                        <FaCompactDisc className="empty-icon" />
                        <h3>No hay playlists</h3>
                        <p>Crea tu primera playlist curada.</p>
                    </div>
                )}
            </section>

            {editing && (
                <section className="playlist-editor glass">
                    <div className="playlist-editor-head">
                        <h2>{playlists.some((item) => item.id === editing.id) ? 'Editar playlist' : 'Nueva playlist'}</h2>
                        <button className="btn-icon" onClick={closeEditor} title="Cerrar" disabled={isSaving}>
                            <FaTimes />
                        </button>
                    </div>

                    {validationError && <div className="admin-inline-feedback error">{validationError}</div>}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Titulo</label>
                            <input value={editing.title} onChange={(event) => updateField('title', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Portada URL</label>
                            <input
                                value={editing.coverArt || ''}
                                onChange={(event) => updateField('coverArt', event.target.value)}
                                placeholder="https://.../storage/v1/object/public/garmusic-assets/..."
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Descripcion</label>
                            <textarea
                                rows={3}
                                value={editing.description || ''}
                                onChange={(event) => updateField('description', event.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Visibilidad</label>
                            <select
                                value={editing.isPublic === false ? 'private' : 'public'}
                                onChange={(event) => updateField('isPublic', event.target.value === 'public')}
                            >
                                <option value="public">Publica</option>
                                <option value="private">Privada</option>
                            </select>
                        </div>
                    </div>

                    <div className="playlist-editor-grid">
                        <div className="playlist-editor-column">
                            <h3>Canciones en playlist ({selectedTracks.length})</h3>
                            {selectedTracks.length === 0 ? (
                                <p className="panel-empty">Aun no hay canciones seleccionadas.</p>
                            ) : (
                                <div className="playlist-editor-track-list">
                                    {selectedTracks.map((item) => (
                                        <article key={item.track.id} className="playlist-editor-track-row">
                                            <div className="playlist-editor-track-copy">
                                                <strong>{item.track.title}</strong>
                                                <small>{item.album.title}</small>
                                            </div>
                                            <div className="playlist-editor-track-actions">
                                                <button className="btn-icon" onClick={() => moveTrack(item.track.id, -1)} title="Subir">
                                                    <FaArrowUp />
                                                </button>
                                                <button className="btn-icon" onClick={() => moveTrack(item.track.id, 1)} title="Bajar">
                                                    <FaArrowDown />
                                                </button>
                                                <button className="btn-icon delete" onClick={() => removeTrackFromPlaylist(item.track.id)} title="Quitar">
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="playlist-editor-column">
                            <h3>Biblioteca de canciones</h3>
                            <div className="form-group">
                                <input
                                    value={trackQuery}
                                    onChange={(event) => setTrackQuery(event.target.value)}
                                    placeholder="Buscar por cancion o album..."
                                />
                            </div>
                            <div className="playlist-editor-track-list">
                                {filteredLibraryTracks.map((item) => {
                                    const selected = editing.trackIds.includes(item.track.id);
                                    return (
                                        <article key={item.track.id} className="playlist-editor-track-row">
                                            <div className="playlist-editor-track-copy">
                                                <strong>{item.track.title}</strong>
                                                <small>{item.album.title}</small>
                                            </div>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => addTrackToPlaylist(item.track.id)}
                                                disabled={selected}
                                            >
                                                {selected ? 'Agregada' : 'Agregar'}
                                            </button>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button className="btn-cancel" onClick={closeEditor} disabled={isSaving}>Cancelar</button>
                        <button className="btn-save" onClick={() => void savePlaylist()} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : <><FaSave /> Guardar playlist</>}
                        </button>
                    </div>
                </section>
            )}

            {pendingDeleteId && (
                <div className="modal-overlay" onClick={() => setPendingDeleteId(null)}>
                    <div className="modal glass-strong" onClick={(event) => event.stopPropagation()}>
                        <h2>Eliminar playlist?</h2>
                        <p>Esta accion no se puede deshacer.</p>
                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setPendingDeleteId(null)}
                                disabled={deletingPlaylistId === pendingDeleteId}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-danger"
                                onClick={() => void confirmDeletePlaylist()}
                                disabled={deletingPlaylistId === pendingDeleteId}
                            >
                                {deletingPlaylistId === pendingDeleteId ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Playlists;
