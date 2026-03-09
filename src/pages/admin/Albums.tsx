import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaCompactDisc,
    FaCopy,
    FaEdit,
    FaPlus,
    FaSearch,
    FaSpotify,
    FaTrash,
} from 'react-icons/fa';
import db from '../../services/DatabaseService';
import { Album } from '../../types/music';
import SpotifyImporter, { SpotifyAlbumData } from '../../components/admin/SpotifyImporter';
import './admin.css';

interface AlbumWithAdminMeta extends Album {
    featured?: boolean;
    tags?: string[];
}

type AlbumStatus = 'draft' | 'scheduled' | 'published';

const toDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const monthLabel = (date: Date): string =>
    date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

const dateFromKey = (key: string): Date | null => {
    const [yearRaw, monthRaw, dayRaw] = key.split('-').map(Number);
    if (!Number.isFinite(yearRaw) || !Number.isFinite(monthRaw) || !Number.isFinite(dayRaw)) {
        return null;
    }
    return new Date(yearRaw, monthRaw - 1, dayRaw);
};

const formatPublishTime = (value?: string): string => {
    if (!value) return '--:--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const buildPublishAtForDate = (album: AlbumWithAdminMeta, dateKey: string): string => {
    const targetDate = dateFromKey(dateKey);
    if (!targetDate) return album.publishAt || '';

    const currentPublish = album.publishAt ? new Date(album.publishAt) : null;
    if (currentPublish && !Number.isNaN(currentPublish.getTime())) {
        targetDate.setHours(
            currentPublish.getHours(),
            currentPublish.getMinutes(),
            currentPublish.getSeconds(),
            currentPublish.getMilliseconds()
        );
    } else {
        targetDate.setHours(18, 0, 0, 0);
    }

    return targetDate.toISOString();
};

const normalizeAudioExtension = (mimeType: string): string => {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes('mp4')) return '.m4a';
    if (normalized.includes('aac')) return '.aac';
    if (normalized.includes('wav')) return '.wav';
    if (normalized.includes('ogg')) return '.ogg';
    if (normalized.includes('flac')) return '.flac';
    if (normalized.includes('webm')) return '.webm';
    return '.mp3';
};

const getAlbumStatus = (album: AlbumWithAdminMeta): AlbumStatus => {
    if ((album.workflowStatus || 'published') === 'draft') {
        return 'draft';
    }
    const publishAtMs = album.publishAt ? Date.parse(album.publishAt) : NaN;
    if (Number.isFinite(publishAtMs) && publishAtMs > Date.now()) {
        return 'scheduled';
    }
    return 'published';
};

const getAlbumStatusLabel = (status: AlbumStatus): string => {
    if (status === 'draft') return 'Borrador';
    if (status === 'scheduled') return 'Programado';
    return 'Publicado';
};

const getAlbumSortPriority = (album: AlbumWithAdminMeta): number => {
    const status = getAlbumStatus(album);
    if (status === 'scheduled') return 0;
    if (status === 'published') return 1;
    return 2;
};

const parseDateMs = (value?: string): number => {
    if (!value) return Number.NaN;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const Albums = () => {
    const [albums, setAlbums] = useState<AlbumWithAdminMeta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSpotifyImporter, setShowSpotifyImporter] = useState(false);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
    const [draggingReleaseId, setDraggingReleaseId] = useState<string | null>(null);
    const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
    const [movingReleaseId, setMovingReleaseId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        void loadAlbums();
    }, []);

    const loadAlbums = async () => {
        setIsLoading(true);
        const data = await db.getAllAlbums(true);
        setAlbums(data as AlbumWithAdminMeta[]);
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        await db.deleteAlbum(id);
        setDeleteConfirm(null);
        await loadAlbums();
    };

    const handleSpotifyImport = async (data: SpotifyAlbumData) => {
        const now = Date.now();
        const newAlbum: AlbumWithAdminMeta = {
            id: `album-${now}`,
            title: data.title,
            type: data.type,
            releaseDate: data.releaseDate,
            coverArt: data.coverArt,
            spotifyUrl: data.spotifyUrl,
            workflowStatus: 'draft',
            tracks: data.tracks.map((track, index) => ({
                id: `track-${now}-${index}`,
                title: track.title,
                duration: track.duration,
                audioFile: '',
                spotifyUrl: track.spotifyUrl,
            })),
        };

        await db.saveAlbum(newAlbum);
        await loadAlbums();
        navigate(`/admin/albums/${newAlbum.id}`);
    };

    const handleDuplicateAlbum = async (sourceAlbum: AlbumWithAdminMeta) => {
        setDuplicatingId(sourceAlbum.id);
        try {
            const now = Date.now();
            const duplicatedId = `album-${now}`;
            const duplicatedTracks = await Promise.all(
                sourceAlbum.tracks.map(async (track, index) => {
                    const duplicatedTrackId = `track-${now}-${index}-${Math.random().toString(36).slice(2, 7)}`;
                    let nextAudioFile = track.audioFile || '';

                    try {
                        const blob = await db.getAudioFile(track.id);
                        if (blob) {
                            const extension = normalizeAudioExtension(blob.type || '');
                            const file = new File([blob], `${duplicatedTrackId}${extension}`, {
                                type: blob.type || 'audio/mpeg',
                            });
                            await db.saveAudioFile(duplicatedTrackId, file);
                            nextAudioFile = `db:${duplicatedTrackId}`;
                        } else if (track.audioFile && !track.audioFile.startsWith('db:')) {
                            nextAudioFile = track.audioFile;
                        } else {
                            nextAudioFile = '';
                        }
                    } catch (error) {
                        console.error('Error duplicating track audio:', error);
                        nextAudioFile = track.audioFile && !track.audioFile.startsWith('db:') ? track.audioFile : '';
                    }

                    return {
                        ...track,
                        id: duplicatedTrackId,
                        audioFile: nextAudioFile,
                    };
                })
            );

            const duplicatedAlbum: AlbumWithAdminMeta = {
                ...sourceAlbum,
                id: duplicatedId,
                title: `${sourceAlbum.title} (Copia)`,
                workflowStatus: 'draft',
                publishAt: '',
                releaseAutomation: {
                    ...(sourceAlbum.releaseAutomation || {}),
                    processedAt: undefined,
                },
                tracks: duplicatedTracks,
            };

            await db.saveAlbum(duplicatedAlbum);
            await loadAlbums();
            navigate(`/admin/albums/${duplicatedId}`);
        } catch (error) {
            console.error('Error duplicating album:', error);
            alert('No se pudo duplicar el album.');
        } finally {
            setDuplicatingId(null);
        }
    };

    const moveReleaseToDate = async (albumId: string, targetDateKey: string) => {
        const album = albums.find((item) => item.id === albumId);
        if (!album) return;

        const currentDateKey = album.publishAt ? toDateKey(new Date(album.publishAt)) : '';
        if (currentDateKey === targetDateKey) return;

        const nextPublishAt = buildPublishAtForDate(album, targetDateKey);
        if (!nextPublishAt) return;

        const updatedAlbum: AlbumWithAdminMeta = {
            ...album,
            publishAt: nextPublishAt,
            workflowStatus: album.workflowStatus === 'draft' ? 'published' : (album.workflowStatus || 'published'),
            releaseAutomation: {
                ...(album.releaseAutomation || {}),
                processedAt: undefined,
            },
        };

        setMovingReleaseId(albumId);
        try {
            await db.saveAlbum(updatedAlbum);
            setAlbums((previous) =>
                previous.map((item) => (item.id === albumId ? updatedAlbum : item))
            );
            setSelectedDateKey(targetDateKey);
        } catch (error) {
            console.error('Error moving release date:', error);
            alert('No se pudo reprogramar el lanzamiento');
        } finally {
            setMovingReleaseId(null);
        }
    };

    const filteredAlbums = useMemo(
        () =>
            albums.filter((album) =>
                album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                album.type.toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [albums, searchTerm]
    );

    const sortedFilteredAlbums = useMemo(() => {
        return [...filteredAlbums].sort((a, b) => {
            const priorityDiff = getAlbumSortPriority(a) - getAlbumSortPriority(b);
            if (priorityDiff !== 0) return priorityDiff;

            const statusA = getAlbumStatus(a);
            const statusB = getAlbumStatus(b);

            if (statusA === 'scheduled' && statusB === 'scheduled') {
                const publishDiff = parseDateMs(a.publishAt) - parseDateMs(b.publishAt);
                if (Number.isFinite(publishDiff) && publishDiff !== 0) return publishDiff;
            }

            const releaseDiff = parseDateMs(b.releaseDate) - parseDateMs(a.releaseDate);
            if (Number.isFinite(releaseDiff) && releaseDiff !== 0) return releaseDiff;

            return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
        });
    }, [filteredAlbums]);

    const scheduledAlbums = useMemo(() => {
        return [...albums]
            .filter((album) => (album.workflowStatus || 'published') !== 'draft')
            .filter((album) => {
                const publishAtMs = album.publishAt ? Date.parse(album.publishAt) : NaN;
                return Number.isFinite(publishAtMs);
            })
            .sort((a, b) => {
                const aMs = Date.parse(a.publishAt || '');
                const bMs = Date.parse(b.publishAt || '');
                return aMs - bMs;
            });
    }, [albums]);

    const scheduledByDate = useMemo(() => {
        const map = new Map<string, AlbumWithAdminMeta[]>();
        for (const album of scheduledAlbums) {
            const date = new Date(album.publishAt || '');
            if (Number.isNaN(date.getTime())) continue;
            const key = toDateKey(date);
            const previous = map.get(key) || [];
            previous.push(album);
            map.set(key, previous);
        }
        return map;
    }, [scheduledAlbums]);

    const todayKey = useMemo(() => toDateKey(new Date()), []);

    const selectedDayItems = useMemo(
        () => (scheduledByDate.get(selectedDateKey) || []).sort((a, b) => Date.parse(a.publishAt || '') - Date.parse(b.publishAt || '')),
        [scheduledByDate, selectedDateKey]
    );

    const selectedDateLabel = useMemo(() => {
        const date = dateFromKey(selectedDateKey);
        if (!date) return selectedDateKey;
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }, [selectedDateKey]);

    const currentMonthStats = useMemo(() => {
        const targetYear = calendarMonth.getFullYear();
        const targetMonth = calendarMonth.getMonth();

        const monthAlbums = scheduledAlbums.filter((album) => {
            const date = new Date(album.publishAt || '');
            return !Number.isNaN(date.getTime()) && date.getFullYear() === targetYear && date.getMonth() === targetMonth;
        });

        const uniqueDays = new Set(
            monthAlbums.map((album) => toDateKey(new Date(album.publishAt || '')))
        );

        return {
            launches: monthAlbums.length,
            activeDays: uniqueDays.size,
        };
    }, [calendarMonth, scheduledAlbums]);

    const upcomingReleases = useMemo(() => {
        const now = Date.now();
        return scheduledAlbums
            .filter((album) => {
                const publishMs = Date.parse(album.publishAt || '');
                return Number.isFinite(publishMs) && publishMs >= now;
            })
            .slice(0, 6);
    }, [scheduledAlbums]);

    const calendarCells = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const totalCells = 42;

        return Array.from({ length: totalCells }, (_, index) => {
            const dayNumber = index - firstWeekDay + 1;
            if (dayNumber < 1 || dayNumber > daysInMonth) {
                return null;
            }
            return new Date(year, month, dayNumber);
        });
    }, [calendarMonth]);

    const formatDuration = (tracks: Album['tracks']) => {
        const total = tracks.reduce((acc, track) => acc + track.duration, 0);
        const mins = Math.floor(total / 60);
        return `${mins} min`;
    };

    return (
        <motion.div className="admin-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="page-header">
                <div className="header-left">
                    <h1><FaCompactDisc /> Gestion de albumes</h1>
                    <p>{albums.length} albumes en total</p>
                </div>
                <div className="header-actions">
                    <button className="btn-spotify" onClick={() => setShowSpotifyImporter(true)}>
                        <FaSpotify /> Importar de Spotify
                    </button>
                    <Link to="/admin/albums/new" className="btn-add">
                        <FaPlus /> Nuevo album
                    </Link>
                </div>
            </div>

            <SpotifyImporter
                isOpen={showSpotifyImporter}
                onClose={() => setShowSpotifyImporter(false)}
                onImport={handleSpotifyImport}
            />

            <section className="albums-calendar glass">
                <div className="albums-calendar-head">
                    <div className="albums-calendar-title">
                        <h2><FaCalendarAlt /> Calendario de lanzamientos</h2>
                        <p>Gestiona fechas de salida con vista mensual, proximos hitos y detalle por dia.</p>
                    </div>
                    <div className="calendar-controls">
                        <div className="calendar-month-nav">
                            <button
                                type="button"
                                className="btn-icon"
                                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                aria-label="Mes anterior"
                            >
                                <FaChevronLeft />
                            </button>
                            <strong>{monthLabel(calendarMonth)}</strong>
                            <button
                                type="button"
                                className="btn-icon"
                                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                aria-label="Mes siguiente"
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                        <button
                            type="button"
                            className="btn-secondary calendar-today-btn"
                            onClick={() => {
                                const now = new Date();
                                setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                                setSelectedDateKey(toDateKey(now));
                            }}
                        >
                            Hoy
                        </button>
                    </div>
                </div>

                <div className="calendar-kpis">
                    <div className="calendar-kpi">
                        <span>Lanzamientos en el mes</span>
                        <strong>{currentMonthStats.launches}</strong>
                    </div>
                    <div className="calendar-kpi">
                        <span>Dias con actividad</span>
                        <strong>{currentMonthStats.activeDays}</strong>
                    </div>
                    <div className="calendar-kpi">
                        <span>Proximos lanzamientos</span>
                        <strong>{upcomingReleases.length}</strong>
                    </div>
                </div>

                <div className="albums-calendar-layout">
                    <div className="albums-calendar-grid-wrap">
                        <div className="albums-calendar-grid">
                            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
                                <span key={day} className="calendar-weekday">{day}</span>
                            ))}
                            {calendarCells.map((date, index) => {
                                if (!date) {
                                    return <div key={`empty-${index}`} className="calendar-cell empty" />;
                                }
                                const key = toDateKey(date);
                                const items = scheduledByDate.get(key) || [];
                                const isToday = key === todayKey;
                                const isSelected = key === selectedDateKey;
                                const canDrop = Boolean(draggingReleaseId);
                                const isDragOver = dragOverDateKey === key;
                                return (
                                    <div
                                        key={key}
                                        role="button"
                                        tabIndex={0}
                                        className={`calendar-cell ${items.length > 0 ? 'has-events' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${canDrop ? 'can-drop' : ''} ${isDragOver ? 'drag-over' : ''}`}
                                        onClick={() => setSelectedDateKey(key)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setSelectedDateKey(key);
                                            }
                                        }}
                                        onDragOver={(event) => {
                                            if (!draggingReleaseId) return;
                                            event.preventDefault();
                                            setDragOverDateKey(key);
                                        }}
                                        onDragLeave={() => {
                                            if (dragOverDateKey === key) {
                                                setDragOverDateKey(null);
                                            }
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            const draggedId = event.dataTransfer.getData('text/plain') || draggingReleaseId;
                                            setDragOverDateKey(null);
                                            setDraggingReleaseId(null);
                                            if (!draggedId) return;
                                            void moveReleaseToDate(draggedId, key);
                                        }}
                                    >
                                        <span className="calendar-cell-head">
                                            <span className="calendar-day">{date.getDate()}</span>
                                            {items.length > 0 && <span className="calendar-day-count">{items.length}</span>}
                                        </span>
                                        {items.slice(0, 2).map((item) => {
                                            const status = getAlbumStatus(item);
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className={`calendar-event status-${status} ${movingReleaseId === item.id ? 'is-loading' : ''}`}
                                                    title={`Editar ${item.title}`}
                                                    draggable
                                                    onDragStart={(event) => {
                                                        event.dataTransfer.setData('text/plain', item.id);
                                                        event.dataTransfer.effectAllowed = 'move';
                                                        setDraggingReleaseId(item.id);
                                                    }}
                                                    onDragEnd={() => {
                                                        setDraggingReleaseId(null);
                                                        setDragOverDateKey(null);
                                                    }}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        navigate(`/admin/albums/${item.id}`);
                                                    }}
                                                >
                                                    <span className="calendar-event-time">{formatPublishTime(item.publishAt)}</span>
                                                    <span className="calendar-event-title">{item.title}</span>
                                                </button>
                                            );
                                        })}
                                        {items.length > 2 && (
                                            <span className="calendar-more">+{items.length - 2} mas</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <aside className="calendar-upcoming">
                        <h3><FaClock /> Proximos lanzamientos</h3>
                        {upcomingReleases.length === 0 && (
                            <p className="calendar-upcoming-empty">No hay lanzamientos futuros programados.</p>
                        )}
                        {upcomingReleases.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={`calendar-upcoming-item ${movingReleaseId === item.id ? 'is-loading' : ''}`}
                                onClick={() => navigate(`/admin/albums/${item.id}`)}
                                draggable
                                onDragStart={(event) => {
                                    event.dataTransfer.setData('text/plain', item.id);
                                    event.dataTransfer.effectAllowed = 'move';
                                    setDraggingReleaseId(item.id);
                                }}
                                onDragEnd={() => {
                                    setDraggingReleaseId(null);
                                    setDragOverDateKey(null);
                                }}
                            >
                                <img src={item.coverArt} alt={item.title} />
                                <span className="calendar-upcoming-item-copy">
                                    <strong>{item.title}</strong>
                                    <small>
                                        {new Date(item.publishAt || '').toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })}{' '}
                                        - {formatPublishTime(item.publishAt)}
                                    </small>
                                </span>
                            </button>
                        ))}
                    </aside>
                </div>

                <div className="calendar-day-panel">
                    <div className="calendar-day-panel-head">
                        <h3>{selectedDateLabel}</h3>
                        <span>{selectedDayItems.length} lanzamientos</span>
                    </div>
                    {selectedDayItems.length === 0 && (
                        <p className="calendar-day-empty">Sin publicaciones para este dia.</p>
                    )}
                    {selectedDayItems.map((item) => {
                        const status = getAlbumStatus(item);
                        return (
                            <div key={item.id} className="calendar-day-item">
                                <img src={item.coverArt} alt={item.title} />
                                <div className="calendar-day-item-copy">
                                    <strong>{item.title}</strong>
                                    <small>
                                        {item.type.toUpperCase()} - {formatPublishTime(item.publishAt)}
                                    </small>
                                </div>
                                <span className={`album-workflow-badge ${status}`}>{getAlbumStatusLabel(status)}</span>
                                <button
                                    type="button"
                                    className={`btn-icon ${movingReleaseId === item.id ? 'is-busy' : ''}`}
                                    title="Arrastrar para reprogramar en el calendario"
                                    draggable
                                    onDragStart={(event) => {
                                        event.stopPropagation();
                                        event.dataTransfer.setData('text/plain', item.id);
                                        event.dataTransfer.effectAllowed = 'move';
                                        setDraggingReleaseId(item.id);
                                    }}
                                    onDragEnd={() => {
                                        setDraggingReleaseId(null);
                                        setDragOverDateKey(null);
                                    }}
                                >
                                    <FaCalendarAlt />
                                </button>
                                <button
                                    type="button"
                                    className="btn-icon edit"
                                    onClick={() => navigate(`/admin/albums/${item.id}`)}
                                    title="Editar lanzamiento"
                                >
                                    <FaEdit />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="search-bar glass">
                <FaSearch />
                <input
                    type="text"
                    placeholder="Buscar albumes..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Cargando albumes...</p>
                </div>
            ) : (
                <div className="albums-table-container glass">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Cover</th>
                                <th>Titulo</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                                <th>Canciones</th>
                                <th>Duracion</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {sortedFilteredAlbums.map((album) => {
                                    const status = getAlbumStatus(album);
                                    return (
                                        <motion.tr
                                            key={album.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            layout
                                        >
                                            <td>
                                                <img src={album.coverArt} alt={album.title} className="table-cover" />
                                            </td>
                                            <td className="title-cell">
                                                <strong>{album.title}</strong>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${album.type}`}>
                                                    {album.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`album-workflow-badge ${status}`}>
                                                    {getAlbumStatusLabel(status)}
                                                </span>
                                            </td>
                                            <td>{new Date(album.releaseDate).toLocaleDateString('es-ES')}</td>
                                            <td>{album.tracks.length}</td>
                                            <td>{formatDuration(album.tracks)}</td>
                                            <td className="actions-cell">
                                                <button
                                                    className="btn-icon edit"
                                                    onClick={() => navigate(`/admin/albums/${album.id}`)}
                                                    title="Editar"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    className={`btn-icon duplicate ${duplicatingId === album.id ? 'is-busy' : ''}`}
                                                    onClick={() => void handleDuplicateAlbum(album)}
                                                    title="Duplicar album"
                                                    disabled={duplicatingId === album.id}
                                                >
                                                    <FaCopy />
                                                </button>
                                                <button
                                                    className="btn-icon delete"
                                                    onClick={() => setDeleteConfirm(album.id)}
                                                    title="Eliminar"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>

                    {sortedFilteredAlbums.length === 0 && (
                        <div className="empty-state">
                            <FaCompactDisc className="empty-icon" />
                            <h3>No hay albumes</h3>
                            <p>
                                {searchTerm
                                    ? 'No se encontraron albumes con esa busqueda'
                                    : 'Empieza creando tu primer album'}
                            </p>
                            {!searchTerm && (
                                <Link to="/admin/albums/new" className="btn-add">
                                    <FaPlus /> Crear album
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            className="modal glass-strong"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <h2>Eliminar album?</h2>
                            <p>Esta accion no se puede deshacer. Se eliminaran todas las canciones asociadas.</p>
                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                                    Cancelar
                                </button>
                                <button className="btn-danger" onClick={() => void handleDelete(deleteConfirm)}>
                                    Eliminar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Albums;
