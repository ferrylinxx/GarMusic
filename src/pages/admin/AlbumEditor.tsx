import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    FaArrowLeft,
    FaCalendarAlt,
    FaCloudUploadAlt,
    FaEye,
    FaGripVertical,
    FaImage,
    FaMusic,
    FaPause,
    FaPlus,
    FaSave,
    FaStar,
    FaTags,
    FaTimes,
    FaTrash,
    FaUpload,
    FaPlay,
} from 'react-icons/fa';
import db from '../../services/DatabaseService';
import { Album, Track, TrackCredits } from '../../types/music';
import { saveAlbumPreview } from '../../utils/albumPreview';
import './admin.css';

interface ExtendedAlbum extends Album {
    featured?: boolean;
    tags?: string[];
}

type SortableTrackItemProps = {
    track: Track;
    index: number;
    audioUrl?: string;
    isPlaying: boolean;
    onPlay: () => void;
    onUpdate: (updates: Partial<Track>) => void;
    onRemove: () => void;
    onAudioUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onAudioRemove: () => void;
    onCoverUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    formatDuration: (seconds: number) => string;
    albumCover: string;
};

const splitCreditsList = (value: string): string[] =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const joinCreditsList = (values?: string[]): string => (Array.isArray(values) ? values.join(', ') : '');

const SortableTrackItem = ({
    track,
    index,
    audioUrl,
    isPlaying,
    onPlay,
    onUpdate,
    onRemove,
    onAudioUpload,
    onAudioRemove,
    onCoverUpload,
    formatDuration,
    albumCover,
}: SortableTrackItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
    };

    const displayCover = track.coverArt || albumCover || '/images/default-cover.jpg';

    return (
        <div ref={setNodeRef} style={style} className={`track-item ${isDragging ? 'dragging' : ''}`}>
            <div className="track-handle" {...attributes} {...listeners}>
                <FaGripVertical />
                <span className="track-number">{index + 1}</span>
            </div>

            <div className="track-cover-mini">
                <img src={displayCover} alt={track.title} />
                <label className="cover-upload-overlay" title="Cambiar portada de cancion">
                    <FaImage />
                    <input type="file" accept="image/*" onChange={onCoverUpload} hidden />
                </label>
            </div>

            <div className="track-info">
                <input
                    type="text"
                    value={track.title}
                    onChange={(event) => onUpdate({ title: event.target.value })}
                    placeholder="Titulo de la cancion"
                    className="track-title-input"
                />
                <input
                    type="text"
                    value={track.spotifyUrl || ''}
                    onChange={(event) => onUpdate({ spotifyUrl: event.target.value })}
                    placeholder="URL de Spotify (opcional)"
                    className="track-spotify-input"
                />
                <textarea
                    value={track.description || ''}
                    onChange={(event) => onUpdate({ description: event.target.value })}
                    placeholder="Descripcion de la cancion (se muestra en Ver informacion)"
                    className="track-description-input"
                    rows={2}
                />

                <details className="track-advanced-fields">
                    <summary>Metadatos avanzados</summary>
                    <div className="track-meta-grid">
                        <input
                            type="text"
                            value={joinCreditsList(track.credits?.composers)}
                            onChange={(event) =>
                                onUpdate({
                                    credits: {
                                        ...(track.credits || {}),
                                        composers: splitCreditsList(event.target.value),
                                    },
                                })
                            }
                            placeholder="Compositores (separados por coma)"
                        />
                        <input
                            type="text"
                            value={joinCreditsList(track.credits?.producers)}
                            onChange={(event) =>
                                onUpdate({
                                    credits: {
                                        ...(track.credits || {}),
                                        producers: splitCreditsList(event.target.value),
                                    },
                                })
                            }
                            placeholder="Productores (separados por coma)"
                        />
                        <input
                            type="text"
                            value={joinCreditsList(track.credits?.mixingEngineers)}
                            onChange={(event) =>
                                onUpdate({
                                    credits: {
                                        ...(track.credits || {}),
                                        mixingEngineers: splitCreditsList(event.target.value),
                                    },
                                })
                            }
                            placeholder="Ingenieria de mezcla"
                        />
                        <input
                            type="text"
                            value={track.metadata?.genre || ''}
                            onChange={(event) =>
                                onUpdate({
                                    metadata: {
                                        ...(track.metadata || {}),
                                        genre: event.target.value,
                                    },
                                })
                            }
                            placeholder="Genero"
                        />
                        <input
                            type="text"
                            value={track.metadata?.language || ''}
                            onChange={(event) =>
                                onUpdate({
                                    metadata: {
                                        ...(track.metadata || {}),
                                        language: event.target.value,
                                    },
                                })
                            }
                            placeholder="Idioma"
                        />
                        <input
                            type="text"
                            value={track.metadata?.musicalKey || ''}
                            onChange={(event) =>
                                onUpdate({
                                    metadata: {
                                        ...(track.metadata || {}),
                                        musicalKey: event.target.value,
                                    },
                                })
                            }
                            placeholder="Tonalidad (ej. C#m)"
                        />
                        <input
                            type="text"
                            value={joinCreditsList(track.credits?.musicians)}
                            onChange={(event) =>
                                onUpdate({
                                    credits: {
                                        ...(track.credits || {}),
                                        musicians: splitCreditsList(event.target.value),
                                    },
                                })
                            }
                            placeholder="Musicos (separados por coma)"
                        />
                        <textarea
                            value={track.lyrics || ''}
                            onChange={(event) => onUpdate({ lyrics: event.target.value })}
                            placeholder="Letra (opcional). Soporta formato LRC: [00:12.30] Tu linea..."
                            rows={5}
                            className="track-lyrics-input"
                        />
                    </div>
                </details>
            </div>

            <div className="track-audio">
                <div className="track-audio-actions">
                    <label className={`btn-upload-audio ${audioUrl ? 'is-replace' : ''}`}>
                        <FaUpload /> {audioUrl ? 'Cambiar audio' : 'Subir audio'}
                        <input
                            type="file"
                            accept=".mp3,.m4a,.aac,.wav,.ogg,.oga,.flac,.opus,audio/*,video/mp4"
                            onChange={onAudioUpload}
                            hidden
                        />
                    </label>
                    {audioUrl && (
                        <button
                            type="button"
                            className="btn-remove-audio"
                            onClick={onAudioRemove}
                            title="Quitar audio"
                        >
                            <FaTimes />
                        </button>
                    )}
                    {audioUrl && (
                        <button
                            type="button"
                            className="btn-play"
                            onClick={onPlay}
                            title={isPlaying ? 'Pausar' : 'Previsualizar'}
                        >
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </button>
                    )}
                </div>
            </div>

            <div className="track-duration">{track.duration > 0 ? formatDuration(track.duration) : '--:--'}</div>

            <button type="button" className="btn-remove-track" onClick={onRemove}>
                <FaTrash />
            </button>
        </div>
    );
};

const createEmptyTrack = (title: string, id?: string): Track => ({
    id: id || `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    duration: 0,
    audioFile: '',
    description: '',
    credits: {},
    metadata: {},
});

const sanitizeTrackCredits = (credits?: TrackCredits): TrackCredits | undefined => {
    if (!credits) return undefined;
    const next: TrackCredits = {};
    const assignIfPresent = (key: keyof TrackCredits, values?: string[]) => {
        if (!Array.isArray(values)) return;
        const normalized = values.map((value) => value.trim()).filter(Boolean);
        if (normalized.length > 0) {
            next[key] = normalized;
        }
    };
    assignIfPresent('composers', credits.composers);
    assignIfPresent('producers', credits.producers);
    assignIfPresent('musicians', credits.musicians);
    assignIfPresent('mixingEngineers', credits.mixingEngineers);
    return Object.keys(next).length > 0 ? next : undefined;
};

const sanitizeTrack = (track: Track): Track => {
    const metadata = track.metadata
        ? {
            ...track.metadata,
            genre: track.metadata.genre?.trim() || undefined,
            language: track.metadata.language?.trim() || undefined,
            musicalKey: track.metadata.musicalKey?.trim() || undefined,
        }
        : undefined;

    const cleanedMetadata =
        metadata && Object.values(metadata).some((value) => value !== undefined && value !== '')
            ? metadata
            : undefined;

    return {
        ...track,
        title: track.title.trim(),
        description: track.description?.trim() || '',
        credits: sanitizeTrackCredits(track.credits),
        metadata: cleanedMetadata,
    };
};

const createInitialAlbum = (): ExtendedAlbum => ({
    id: `album-${Date.now()}`,
    title: '',
    type: 'album',
    releaseDate: new Date().toISOString().split('T')[0],
    workflowStatus: 'draft',
    publishAt: '',
    coverArt: '/images/albums/default.svg',
    description: '',
    tracks: [],
    releaseAutomation: {
        autoFeatureOnRelease: false,
        autoPopupOnRelease: false,
        popupTitle: '',
        popupDescription: '',
        popupLinkText: '',
    },
    featured: false,
    tags: [],
});

const isGenericTrackTitle = (title?: string): boolean => {
    const normalized = (title || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    return normalized === '' || /^nueva cancion(?:\s+\d+)?$/i.test(normalized);
};

const toDatetimeLocalValue = (isoDateTime?: string): string => {
    if (!isoDateTime) return '';
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromDatetimeLocalValue = (localValue: string): string => {
    if (!localValue) return '';
    const date = new Date(localValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
};

const openNativePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
    }
    input.focus();
};

const isValidDuration = (value: number): boolean => Number.isFinite(value) && value > 0;

const probeAudioDuration = (sourceUrl: string, timeoutMs = 14000): Promise<number> =>
    new Promise((resolve) => {
        const probe = document.createElement('audio');
        let settled = false;
        let timeoutId: number | undefined;

        const finalize = (duration: number) => {
            if (settled) return;
            settled = true;
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            probe.removeEventListener('loadedmetadata', handleDuration);
            probe.removeEventListener('durationchange', handleDuration);
            probe.removeEventListener('timeupdate', handleDuration);
            probe.removeEventListener('error', handleError);
            try {
                probe.pause();
            } catch {
                // ignore
            }
            probe.removeAttribute('src');
            try {
                probe.load();
            } catch {
                // ignore
            }
            resolve(isValidDuration(duration) ? duration : 0);
        };

        const handleDuration = () => {
            if (isValidDuration(probe.duration)) {
                finalize(probe.duration);
                return;
            }

            if (probe.duration === Number.POSITIVE_INFINITY) {
                try {
                    probe.currentTime = Number.MAX_SAFE_INTEGER;
                } catch {
                    // ignore seek issues
                }
            }
        };

        const handleError = () => finalize(0);

        timeoutId = window.setTimeout(() => finalize(0), timeoutMs);

        probe.preload = 'metadata';
        probe.muted = true;
        probe.addEventListener('loadedmetadata', handleDuration);
        probe.addEventListener('durationchange', handleDuration);
        probe.addEventListener('timeupdate', handleDuration);
        probe.addEventListener('error', handleError);
        probe.src = sourceUrl;
        probe.load();
    });

const decodeAudioDurationFromFile = async (file: File): Promise<number> => {
    if (typeof window === 'undefined') return 0;
    const contextFactory =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!contextFactory) return 0;

    const context = new contextFactory();
    try {
        const buffer = await file.arrayBuffer();
        const decoded = await context.decodeAudioData(buffer.slice(0));
        return isValidDuration(decoded.duration) ? decoded.duration : 0;
    } catch {
        return 0;
    } finally {
        void context.close();
    }
};

const getUploadedAudioDuration = async (sourceUrl: string, file: File): Promise<number> => {
    const fromSource = await probeAudioDuration(sourceUrl);
    if (isValidDuration(fromSource)) return fromSource;

    const localUrl = URL.createObjectURL(file);
    try {
        const fromLocalBlob = await probeAudioDuration(localUrl);
        if (isValidDuration(fromLocalBlob)) return fromLocalBlob;
    } finally {
        URL.revokeObjectURL(localUrl);
    }

    const fromDecode = await decodeAudioDurationFromFile(file);
    if (isValidDuration(fromDecode)) return fromDecode;

    return 0;
};

const AlbumEditor = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bulkAudioInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const releaseDateInputRef = useRef<HTMLInputElement>(null);
    const publishAtInputRef = useRef<HTMLInputElement>(null);
    const initialAlbumRef = useRef<ExtendedAlbum>(createInitialAlbum());

    const [album, setAlbum] = useState<ExtendedAlbum>(initialAlbumRef.current);
    const [isSaving, setIsSaving] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
    const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
    const [newTag, setNewTag] = useState('');
    const [isAudioDropActive, setIsAudioDropActive] = useState(false);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [bulkUploadSummary, setBulkUploadSummary] = useState('');
    const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(initialAlbumRef.current));

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (!isNew && id) {
            void loadAlbum(id);
        }
    }, [id, isNew]);

    const loadAlbum = async (albumId: string) => {
        try {
            const data = await db.getAlbum(albumId, true);
            if (!data) {
                navigate('/admin/albums');
                return;
            }

            const normalizedAlbum: ExtendedAlbum = {
                ...data,
                workflowStatus: data.workflowStatus || 'published',
                featured: (data as ExtendedAlbum).featured || false,
                tags: (data as ExtendedAlbum).tags || [],
                releaseAutomation: {
                    autoFeatureOnRelease: false,
                    autoPopupOnRelease: false,
                    popupTitle: '',
                    popupDescription: '',
                    popupLinkText: '',
                    ...(data.releaseAutomation || {}),
                },
            };
            setAlbum(normalizedAlbum);
            setSavedSnapshot(JSON.stringify(normalizedAlbum));

            const urls: Record<string, string> = {};
            for (const track of data.tracks) {
                const url = db.getImmediateAudioUrl(track.id, track.audioFile) || (await db.getAudioFileUrl(track.id));
                if (url) urls[track.id] = url;
            }
            setAudioUrls(urls);
        } catch (error) {
            console.error('Error loading album:', error);
            alert('No se pudo cargar el album');
            navigate('/admin/albums');
        }
    };

    const saveAlbumWithStatus = async (workflowStatus: 'draft' | 'published') => {
        if (!album.title.trim()) return;
        setIsSaving(true);
        try {
            const publishAtTimestamp = album.publishAt ? Date.parse(album.publishAt) : NaN;
            const normalizedPublishAt = Number.isFinite(publishAtTimestamp)
                ? new Date(publishAtTimestamp).toISOString()
                : '';
            const automation = {
                autoFeatureOnRelease: Boolean(album.releaseAutomation?.autoFeatureOnRelease),
                autoPopupOnRelease: Boolean(album.releaseAutomation?.autoPopupOnRelease),
                popupTitle: album.releaseAutomation?.popupTitle?.trim() || '',
                popupDescription: album.releaseAutomation?.popupDescription?.trim() || '',
                popupLinkText: album.releaseAutomation?.popupLinkText?.trim() || '',
                processedAt: album.releaseAutomation?.processedAt,
            };

            if (!normalizedPublishAt || Date.parse(normalizedPublishAt) > Date.now()) {
                delete automation.processedAt;
            }

            const albumToSave: ExtendedAlbum = {
                ...album,
                publishAt: normalizedPublishAt,
                workflowStatus,
                releaseAutomation: automation,
                tracks: album.tracks.map((track) => sanitizeTrack(track)),
            };

            await db.saveAlbum(albumToSave);
            setSavedSnapshot(JSON.stringify(albumToSave));
            navigate('/admin/albums');
        } catch (error) {
            console.error('Error saving album:', error);
            alert('No se pudo guardar el album');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        await saveAlbumWithStatus('published');
    };

    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const imageUrl = await db.uploadImageFile(file, 'albums');
            setCoverPreview(imageUrl);
            setAlbum((previous) => ({ ...previous, coverArt: imageUrl }));
        } catch (error) {
            console.error('Error uploading album cover:', error);
            alert('No se pudo subir la portada del album');
        }
    };

    const uploadAudioForTrack = async (
        trackId: string,
        file: File,
        options: { silent?: boolean } = {}
    ): Promise<boolean> => {
        try {
            await db.saveAudioFile(trackId, file);
            const persistedUrl = db.getTrackStreamUrl(trackId);
            const fallbackLocalUrl = URL.createObjectURL(file);
            const resolvedUrl = persistedUrl || fallbackLocalUrl;

            setAudioUrls((previous) => {
                const previousUrl = previous[trackId];
                if (previousUrl && previousUrl.startsWith('blob:') && previousUrl !== resolvedUrl) {
                    URL.revokeObjectURL(previousUrl);
                }
                return { ...previous, [trackId]: resolvedUrl };
            });
            setAlbum((previous) => ({
                ...previous,
                tracks: previous.tracks.map((track) =>
                    track.id === trackId ? { ...track, audioFile: `db:${trackId}`, duration: 0 } : track
                ),
            }));

            const duration = Math.round(await getUploadedAudioDuration(resolvedUrl, file));
            if (duration > 0) {
                setAlbum((previous) => ({
                    ...previous,
                    tracks: previous.tracks.map((track) =>
                        track.id === trackId ? { ...track, duration, audioFile: `db:${trackId}` } : track
                    ),
                }));
            }

            if (resolvedUrl === fallbackLocalUrl && persistedUrl) {
                URL.revokeObjectURL(fallbackLocalUrl);
            }
            return true;
        } catch (error) {
            console.error('Error uploading track audio:', error);
            if (!options.silent) {
                alert('No se pudo subir el audio');
            }
            return false;
        }
    };

    const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>, trackId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const inferredTitle = file.name
            .replace(/\.[^.]+$/, '')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (inferredTitle) {
            setAlbum((previous) => ({
                ...previous,
                tracks: previous.tracks.map((track) => {
                    if (track.id !== trackId) return track;
                    if (!isGenericTrackTitle(track.title)) return track;
                    return { ...track, title: inferredTitle };
                }),
            }));
        }

        await uploadAudioForTrack(trackId, file);
        event.target.value = '';
    };

    const normalizeName = (value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();

    const stripExtension = (fileName: string) => fileName.replace(/\.[^.]+$/, '');

    const titleFromFileName = (fileName: string): string =>
        stripExtension(fileName)
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const resolveTrackForFile = (file: File, usedTrackIds: Set<string>, candidateTracks: Track[]): string | null => {
        const baseName = normalizeName(stripExtension(file.name));
        const availableTracks = candidateTracks.filter((track) => !usedTrackIds.has(track.id));

        const exact = availableTracks.find((track) => normalizeName(track.title) === baseName);
        if (exact) return exact.id;

        const contains = availableTracks.find((track) => {
            const title = normalizeName(track.title);
            return baseName.includes(title) || title.includes(baseName);
        });
        if (contains) return contains.id;

        return null;
    };

    const handleBulkAudioFiles = async (files: File[]) => {
        if (files.length === 0) return;

        setIsBulkUploading(true);
        setBulkUploadSummary('');

        try {
            const audioFiles = files.filter((file) => {
                const mime = (file.type || '').toLowerCase();
                return (
                    mime.startsWith('audio/') ||
                    mime === 'video/mp4' ||
                    /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus|webm)$/i.test(file.name)
                );
            });

            if (audioFiles.length === 0) {
                setBulkUploadSummary('No se detectaron archivos de audio validos.');
                return;
            }

            let workingTracks = [...album.tracks];
            const createdTracks: Track[] = [];

            if (workingTracks.length === 0) {
                const generatedTracks = audioFiles.map((file, index) =>
                    createEmptyTrack(titleFromFileName(file.name) || `Nueva cancion ${index + 1}`)
                );

                createdTracks.push(...generatedTracks);
                workingTracks = [...workingTracks, ...generatedTracks];
            }

            const usedTrackIds = new Set<string>();
            const assignments: Array<{ trackId: string; file: File }> = [];
            const unassignedFiles: File[] = [];

            for (const file of audioFiles) {
                const matchedTrackId = resolveTrackForFile(file, usedTrackIds, workingTracks);
                if (matchedTrackId) {
                    assignments.push({ trackId: matchedTrackId, file });
                    usedTrackIds.add(matchedTrackId);
                } else {
                    unassignedFiles.push(file);
                }
            }

            const tracksWithoutAudio = workingTracks.filter((track) => {
                if (usedTrackIds.has(track.id)) return false;
                if (audioUrls[track.id]) return false;
                return !track.audioFile || !track.audioFile.trim();
            });

            for (let index = 0; index < unassignedFiles.length && index < tracksWithoutAudio.length; index += 1) {
                assignments.push({
                    trackId: tracksWithoutAudio[index].id,
                    file: unassignedFiles[index],
                });
                usedTrackIds.add(tracksWithoutAudio[index].id);
            }

            const leftoverFiles = unassignedFiles.slice(tracksWithoutAudio.length);
            if (leftoverFiles.length > 0) {
                const extraTracks = leftoverFiles.map((file, index) =>
                    createEmptyTrack(titleFromFileName(file.name) || `Nueva cancion ${workingTracks.length + index + 1}`)
                );

                createdTracks.push(...extraTracks);
                workingTracks = [...workingTracks, ...extraTracks];
                extraTracks.forEach((track, index) => {
                    assignments.push({
                        trackId: track.id,
                        file: leftoverFiles[index],
                    });
                });
            }

            if (createdTracks.length > 0) {
                setAlbum((previous) => ({
                    ...previous,
                    tracks: [...previous.tracks, ...createdTracks],
                }));
            }

            let uploaded = 0;
            let failed = 0;
            for (const assignment of assignments) {
                const success = await uploadAudioForTrack(assignment.trackId, assignment.file, { silent: true });
                if (success) {
                    uploaded += 1;
                } else {
                    failed += 1;
                }
            }

            const skipped = Math.max(audioFiles.length - assignments.length, 0);
            const createdLabel =
                createdTracks.length > 0 ? `, ${createdTracks.length} pistas creadas automaticamente` : '';
            const failedLabel = failed > 0 ? `, ${failed} con error` : '';
            const skippedLabel = skipped > 0 ? `, ${skipped} sin asignar` : '';
            setBulkUploadSummary(
                `Carga completada: ${uploaded} audios subidos${createdLabel}${failedLabel}${skippedLabel}.`
            );
        } finally {
            setIsBulkUploading(false);
        }
    };

    const handleTrackCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>, trackId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const imageUrl = await db.uploadImageFile(file, 'tracks');
            setAlbum((previous) => ({
                ...previous,
                tracks: previous.tracks.map((track) =>
                    track.id === trackId ? { ...track, coverArt: imageUrl } : track
                ),
            }));
        } catch (error) {
            console.error('Error uploading track cover:', error);
            alert('No se pudo subir la portada de la cancion');
        }
    };

    const addTrack = () => {
        const newTrack = createEmptyTrack(`Nueva cancion ${album.tracks.length + 1}`);
        setAlbum((previous) => ({ ...previous, tracks: [...previous.tracks, newTrack] }));
    };

    const updateTrack = (trackId: string, updates: Partial<Track>) => {
        setAlbum((previous) => ({
            ...previous,
            tracks: previous.tracks.map((track) => (track.id === trackId ? { ...track, ...updates } : track)),
        }));
    };

    const removeTrackAudio = async (trackId: string) => {
        try {
            await db.deleteAudioFile(trackId);
        } catch (error) {
            console.error('Error deleting track audio:', error);
        }

        if (playingTrackId === trackId) {
            audioRef.current?.pause();
            setPlayingTrackId(null);
        }

        setAudioUrls((previous) => {
            const next = { ...previous };
            const previousUrl = next[trackId];
            if (previousUrl && previousUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previousUrl);
            }
            delete next[trackId];
            return next;
        });

        setAlbum((previous) => ({
            ...previous,
            tracks: previous.tracks.map((track) =>
                track.id === trackId
                    ? {
                          ...track,
                          audioFile: '',
                          duration: 0,
                      }
                    : track
            ),
        }));
    };

    const removeTrack = async (trackId: string) => {
        await removeTrackAudio(trackId);
        setAlbum((previous) => ({
            ...previous,
            tracks: previous.tracks.filter((track) => track.id !== trackId),
        }));
    };

    const playTrack = async (trackId: string) => {
        if (playingTrackId === trackId) {
            audioRef.current?.pause();
            setPlayingTrackId(null);
            return;
        }

        const fromCache = audioUrls[trackId];
        const track = album.tracks.find((item) => item.id === trackId);
        const fromDb = fromCache || db.getImmediateAudioUrl(trackId, track?.audioFile) || (await db.getAudioFileUrl(trackId));
        if (!fromDb || !audioRef.current) return;

        if (!fromCache) {
            setAudioUrls((previous) => ({ ...previous, [trackId]: fromDb }));
        }

        audioRef.current.src = fromDb;
        await audioRef.current.play();
        setPlayingTrackId(trackId);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = album.tracks.findIndex((track) => track.id === active.id);
        const newIndex = album.tracks.findIndex((track) => track.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        setAlbum((previous) => ({
            ...previous,
            tracks: arrayMove(previous.tracks, oldIndex, newIndex),
        }));
    };

    const addTag = () => {
        const normalized = newTag.trim();
        if (!normalized) return;
        if (album.tags?.includes(normalized)) return;

        setAlbum((previous) => ({
            ...previous,
            tags: [...(previous.tags || []), normalized],
        }));
        setNewTag('');
    };

    const removeTag = (tag: string) => {
        setAlbum((previous) => ({
            ...previous,
            tags: (previous.tags || []).filter((item) => item !== tag),
        }));
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePreview = () => {
        saveAlbumPreview({
            ...album,
            tracks: album.tracks.map((track) => sanitizeTrack(track)),
        });
        window.open(`/musica/album/${encodeURIComponent(album.id)}?preview=1`, '_blank', 'noopener,noreferrer');
    };

    const setAlbumType = (type: Album['type']) => {
        setAlbum((previous) => ({ ...previous, type }));
    };

    const totalDurationSeconds = useMemo(
        () => album.tracks.reduce((acc, track) => acc + (track.duration || 0), 0),
        [album.tracks]
    );

    const tracksWithAudio = useMemo(
        () =>
            album.tracks.filter((track) => {
                if (audioUrls[track.id]) return true;
                return Boolean(track.audioFile && track.audioFile.trim());
            }).length,
        [album.tracks, audioUrls]
    );

    const albumTitlePreview = album.title.trim() || 'Nuevo lanzamiento';
    const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : '----';
    const descriptionLength = (album.description || '').trim().length;
    const publishAtMs = album.publishAt ? Date.parse(album.publishAt) : NaN;
    const isScheduled = Number.isFinite(publishAtMs) && publishAtMs > Date.now();
    const isDraft = (album.workflowStatus || 'published') === 'draft';
    const publishStatusLabel = isDraft
        ? 'Estado: borrador'
        : isScheduled
        ? `Programado: ${new Date(album.publishAt || '').toLocaleString('es-ES')}`
        : 'Publicado y visible';
    const hasScheduledPublishAt = Boolean(album.publishAt);
    const hasUnsavedChanges = useMemo(
        () => JSON.stringify(album) !== savedSnapshot,
        [album, savedSnapshot]
    );

    return (
        <motion.div className="admin-page album-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} />

            <div className="page-header">
                <button className="btn-back" onClick={() => navigate('/admin/albums')}>
                    <FaArrowLeft /> Volver
                </button>
                <h1>{isNew ? 'Nuevo album' : 'Editar album'}</h1>
                <div className="album-editor-header-actions">
                    <button type="button" className="btn-preview" onClick={handlePreview}>
                        <FaEye /> Vista previa
                    </button>
                    <span className={`album-dirty-indicator ${hasUnsavedChanges ? 'dirty' : 'clean'}`}>
                        {hasUnsavedChanges ? 'Cambios sin guardar' : 'Todo guardado'}
                    </span>
                </div>
            </div>

            <section className="album-editor-summary glass-strong">
                <div className="album-summary-head">
                    <div className="album-summary-cover">
                        <img src={coverPreview || album.coverArt} alt={albumTitlePreview} />
                    </div>
                    <div className="album-summary-meta">
                        <p className="album-summary-kicker">{album.type.toUpperCase()} - {releaseYear}</p>
                        <h2>{albumTitlePreview}</h2>
                        <p className="album-summary-schedule">{publishStatusLabel}</p>
                        <p className="album-summary-description">
                            {album.description?.trim() || 'Construye un lanzamiento con identidad: concepto, tono y narrativa.'}
                        </p>
                        <div className="album-type-pills">
                            <button type="button" className={album.type === 'album' ? 'active' : ''} onClick={() => setAlbumType('album')}>Album</button>
                            <button type="button" className={album.type === 'single' ? 'active' : ''} onClick={() => setAlbumType('single')}>Single</button>
                            <button type="button" className={album.type === 'ep' ? 'active' : ''} onClick={() => setAlbumType('ep')}>EP</button>
                        </div>
                    </div>
                </div>
                <div className="album-summary-kpis">
                    <div className="album-kpi"><span className="label">Canciones</span><strong>{album.tracks.length}</strong></div>
                    <div className="album-kpi"><span className="label">Con audio</span><strong>{tracksWithAudio}</strong></div>
                    <div className="album-kpi"><span className="label">Pendientes</span><strong>{Math.max(album.tracks.length - tracksWithAudio, 0)}</strong></div>
                    <div className="album-kpi"><span className="label">Duracion</span><strong>{formatDuration(totalDurationSeconds)}</strong></div>
                    <div className="album-kpi"><span className="label">Descripcion</span><strong>{descriptionLength} car.</strong></div>
                </div>
            </section>

            <form onSubmit={handleSubmit} className="editor-form">
                <div className="editor-grid">
                    <div className="cover-section glass">
                        <div className="cover-upload" onClick={() => fileInputRef.current?.click()}>
                            <img src={coverPreview || album.coverArt} alt="Cover" className="cover-preview" />
                            <div className="cover-overlay">
                                <FaUpload />
                                <span>Cambiar portada</span>
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverUpload} hidden />

                        <div className="featured-toggle">
                            <label className={`toggle-label ${album.featured ? 'active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={album.featured || false}
                                    onChange={(event) => setAlbum((previous) => ({ ...previous, featured: event.target.checked }))}
                                />
                                <FaStar /> Album destacado
                            </label>
                            <p className="toggle-hint">
                                Los albumes destacados se priorizan en la portada.
                            </p>
                        </div>
                    </div>

                    <div className="details-section glass">
                        <div className="form-group">
                            <label htmlFor="title">Titulo del album</label>
                            <input
                                type="text"
                                id="title"
                                value={album.title}
                                onChange={(event) => setAlbum((previous) => ({ ...previous, title: event.target.value }))}
                                placeholder="Nombre del album"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="type">Tipo</label>
                                <select
                                    id="type"
                                    value={album.type}
                                    onChange={(event) => setAlbum((previous) => ({ ...previous, type: event.target.value as Album['type'] }))}
                                >
                                    <option value="album">Album</option>
                                    <option value="single">Single</option>
                                    <option value="ep">EP</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="releaseDate">Fecha de lanzamiento y publicacion</label>
                                <div className="date-input-with-button">
                                    <input
                                        ref={releaseDateInputRef}
                                        type="date"
                                        id="releaseDate"
                                        value={album.releaseDate}
                                        onChange={(event) => setAlbum((previous) => ({ ...previous, releaseDate: event.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        className="btn-date-picker"
                                        onClick={() => openNativePicker(releaseDateInputRef.current)}
                                        aria-label="Abrir calendario de fecha de lanzamiento"
                                    >
                                        <FaCalendarAlt />
                                    </button>
                                </div>

                                <div className="publish-mode-toggle">
                                    <button
                                        type="button"
                                        className={!hasScheduledPublishAt ? 'active' : ''}
                                        onClick={() =>
                                            setAlbum((previous) => ({
                                                ...previous,
                                                publishAt: '',
                                                releaseAutomation: {
                                                    ...(previous.releaseAutomation || {}),
                                                    processedAt: undefined,
                                                },
                                            }))
                                        }
                                    >
                                        Publicar ahora
                                    </button>
                                    <button
                                        type="button"
                                        className={hasScheduledPublishAt ? 'active' : ''}
                                        onClick={() =>
                                            setAlbum((previous) => ({
                                                ...previous,
                                                publishAt:
                                                    previous.publishAt ||
                                                    new Date(`${previous.releaseDate || new Date().toISOString().slice(0, 10)}T12:00:00`).toISOString(),
                                                releaseAutomation: {
                                                    ...(previous.releaseAutomation || {}),
                                                    processedAt: undefined,
                                                },
                                            }))
                                        }
                                    >
                                        Programar publicacion
                                    </button>
                                </div>

                                {hasScheduledPublishAt && (
                                    <>
                                        <div className="date-input-with-button">
                                            <input
                                                ref={publishAtInputRef}
                                                type="datetime-local"
                                                id="publishAt"
                                                value={toDatetimeLocalValue(album.publishAt)}
                                                onChange={(event) =>
                                                    setAlbum((previous) => ({
                                                        ...previous,
                                                        publishAt: fromDatetimeLocalValue(event.target.value),
                                                        releaseAutomation: {
                                                            ...(previous.releaseAutomation || {}),
                                                            processedAt: undefined,
                                                        },
                                                    }))
                                                }
                                            />
                                            <button
                                                type="button"
                                                className="btn-date-picker"
                                                onClick={() => openNativePicker(publishAtInputRef.current)}
                                                aria-label="Abrir calendario y hora de publicacion"
                                            >
                                                <FaCalendarAlt />
                                            </button>
                                        </div>
                                        <small className="field-helper">
                                            El album se publicara automaticamente en esa fecha y hora.
                                        </small>
                                    </>
                                )}
                                {!hasScheduledPublishAt && (
                                    <small className="field-helper">
                                        Publicacion inmediata: el album queda visible en cuanto guardes.
                                    </small>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Descripcion</label>
                            <textarea
                                id="description"
                                value={album.description || ''}
                                onChange={(event) => setAlbum((previous) => ({ ...previous, description: event.target.value }))}
                                placeholder="Describe el sonido, contexto y objetivo del lanzamiento..."
                                rows={5}
                            />
                            <small className="field-helper">
                                Consejo: explica propuesta artistica, referencia sonora y energia del proyecto.
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Automatizacion al publicarse</label>
                            <div className="release-automation-grid">
                                <label className={`toggle-label ${album.releaseAutomation?.autoFeatureOnRelease ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(album.releaseAutomation?.autoFeatureOnRelease)}
                                        onChange={(event) =>
                                            setAlbum((previous) => ({
                                                ...previous,
                                                releaseAutomation: {
                                                    ...(previous.releaseAutomation || {}),
                                                    autoFeatureOnRelease: event.target.checked,
                                                },
                                            }))
                                        }
                                    />
                                    <FaStar /> Poner como album destacado al publicarse
                                </label>
                                <label className={`toggle-label ${album.releaseAutomation?.autoPopupOnRelease ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(album.releaseAutomation?.autoPopupOnRelease)}
                                        onChange={(event) =>
                                            setAlbum((previous) => ({
                                                ...previous,
                                                releaseAutomation: {
                                                    ...(previous.releaseAutomation || {}),
                                                    autoPopupOnRelease: event.target.checked,
                                                },
                                            }))
                                        }
                                    />
                                    <FaUpload /> Lanzar popup automatico
                                </label>
                            </div>
                        </div>

                        {album.releaseAutomation?.autoPopupOnRelease && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="releasePopupTitle">Titulo popup lanzamiento</label>
                                    <input
                                        type="text"
                                        id="releasePopupTitle"
                                        value={album.releaseAutomation?.popupTitle || ''}
                                        onChange={(event) =>
                                            setAlbum((previous) => ({
                                                ...previous,
                                                releaseAutomation: {
                                                    ...(previous.releaseAutomation || {}),
                                                    popupTitle: event.target.value,
                                                },
                                            }))
                                        }
                                        placeholder={`Nuevo lanzamiento: ${album.title || 'Mi album'}`}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="releasePopupDescription">Descripcion popup lanzamiento</label>
                                    <textarea
                                        id="releasePopupDescription"
                                        value={album.releaseAutomation?.popupDescription || ''}
                                        onChange={(event) =>
                                            setAlbum((previous) => ({
                                                ...previous,
                                                releaseAutomation: {
                                                    ...(previous.releaseAutomation || {}),
                                                    popupDescription: event.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="Disponible ahora en la discografia oficial."
                                        rows={3}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="releasePopupCta">Texto boton popup</label>
                                    <input
                                        type="text"
                                        id="releasePopupCta"
                                        value={album.releaseAutomation?.popupLinkText || ''}
                                        onChange={(event) =>
                                            setAlbum((previous) => ({
                                                ...previous,
                                                releaseAutomation: {
                                                    ...(previous.releaseAutomation || {}),
                                                    popupLinkText: event.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="Escuchar ahora"
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label><FaTags /> Etiquetas / generos</label>
                            <div className="tags-container">
                                {album.tags?.map((tag) => (
                                    <span key={tag} className="tag">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)}>
                                            <FaTimes />
                                        </button>
                                    </span>
                                ))}
                                <div className="add-tag-input">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(event) => setNewTag(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                addTag();
                                            }
                                        }}
                                        placeholder="Anadir etiqueta..."
                                    />
                                    <button type="button" onClick={addTag}>
                                        <FaPlus />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="tracks-section glass">
                    <div className="section-header">
                        <div className="section-header-copy">
                            <h2><FaMusic /> Canciones ({album.tracks.length})</h2>
                            <p>
                                Duracion total: <strong>{formatDuration(totalDurationSeconds)}</strong> -
                                Audios cargados: <strong>{tracksWithAudio}</strong>
                            </p>
                        </div>
                        <button type="button" className="btn-add-track" onClick={addTrack}>
                            <FaPlus /> Anadir cancion
                        </button>
                    </div>

                    <div
                        className={`audio-dropzone ${isAudioDropActive ? 'active' : ''}`}
                        onDragOver={(event) => {
                            event.preventDefault();
                            setIsAudioDropActive(true);
                        }}
                        onDragLeave={(event) => {
                            event.preventDefault();
                            setIsAudioDropActive(false);
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            setIsAudioDropActive(false);
                            const droppedFiles = Array.from(event.dataTransfer.files || []);
                            void handleBulkAudioFiles(droppedFiles);
                        }}
                    >
                        <FaCloudUploadAlt />
                        <div>
                            <strong>Subida multiple de audios (drag & drop)</strong>
                            <p>Arrastra varios archivos o selecciona en lote. Se asignan por nombre de pista o por pistas vacias.</p>
                        </div>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => bulkAudioInputRef.current?.click()}
                            disabled={isBulkUploading}
                        >
                            {isBulkUploading ? 'Subiendo...' : 'Seleccionar archivos'}
                        </button>
                        <input
                            ref={bulkAudioInputRef}
                            type="file"
                            accept=".mp3,.m4a,.aac,.wav,.ogg,.oga,.flac,.opus,audio/*,video/mp4"
                            multiple
                            hidden
                            onChange={(event) => {
                                const selectedFiles = Array.from(event.target.files || []);
                                void handleBulkAudioFiles(selectedFiles);
                                event.target.value = '';
                            }}
                        />
                    </div>

                    {bulkUploadSummary && (
                        <p className="bulk-upload-summary">{bulkUploadSummary}</p>
                    )}

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={album.tracks.map((track) => track.id)} strategy={verticalListSortingStrategy}>
                            <div className="tracks-list">
                                {album.tracks.map((track, index) => (
                                    <SortableTrackItem
                                        key={track.id}
                                        track={track}
                                        index={index}
                                        audioUrl={audioUrls[track.id]}
                                        isPlaying={playingTrackId === track.id}
                                        onPlay={() => void playTrack(track.id)}
                                        onUpdate={(updates) => updateTrack(track.id, updates)}
                                        onRemove={() => void removeTrack(track.id)}
                                        onAudioUpload={(event) => void handleAudioUpload(event, track.id)}
                                        onAudioRemove={() => void removeTrackAudio(track.id)}
                                        onCoverUpload={(event) => void handleTrackCoverUpload(event, track.id)}
                                        formatDuration={formatDuration}
                                        albumCover={album.coverArt}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {album.tracks.length === 0 && (
                        <div className="empty-tracks">
                            <FaMusic />
                            <p>No hay canciones todavia. Usa "Anadir cancion" para empezar.</p>
                        </div>
                    )}

                    <p className="drag-hint">
                        <FaGripVertical /> Arrastra para reordenar la secuencia del album.
                    </p>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => navigate('/admin/albums')}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-secondary"
                        disabled={isSaving || !album.title.trim()}
                        onClick={() => void saveAlbumWithStatus('draft')}
                    >
                        {isSaving ? <span className="loading-spinner-small"></span> : <>Guardar borrador</>}
                    </button>
                    <button type="submit" className="btn-save" disabled={isSaving || !album.title.trim()}>
                        {isSaving ? <span className="loading-spinner-small"></span> : <><FaSave /> Publicar</>}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default AlbumEditor;

