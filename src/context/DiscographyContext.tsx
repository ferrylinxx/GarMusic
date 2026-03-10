import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Album, Track } from '../types/music';
import db from '../services/DatabaseService';
import { discography as staticAlbums } from '../data/discography';

interface DiscographyContextType {
    albums: Album[];
    tracks: Track[];
    latestRelease: Album | null;
    nextScheduledRelease: Album | null;
    featuredAlbums: Album[];
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    getAlbumById: (id: string) => Album | undefined;
    getAudioUrl: (trackId: string) => Promise<string | null>;
}

const DiscographyContext = createContext<DiscographyContextType | null>(null);

const parsePublishAtMs = (album: Album): number | null => {
    const raw = typeof album.publishAt === 'string' ? album.publishAt.trim() : '';
    if (!raw) return null;

    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseReleaseDateMs = (album: Album): number | null => {
    const raw = typeof album.releaseDate === 'string' ? album.releaseDate.trim() : '';
    if (!raw) return null;

    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
};

const getAlbumSortTimestamp = (album: Album): number => {
    const publishAtMs = parsePublishAtMs(album);
    if (typeof publishAtMs === 'number' && Number.isFinite(publishAtMs)) return publishAtMs;
    const releaseDateMs = parseReleaseDateMs(album);
    if (typeof releaseDateMs === 'number' && Number.isFinite(releaseDateMs)) return releaseDateMs;
    return 0;
};

const compareAlbumsStable = (a: Album, b: Album): number => {
    const dateDiff = getAlbumSortTimestamp(b) - getAlbumSortTimestamp(a);
    if (dateDiff !== 0) return dateDiff;

    const titleDiff = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
    if (titleDiff !== 0) return titleDiff;

    return a.id.localeCompare(b.id, 'es', { sensitivity: 'base' });
};

export const DiscographyProvider = ({ children }: { children: ReactNode }) => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [nextScheduledRelease, setNextScheduledRelease] = useState<Album | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAlbums = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Include unpublished so frontend can render countdown to next release.
            let dbAlbums = await db.getAllAlbums(true);

            if (dbAlbums.length === 0) {
                await db.seedInitialData(staticAlbums);
                dbAlbums = await db.getAllAlbums(true);
            }

            const now = Date.now();

            const publishedAlbums = dbAlbums.filter((album) => {
                const publishAtMs = parsePublishAtMs(album);
                if (!publishAtMs) return true;
                return publishAtMs <= now;
            });

            const upcomingAlbums = dbAlbums
                .filter((album) => {
                    const publishAtMs = parsePublishAtMs(album);
                    if (!publishAtMs) return false;
                    return publishAtMs > now;
                })
                .sort((a, b) => {
                    const aTime = parsePublishAtMs(a) ?? Number.MAX_SAFE_INTEGER;
                    const bTime = parsePublishAtMs(b) ?? Number.MAX_SAFE_INTEGER;
                    return aTime - bTime;
                });

            publishedAlbums.sort(compareAlbumsStable);

            setAlbums(publishedAlbums);
            setNextScheduledRelease(upcomingAlbums[0] || null);
        } catch (err) {
            console.error('Error loading albums:', err);
            setError('Error al cargar la discografia');
            setAlbums(staticAlbums);
            setNextScheduledRelease(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAlbums();
    }, [loadAlbums]);

    const tracks = albums.flatMap((album) =>
        album.tracks.map((track) => ({
            ...track,
            albumId: album.id,
            albumTitle: album.title,
            albumCover: album.coverArt,
        }))
    );

    const latestRelease = albums.length > 0 ? albums[0] : null;
    const featuredAlbums = albums.slice(0, 4);

    const getAlbumById = (id: string) => albums.find((album) => album.id === id);

    const getAudioUrl = async (trackId: string): Promise<string | null> => {
        for (const album of albums) {
            const track = album.tracks.find((item) => item.id === trackId);
            if (track) {
                const immediateUrl = db.getImmediateAudioUrl(track.id, track.audioFile);
                if (immediateUrl) return immediateUrl;
            }
        }

        return db.getAudioFileUrl(trackId);
    };

    return (
        <DiscographyContext.Provider
            value={{
                albums,
                tracks,
                latestRelease,
                nextScheduledRelease,
                featuredAlbums,
                isLoading,
                error,
                refreshData: loadAlbums,
                getAlbumById,
                getAudioUrl,
            }}
        >
            {children}
        </DiscographyContext.Provider>
    );
};

export const useDiscography = (): DiscographyContextType => {
    const context = useContext(DiscographyContext);
    if (!context) {
        throw new Error('useDiscography must be used within a DiscographyProvider');
    }
    return context;
};

export default DiscographyContext;
