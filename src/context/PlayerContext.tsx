import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Howl } from 'howler';
import type { Album, PlayerState, Track } from '../types/music';
import { useAuth } from './AuthContext';
import { useDiscography } from './DiscographyContext';
import db from '../services/DatabaseService';
import statsService from '../services/StatsService';
import { trackEvent } from '../utils/analytics';
import { primeMediaPlayback } from '../utils/mediaUnlock';

interface PlayerContextType extends PlayerState {
    favoriteTrackIds: string[];
    recentTrackIds: string[];
    playbackError: string | null;
    playTrack: (track: Track, album?: Album) => void;
    prepareTrackPlayback: (track: Track) => void;
    playAlbum: (album: Album) => void;
    pauseTrack: () => void;
    togglePlay: () => void;
    nextTrack: () => void;
    previousTrack: () => void;
    seekTo: (time: number) => void;
    setVolume: (volume: number) => void;
    addToQueue: (track: Track) => void;
    removeFromQueue: (trackId: string, queueIndex?: number) => void;
    clearQueue: () => void;
    toggleFavoriteTrack: (trackId: string) => void;
    isFavoriteTrack: (trackId: string) => boolean;
    clearRecentlyPlayed: () => void;
    clearPlaybackError: () => void;
    toggleExpanded: () => void;
    toggleLyrics: () => void;
    toggleCredits: () => void;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

interface PlayerProviderProps {
    children: React.ReactNode;
}

interface PersistedPlaybackState {
    queueTrackIds: string[];
    favoriteTrackIds: string[];
    recentTrackIds: string[];
    volume: number;
    repeat: PlayerState['repeat'];
    shuffle: boolean;
}

const PERSIST_KEY_PREFIX = 'fgarola_player';
const PERSIST_SESSION_ID_KEY = 'fgarola_player_session_id';
const DATA_SAVER_STORAGE_KEY = 'fgarola_data_saver';
const RECENT_TRACK_LIMIT = 30;
const CROSSFADE_WINDOW_SECONDS = 0.65;
const CROSSFADE_DURATION_MS = 520;

type PlaybackProfile = 'desktop' | 'ios-safari' | 'android-chrome' | 'mobile-web';

const isLikelyIOS = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent || '';
    const platform = navigator.platform || '';
    return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isLikelyMobilePlaybackDevice = (): boolean => {
    if (typeof navigator === 'undefined') return false;

    const userAgent = navigator.userAgent || '';
    const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isCoarsePointer =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 900px)').matches
            : false;

    return isMobileUa || isCoarsePointer;
};

const detectPlaybackProfile = (): PlaybackProfile => {
    if (typeof navigator === 'undefined') return 'desktop';

    const userAgent = navigator.userAgent || '';
    const isIOS = isLikelyIOS();
    const isSafari =
        /Safari/i.test(userAgent) &&
        !/CriOS|Chrome|EdgiOS|FxiOS|OPiOS|DuckDuckGo|YaBrowser/i.test(userAgent);

    if (isIOS && isSafari) {
        return 'ios-safari';
    }

    if (/Android/i.test(userAgent) && /Chrome/i.test(userAgent) && !/EdgA|OPR|SamsungBrowser/i.test(userAgent)) {
        return 'android-chrome';
    }

    if (isLikelyMobilePlaybackDevice()) {
        return 'mobile-web';
    }

    return 'desktop';
};

const toAbsoluteAssetUrl = (value?: string): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (typeof window === 'undefined') return raw;
    if (raw.startsWith('/')) return `${window.location.origin}${raw}`;
    return `${window.location.origin}/${raw}`;
};

const inferImageMimeType = (url: string): string | undefined => {
    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.png')) return 'image/png';
    if (clean.endsWith('.webp')) return 'image/webp';
    if (clean.endsWith('.gif')) return 'image/gif';
    if (clean.endsWith('.avif')) return 'image/avif';
    if (clean.endsWith('.svg')) return 'image/svg+xml';
    if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
    return undefined;
};

const HOWLER_FORMATS_BY_EXTENSION: Record<string, string> = {
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

const FALLBACK_DB_AUDIO_FORMATS = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac', 'webm', 'opus'];

const inferHowlerFormats = (source: string, fallbackRawSource?: string): string[] | undefined => {
    const toExtension = (value?: string): string => {
        const normalized = String(value || '').trim().split('?')[0].toLowerCase();
        if (!normalized) return '';
        const dotIndex = normalized.lastIndexOf('.');
        if (dotIndex === -1) return '';
        return normalized.slice(dotIndex + 1);
    };

    const sourceExt = toExtension(source);
    if (sourceExt && HOWLER_FORMATS_BY_EXTENSION[sourceExt]) {
        return [HOWLER_FORMATS_BY_EXTENSION[sourceExt]];
    }

    const fallbackExt = toExtension(fallbackRawSource);
    if (fallbackExt && HOWLER_FORMATS_BY_EXTENSION[fallbackExt]) {
        return [HOWLER_FORMATS_BY_EXTENSION[fallbackExt]];
    }

    const normalizedSource = String(source || '').toLowerCase();
    if (normalizedSource.includes('/api/tracks/') && normalizedSource.includes('/audio')) {
        return FALLBACK_DB_AUDIO_FORMATS;
    }

    return undefined;
};

const defaultPersistedState = (): PersistedPlaybackState => ({
    queueTrackIds: [],
    favoriteTrackIds: [],
    recentTrackIds: [],
    volume: 0.7,
    repeat: 'off',
    shuffle: false,
});

const createSessionId = () => `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getSessionId = (): string => {
    if (typeof window === 'undefined') {
        return 'server';
    }

    const existing = sessionStorage.getItem(PERSIST_SESSION_ID_KEY);
    if (existing) {
        return existing;
    }

    const created = createSessionId();
    sessionStorage.setItem(PERSIST_SESSION_ID_KEY, created);
    return created;
};

const getPersistTarget = (username?: string | null): { storage: Storage | null; key: string } => {
    if (typeof window === 'undefined') {
        return { storage: null, key: 'server' };
    }

    if (username) {
        return {
            storage: localStorage,
            key: `${PERSIST_KEY_PREFIX}:user:${username}`,
        };
    }

    return {
        storage: sessionStorage,
        key: `${PERSIST_KEY_PREFIX}:session:${getSessionId()}`,
    };
};

const readPersistedState = (username?: string | null): PersistedPlaybackState => {
    const { storage, key } = getPersistTarget(username);
    if (!storage) {
        return defaultPersistedState();
    }

    try {
        const raw = storage.getItem(key);
        if (!raw) {
            return defaultPersistedState();
        }

        const parsed = JSON.parse(raw) as Partial<PersistedPlaybackState>;
        const parsedVolume = Number(parsed.volume);
        const parsedRepeat =
            parsed.repeat === 'all' || parsed.repeat === 'one' || parsed.repeat === 'off'
                ? parsed.repeat
                : 'off';
        return {
            queueTrackIds: Array.isArray(parsed.queueTrackIds)
                ? parsed.queueTrackIds.filter((id): id is string => typeof id === 'string')
                : [],
            favoriteTrackIds: Array.isArray(parsed.favoriteTrackIds)
                ? parsed.favoriteTrackIds.filter((id): id is string => typeof id === 'string')
                : [],
            recentTrackIds: Array.isArray(parsed.recentTrackIds)
                ? parsed.recentTrackIds.filter((id): id is string => typeof id === 'string').slice(0, RECENT_TRACK_LIMIT)
                : [],
            volume: Number.isFinite(parsedVolume) ? Math.min(1, Math.max(0, parsedVolume)) : 0.7,
            repeat: parsedRepeat,
            shuffle: Boolean(parsed.shuffle),
        };
    } catch {
        return defaultPersistedState();
    }
};

const writePersistedState = (username: string | null | undefined, payload: PersistedPlaybackState) => {
    const { storage, key } = getPersistTarget(username);
    if (!storage) {
        return;
    }

    storage.setItem(
        key,
        JSON.stringify({
            queueTrackIds: payload.queueTrackIds,
            favoriteTrackIds: payload.favoriteTrackIds,
            recentTrackIds: payload.recentTrackIds.slice(0, RECENT_TRACK_LIMIT),
            volume: Math.min(1, Math.max(0, payload.volume)),
            repeat: payload.repeat,
            shuffle: payload.shuffle,
        })
    );
};

export const PlayerProvider = ({ children }: PlayerProviderProps) => {
    const { albums } = useDiscography();
    const { user } = useAuth();

    const [state, setState] = useState<PlayerState>({
        currentTrack: null,
        currentAlbum: null,
        queue: [],
        isPlaying: false,
        isBuffering: false,
        volume: 0.7,
        currentTime: 0,
        duration: 0,
        isExpanded: false,
        showLyrics: false,
        showCredits: false,
        repeat: 'off',
        shuffle: false,
    });

    const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>([]);
    const [recentTrackIds, setRecentTrackIds] = useState<string[]>([]);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const playbackProfile = useMemo(() => detectPlaybackProfile(), []);
    const mobilePlaybackDevice = playbackProfile !== 'desktop';
    const crossfadeEnabled = playbackProfile === 'desktop';

    const soundRef = useRef<Howl | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const backendSyncTimeoutRef = useRef<number | undefined>(undefined);
    const crossfadeTriggeredRef = useRef(false);
    const defaultDocumentTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : 'FGAROLA');
    const stateRef = useRef<PlayerState>(state);
    const hydratedIdentityRef = useRef<string>('');
    const mediaSessionActionsRef = useRef<{
        togglePlay: () => void;
        nextTrack: () => void;
        previousTrack: () => void;
        seekTo: (time: number) => void;
    }>({
        togglePlay: () => undefined,
        nextTrack: () => undefined,
        previousTrack: () => undefined,
        seekTo: () => undefined,
    });
    const audioCandidatesCacheRef = useRef<Map<string, string[]>>(new Map());
    const prefetchedTrackIdRef = useRef<string | null>(null);
    const prefetchedSourceRef = useRef<string>('');
    const prefetchAudioRef = useRef<HTMLAudioElement | null>(null);

    const trackIndex = useMemo(() => {
        const index = new Map<string, { track: Track; album: Album }>();
        for (const album of albums) {
            for (const track of album.tracks) {
                index.set(track.id, { track, album });
            }
        }
        return index;
    }, [albums]);

    useEffect(() => {
        audioCandidatesCacheRef.current.clear();
        prefetchedTrackIdRef.current = null;
        prefetchedSourceRef.current = '';
    }, [trackIndex]);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        const currentTrack = state.currentTrack;
        const currentAlbum = state.currentAlbum;

        if (typeof document !== 'undefined') {
            if (currentTrack?.title?.trim()) {
                document.title = `${currentTrack.title} | FGAROLA`;
            } else {
                document.title = defaultDocumentTitleRef.current;
            }
        }

        if (typeof navigator === 'undefined') return;
        const mediaSession = (navigator as Navigator & { mediaSession?: any }).mediaSession;
        if (!mediaSession) return;

        if (!currentTrack) {
            mediaSession.metadata = null;
            mediaSession.playbackState = 'none';
            return;
        }

        const artworkSource = toAbsoluteAssetUrl(currentTrack.coverArt || currentAlbum?.coverArt || '/images/default-cover.jpg');
        const artworkType = artworkSource ? inferImageMimeType(artworkSource) : undefined;
        const artwork = artworkSource
            ? [96, 128, 192, 256, 384, 512].map((size) => ({
                src: artworkSource,
                sizes: `${size}x${size}`,
                ...(artworkType ? { type: artworkType } : {}),
            }))
            : [];

        const MediaMetadataCtor = (window as Window & { MediaMetadata?: new (init?: MediaMetadataInit) => MediaMetadata }).MediaMetadata;
        if (typeof MediaMetadataCtor === 'function') {
            mediaSession.metadata = new MediaMetadataCtor({
                title: currentTrack.title || 'Cancion',
                artist: 'FGAROLA',
                album: currentAlbum?.title || 'Singles',
                artwork,
            });
        }

        mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
        if (typeof mediaSession.setPositionState === 'function' && Number.isFinite(state.duration) && state.duration > 0) {
            try {
                mediaSession.setPositionState({
                    duration: state.duration,
                    playbackRate: 1,
                    position: Math.max(0, Math.min(state.currentTime, state.duration)),
                });
            } catch {
                // ignore browsers with partial MediaSession support
            }
        }
    }, [state.currentTrack, state.currentAlbum, state.isPlaying, state.currentTime, state.duration]);

    useEffect(() => {
        if (albums.length === 0) {
            return;
        }

        const identity = user?.username ? `user:${user.username}` : `session:${getSessionId()}`;
        if (hydratedIdentityRef.current === identity) {
            return;
        }

        let cancelled = false;

        const hydrate = async () => {
            const persisted = readPersistedState(user?.username);
            let source: PersistedPlaybackState = persisted;

            if (user?.username) {
                try {
                    const remote = await db.getUserLibraryState(user.username);
                    const hasRemoteData =
                        remote.queueTrackIds.length > 0 ||
                        remote.favoriteTrackIds.length > 0 ||
                        remote.recentTrackIds.length > 0;

                    if (hasRemoteData) {
                        source = {
                            ...persisted,
                            queueTrackIds: remote.queueTrackIds,
                            favoriteTrackIds: remote.favoriteTrackIds,
                            recentTrackIds: remote.recentTrackIds,
                        };
                    } else {
                        const hasLocalData =
                            persisted.queueTrackIds.length > 0 ||
                            persisted.favoriteTrackIds.length > 0 ||
                            persisted.recentTrackIds.length > 0;

                        if (hasLocalData) {
                            await db.saveUserLibraryState(user.username, persisted);
                        }
                    }
                } catch (error) {
                    console.error('Error syncing remote library state:', error);
                }
            }

            if (cancelled) return;

            const hydratedQueue = source.queueTrackIds
                .map((trackId) => trackIndex.get(trackId)?.track)
                .filter((track): track is Track => Boolean(track));

            const hydratedFavorites = source.favoriteTrackIds.filter((trackId) => trackIndex.has(trackId));
            const hydratedRecent = source.recentTrackIds
                .filter((trackId) => trackIndex.has(trackId))
                .slice(0, RECENT_TRACK_LIMIT);

            setState((prev) => ({
                ...prev,
                queue: hydratedQueue,
                volume: source.volume,
                repeat: source.repeat,
                shuffle: source.shuffle,
            }));
            setFavoriteTrackIds(hydratedFavorites);
            setRecentTrackIds(hydratedRecent);
            hydratedIdentityRef.current = identity;
        };

        void hydrate();

        return () => {
            cancelled = true;
        };
    }, [albums, trackIndex, user?.username]);

    useEffect(() => {
        if (!hydratedIdentityRef.current) {
            return;
        }

        const payload = {
            queueTrackIds: state.queue.map((track) => track.id),
            favoriteTrackIds,
            recentTrackIds,
            volume: state.volume,
            repeat: state.repeat,
            shuffle: state.shuffle,
        };

        writePersistedState(user?.username, payload);

        if (!user?.username) {
            return;
        }

        if (backendSyncTimeoutRef.current) {
            window.clearTimeout(backendSyncTimeoutRef.current);
        }

        const remotePayload = {
            queueTrackIds: payload.queueTrackIds,
            favoriteTrackIds: payload.favoriteTrackIds,
            recentTrackIds: payload.recentTrackIds,
        };
        const syncUser = user.username;
        backendSyncTimeoutRef.current = window.setTimeout(() => {
            void db.saveUserLibraryState(syncUser, remotePayload).catch((error) => {
                console.error('Error saving remote library state:', error);
            });
        }, 450);
    }, [state.queue, state.volume, state.repeat, state.shuffle, favoriteTrackIds, recentTrackIds, user?.username]);

    useEffect(() => {
        const candidate = resolveNextTrackCandidate(stateRef.current);
        if (!candidate) {
            prefetchedTrackIdRef.current = null;
            prefetchedSourceRef.current = '';
            return;
        }
        void prefetchTrackAudio(candidate.track);
    }, [state.currentTrack, state.currentAlbum, state.queue, state.repeat, state.shuffle]);

    const resolveNextTrackCandidate = (snapshot: PlayerState): { track: Track; album?: Album; consumeQueue: boolean } | null => {
        if (snapshot.queue.length > 0) {
            const queuedTrack = snapshot.queue[0];
            const queuedAlbum = trackIndex.get(queuedTrack.id)?.album;
            return {
                track: queuedTrack,
                album: queuedAlbum,
                consumeQueue: true,
            };
        }

        if (!snapshot.currentTrack || !snapshot.currentAlbum) return null;

        const albumTracks = snapshot.currentAlbum.tracks;
        const currentIndex = albumTracks.findIndex((track) => track.id === snapshot.currentTrack?.id);
        if (currentIndex === -1 || albumTracks.length === 0) return null;

        if (snapshot.shuffle && albumTracks.length > 1) {
            let randomIndex = currentIndex;
            while (randomIndex === currentIndex) {
                randomIndex = Math.floor(Math.random() * albumTracks.length);
            }
            return {
                track: albumTracks[randomIndex],
                album: snapshot.currentAlbum,
                consumeQueue: false,
            };
        }

        if (currentIndex < albumTracks.length - 1) {
            return {
                track: albumTracks[currentIndex + 1],
                album: snapshot.currentAlbum,
                consumeQueue: false,
            };
        }

        if (snapshot.repeat === 'all') {
            return {
                track: albumTracks[0],
                album: snapshot.currentAlbum,
                consumeQueue: false,
            };
        }

        return null;
    };

    const playNextCandidate = (candidate: { track: Track; album?: Album; consumeQueue: boolean }) => {
        if (candidate.consumeQueue) {
            setState((prev) => ({
                ...prev,
                queue: prev.queue.slice(1),
            }));
        }
        void playTrack(candidate.track, candidate.album);
    };

    const updateTime = () => {
        if (soundRef.current && stateRef.current.isPlaying) {
            const nextTime = (soundRef.current.seek() as number) || 0;
            setState((prev) => ({
                ...prev,
                currentTime: nextTime,
            }));

            const snapshot = stateRef.current;
            const remaining = Number.isFinite(snapshot.duration) ? snapshot.duration - nextTime : Number.POSITIVE_INFINITY;
            if (
                crossfadeEnabled &&
                !crossfadeTriggeredRef.current &&
                snapshot.repeat !== 'one' &&
                remaining > 0 &&
                remaining <= CROSSFADE_WINDOW_SECONDS
            ) {
                const candidate = resolveNextTrackCandidate(snapshot);
                if (candidate) {
                    crossfadeTriggeredRef.current = true;
                    playNextCandidate(candidate);
                    return;
                }
            }

            animationFrameRef.current = requestAnimationFrame(updateTime);
        }
    };

    useEffect(() => {
        if (state.isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateTime);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [state.isPlaying]);

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unload();
                soundRef.current = null;
            }
            if (prefetchAudioRef.current) {
                try {
                    prefetchAudioRef.current.src = '';
                    prefetchAudioRef.current.load();
                } catch {
                    // ignore audio cleanup failures
                }
                prefetchAudioRef.current = null;
            }
            if (backendSyncTimeoutRef.current) {
                window.clearTimeout(backendSyncTimeoutRef.current);
                backendSyncTimeoutRef.current = undefined;
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const unlockPlayback = () => {
            void primeMediaPlayback();
        };

        window.addEventListener('pointerdown', unlockPlayback, { passive: true });
        window.addEventListener('keydown', unlockPlayback);

        return () => {
            window.removeEventListener('pointerdown', unlockPlayback);
            window.removeEventListener('keydown', unlockPlayback);
        };
    }, []);

    const registerRecentTrack = (trackId: string) => {
        setRecentTrackIds((previous) => {
            const next = [trackId, ...previous.filter((id) => id !== trackId)];
            return next.slice(0, RECENT_TRACK_LIMIT);
        });
    };

    const clearPlaybackError = () => {
        setPlaybackError(null);
    };

    const normalizeAudioSource = (value?: string): string => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        if (raw.startsWith('/')) return toAbsoluteAssetUrl(raw);
        if (raw.startsWith('db:')) return '';
        return toAbsoluteAssetUrl(raw);
    };

    const resolveTrackAudioCandidates = async (track: Track): Promise<string[]> => {
        const cached = audioCandidatesCacheRef.current.get(track.id);
        if (cached && cached.length > 0) {
            return cached;
        }

        const uniqueCandidates = new Set<string>();
        const addCandidate = (value?: string) => {
            const normalized = normalizeAudioSource(value);
            if (normalized) {
                uniqueCandidates.add(normalized);
            }
        };

        const rawAudioFile = String(track.audioFile || '').trim();
        const shouldPrioritizeSignedUrl =
            !rawAudioFile ||
            rawAudioFile.startsWith('db:') ||
            (!rawAudioFile.startsWith('/') && !/^https?:\/\//i.test(rawAudioFile));

        if (shouldPrioritizeSignedUrl) {
            try {
                const preferredDbUrl = await db.prefetchAudioUrl(track.id, rawAudioFile);
                addCandidate(preferredDbUrl || undefined);
            } catch (error) {
                console.error('Error resolving preferred DB audio URL:', error);
            }
        }

        addCandidate(db.getPreferredAudioUrl(track.id, rawAudioFile) || undefined);

        const shouldQueryDb =
            uniqueCandidates.size === 0 &&
            (!rawAudioFile ||
                rawAudioFile.startsWith('db:') ||
                (!rawAudioFile.startsWith('/') && !/^https?:\/\//i.test(rawAudioFile)));

        if (shouldQueryDb) {
            try {
                const dbUrl = await db.getAudioFileUrl(track.id);
                addCandidate(dbUrl || undefined);
            } catch (error) {
                console.error('Error resolving DB audio URL:', error);
            }
        }

        const resolved = Array.from(uniqueCandidates);
        if (resolved.length > 0) {
            audioCandidatesCacheRef.current.set(track.id, resolved);
        }
        return resolved;
    };

    const shouldUseDataSaver = (): boolean => {
        if (typeof window === 'undefined') return false;

        try {
            const storedPreference = localStorage.getItem(DATA_SAVER_STORAGE_KEY);
            if (storedPreference === '1') return true;
            if (storedPreference === '0') return false;
        } catch {
            // ignore storage access issues in restricted contexts
        }

        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        return Boolean(connection?.saveData);
    };

    const prefetchTrackAudio = async (track: Track, strategy: 'next' | 'intent' = 'next') => {
        if (typeof window === 'undefined') return;
        if (shouldUseDataSaver()) return;

        const candidates = await resolveTrackAudioCandidates(track);
        const source = candidates[0];
        if (!source) return;

        if (prefetchedTrackIdRef.current === track.id && prefetchedSourceRef.current === source) {
            return;
        }

        const audio = prefetchAudioRef.current || new Audio();
        const shouldUseAggressivePreload =
            strategy === 'intent' ||
            playbackProfile === 'android-chrome' ||
            (!mobilePlaybackDevice && strategy === 'next');

        audio.preload = shouldUseAggressivePreload ? 'auto' : 'metadata';
        audio.src = source;
        try {
            audio.load();
        } catch {
            // ignore preload failures in unsupported browsers
        }

        prefetchAudioRef.current = audio;
        prefetchedTrackIdRef.current = track.id;
        prefetchedSourceRef.current = source;
    };

    const prepareTrackPlayback = (track: Track) => {
        if (playbackProfile === 'ios-safari') {
            void primeMediaPlayback();
        }
        void prefetchTrackAudio(track, 'intent');
    };

    const applyCrossfade = (incoming: Howl, outgoing: Howl, targetVolume: number) => {
        try {
            outgoing.fade(outgoing.volume(), 0, CROSSFADE_DURATION_MS);
        } catch {
            outgoing.volume(0);
        }

        try {
            incoming.fade(0, targetVolume, CROSSFADE_DURATION_MS);
        } catch {
            incoming.volume(targetVolume);
        }

        window.setTimeout(() => {
            try {
                outgoing.stop();
                outgoing.unload();
            } catch {
                // ignore cleanup issues from replaced sound instance
            }
        }, CROSSFADE_DURATION_MS + 80);
    };

    const playTrack = async (track: Track, album?: Album) => {
        const previousSound = soundRef.current;

        if (playbackProfile === 'ios-safari') {
            await primeMediaPlayback();
        }

        setState((prev) => ({
            ...prev,
            currentTrack: track,
            currentAlbum: album || prev.currentAlbum,
            isPlaying: false,
            isBuffering: true,
            currentTime: 0,
            duration: 0,
        }));

        let audioCandidates = await resolveTrackAudioCandidates(track);

        if (prefetchedTrackIdRef.current === track.id && prefetchedSourceRef.current) {
            const prefetchedSource = prefetchedSourceRef.current;
            if (audioCandidates.includes(prefetchedSource)) {
                audioCandidates = [prefetchedSource, ...audioCandidates.filter((source) => source !== prefetchedSource)];
            }
        }

        if (audioCandidates.length === 0) {
            setPlaybackError(`No hay audio disponible para "${track.title}".`);
            setState((prev) => ({
                ...prev,
                currentTrack: track,
                currentAlbum: album || prev.currentAlbum,
                isPlaying: false,
                isBuffering: false,
            }));
            return;
        }

        const targetVolume = Math.min(1, Math.max(0, stateRef.current.volume));
        const shouldCrossfade = Boolean(previousSound && crossfadeEnabled);

        if (!shouldCrossfade && previousSound) {
            soundRef.current = null;
            try {
                previousSound.stop();
                previousSound.unload();
            } catch {
                // ignore cleanup issues from replaced sound instance
            }
        }

        let crossfadeApplied = false;
        let hasStartedPlayback = false;

        const markPlaybackStarted = (sound: Howl) => {
            if (hasStartedPlayback) return;
            hasStartedPlayback = true;
            clearPlaybackError();

            if (album) {
                statsService.trackPlay(track.id, album.id);
            } else {
                statsService.trackPlay(track.id, 'unknown');
            }

            trackEvent('play_track', {
                track_id: track.id,
                track_title: track.title,
                album_id: album?.id ?? 'unknown',
                album_title: album?.title,
            });

            registerRecentTrack(track.id);

            setState((prev) => ({
                ...prev,
                currentTrack: track,
                currentAlbum: album || prev.currentAlbum,
                isPlaying: true,
                isBuffering: false,
                currentTime: 0,
                duration: Number.isFinite(sound.duration()) ? sound.duration() : prev.duration,
            }));
            if (prefetchedTrackIdRef.current === track.id) {
                prefetchedTrackIdRef.current = null;
                prefetchedSourceRef.current = '';
            }
        };

        const playCandidate = (candidateIndex: number): Howl => {
            const source = audioCandidates[candidateIndex];
            const sourceFormats = inferHowlerFormats(source, track.audioFile);

            const sound = new Howl({
                src: [source],
                ...(sourceFormats ? { format: sourceFormats } : {}),
                html5: true,
                preload: true,
                volume: shouldCrossfade ? 0 : targetVolume,
                onload: () => {
                    if (soundRef.current !== sound) return;
                    setState((prev) => ({
                        ...prev,
                        duration: sound.duration(),
                    }));
                },
                onplay: () => {
                    if (soundRef.current !== sound) return;

                    if (shouldCrossfade && previousSound && previousSound !== sound && !crossfadeApplied) {
                        crossfadeApplied = true;
                        applyCrossfade(sound, previousSound, targetVolume);
                    } else if (!shouldCrossfade) {
                        sound.volume(targetVolume);
                    }

                    markPlaybackStarted(sound);
                },
                onpause: () => {
                    if (soundRef.current !== sound) return;
                    setState((prev) => ({
                        ...prev,
                        isPlaying: false,
                        isBuffering: false,
                    }));
                },
                onstop: () => {
                    if (soundRef.current !== sound) return;
                    setState((prev) => ({
                        ...prev,
                        isPlaying: false,
                        isBuffering: false,
                        currentTime: 0,
                    }));
                },
                onend: () => {
                    if (soundRef.current !== sound) return;
                    nextTrack();
                },
                onplayerror: (_id, error) => {
                    console.error('Error starting audio playback:', error);
                    sound.once('unlock', () => {
                        if (soundRef.current !== sound) return;
                        const retriedPlayId = sound.play();
                        if (typeof retriedPlayId !== 'number') {
                            setPlaybackError(`No se pudo iniciar "${track.title}".`);
                            setState((prev) => ({ ...prev, isPlaying: false, isBuffering: false }));
                        }
                    });
                },
                onloaderror: (_id, error) => {
                    console.error('Error loading audio source:', source, error);
                    if (soundRef.current !== sound) return;

                    try {
                        sound.unload();
                    } catch {
                        // ignore unload failures while swapping source
                    }

                    const nextCandidateIndex = candidateIndex + 1;
                    if (nextCandidateIndex < audioCandidates.length) {
                        const fallbackSound = playCandidate(nextCandidateIndex);
                        soundRef.current = fallbackSound;
                        crossfadeTriggeredRef.current = false;
                        const fallbackPlayId = fallbackSound.play();
                        if (typeof fallbackPlayId !== 'number') {
                            setPlaybackError(`No se pudo reproducir "${track.title}".`);
                            setState((prev) => ({ ...prev, isPlaying: false, isBuffering: false }));
                        }
                        return;
                    }

                    setPlaybackError(`No se pudo cargar "${track.title}".`);
                    setState((prev) => ({ ...prev, isPlaying: false, isBuffering: false }));
                },
            });

            return sound;
        };

        const sound = playCandidate(0);
        soundRef.current = sound;
        crossfadeTriggeredRef.current = false;
        clearPlaybackError();

        const playId = sound.play();
        if (typeof playId !== 'number') {
            setPlaybackError(`No se pudo reproducir "${track.title}".`);
            setState((prev) => ({ ...prev, isPlaying: false, isBuffering: false }));
        }
    };

    const playAlbum = (album: Album) => {
        if (album.tracks.length === 0) return;
        setState((prev) => ({ ...prev, queue: [] }));
        void playTrack(album.tracks[0], album);
    };

    const pauseTrack = () => {
        if (soundRef.current) {
            soundRef.current.pause();
            setState((prev) => ({ ...prev, isPlaying: false, isBuffering: false }));
        }
    };

    const togglePlay = () => {
        if (stateRef.current.isBuffering) {
            return;
        }

        if (stateRef.current.isPlaying) {
            pauseTrack();
            return;
        }

        if (soundRef.current) {
            clearPlaybackError();
            setState((prev) => ({ ...prev, isBuffering: true }));
            const playId = soundRef.current.play();
            if (typeof playId !== 'number') {
                setPlaybackError('No se pudo reanudar la reproduccion.');
                setState((prev) => ({ ...prev, isPlaying: false, isBuffering: false }));
            }
            return;
        }

        if (stateRef.current.currentTrack) {
            void playTrack(stateRef.current.currentTrack, stateRef.current.currentAlbum || undefined);
        }
    };

    const nextTrack = () => {
        const snapshot = stateRef.current;

        if (snapshot.repeat === 'one' && snapshot.currentTrack && snapshot.currentAlbum) {
            void playTrack(snapshot.currentTrack, snapshot.currentAlbum);
            return;
        }

        const candidate = resolveNextTrackCandidate(snapshot);
        if (!candidate) return;
        playNextCandidate(candidate);
    };

    const previousTrack = () => {
        const snapshot = stateRef.current;

        if (snapshot.currentTime > 3) {
            seekTo(0);
            return;
        }

        if (!snapshot.currentTrack || !snapshot.currentAlbum) return;

        const albumTracks = snapshot.currentAlbum.tracks;
        const currentIndex = albumTracks.findIndex((track) => track.id === snapshot.currentTrack?.id);
        if (currentIndex === -1 || albumTracks.length === 0) return;

        if (currentIndex > 0) {
            void playTrack(albumTracks[currentIndex - 1], snapshot.currentAlbum);
            return;
        }

        if (snapshot.repeat === 'all') {
            void playTrack(albumTracks[albumTracks.length - 1], snapshot.currentAlbum);
        }
    };

    const seekTo = (time: number) => {
        if (soundRef.current) {
            soundRef.current.seek(time);
            setState((prev) => ({ ...prev, currentTime: time }));
        }
    };

    const setVolume = (volume: number) => {
        const safeVolume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : stateRef.current.volume;
        if (soundRef.current) {
            soundRef.current.volume(safeVolume);
        }
        setState((prev) => ({ ...prev, volume: safeVolume }));
    };

    const addToQueue = (track: Track) => {
        setState((prev) => ({
            ...prev,
            queue: [...prev.queue, track],
        }));
    };

    const removeFromQueue = (trackId: string, queueIndex?: number) => {
        setState((prev) => {
            if (typeof queueIndex === 'number' && queueIndex >= 0 && queueIndex < prev.queue.length) {
                const indexedTrack = prev.queue[queueIndex];
                if (indexedTrack && indexedTrack.id === trackId) {
                    return {
                        ...prev,
                        queue: prev.queue.filter((_, index) => index !== queueIndex),
                    };
                }
            }

            const firstMatchIndex = prev.queue.findIndex((track) => track.id === trackId);
            if (firstMatchIndex === -1) {
                return prev;
            }

            return {
                ...prev,
                queue: prev.queue.filter((_, index) => index !== firstMatchIndex),
            };
        });
    };

    const clearQueue = () => {
        setState((prev) => ({ ...prev, queue: [] }));
    };

    const toggleFavoriteTrack = (trackId: string) => {
        setFavoriteTrackIds((previous) => {
            if (previous.includes(trackId)) {
                return previous.filter((id) => id !== trackId);
            }
            return [trackId, ...previous];
        });
    };

    const isFavoriteTrack = (trackId: string) => favoriteTrackIds.includes(trackId);

    const clearRecentlyPlayed = () => {
        setRecentTrackIds([]);
    };

    const toggleExpanded = () => {
        setState((prev) => ({ ...prev, isExpanded: !prev.isExpanded }));
    };

    const toggleLyrics = () => {
        setState((prev) => ({ ...prev, showLyrics: !prev.showLyrics, showCredits: false }));
    };

    const toggleCredits = () => {
        setState((prev) => ({ ...prev, showCredits: !prev.showCredits, showLyrics: false }));
    };

    const toggleRepeat = () => {
        setState((prev) => ({
            ...prev,
            repeat: prev.repeat === 'off' ? 'all' : prev.repeat === 'all' ? 'one' : 'off',
        }));
    };

    const toggleShuffle = () => {
        setState((prev) => ({ ...prev, shuffle: !prev.shuffle }));
    };

    useEffect(() => {
        mediaSessionActionsRef.current = {
            togglePlay,
            nextTrack,
            previousTrack,
            seekTo,
        };
    });

    useEffect(() => {
        if (typeof navigator === 'undefined') return;
        const mediaSession = (navigator as Navigator & { mediaSession?: any }).mediaSession;
        if (!mediaSession) return;

        const setHandler = (action: string, handler: ((details?: { seekTime?: number; seekOffset?: number }) => void) | null) => {
            try {
                mediaSession.setActionHandler(action, handler);
            } catch {
                // ignore unsupported media actions in current browser
            }
        };

        setHandler('play', () => {
            if (!stateRef.current.isPlaying) {
                mediaSessionActionsRef.current.togglePlay();
            }
        });

        setHandler('pause', () => {
            if (stateRef.current.isPlaying) {
                mediaSessionActionsRef.current.togglePlay();
            }
        });

        setHandler('previoustrack', () => {
            mediaSessionActionsRef.current.previousTrack();
        });

        setHandler('nexttrack', () => {
            mediaSessionActionsRef.current.nextTrack();
        });

        setHandler('seekbackward', (details) => {
            const offset = Number(details?.seekOffset || 10);
            mediaSessionActionsRef.current.seekTo(Math.max(0, stateRef.current.currentTime - offset));
        });

        setHandler('seekforward', (details) => {
            const offset = Number(details?.seekOffset || 10);
            const maxDuration = Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : Number.MAX_SAFE_INTEGER;
            mediaSessionActionsRef.current.seekTo(Math.min(maxDuration, stateRef.current.currentTime + offset));
        });

        setHandler('seekto', (details) => {
            const nextPosition = Number(details?.seekTime);
            if (!Number.isFinite(nextPosition)) return;
            mediaSessionActionsRef.current.seekTo(nextPosition);
        });

        return () => {
            setHandler('play', null);
            setHandler('pause', null);
            setHandler('previoustrack', null);
            setHandler('nexttrack', null);
            setHandler('seekbackward', null);
            setHandler('seekforward', null);
            setHandler('seekto', null);
        };
    }, []);

    return (
        <PlayerContext.Provider
            value={{
                ...state,
                favoriteTrackIds,
                recentTrackIds,
                playbackError,
                playTrack,
                prepareTrackPlayback,
                playAlbum,
                pauseTrack,
                togglePlay,
                nextTrack,
                previousTrack,
                seekTo,
                setVolume,
                addToQueue,
                removeFromQueue,
                clearQueue,
                toggleFavoriteTrack,
                isFavoriteTrack,
                clearRecentlyPlayed,
                clearPlaybackError,
                toggleExpanded,
                toggleLyrics,
                toggleCredits,
                toggleRepeat,
                toggleShuffle,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = () => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayer debe usarse dentro de PlayerProvider');
    }
    return context;
};
