import { Album, Playlist, Track } from '../types/music';

// Types for stats
export interface PlayEvent {
    id: string;
    trackId: string;
    albumId: string;
    timestamp: number;
    date: string;
}

// Types for messages
export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    timestamp: number;
    read: boolean;
}

// Types for popups
export interface Popup {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    linkUrl?: string;
    linkText?: string;
    startDate: string;
    endDate: string;
    active: boolean;
    triggerVersion?: number;
    lastTriggeredAt?: string;
}

// Types for site settings
export interface SiteSettings {
    heroTitle: string;
    heroSubtitles: string[];
    heroVideoUrl: string;
    heroDescription: string;
    spotifyUrl: string;
    instagramUrl: string;
    youtubeUrl: string;
    twitterUrl: string;
    tiktokUrl: string;
    spotifyFollowers: number;
    instagramFollowers: number;
    youtubeFollowers: number;
    kofiUrl: string;
    patreonUrl: string;
    paypalUrl: string;
    bioContent: string;
    bioImage: string;
    accentPrimary: string;
    accentSecondary: string;
    featuredAlbumId: string | null;
    homePersonalTitle: string;
    homePersonalDescription: string;
    homeCountdownTitle: string;
    homeCountdownDescription: string;
    homeSpotlightTitle: string;
    homeSpotlightDescription: string;
    homeDiscoveryTitle: string;
    homeDiscoveryDescription: string;
    homeSignalsTitle: string;
    homeSignalsDescription: string;
    homeCommunityTitle: string;
    homeCommunityDescription: string;
    homeNewsletterTitle: string;
    homeNewsletterDescription: string;
    homeNewsletterPlaceholder: string;
    homeNewsletterButtonLabel: string;
    musicPageTitle: string;
    musicPageSubtitle: string;
    musicActivityTitle: string;
    musicActivityDescription: string;
    bioHeroTitle: string;
    bioHeroSummary: string;
    bioSidebarTitle: string;
    bioSidebarItems: string[];
}

export interface UserLibraryState {
    queueTrackIds: string[];
    favoriteTrackIds: string[];
    recentTrackIds: string[];
}

export interface ReleasePreregistrationResult {
    ok: boolean;
    alreadyExists: boolean;
    count: number;
}

const rawApiBase = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL || '').trim();
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

const DEFAULT_ALBUM_COVER = '/images/albums/default.svg';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeAlbumType = (value: unknown): Album['type'] => {
    const normalized = toTrimmedString(value).toLowerCase();
    if (!normalized) return 'album';

    if (
        normalized === 'ep' ||
        normalized === 'e.p' ||
        normalized === 'e.p.' ||
        normalized === 'extended-play' ||
        normalized === 'extended_play' ||
        normalized.startsWith('ep ')
    ) {
        return 'ep';
    }

    if (normalized.includes('single')) {
        return 'single';
    }

    return 'album';
};

const normalizeDateOnly = (value: unknown): string => {
    const raw = toTrimmedString(value);
    if (!raw) return new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) {
        return new Date().toISOString().slice(0, 10);
    }
    return new Date(parsed).toISOString().slice(0, 10);
};

const normalizeIsoDatetime = (value: unknown): string | undefined => {
    const raw = toTrimmedString(value);
    if (!raw) return undefined;
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return undefined;
    return new Date(parsed).toISOString();
};

const normalizeTrackDuration = (value: unknown): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const sanitized = value
        .map((item) => toTrimmedString(item))
        .filter(Boolean);
    return sanitized.length > 0 ? sanitized : undefined;
};

const normalizeTrackPayload = (value: unknown, albumId: string, index: number): Track => {
    const source = isObjectRecord(value) ? value : {};
    const normalizedId = toTrimmedString(source.id) || `track-${albumId}-${index + 1}`;
    const normalizedTitle =
        toTrimmedString(source.title) ||
        toTrimmedString(source.name) ||
        `Cancion ${index + 1}`;
    const normalizedAudioFile =
        toTrimmedString(source.audioFile) ||
        toTrimmedString(source.audio_url) ||
        '';

    const credits = isObjectRecord(source.credits)
        ? {
              composers: normalizeStringArray(source.credits.composers),
              producers: normalizeStringArray(source.credits.producers),
              musicians: normalizeStringArray(source.credits.musicians),
              mixingEngineers: normalizeStringArray(source.credits.mixingEngineers),
          }
        : undefined;

    const hasCredits = credits && Object.values(credits).some((entry) => Array.isArray(entry) && entry.length > 0);

    const metadata = isObjectRecord(source.metadata)
        ? {
              genre: toTrimmedString(source.metadata.genre) || undefined,
              language: toTrimmedString(source.metadata.language) || undefined,
              musicalKey: toTrimmedString(source.metadata.musicalKey) || undefined,
          }
        : undefined;

    const hasMetadata = metadata && Object.values(metadata).some((entry) => Boolean(entry));

    return {
        ...(source as Omit<Track, 'id' | 'title' | 'duration' | 'audioFile'>),
        id: normalizedId,
        title: normalizedTitle,
        duration: normalizeTrackDuration(source.duration),
        audioFile: normalizedAudioFile,
        ...(toTrimmedString(source.coverArt) ? { coverArt: toTrimmedString(source.coverArt) } : {}),
        ...(toTrimmedString(source.spotifyUrl) ? { spotifyUrl: toTrimmedString(source.spotifyUrl) } : {}),
        ...(toTrimmedString(source.description) ? { description: toTrimmedString(source.description) } : {}),
        ...(toTrimmedString(source.lyrics) ? { lyrics: String(source.lyrics) } : {}),
        ...(hasCredits ? { credits } : {}),
        ...(hasMetadata ? { metadata } : {}),
    };
};

const normalizeAlbumPayload = (value: unknown, index = 0): Album => {
    const source = isObjectRecord(value) ? value : {};
    const normalizedId = toTrimmedString(source.id) || `album-${index + 1}`;
    const rawTracks = Array.isArray(source.tracks)
        ? source.tracks
        : Array.isArray(source.songs)
        ? source.songs
        : [];
    const normalizedTracks = rawTracks.map((track, trackIndex) =>
        normalizeTrackPayload(track, normalizedId, trackIndex)
    );

    const normalizedWorkflowStatus = toTrimmedString(source.workflowStatus).toLowerCase() === 'draft' ? 'draft' : 'published';
    const normalizedPublishAt = normalizeIsoDatetime(source.publishAt);

    const rawReleaseAutomation = isObjectRecord(source.releaseAutomation) ? source.releaseAutomation : undefined;
    const normalizedReleaseAutomation = rawReleaseAutomation
        ? {
              autoFeatureOnRelease: Boolean(rawReleaseAutomation.autoFeatureOnRelease),
              autoPopupOnRelease: Boolean(rawReleaseAutomation.autoPopupOnRelease),
              popupTitle: toTrimmedString(rawReleaseAutomation.popupTitle),
              popupDescription: toTrimmedString(rawReleaseAutomation.popupDescription),
              popupLinkText: toTrimmedString(rawReleaseAutomation.popupLinkText),
              processedAt: normalizeIsoDatetime(rawReleaseAutomation.processedAt),
          }
        : undefined;

    return {
        ...(source as Omit<Album, 'id' | 'title' | 'type' | 'releaseDate' | 'coverArt' | 'tracks'>),
        id: normalizedId,
        title: toTrimmedString(source.title) || `Lanzamiento ${index + 1}`,
        type: normalizeAlbumType(source.type),
        releaseDate: normalizeDateOnly(source.releaseDate),
        coverArt: toTrimmedString(source.coverArt) || DEFAULT_ALBUM_COVER,
        description: toTrimmedString(source.description),
        spotifyUrl: toTrimmedString(source.spotifyUrl),
        tracks: normalizedTracks,
        workflowStatus: normalizedWorkflowStatus,
        ...(normalizedPublishAt ? { publishAt: normalizedPublishAt } : {}),
        ...(normalizedReleaseAutomation ? { releaseAutomation: normalizedReleaseAutomation } : {}),
    };
};

class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

class DatabaseService {
    private buildUrl(path: string): string {
        return `${API_BASE}${path}`;
    }

    private toAbsoluteUrl(url: string): string {
        if (/^https?:\/\//i.test(url)) {
            return url;
        }
        return this.buildUrl(url);
    }

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const headers = new Headers(init?.headers);
        const isJsonBody = init?.body && !(init.body instanceof FormData);
        if (isJsonBody && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(this.buildUrl(path), {
            ...init,
            headers,
        });

        if (!response.ok) {
            let details = '';
            try {
                details = await response.text();
            } catch {
                details = '';
            }
            throw new ApiError(details || `HTTP ${response.status}`, response.status);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        const text = await response.text();
        if (!text) {
            return undefined as T;
        }
        return JSON.parse(text) as T;
    }

    async init(): Promise<void> {
        // no-op: backend handles initialization
        return Promise.resolve();
    }

    // ============ ALBUMS ============
    async getAllAlbums(includeUnpublished: boolean = false): Promise<Album[]> {
        const query = includeUnpublished ? '?includeUnpublished=true' : '';
        const payload = await this.request<unknown>(`/api/albums${query}`);
        if (!Array.isArray(payload)) {
            return [];
        }
        return payload.map((album, index) => normalizeAlbumPayload(album, index));
    }

    async getAlbum(id: string, includeUnpublished: boolean = false): Promise<Album | undefined> {
        const query = includeUnpublished ? '?includeUnpublished=true' : '';
        try {
            const payload = await this.request<unknown>(`/api/albums/${encodeURIComponent(id)}${query}`);
            return normalizeAlbumPayload(payload);
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return undefined;
            }
            throw error;
        }
    }

    async saveAlbum(album: Album): Promise<void> {
        await this.request(`/api/albums/${encodeURIComponent(album.id)}`, {
            method: 'PUT',
            body: JSON.stringify(album),
        });
    }

    async deleteAlbum(id: string): Promise<void> {
        await this.request(`/api/albums/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }

    // ============ PLAYLISTS ============
    async getAllPlaylists(includePrivate: boolean = false): Promise<Playlist[]> {
        const query = includePrivate ? '?includePrivate=true' : '';
        return this.request<Playlist[]>(`/api/playlists${query}`);
    }

    async getPlaylist(id: string, includePrivate: boolean = false): Promise<Playlist | null> {
        const query = includePrivate ? '?includePrivate=true' : '';
        try {
            return await this.request<Playlist>(`/api/playlists/${encodeURIComponent(id)}${query}`);
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async savePlaylist(playlist: Playlist): Promise<void> {
        await this.request(`/api/playlists/${encodeURIComponent(playlist.id)}`, {
            method: 'PUT',
            body: JSON.stringify(playlist),
        });
    }

    async deletePlaylist(id: string): Promise<void> {
        await this.request(`/api/playlists/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }

    // ============ AUDIO FILES ============
    async saveAudioFile(trackId: string, file: File): Promise<string> {
        const mimeType = (file.type || '').toLowerCase();
        const fallbackExtension =
            mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a' || mimeType === 'video/mp4'
                ? '.m4a'
                : mimeType === 'audio/aac' || mimeType === 'audio/x-aac'
                ? '.aac'
                : mimeType === 'audio/wav' || mimeType === 'audio/x-wav'
                ? '.wav'
                : mimeType === 'audio/ogg'
                ? '.ogg'
                : '.mp3';

        const normalizedFileName = file.name?.trim() || `audio-${Date.now()}${fallbackExtension}`;
        const formData = new FormData();
        formData.append('file', file, normalizedFileName);

        const response = await this.request<{ id: string }>(
            `/api/tracks/${encodeURIComponent(trackId)}/audio`,
            {
                method: 'POST',
                body: formData,
            }
        );

        return response?.id || `audio-${trackId}`;
    }

    async getAudioFile(trackId: string): Promise<Blob | null> {
        const response = await fetch(this.buildUrl(`/api/tracks/${encodeURIComponent(trackId)}/audio`));
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new ApiError(`Error cargando audio (${response.status})`, response.status);
        }
        return response.blob();
    }

    async getAudioFileUrl(trackId: string): Promise<string | null> {
        try {
            const info = await this.request<{ exists: boolean; url: string | null; updatedAt?: number | null }>(
                `/api/tracks/${encodeURIComponent(trackId)}/audio-info`
            );
            if (!info?.exists || !info.url) {
                return null;
            }
            const absoluteUrl = this.toAbsoluteUrl(info.url);
            const updatedAt = Number(info.updatedAt || 0);
            if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
                return absoluteUrl;
            }
            const separator = absoluteUrl.includes('?') ? '&' : '?';
            return `${absoluteUrl}${separator}v=${updatedAt}`;
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async deleteAudioFile(trackId: string): Promise<void> {
        await this.request(`/api/tracks/${encodeURIComponent(trackId)}/audio`, {
            method: 'DELETE',
        });
    }

    async uploadImageFile(file: File, scope: string = 'general'): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await this.request<{ url: string }>(
            `/api/uploads/image?scope=${encodeURIComponent(scope)}`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response?.url) {
            throw new Error('No se recibio URL de imagen');
        }

        return this.toAbsoluteUrl(response.url);
    }

    async uploadVideoFile(file: File, scope: string = 'general'): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await this.request<{ url: string }>(
            `/api/uploads/video?scope=${encodeURIComponent(scope)}`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response?.url) {
            throw new Error('No se recibio URL de video');
        }

        return this.toAbsoluteUrl(response.url);
    }

    // ============ SETTINGS ============
    async getSetting<T>(key: string): Promise<T | null> {
        try {
            const response = await this.request<{ key: string; value: T }>(
                `/api/settings/${encodeURIComponent(key)}`
            );
            return response.value;
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async setSetting<T>(key: string, value: T): Promise<void> {
        await this.request(`/api/settings/${encodeURIComponent(key)}`, {
            method: 'PUT',
            body: JSON.stringify({ value }),
        });
    }

    async getSiteSettings(): Promise<SiteSettings> {
        try {
            const settings = await this.request<SiteSettings>('/api/site-settings');
            return settings || this.getDefaultSiteSettings();
        } catch {
            return this.getDefaultSiteSettings();
        }
    }

    async saveSiteSettings(settings: SiteSettings): Promise<void> {
        await this.request('/api/site-settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
    }

    // ============ USER LIBRARY STATE ============
    async getUserLibraryState(userKey: string): Promise<UserLibraryState> {
        const response = await this.request<{ userKey: string; state: UserLibraryState }>(
            `/api/library-state/${encodeURIComponent(userKey)}`
        );

        return response?.state || {
            queueTrackIds: [],
            favoriteTrackIds: [],
            recentTrackIds: [],
        };
    }

    async saveUserLibraryState(userKey: string, state: UserLibraryState): Promise<void> {
        await this.request(`/api/library-state/${encodeURIComponent(userKey)}`, {
            method: 'PUT',
            body: JSON.stringify(state),
        });
    }

    // ============ RELEASE PREREGISTRATION ============
    async preregisterForRelease(albumId: string, email: string, name?: string): Promise<ReleasePreregistrationResult> {
        return this.request<ReleasePreregistrationResult>(
            `/api/releases/${encodeURIComponent(albumId)}/preregistrations`,
            {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    name: name || '',
                }),
            }
        );
    }

    async getReleasePreregistrationCount(albumId: string): Promise<number> {
        const response = await this.request<{ count: number }>(
            `/api/releases/${encodeURIComponent(albumId)}/preregistrations/count`
        );
        return Number(response?.count || 0);
    }

    getDefaultSiteSettings(): SiteSettings {
        return {
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
    }

    // ============ PLAY EVENTS (Stats) ============
    async savePlayEvent(event: PlayEvent): Promise<void> {
        await this.request('/api/play-events', {
            method: 'POST',
            body: JSON.stringify(event),
        });
    }

    async getAllPlayEvents(): Promise<PlayEvent[]> {
        return this.request<PlayEvent[]>('/api/play-events');
    }

    async getPlayEventsByTrack(trackId: string): Promise<PlayEvent[]> {
        return this.request<PlayEvent[]>(`/api/play-events/track/${encodeURIComponent(trackId)}`);
    }

    // ============ MESSAGES ============
    async saveMessage(message: ContactMessage): Promise<void> {
        await this.request('/api/messages', {
            method: 'POST',
            body: JSON.stringify(message),
        });
    }

    async getAllMessages(): Promise<ContactMessage[]> {
        return this.request<ContactMessage[]>('/api/messages');
    }

    async markMessageAsRead(id: string): Promise<void> {
        await this.request(`/api/messages/${encodeURIComponent(id)}/read`, {
            method: 'PATCH',
        });
    }

    async deleteMessage(id: string): Promise<void> {
        await this.request(`/api/messages/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }

    async getUnreadMessageCount(): Promise<number> {
        const result = await this.request<{ count: number }>('/api/messages/unread-count');
        return result?.count || 0;
    }

    // ============ POPUPS ============
    async savePopup(popup: Popup): Promise<void> {
        await this.request(`/api/popups/${encodeURIComponent(popup.id)}`, {
            method: 'PUT',
            body: JSON.stringify(popup),
        });
    }

    async getAllPopups(): Promise<Popup[]> {
        return this.request<Popup[]>('/api/popups');
    }

    async getActivePopups(): Promise<Popup[]> {
        return this.request<Popup[]>('/api/popups/active');
    }

    async deletePopup(id: string): Promise<void> {
        await this.request(`/api/popups/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }

    // ============ SEED DATA ============
    async seedInitialData(albums: Album[]): Promise<void> {
        const existing = await this.getAllAlbums(true);
        if (existing.length === 0) {
            for (const album of albums) {
                await this.saveAlbum(album);
            }
        }
    }

    // ============ EXPORT/IMPORT ============
    async exportData(): Promise<{ albums: Album[]; playlists?: Playlist[] }> {
        return this.request<{ albums: Album[]; playlists?: Playlist[] }>('/api/export');
    }

    async clearAll(): Promise<void> {
        await this.request('/api/clear', {
            method: 'POST',
        });
    }
}

export const db = new DatabaseService();
export default db;
