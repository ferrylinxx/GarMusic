import type { Album } from '../types/music';

const ALBUM_PREVIEW_PREFIX = 'fgarola_album_preview:';

const getAlbumPreviewStorageKey = (albumId: string): string => `${ALBUM_PREVIEW_PREFIX}${albumId}`;

export const saveAlbumPreview = (album: Album): void => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(getAlbumPreviewStorageKey(album.id), JSON.stringify(album));
    } catch {
        // ignore storage failures in restricted browsing modes
    }
};

export const readAlbumPreview = (albumId: string): Album | null => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = localStorage.getItem(getAlbumPreviewStorageKey(albumId));
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Album | null;
        if (!parsed || typeof parsed !== 'object') return null;
        if (parsed.id !== albumId || !Array.isArray(parsed.tracks)) return null;
        return parsed;
    } catch {
        return null;
    }
};
