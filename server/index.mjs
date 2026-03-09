import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 3001);

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY || '').trim();
const SUPABASE_AUDIO_BUCKET = String(process.env.SUPABASE_AUDIO_BUCKET || 'garmusic-audio').trim();
const SUPABASE_ASSETS_BUCKET = String(process.env.SUPABASE_ASSETS_BUCKET || 'garmusic-assets').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Faltan variables SUPABASE_URL y SUPABASE_ANON_KEY para iniciar la API');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const app = express();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024,
    },
});

const defaultSiteSettings = {
    heroTitle: 'FGAROLA',
    heroSubtitles: ['Cantante', 'Compositor', 'Artista', 'Productor'],
    heroVideoUrl: '/videos/hero-bg.mp4',
    heroDescription: 'Descubre mi musica, mi historia y conecta conmigo',
    spotifyUrl: 'https://spotify.com',
    instagramUrl: 'https://instagram.com',
    youtubeUrl: 'https://youtube.com',
    twitterUrl: '',
    tiktokUrl: '',
    spotifyFollowers: 125000,
    instagramFollowers: 85000,
    youtubeFollowers: 50000,
    kofiUrl: '',
    patreonUrl: '',
    paypalUrl: '',
    bioContent: '',
    bioImage: '',
    accentPrimary: '#667eea',
    accentSecondary: '#f5576c',
    featuredAlbumId: null,
    homePersonalTitle: 'Tu sesion guardada',
    homePersonalDescription: 'Tus datos se sincronizan por usuario para mantener continuidad entre dispositivos.',
    homeCountdownTitle: 'Proximo lanzamiento',
    homeCountdownDescription: '',
    homeSpotlightTitle: 'Ultimo lanzamiento',
    homeSpotlightDescription: 'El centro de la landing: reproduce, explora y entra directo al lanzamiento actual.',
    homeDiscoveryTitle: 'Discografia seleccionada',
    homeDiscoveryDescription: 'Una seleccion compacta para descubrir lo esencial sin salir de la portada.',
    homeSignalsTitle: 'Panorama musical',
    homeSignalsDescription: 'Dos vistas clave para entender que canciones conectan mejor con la audiencia.',
    homeCommunityTitle: 'Crecimiento y apoyo',
    homeCommunityDescription: 'Todo lo necesario para seguir el proyecto y apoyar su crecimiento.',
    homeNewsletterTitle: 'Mantente conectado',
    homeNewsletterDescription: 'Suscribete para recibir noticias sobre nuevos lanzamientos, conciertos y contenido exclusivo.',
    homeNewsletterPlaceholder: 'tu@email.com',
    homeNewsletterButtonLabel: 'Suscribirse',
    musicPageTitle: 'Mi musica',
    musicPageSubtitle: 'Biblioteca completa con busqueda rapida, actividad personal y acceso directo a cada album.',
    musicActivityTitle: 'Tu actividad',
    musicActivityDescription: 'Acceso rapido a cola, favoritos y reproducciones recientes.',
    bioHeroTitle: 'Sobre mi proyecto musical',
    bioHeroSummary: 'Un recorrido por mi historia, mi enfoque creativo y la evolucion del sonido que estoy construyendo.',
    bioSidebarTitle: 'Resumen',
    bioSidebarItems: [
        'Catalogo actualizado desde el panel admin.',
        'Bio editable con Markdown.',
        'Integrado con pagina de musica y lanzamientos.',
    ],
};

const nowMs = () => Date.now();
const todayYmd = () => new Date().toISOString().split('T')[0];

const safeJsonParse = (value, fallback) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const sanitizeTrackId = (trackId) => trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
const sanitizeScope = (scope) => scope.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'general';

const getAudioPublicUrl = (trackId) => `/api/tracks/${encodeURIComponent(trackId)}/audio`;
const RELEASE_POPUP_PREFIX = 'release-';
const DEFAULT_RELEASE_POPUP_WINDOW_DAYS = 14;
const LIBRARY_MAX_QUEUE = 300;
const LIBRARY_MAX_FAVORITES = 500;
const LIBRARY_MAX_RECENT = 300;
const RELEASE_PREREG_EMAIL_MAX = 180;
const RELEASE_PREREG_NAME_MAX = 120;
const PLAYLIST_MAX_TRACKS = 500;
const PLAYLIST_TITLE_MAX = 140;
const PLAYLIST_DESCRIPTION_MAX = 2000;
const PLAYLIST_COVER_MAX = 1200;

const AUDIO_ALLOWED_EXTENSIONS = new Set([
    '.mp3',
    '.m4a',
    '.aac',
    '.wav',
    '.ogg',
    '.oga',
    '.flac',
    '.opus',
    '.webm',
]);

const AUDIO_MIME_EXTENSION_MAP = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/aac': '.aac',
    'audio/x-aac': '.aac',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/flac': '.flac',
    'audio/webm': '.webm',
    'audio/opus': '.opus',
    // iPhone/Safari sometimes reports M4A as video/mp4.
    'video/mp4': '.m4a',
};

const sanitizeFileExtension = (extension) => {
    if (!extension) return '';
    const normalized = String(extension).toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (!normalized) return '';
    return normalized.startsWith('.') ? normalized : `.${normalized}`;
};

const resolveAudioExtension = (file) => {
    const fromName = sanitizeFileExtension(path.extname(file.originalname || ''));
    if (AUDIO_ALLOWED_EXTENSIONS.has(fromName)) {
        return fromName;
    }

    const mimeType = String(file.mimetype || '').toLowerCase();
    const fromMime = AUDIO_MIME_EXTENSION_MAP[mimeType];
    if (fromMime) {
        return fromMime;
    }

    return '.mp3';
};

const normalizeAudioMimeType = (mimeType, extension) => {
    const normalized = String(mimeType || '').toLowerCase();
    if (normalized.startsWith('audio/')) {
        return normalized;
    }

    if (normalized === 'video/mp4' && extension === '.m4a') {
        return 'audio/mp4';
    }

    if (extension === '.m4a') return 'audio/mp4';
    if (extension === '.aac') return 'audio/aac';
    if (extension === '.wav') return 'audio/wav';
    if (extension === '.ogg' || extension === '.oga') return 'audio/ogg';
    if (extension === '.flac') return 'audio/flac';
    if (extension === '.opus') return 'audio/opus';
    if (extension === '.webm') return 'audio/webm';
    return 'audio/mpeg';
};

const parsePublishAtMs = (album) => {
    const raw = typeof album?.publishAt === 'string' ? album.publishAt.trim() : '';
    if (!raw) return null;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseReleaseDateMs = (album) => {
    const raw = typeof album?.releaseDate === 'string' ? album.releaseDate.trim() : '';
    if (!raw) return null;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
};

const getAlbumOrderMs = (album) => {
    const publishAtMs = parsePublishAtMs(album);
    if (Number.isFinite(publishAtMs)) return publishAtMs;
    const releaseDateMs = parseReleaseDateMs(album);
    if (Number.isFinite(releaseDateMs)) return releaseDateMs;
    return 0;
};

const sortAlbumsByMusicDate = (albums) => {
    return [...albums].sort((a, b) => {
        const timeDiff = getAlbumOrderMs(b) - getAlbumOrderMs(a);
        if (timeDiff !== 0) return timeDiff;
        const aTitle = String(a?.title || '');
        const bTitle = String(b?.title || '');
        return aTitle.localeCompare(bTitle, 'es', { sensitivity: 'base' });
    });
};

const getAlbumWorkflowStatus = (album) => {
    const raw = String(album?.workflowStatus || 'published').toLowerCase();
    return raw === 'draft' ? 'draft' : 'published';
};

const isAlbumPublished = (album, now = Date.now()) => {
    if (getAlbumWorkflowStatus(album) === 'draft') {
        return false;
    }
    const publishAtMs = parsePublishAtMs(album);
    if (!publishAtMs) {
        return true;
    }
    return publishAtMs <= now;
};

const toIsoDay = (dateLike) => {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) {
        return todayYmd();
    }
    return date.toISOString().slice(0, 10);
};

const buildReleasePopupId = (albumId) => `${RELEASE_POPUP_PREFIX}${String(albumId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

const sanitizeUserKey = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.replace(/[^a-zA-Z0-9._@-]/g, '_').slice(0, 120);
};

const sanitizeReleasePreregEmail = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.length > RELEASE_PREREG_EMAIL_MAX) return '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(raw) ? raw : '';
};

const sanitizeReleasePreregName = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.slice(0, RELEASE_PREREG_NAME_MAX);
};

const sanitizeTrackIdArray = (value, maxSize) => {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const output = [];

    for (const item of value) {
        if (typeof item !== 'string') continue;
        const sanitized = item.trim();
        if (!sanitized) continue;
        if (seen.has(sanitized)) continue;
        seen.add(sanitized);
        output.push(sanitized);
        if (output.length >= maxSize) break;
    }

    return output;
};

const sanitizePlaylistId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
};

const normalizePlaylistPayload = (payload, options = {}) => {
    const now = nowMs();
    const safeId = sanitizePlaylistId(payload?.id || options.fallbackId || `playlist-${now}`);
    const title = String(payload?.title || '').trim().slice(0, PLAYLIST_TITLE_MAX);
    const description = String(payload?.description || '').trim().slice(0, PLAYLIST_DESCRIPTION_MAX);
    const coverArt = String(payload?.coverArt || '').trim().slice(0, PLAYLIST_COVER_MAX);
    const trackIds = sanitizeTrackIdArray(payload?.trackIds, PLAYLIST_MAX_TRACKS);
    const createdAtFromPayload = Number(payload?.createdAt);
    const createdAtFromOptions = Number(options.existingCreatedAt);
    const createdAt = Number.isFinite(createdAtFromOptions)
        ? createdAtFromOptions
        : Number.isFinite(createdAtFromPayload)
        ? createdAtFromPayload
        : now;

    return {
        id: safeId || `playlist-${now}`,
        title: title || 'Playlist sin titulo',
        description,
        coverArt,
        trackIds,
        isPublic: payload?.isPublic !== false,
        createdAt,
        updatedAt: now,
    };
};

const normalizeLibraryState = (payload) => ({
    queueTrackIds: sanitizeTrackIdArray(payload?.queueTrackIds, LIBRARY_MAX_QUEUE),
    favoriteTrackIds: sanitizeTrackIdArray(payload?.favoriteTrackIds, LIBRARY_MAX_FAVORITES),
    recentTrackIds: sanitizeTrackIdArray(payload?.recentTrackIds, LIBRARY_MAX_RECENT),
});

const normalizeSql = (query) => String(query || '').replace(/\s+/g, ' ').trim();
// Compatibility fallback when audio_files table policies are not open yet.
const AUDIO_FILES_FALLBACK_SETTING_KEY = 'audioFilesMap';

const isStorageNotFoundError = (error) => {
    const message = String(error?.message || '');
    return /not found|does not exist|404/i.test(message);
};

const isAudioFilesFallbackError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return (
        message.includes('row-level security') ||
        message.includes('permission denied') ||
        message.includes('relation') ||
        message.includes('does not exist')
    );
};

const ensureSupabaseResult = (error, context) => {
    if (!error) return;
    const wrapped = new Error(`[supabase] ${context}: ${error.message || String(error)}`);
    wrapped.cause = error;
    throw wrapped;
};

const loadAudioFilesMap = async () => {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', AUDIO_FILES_FALLBACK_SETTING_KEY)
        .maybeSingle();
    ensureSupabaseResult(error, 'audio-map.load');

    const parsed = safeJsonParse(data?.value, {});
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
    }
    return parsed;
};

const saveAudioFilesMap = async (mapValue) => {
    const { error } = await supabase.from('settings').upsert(
        {
            key: AUDIO_FILES_FALLBACK_SETTING_KEY,
            value: JSON.stringify(mapValue || {}),
            updated_at: nowMs(),
        },
        { onConflict: 'key' }
    );
    ensureSupabaseResult(error, 'audio-map.save');
};

const getStoragePublicUrl = (bucket, objectPath) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    return data?.publicUrl || '';
};

const uploadStorageObject = async (bucket, objectPath, buffer, contentType) => {
    const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
        contentType: contentType || 'application/octet-stream',
        upsert: true,
    });
    ensureSupabaseResult(error, `upload ${bucket}/${objectPath}`);
};

const removeStorageObject = async (bucket, objectPath) => {
    if (!objectPath) return;
    const { error } = await supabase.storage.from(bucket).remove([objectPath]);
    if (error && !isStorageNotFoundError(error)) {
        ensureSupabaseResult(error, `remove ${bucket}/${objectPath}`);
    }
};

const downloadStorageObject = async (bucket, objectPath) => {
    if (!objectPath) return null;
    const { data, error } = await supabase.storage.from(bucket).download(objectPath);
    if (error) {
        if (isStorageNotFoundError(error)) {
            return null;
        }
        ensureSupabaseResult(error, `download ${bucket}/${objectPath}`);
    }
    if (!data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
};

const unsupportedQuery = (method, query) => {
    throw new Error(`[supabase-db] Query no soportada (${method}): ${query}`);
};

const db = {
    async exec(_query) {
        return;
    },

    async get(query, ...params) {
        const sql = normalizeSql(query);

        if (sql === 'SELECT value FROM settings WHERE key = ?') {
            const { data, error } = await supabase.from('settings').select('value').eq('key', params[0]).maybeSingle();
            ensureSupabaseResult(error, 'settings.get');
            return data || undefined;
        }

        if (sql === 'SELECT data FROM albums WHERE id = ?') {
            const { data, error } = await supabase.from('albums').select('data').eq('id', params[0]).maybeSingle();
            ensureSupabaseResult(error, 'albums.get');
            return data || undefined;
        }

        if (sql === 'SELECT data FROM popups WHERE id = ?') {
            const { data, error } = await supabase.from('popups').select('data').eq('id', params[0]).maybeSingle();
            ensureSupabaseResult(error, 'popups.get');
            return data || undefined;
        }

        if (sql === 'SELECT file_path FROM audio_files WHERE track_id = ?') {
            const { data, error } = await supabase.from('audio_files').select('file_path').eq('track_id', params[0]).maybeSingle();
            if (error && isAudioFilesFallbackError(error)) {
                const audioMap = await loadAudioFilesMap();
                const entry = audioMap[params[0]];
                return entry ? { file_path: entry.file_path } : undefined;
            }
            ensureSupabaseResult(error, 'audio_files.get.path');
            return data || undefined;
        }

        if (sql === 'SELECT data FROM playlists WHERE id = ?') {
            const { data, error } = await supabase.from('playlists').select('data').eq('id', params[0]).maybeSingle();
            ensureSupabaseResult(error, 'playlists.get');
            return data || undefined;
        }

        if (sql === 'SELECT track_id, updated_at FROM audio_files WHERE track_id = ?') {
            const { data, error } = await supabase
                .from('audio_files')
                .select('track_id,updated_at')
                .eq('track_id', params[0])
                .maybeSingle();
            if (error && isAudioFilesFallbackError(error)) {
                const audioMap = await loadAudioFilesMap();
                const entry = audioMap[params[0]];
                return entry
                    ? {
                          track_id: params[0],
                          updated_at: Number(entry.updated_at || 0),
                      }
                    : undefined;
            }
            ensureSupabaseResult(error, 'audio_files.get.info');
            return data || undefined;
        }

        if (sql === 'SELECT file_path, mime_type, file_name FROM audio_files WHERE track_id = ?') {
            const { data, error } = await supabase
                .from('audio_files')
                .select('file_path,mime_type,file_name')
                .eq('track_id', params[0])
                .maybeSingle();
            if (error && isAudioFilesFallbackError(error)) {
                const audioMap = await loadAudioFilesMap();
                const entry = audioMap[params[0]];
                return entry
                    ? {
                          file_path: entry.file_path,
                          mime_type: entry.mime_type,
                          file_name: entry.file_name,
                      }
                    : undefined;
            }
            ensureSupabaseResult(error, 'audio_files.get.stream');
            return data || undefined;
        }

        if (sql === 'SELECT data, updated_at FROM user_library_states WHERE user_key = ?') {
            const { data, error } = await supabase
                .from('user_library_states')
                .select('data,updated_at')
                .eq('user_key', params[0])
                .maybeSingle();
            ensureSupabaseResult(error, 'user_library_states.get');
            return data || undefined;
        }

        if (sql === 'SELECT id FROM release_preregistrations WHERE album_id = ? AND email = ?') {
            const { data, error } = await supabase
                .from('release_preregistrations')
                .select('id')
                .eq('album_id', params[0])
                .eq('email', params[1])
                .maybeSingle();
            ensureSupabaseResult(error, 'release_preregistrations.get');
            return data || undefined;
        }

        if (sql === 'SELECT COUNT(*) as count FROM release_preregistrations WHERE album_id = ?') {
            const { count, error } = await supabase
                .from('release_preregistrations')
                .select('id', { count: 'exact', head: true })
                .eq('album_id', params[0]);
            ensureSupabaseResult(error, 'release_preregistrations.count');
            return { count: Number(count || 0) };
        }

        if (sql === 'SELECT COUNT(*) as count FROM messages WHERE read = 0') {
            const { count, error } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('read', false);
            ensureSupabaseResult(error, 'messages.unread-count');
            return { count: Number(count || 0) };
        }

        if (sql === 'SELECT data FROM messages WHERE id = ?') {
            const { data, error } = await supabase.from('messages').select('data').eq('id', params[0]).maybeSingle();
            ensureSupabaseResult(error, 'messages.get');
            return data || undefined;
        }

        unsupportedQuery('get', sql);
    },

    async all(query, ...params) {
        const sql = normalizeSql(query);

        if (sql === 'SELECT id, data FROM albums') {
            const { data, error } = await supabase.from('albums').select('id,data');
            ensureSupabaseResult(error, 'albums.list.id-data');
            return data || [];
        }

        if (sql === 'SELECT data FROM albums') {
            const { data, error } = await supabase.from('albums').select('data');
            ensureSupabaseResult(error, 'albums.list.data');
            return data || [];
        }

        if (sql === 'SELECT data FROM playlists ORDER BY updated_at DESC') {
            const { data, error } = await supabase.from('playlists').select('data').order('updated_at', { ascending: false });
            ensureSupabaseResult(error, 'playlists.list');
            return data || [];
        }

        if (sql === 'SELECT id, track_id as trackId, album_id as albumId, timestamp, date FROM play_events ORDER BY timestamp DESC') {
            const { data, error } = await supabase
                .from('play_events')
                .select('id,track_id,album_id,timestamp,date')
                .order('timestamp', { ascending: false });
            ensureSupabaseResult(error, 'play_events.list');
            return (data || []).map((row) => ({
                id: row.id,
                trackId: row.track_id,
                albumId: row.album_id,
                timestamp: row.timestamp,
                date: row.date,
            }));
        }

        if (sql === 'SELECT id, track_id as trackId, album_id as albumId, timestamp, date FROM play_events WHERE track_id = ? ORDER BY timestamp DESC') {
            const { data, error } = await supabase
                .from('play_events')
                .select('id,track_id,album_id,timestamp,date')
                .eq('track_id', params[0])
                .order('timestamp', { ascending: false });
            ensureSupabaseResult(error, 'play_events.list.by-track');
            return (data || []).map((row) => ({
                id: row.id,
                trackId: row.track_id,
                albumId: row.album_id,
                timestamp: row.timestamp,
                date: row.date,
            }));
        }

        if (sql === 'SELECT data FROM messages ORDER BY timestamp DESC') {
            const { data, error } = await supabase.from('messages').select('data').order('timestamp', { ascending: false });
            ensureSupabaseResult(error, 'messages.list');
            return data || [];
        }

        if (sql === 'SELECT data FROM popups ORDER BY updated_at DESC') {
            const { data, error } = await supabase.from('popups').select('data').order('updated_at', { ascending: false });
            ensureSupabaseResult(error, 'popups.list');
            return data || [];
        }

        if (sql === 'SELECT data FROM albums ORDER BY updated_at DESC') {
            const { data, error } = await supabase.from('albums').select('data').order('updated_at', { ascending: false });
            ensureSupabaseResult(error, 'albums.export');
            return data || [];
        }

        if (sql === 'SELECT data FROM playlists ORDER BY updated_at DESC') {
            const { data, error } = await supabase.from('playlists').select('data').order('updated_at', { ascending: false });
            ensureSupabaseResult(error, 'playlists.export');
            return data || [];
        }

        if (sql === 'SELECT track_id, file_path FROM audio_files') {
            const { data, error } = await supabase.from('audio_files').select('track_id,file_path');
            if (error && isAudioFilesFallbackError(error)) {
                const audioMap = await loadAudioFilesMap();
                return Object.entries(audioMap).map(([track_id, entry]) => ({
                    track_id,
                    file_path: entry.file_path,
                }));
            }
            ensureSupabaseResult(error, 'audio_files.list.paths');
            return data || [];
        }

        unsupportedQuery('all', sql);
    },

    async run(query, ...params) {
        const sql = normalizeSql(query);

        if (sql.startsWith('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET')) {
            const { error } = await supabase.from('settings').upsert(
                {
                    key: params[0],
                    value: params[1],
                    updated_at: params[2],
                },
                { onConflict: 'key' }
            );
            ensureSupabaseResult(error, 'settings.upsert');
            return;
        }

        if (sql.startsWith('INSERT INTO popups (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET')) {
            const { error } = await supabase.from('popups').upsert(
                {
                    id: params[0],
                    data: params[1],
                    updated_at: params[2],
                },
                { onConflict: 'id' }
            );
            ensureSupabaseResult(error, 'popups.upsert');
            return;
        }

        if (sql === 'UPDATE albums SET data = ?, updated_at = ? WHERE id = ?') {
            const { error } = await supabase
                .from('albums')
                .update({ data: params[0], updated_at: params[1] })
                .eq('id', params[2]);
            ensureSupabaseResult(error, 'albums.update');
            return;
        }

        if (sql.startsWith('INSERT INTO albums (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET')) {
            const { error } = await supabase.from('albums').upsert(
                {
                    id: params[0],
                    data: params[1],
                    updated_at: params[2],
                },
                { onConflict: 'id' }
            );
            ensureSupabaseResult(error, 'albums.upsert');
            return;
        }

        if (sql === 'DELETE FROM audio_files WHERE track_id = ?') {
            const { error } = await supabase.from('audio_files').delete().eq('track_id', params[0]);
            if (error && isAudioFilesFallbackError(error)) {
                const audioMap = await loadAudioFilesMap();
                delete audioMap[params[0]];
                await saveAudioFilesMap(audioMap);
                return;
            }
            ensureSupabaseResult(error, 'audio_files.delete');
            return;
        }

        if (sql === 'DELETE FROM albums WHERE id = ?') {
            const { error } = await supabase.from('albums').delete().eq('id', params[0]);
            ensureSupabaseResult(error, 'albums.delete');
            return;
        }

        if (sql.startsWith('INSERT INTO playlists (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET')) {
            const { error } = await supabase.from('playlists').upsert(
                {
                    id: params[0],
                    data: params[1],
                    updated_at: params[2],
                },
                { onConflict: 'id' }
            );
            ensureSupabaseResult(error, 'playlists.upsert');
            return;
        }

        if (sql === 'DELETE FROM playlists WHERE id = ?') {
            const { error } = await supabase.from('playlists').delete().eq('id', params[0]);
            ensureSupabaseResult(error, 'playlists.delete');
            return;
        }

        if (sql.startsWith('INSERT INTO audio_files (track_id, file_name, mime_type, file_path, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(track_id) DO UPDATE SET')) {
            const { error } = await supabase.from('audio_files').upsert(
                {
                    track_id: params[0],
                    file_name: params[1],
                    mime_type: params[2],
                    file_path: params[3],
                    updated_at: params[4],
                },
                { onConflict: 'track_id' }
            );
            if (error && isAudioFilesFallbackError(error)) {
                const audioMap = await loadAudioFilesMap();
                audioMap[params[0]] = {
                    file_name: params[1],
                    mime_type: params[2],
                    file_path: params[3],
                    updated_at: params[4],
                };
                await saveAudioFilesMap(audioMap);
                return;
            }
            ensureSupabaseResult(error, 'audio_files.upsert');
            return;
        }

        if (sql.startsWith('INSERT INTO user_library_states (user_key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_key) DO UPDATE SET')) {
            const { error } = await supabase.from('user_library_states').upsert(
                {
                    user_key: params[0],
                    data: params[1],
                    updated_at: params[2],
                },
                { onConflict: 'user_key' }
            );
            ensureSupabaseResult(error, 'user_library_states.upsert');
            return;
        }

        if (sql.startsWith('INSERT INTO release_preregistrations (id, album_id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(album_id, email) DO UPDATE SET')) {
            const { error } = await supabase.from('release_preregistrations').upsert(
                {
                    id: params[0],
                    album_id: params[1],
                    email: params[2],
                    name: params[3],
                    created_at: params[4],
                    updated_at: params[5],
                },
                { onConflict: 'album_id,email' }
            );
            ensureSupabaseResult(error, 'release_preregistrations.upsert');
            return;
        }

        if (sql.startsWith('INSERT OR REPLACE INTO play_events (id, track_id, album_id, timestamp, date) VALUES (?, ?, ?, ?, ?)')) {
            const { error } = await supabase.from('play_events').upsert(
                {
                    id: params[0],
                    track_id: params[1],
                    album_id: params[2],
                    timestamp: params[3],
                    date: params[4],
                },
                { onConflict: 'id' }
            );
            ensureSupabaseResult(error, 'play_events.upsert');
            return;
        }

        if (sql.startsWith('INSERT OR REPLACE INTO messages (id, data, timestamp, read) VALUES (?, ?, ?, ?)')) {
            const { error } = await supabase.from('messages').upsert(
                {
                    id: params[0],
                    data: params[1],
                    timestamp: params[2],
                    read: Number(params[3]) === 1 || params[3] === true,
                },
                { onConflict: 'id' }
            );
            ensureSupabaseResult(error, 'messages.upsert');
            return;
        }

        if (sql === 'UPDATE messages SET data = ?, read = 1 WHERE id = ?') {
            const { error } = await supabase
                .from('messages')
                .update({ data: params[0], read: true })
                .eq('id', params[1]);
            ensureSupabaseResult(error, 'messages.mark-read');
            return;
        }

        if (sql === 'DELETE FROM messages WHERE id = ?') {
            const { error } = await supabase.from('messages').delete().eq('id', params[0]);
            ensureSupabaseResult(error, 'messages.delete');
            return;
        }

        if (sql === 'DELETE FROM popups WHERE id = ?') {
            const { error } = await supabase.from('popups').delete().eq('id', params[0]);
            ensureSupabaseResult(error, 'popups.delete');
            return;
        }

        if (sql === 'DELETE FROM albums') {
            const { error } = await supabase.from('albums').delete().not('id', 'is', null);
            ensureSupabaseResult(error, 'albums.clear');
            return;
        }

        if (sql === 'DELETE FROM playlists') {
            const { error } = await supabase.from('playlists').delete().not('id', 'is', null);
            ensureSupabaseResult(error, 'playlists.clear');
            return;
        }

        if (sql === 'DELETE FROM audio_files') {
            const { error } = await supabase.from('audio_files').delete().not('track_id', 'is', null);
            if (error && isAudioFilesFallbackError(error)) {
                await saveAudioFilesMap({});
                return;
            }
            ensureSupabaseResult(error, 'audio_files.clear');
            return;
        }

        unsupportedQuery('run', sql);
    },
};

const loadSiteSettings = async () => {
    const row = await db.get('SELECT value FROM settings WHERE key = ?', 'siteSettings');
    if (!row) {
        return { ...defaultSiteSettings };
    }
    const parsed = safeJsonParse(row.value, defaultSiteSettings);
    return { ...defaultSiteSettings, ...parsed };
};

const saveSiteSettings = async (settings) => {
    await db.run(
        `
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        `,
        'siteSettings',
        JSON.stringify(settings),
        nowMs()
    );
};

const upsertPopup = async (popupId, popup) => {
    await db.run(
        `
        INSERT INTO popups (id, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at
        `,
        popupId,
        JSON.stringify(popup),
        nowMs()
    );
};

const runReleaseAutomation = async () => {
    const rows = await db.all('SELECT id, data FROM albums');
    if (!rows.length) {
        return;
    }

    const now = nowMs();
    const nowIso = new Date(now).toISOString();
    const today = todayYmd();
    const pendingUpdates = [];
    const pendingPopupUpserts = [];
    let nextFeaturedAlbumId = null;

    for (const row of rows) {
        const album = safeJsonParse(row.data, null);
        if (!album || typeof album !== 'object') continue;
        if (getAlbumWorkflowStatus(album) === 'draft') continue;

        const publishAtMs = parsePublishAtMs(album);
        const shouldBePublished = publishAtMs ? publishAtMs <= now : true;
        if (!shouldBePublished) continue;

        const hasScheduledPublish = Boolean(publishAtMs);
        const automation = {
            autoFeatureOnRelease: false,
            autoPopupOnRelease: hasScheduledPublish,
            ...(album.releaseAutomation || {}),
        };

        const hasAutomation = Boolean(automation.autoFeatureOnRelease || automation.autoPopupOnRelease);
        if (!hasAutomation) continue;

        if (automation.processedAt) continue;

        if (automation.autoFeatureOnRelease) {
            nextFeaturedAlbumId = album.id;
        }

        if (automation.autoPopupOnRelease) {
            const popupId = buildReleasePopupId(album.id);
            const existingPopupRow = await db.get('SELECT data FROM popups WHERE id = ?', popupId);
            const existingPopup = existingPopupRow ? safeJsonParse(existingPopupRow.data, null) : null;
            const startDate = toIsoDay(publishAtMs || now);
            const endDate = toIsoDay((publishAtMs || now) + DEFAULT_RELEASE_POPUP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

            const popup = {
                ...(existingPopup || {}),
                id: popupId,
                title: (automation.popupTitle || '').trim() || existingPopup?.title || `Nuevo lanzamiento: ${album.title || 'Nuevo album'}`,
                description:
                    (automation.popupDescription || '').trim() ||
                    existingPopup?.description ||
                    album.description ||
                    'Ya disponible en la discografia oficial.',
                imageUrl: existingPopup?.imageUrl || album.coverArt || '',
                linkUrl: `/musica/album/${encodeURIComponent(album.id)}`,
                linkText: (automation.popupLinkText || '').trim() || existingPopup?.linkText || 'Escuchar ahora',
                startDate: existingPopup?.startDate || startDate,
                endDate: existingPopup?.endDate || endDate,
                active: true,
                triggerVersion: Number(existingPopup?.triggerVersion || 0) + 1,
                lastTriggeredAt: nowIso,
            };

            pendingPopupUpserts.push({ id: popupId, popup });
        }

        album.releaseAutomation = {
            ...automation,
            processedAt: nowIso,
        };
        pendingUpdates.push({ id: row.id, album });
    }

    if (!pendingUpdates.length && !pendingPopupUpserts.length && !nextFeaturedAlbumId) {
        return;
    }

    if (nextFeaturedAlbumId) {
        const siteSettings = await loadSiteSettings();
        if (siteSettings.featuredAlbumId !== nextFeaturedAlbumId) {
            siteSettings.featuredAlbumId = nextFeaturedAlbumId;
            await saveSiteSettings(siteSettings);
        }
    }

    for (const popupUpdate of pendingPopupUpserts) {
        await upsertPopup(popupUpdate.id, popupUpdate.popup);
    }

    for (const update of pendingUpdates) {
        await db.run(
            'UPDATE albums SET data = ?, updated_at = ? WHERE id = ?',
            JSON.stringify(update.album),
            nowMs(),
            update.id
        );
    }
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (_req, res) => {
    res.json({
        ok: true,
        provider: 'supabase',
        supabaseUrl: SUPABASE_URL,
        audioBucket: SUPABASE_AUDIO_BUCKET,
        assetsBucket: SUPABASE_ASSETS_BUCKET,
    });
});

// ===== Image uploads =====
app.post('/api/uploads/image', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Archivo no enviado' });
            return;
        }

        if (!req.file.mimetype?.startsWith('image/')) {
            res.status(400).json({ error: 'Solo se permiten imagenes' });
            return;
        }

        const scope = sanitizeScope(String(req.query.scope || 'general'));

        let ext = path.extname(req.file.originalname || '').toLowerCase();
        if (!ext) {
            if (req.file.mimetype === 'image/png') ext = '.png';
            else if (req.file.mimetype === 'image/webp') ext = '.webp';
            else if (req.file.mimetype === 'image/gif') ext = '.gif';
            else if (req.file.mimetype === 'image/svg+xml') ext = '.svg';
            else ext = '.jpg';
        }

        const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);
        if (!allowed.has(ext)) {
            ext = '.jpg';
        }

        const fileName = `${scope}-${nowMs()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        const objectPath = `images/${scope}/${fileName}`;
        await uploadStorageObject(SUPABASE_ASSETS_BUCKET, objectPath, req.file.buffer, req.file.mimetype);
        const publicUrl = getStoragePublicUrl(SUPABASE_ASSETS_BUCKET, objectPath);

        res.json({
            url: publicUrl,
        });
    } catch (error) {
        next(error);
    }
});

// ===== Video uploads =====
app.post('/api/uploads/video', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Archivo no enviado' });
            return;
        }

        if (!req.file.mimetype?.startsWith('video/')) {
            res.status(400).json({ error: 'Solo se permiten videos' });
            return;
        }

        const scope = sanitizeScope(String(req.query.scope || 'general'));

        let ext = path.extname(req.file.originalname || '').toLowerCase();
        if (!ext) {
            if (req.file.mimetype === 'video/webm') ext = '.webm';
            else if (req.file.mimetype === 'video/ogg') ext = '.ogv';
            else ext = '.mp4';
        }

        const allowed = new Set(['.mp4', '.webm', '.ogv', '.mov', '.m4v']);
        if (!allowed.has(ext)) {
            ext = '.mp4';
        }

        const fileName = `${scope}-${nowMs()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        const objectPath = `videos/${scope}/${fileName}`;
        await uploadStorageObject(SUPABASE_ASSETS_BUCKET, objectPath, req.file.buffer, req.file.mimetype);
        const publicUrl = getStoragePublicUrl(SUPABASE_ASSETS_BUCKET, objectPath);

        res.json({
            url: publicUrl,
        });
    } catch (error) {
        next(error);
    }
});

// ===== Albums =====
app.get('/api/albums', async (_req, res, next) => {
    try {
        await runReleaseAutomation();
        const includeUnpublished =
            String(_req.query.includeUnpublished || '').toLowerCase() === 'true' ||
            String(_req.query.includeUnpublished || '') === '1';
        const rows = await db.all('SELECT data FROM albums');
        const now = nowMs();
        const albums = sortAlbumsByMusicDate(
            rows
            .map(row => safeJsonParse(row.data, null))
            .filter(Boolean)
            .filter((album) => includeUnpublished || isAlbumPublished(album, now))
        );
        res.json(albums);
    } catch (error) {
        next(error);
    }
});

app.get('/api/albums/:id', async (req, res, next) => {
    try {
        await runReleaseAutomation();
        const includeUnpublished =
            String(req.query.includeUnpublished || '').toLowerCase() === 'true' ||
            String(req.query.includeUnpublished || '') === '1';
        const row = await db.get('SELECT data FROM albums WHERE id = ?', req.params.id);
        if (!row) {
            res.status(404).json({ error: 'Album no encontrado' });
            return;
        }
        const album = safeJsonParse(row.data, null);
        if (!album) {
            res.status(404).json({ error: 'Album no encontrado' });
            return;
        }
        if (!includeUnpublished && !isAlbumPublished(album, nowMs())) {
            res.status(404).json({ error: 'Album no encontrado' });
            return;
        }
        res.json(album);
    } catch (error) {
        next(error);
    }
});

app.put('/api/albums/:id', async (req, res, next) => {
    try {
        const album = req.body;
        if (!album || typeof album !== 'object') {
            res.status(400).json({ error: 'Body invalido' });
            return;
        }

        const previousRow = await db.get('SELECT data FROM albums WHERE id = ?', req.params.id);
        const previousAlbum = previousRow ? safeJsonParse(previousRow.data, null) : null;

        const albumToStore = {
            ...album,
            id: req.params.id,
        };
        albumToStore.workflowStatus = getAlbumWorkflowStatus(albumToStore);

        const previousPublishAt = typeof previousAlbum?.publishAt === 'string' ? previousAlbum.publishAt : '';
        const nextPublishAt = typeof albumToStore?.publishAt === 'string' ? albumToStore.publishAt : '';
        const releaseAutomation = { ...(albumToStore.releaseAutomation || {}) };
        if (previousPublishAt !== nextPublishAt) {
            delete releaseAutomation.processedAt;
        }
        if (nextPublishAt && Date.parse(nextPublishAt) > nowMs()) {
            delete releaseAutomation.processedAt;
        }
        albumToStore.releaseAutomation = releaseAutomation;

        await db.run(
            `
            INSERT INTO albums (id, data, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              data = excluded.data,
              updated_at = excluded.updated_at
            `,
            req.params.id,
            JSON.stringify(albumToStore),
            nowMs()
        );

        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/albums/:id', async (req, res, next) => {
    try {
        const row = await db.get('SELECT data FROM albums WHERE id = ?', req.params.id);
        if (row) {
            const album = safeJsonParse(row.data, { tracks: [] });
            if (Array.isArray(album.tracks)) {
                for (const track of album.tracks) {
                    const audio = await db.get('SELECT file_path FROM audio_files WHERE track_id = ?', track.id);
                    if (audio?.file_path) {
                        await removeStorageObject(SUPABASE_AUDIO_BUCKET, audio.file_path);
                    }
                    await db.run('DELETE FROM audio_files WHERE track_id = ?', track.id);
                }
            }
        }

        await db.run('DELETE FROM albums WHERE id = ?', req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ===== Playlists =====
app.get('/api/playlists', async (req, res, next) => {
    try {
        const includePrivate =
            String(req.query.includePrivate || '').toLowerCase() === 'true' ||
            String(req.query.includePrivate || '') === '1';

        const rows = await db.all('SELECT data FROM playlists ORDER BY updated_at DESC');
        const playlists = rows
            .map((row) => safeJsonParse(row.data, null))
            .filter(Boolean)
            .filter((playlist) => includePrivate || playlist.isPublic !== false);

        res.json(playlists);
    } catch (error) {
        next(error);
    }
});

app.get('/api/playlists/:id', async (req, res, next) => {
    try {
        const includePrivate =
            String(req.query.includePrivate || '').toLowerCase() === 'true' ||
            String(req.query.includePrivate || '') === '1';

        const row = await db.get('SELECT data FROM playlists WHERE id = ?', req.params.id);
        if (!row) {
            res.status(404).json({ error: 'Playlist no encontrada' });
            return;
        }

        const playlist = safeJsonParse(row.data, null);
        if (!playlist) {
            res.status(404).json({ error: 'Playlist no encontrada' });
            return;
        }

        if (!includePrivate && playlist.isPublic === false) {
            res.status(404).json({ error: 'Playlist no encontrada' });
            return;
        }

        res.json(playlist);
    } catch (error) {
        next(error);
    }
});

app.put('/api/playlists/:id', async (req, res, next) => {
    try {
        const safeId = sanitizePlaylistId(req.params.id);
        if (!safeId) {
            res.status(400).json({ error: 'Id de playlist invalido' });
            return;
        }

        const existingRow = await db.get('SELECT data FROM playlists WHERE id = ?', safeId);
        const existing = existingRow ? safeJsonParse(existingRow.data, null) : null;

        const normalized = normalizePlaylistPayload(
            {
                ...(req.body || {}),
                id: safeId,
            },
            {
                fallbackId: safeId,
                existingCreatedAt: existing?.createdAt,
            }
        );

        await db.run(
            `
            INSERT INTO playlists (id, data, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              data = excluded.data,
              updated_at = excluded.updated_at
            `,
            safeId,
            JSON.stringify(normalized),
            nowMs()
        );

        res.json({ ok: true, playlist: normalized });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/playlists/:id', async (req, res, next) => {
    try {
        await db.run('DELETE FROM playlists WHERE id = ?', req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ===== Audio files =====
app.post('/api/tracks/:trackId/audio', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Archivo no enviado' });
            return;
        }

        const trackId = req.params.trackId;
        const safeTrack = sanitizeTrackId(trackId);
        const ext = resolveAudioExtension(req.file);
        const mimeType = normalizeAudioMimeType(req.file.mimetype, ext);

        if (!AUDIO_ALLOWED_EXTENSIONS.has(ext)) {
            res.status(400).json({ error: 'Formato de audio no soportado' });
            return;
        }

        const fileName = `${safeTrack}-${nowMs()}${ext}`;
        const filePath = `tracks/${safeTrack}/${fileName}`;

        const previous = await db.get('SELECT file_path FROM audio_files WHERE track_id = ?', trackId);
        if (previous?.file_path) {
            await removeStorageObject(SUPABASE_AUDIO_BUCKET, previous.file_path);
        }

        await uploadStorageObject(SUPABASE_AUDIO_BUCKET, filePath, req.file.buffer, mimeType);

        await db.run(
            `
            INSERT INTO audio_files (track_id, file_name, mime_type, file_path, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(track_id) DO UPDATE SET
              file_name = excluded.file_name,
              mime_type = excluded.mime_type,
              file_path = excluded.file_path,
              updated_at = excluded.updated_at
            `,
            trackId,
            fileName,
            mimeType,
            filePath,
            nowMs()
        );

        res.json({
            id: `audio-${trackId}`,
            trackId,
            url: getAudioPublicUrl(trackId),
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/tracks/:trackId/audio-info', async (req, res, next) => {
    try {
        const row = await db.get(
            'SELECT track_id, updated_at FROM audio_files WHERE track_id = ?',
            req.params.trackId
        );
        const exists = !!row;
        res.json({
            exists,
            url: exists ? getAudioPublicUrl(req.params.trackId) : null,
            updatedAt: exists ? Number(row.updated_at || 0) : null,
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/tracks/:trackId/audio', async (req, res, next) => {
    try {
        const row = await db.get(
            'SELECT file_path, mime_type, file_name FROM audio_files WHERE track_id = ?',
            req.params.trackId
        );
        if (!row) {
            res.status(404).json({ error: 'Audio no encontrado' });
            return;
        }

        const audioBuffer = await downloadStorageObject(SUPABASE_AUDIO_BUCKET, row.file_path);
        if (!audioBuffer) {
            res.status(404).json({ error: 'Audio no encontrado' });
            return;
        }

        res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${row.file_name}"`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(audioBuffer);
    } catch (error) {
        next(error);
    }
});

app.delete('/api/tracks/:trackId/audio', async (req, res, next) => {
    try {
        const row = await db.get('SELECT file_path FROM audio_files WHERE track_id = ?', req.params.trackId);
        if (row?.file_path) {
            await removeStorageObject(SUPABASE_AUDIO_BUCKET, row.file_path);
        }
        await db.run('DELETE FROM audio_files WHERE track_id = ?', req.params.trackId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ===== Settings =====
app.get('/api/settings/:key', async (req, res, next) => {
    try {
        const row = await db.get('SELECT value FROM settings WHERE key = ?', req.params.key);
        if (!row) {
            res.status(404).json({ error: 'Setting no encontrado' });
            return;
        }
        res.json({
            key: req.params.key,
            value: safeJsonParse(row.value, null),
        });
    } catch (error) {
        next(error);
    }
});

app.put('/api/settings/:key', async (req, res, next) => {
    try {
        const key = req.params.key;
        await db.run(
            `
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
            `,
            key,
            JSON.stringify(req.body?.value ?? null),
            nowMs()
        );
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.get('/api/site-settings', async (_req, res, next) => {
    try {
        await runReleaseAutomation();
        const row = await db.get('SELECT value FROM settings WHERE key = ?', 'siteSettings');
        if (!row) {
            res.json(defaultSiteSettings);
            return;
        }
        const parsed = safeJsonParse(row.value, defaultSiteSettings);
        res.json({ ...defaultSiteSettings, ...parsed });
    } catch (error) {
        next(error);
    }
});

app.put('/api/site-settings', async (req, res, next) => {
    try {
        const merged = {
            ...defaultSiteSettings,
            ...(req.body || {}),
        };
        await db.run(
            `
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
            `,
            'siteSettings',
            JSON.stringify(merged),
            nowMs()
        );
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

// ===== User library state (queue/favorites/recent) =====
app.get('/api/library-state/:userKey', async (req, res, next) => {
    try {
        const userKey = sanitizeUserKey(req.params.userKey);
        if (!userKey) {
            res.status(400).json({ error: 'userKey invalido' });
            return;
        }

        const row = await db.get('SELECT data, updated_at FROM user_library_states WHERE user_key = ?', userKey);
        if (!row) {
            res.json({
                userKey,
                state: normalizeLibraryState({}),
                updatedAt: null,
            });
            return;
        }

        const parsed = safeJsonParse(row.data, {});
        res.json({
            userKey,
            state: normalizeLibraryState(parsed),
            updatedAt: row.updated_at || null,
        });
    } catch (error) {
        next(error);
    }
});

app.put('/api/library-state/:userKey', async (req, res, next) => {
    try {
        const userKey = sanitizeUserKey(req.params.userKey);
        if (!userKey) {
            res.status(400).json({ error: 'userKey invalido' });
            return;
        }

        const normalizedState = normalizeLibraryState(req.body || {});

        await db.run(
            `
            INSERT INTO user_library_states (user_key, data, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_key) DO UPDATE SET
              data = excluded.data,
              updated_at = excluded.updated_at
            `,
            userKey,
            JSON.stringify(normalizedState),
            nowMs()
        );

        res.json({ ok: true, userKey, state: normalizedState });
    } catch (error) {
        next(error);
    }
});

// ===== Release preregistrations =====
app.post('/api/releases/:albumId/preregistrations', async (req, res, next) => {
    try {
        const albumId = String(req.params.albumId || '').trim();
        if (!albumId) {
            res.status(400).json({ error: 'albumId invalido' });
            return;
        }

        const email = sanitizeReleasePreregEmail(req.body?.email);
        if (!email) {
            res.status(400).json({ error: 'Email invalido' });
            return;
        }

        const name = sanitizeReleasePreregName(req.body?.name);
        const existing = await db.get(
            'SELECT id FROM release_preregistrations WHERE album_id = ? AND email = ?',
            albumId,
            email
        );

        const preregId = existing?.id || `prereg-${nowMs()}-${Math.random().toString(36).slice(2, 10)}`;
        const now = nowMs();

        await db.run(
            `
            INSERT INTO release_preregistrations (id, album_id, email, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(album_id, email) DO UPDATE SET
              name = excluded.name,
              updated_at = excluded.updated_at
            `,
            preregId,
            albumId,
            email,
            name,
            now,
            now
        );

        const countRow = await db.get(
            'SELECT COUNT(*) as count FROM release_preregistrations WHERE album_id = ?',
            albumId
        );

        res.json({
            ok: true,
            alreadyExists: Boolean(existing),
            count: Number(countRow?.count || 0),
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/releases/:albumId/preregistrations/count', async (req, res, next) => {
    try {
        const albumId = String(req.params.albumId || '').trim();
        if (!albumId) {
            res.status(400).json({ error: 'albumId invalido' });
            return;
        }

        const row = await db.get(
            'SELECT COUNT(*) as count FROM release_preregistrations WHERE album_id = ?',
            albumId
        );
        res.json({ count: Number(row?.count || 0) });
    } catch (error) {
        next(error);
    }
});

// ===== Play events =====
app.post('/api/play-events', async (req, res, next) => {
    try {
        const event = req.body || {};
        const id = event.id || `play-${nowMs()}-${Math.random().toString(36).slice(2, 10)}`;
        const timestamp = Number(event.timestamp) || nowMs();
        const date = event.date || todayYmd();

        await db.run(
            `
            INSERT OR REPLACE INTO play_events (id, track_id, album_id, timestamp, date)
            VALUES (?, ?, ?, ?, ?)
            `,
            id,
            String(event.trackId || ''),
            String(event.albumId || ''),
            timestamp,
            date
        );

        res.json({ ok: true, id });
    } catch (error) {
        next(error);
    }
});

app.get('/api/play-events', async (_req, res, next) => {
    try {
        const rows = await db.all(
            'SELECT id, track_id as trackId, album_id as albumId, timestamp, date FROM play_events ORDER BY timestamp DESC'
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.get('/api/play-events/track/:trackId', async (req, res, next) => {
    try {
        const rows = await db.all(
            'SELECT id, track_id as trackId, album_id as albumId, timestamp, date FROM play_events WHERE track_id = ? ORDER BY timestamp DESC',
            req.params.trackId
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// ===== Messages =====
app.get('/api/messages', async (_req, res, next) => {
    try {
        const rows = await db.all('SELECT data FROM messages ORDER BY timestamp DESC');
        const messages = rows.map(row => safeJsonParse(row.data, null)).filter(Boolean);
        res.json(messages);
    } catch (error) {
        next(error);
    }
});

app.post('/api/messages', async (req, res, next) => {
    try {
        const message = req.body || {};
        const payload = {
            id: message.id || `msg-${nowMs()}-${Math.random().toString(36).slice(2, 10)}`,
            name: message.name || '',
            email: message.email || '',
            subject: message.subject || '',
            message: message.message || '',
            timestamp: Number(message.timestamp) || nowMs(),
            read: !!message.read,
        };

        await db.run(
            `
            INSERT OR REPLACE INTO messages (id, data, timestamp, read)
            VALUES (?, ?, ?, ?)
            `,
            payload.id,
            JSON.stringify(payload),
            payload.timestamp,
            payload.read ? 1 : 0
        );

        res.status(201).json(payload);
    } catch (error) {
        next(error);
    }
});

app.patch('/api/messages/:id/read', async (req, res, next) => {
    try {
        const row = await db.get('SELECT data FROM messages WHERE id = ?', req.params.id);
        if (!row) {
            res.status(404).json({ error: 'Mensaje no encontrado' });
            return;
        }
        const current = safeJsonParse(row.data, null);
        if (!current) {
            res.status(500).json({ error: 'Mensaje corrupto' });
            return;
        }
        const updated = { ...current, read: true };
        await db.run(
            'UPDATE messages SET data = ?, read = 1 WHERE id = ?',
            JSON.stringify(updated),
            req.params.id
        );
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/messages/:id', async (req, res, next) => {
    try {
        await db.run('DELETE FROM messages WHERE id = ?', req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

app.get('/api/messages/unread-count', async (_req, res, next) => {
    try {
        const row = await db.get('SELECT COUNT(*) as count FROM messages WHERE read = 0');
        res.json({ count: row?.count ?? 0 });
    } catch (error) {
        next(error);
    }
});

// ===== Popups =====
app.get('/api/popups', async (_req, res, next) => {
    try {
        const rows = await db.all('SELECT data FROM popups ORDER BY updated_at DESC');
        const popups = rows.map(row => safeJsonParse(row.data, null)).filter(Boolean);
        res.json(popups);
    } catch (error) {
        next(error);
    }
});

app.get('/api/popups/active', async (_req, res, next) => {
    try {
        await runReleaseAutomation();
        const rows = await db.all('SELECT data FROM popups ORDER BY updated_at DESC');
        const today = todayYmd();
        const popups = rows
            .map(row => safeJsonParse(row.data, null))
            .filter(Boolean)
            .filter(p => p.active && p.startDate <= today && p.endDate >= today);
        res.json(popups);
    } catch (error) {
        next(error);
    }
});

app.put('/api/popups/:id', async (req, res, next) => {
    try {
        const popup = {
            ...(req.body || {}),
            id: req.params.id,
        };
        await db.run(
            `
            INSERT INTO popups (id, data, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              data = excluded.data,
              updated_at = excluded.updated_at
            `,
            req.params.id,
            JSON.stringify(popup),
            nowMs()
        );
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/popups/:id', async (req, res, next) => {
    try {
        await db.run('DELETE FROM popups WHERE id = ?', req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ===== Export / clear =====
app.get('/api/export', async (_req, res, next) => {
    try {
        const albumRows = await db.all('SELECT data FROM albums ORDER BY updated_at DESC');
        const playlistRows = await db.all('SELECT data FROM playlists ORDER BY updated_at DESC');
        const albums = albumRows.map(row => safeJsonParse(row.data, null)).filter(Boolean);
        const playlists = playlistRows.map((row) => safeJsonParse(row.data, null)).filter(Boolean);
        res.json({ albums, playlists });
    } catch (error) {
        next(error);
    }
});

app.post('/api/clear', async (_req, res, next) => {
    try {
        const audioRows = await db.all('SELECT track_id, file_path FROM audio_files');
        for (const row of audioRows) {
            await removeStorageObject(SUPABASE_AUDIO_BUCKET, row.file_path);
        }

        await db.run('DELETE FROM albums');
        await db.run('DELETE FROM playlists');
        await db.run('DELETE FROM audio_files');
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

const escapeHtml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const withAbsoluteUrl = (origin, raw) => {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
};

const upsertMetaTag = (html, key, value, by = 'name') => {
    const safeValue = escapeHtml(value);
    const safeKey = escapeHtml(key);
    const tag = `<meta ${by}="${safeKey}" content="${safeValue}" />`;
    const regex = new RegExp(`<meta\\s+[^>]*${by}=["']${escapeRegExp(key)}["'][^>]*>`, 'i');
    if (regex.test(html)) {
        return html.replace(regex, tag);
    }
    return html.replace('</head>', `  ${tag}\n</head>`);
};

const injectSeoMeta = (html, meta) => {
    let next = html;
    next = next.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
    next = upsertMetaTag(next, 'description', meta.description, 'name');
    next = upsertMetaTag(next, 'og:type', meta.ogType || 'website', 'property');
    next = upsertMetaTag(next, 'og:url', meta.url, 'property');
    next = upsertMetaTag(next, 'og:title', meta.title, 'property');
    next = upsertMetaTag(next, 'og:description', meta.description, 'property');
    next = upsertMetaTag(next, 'og:image', meta.image, 'property');
    next = upsertMetaTag(next, 'twitter:card', 'summary_large_image', 'name');
    next = upsertMetaTag(next, 'twitter:url', meta.url, 'name');
    next = upsertMetaTag(next, 'twitter:title', meta.title, 'name');
    next = upsertMetaTag(next, 'twitter:description', meta.description, 'name');
    next = upsertMetaTag(next, 'twitter:image', meta.image, 'name');
    return next;
};

// ===== Static frontend in production =====
const distDir = path.join(projectRoot, 'dist');
try {
    await fs.access(distDir);
    const indexTemplate = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');

    const sendTemplate = (res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(indexTemplate);
    };

    app.get('/musica/album/:albumId', async (req, res) => {
        try {
            await runReleaseAutomation();
            const row = await db.get('SELECT data FROM albums WHERE id = ?', req.params.albumId);
            const album = row ? safeJsonParse(row.data, null) : null;
            if (!album || !isAlbumPublished(album, nowMs())) {
                sendTemplate(res);
                return;
            }

            const origin = `${req.protocol}://${req.get('host')}`;
            const title = `${album.title || 'Album'} | fgarola`;
            const description =
                String(album.description || '').trim() ||
                `Escucha ${album.title || 'este lanzamiento'} en fgarola.`;
            const image = withAbsoluteUrl(origin, album.coverArt || '/images/albums/default.svg');
            const url = `${origin}/musica/album/${encodeURIComponent(album.id)}`;

            const html = injectSeoMeta(indexTemplate, {
                title,
                description,
                image,
                url,
                ogType: 'music.album',
            });

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch {
            sendTemplate(res);
        }
    });

    app.get('/playlist/:playlistId', async (req, res) => {
        try {
            const row = await db.get('SELECT data FROM playlists WHERE id = ?', req.params.playlistId);
            const playlist = row ? safeJsonParse(row.data, null) : null;
            if (!playlist || playlist.isPublic === false) {
                sendTemplate(res);
                return;
            }

            const origin = `${req.protocol}://${req.get('host')}`;
            const title = `${playlist.title || 'Playlist'} | fgarola`;
            const description =
                String(playlist.description || '').trim() ||
                `Playlist curada con ${Array.isArray(playlist.trackIds) ? playlist.trackIds.length : 0} canciones.`;
            const image = withAbsoluteUrl(origin, playlist.coverArt || '/images/albums/default.svg');
            const url = `${origin}/playlist/${encodeURIComponent(playlist.id)}`;

            const html = injectSeoMeta(indexTemplate, {
                title,
                description,
                image,
                url,
                ogType: 'music.playlist',
            });

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch {
            sendTemplate(res);
        }
    });

    app.use(express.static(distDir));
    app.get(/^\/(?!api).*/, (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
    });
} catch {
    // dist/ might not exist in dev mode; API-only is fine
}

app.use((error, _req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({
                error: 'Archivo demasiado grande',
                details: 'El limite de subida es 500MB por archivo.',
            });
            return;
        }
        res.status(400).json({
            error: 'Error de subida',
            details: error.message,
        });
        return;
    }

    next(error);
});

app.use((error, _req, res, _next) => {
    console.error('[api-error]', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'production' ? undefined : String(error),
    });
});

const server = app.listen(PORT, () => {
    console.log(`[api] running on http://localhost:${PORT}`);
    console.log(`[api] storage: supabase`);
    console.log(`[api] supabase url: ${SUPABASE_URL}`);
    console.log(`[api] audio bucket: ${SUPABASE_AUDIO_BUCKET}`);
    console.log(`[api] assets bucket: ${SUPABASE_ASSETS_BUCKET}`);
});

export { app, db, server };
