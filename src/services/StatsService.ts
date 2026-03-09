import db from './DatabaseService';

export interface PlayEvent {
    id: string;
    trackId: string;
    albumId: string;
    timestamp: number;
    date: string; // YYYY-MM-DD
}

export interface TrackStats {
    trackId: string;
    trackTitle: string;
    albumId: string;
    albumTitle: string;
    playCount: number;
    lastPlayed: number;
    sharePercent: number;
}

export interface DailyStats {
    date: string;
    playCount: number;
}

export interface HourlyStats {
    hour: number;
    label: string;
    playCount: number;
}

export interface AlbumStats {
    albumId: string;
    albumTitle: string;
    playCount: number;
    trackCount: number;
    lastPlayed: number;
    sharePercent: number;
}

export interface StatsSummary {
    totalPlays: number;
    uniqueTracks: number;
    uniqueAlbums: number;
    playsToday: number;
    playsThisWeek: number;
    playsInRange: number;
    previousRangePlays: number;
    avgDailyPlays: number;
    growthPercent: number;
    bestDay: DailyStats | null;
    peakHour: HourlyStats | null;
    topAlbum: AlbumStats | null;
}

export interface AnalyticsDashboard {
    summary: StatsSummary;
    topTracks: TrackStats[];
    dailyStats: DailyStats[];
    hourlyStats: HourlyStats[];
    albumStats: AlbumStats[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toYmd = (timestamp: number): string => new Date(timestamp).toISOString().split('T')[0];

const safeTimestamp = (event: PlayEvent): number => {
    const parsed = Number(event.timestamp);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return Date.now();
};

class StatsService {
    async trackPlay(trackId: string, albumId: string): Promise<void> {
        const now = Date.now();
        const event: PlayEvent = {
            id: `play-${now}-${Math.random().toString(36).slice(2, 10)}`,
            trackId,
            albumId,
            timestamp: now,
            date: toYmd(now),
        };
        await db.savePlayEvent(event);
    }

    private async getEvents(): Promise<PlayEvent[]> {
        const events = await db.getAllPlayEvents();
        return events.map((event) => ({
            ...event,
            timestamp: safeTimestamp(event as PlayEvent),
            date: event.date || toYmd(safeTimestamp(event as PlayEvent)),
        }));
    }

    private filterEventsByDays(events: PlayEvent[], days?: number): PlayEvent[] {
        if (!days || days <= 0) return events;
        const start = Date.now() - (days - 1) * DAY_MS;
        return events.filter((event) => safeTimestamp(event) >= start);
    }

    private buildDailyStats(events: PlayEvent[], days: number): DailyStats[] {
        const map: Record<string, number> = {};
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * DAY_MS);
            map[toYmd(date.getTime())] = 0;
        }
        for (const event of events) {
            const key = event.date || toYmd(safeTimestamp(event));
            if (map[key] !== undefined) {
                map[key] += 1;
            }
        }
        return Object.entries(map).map(([date, playCount]) => ({ date, playCount }));
    }

    async getTotalPlays(): Promise<number> {
        const events = await this.getEvents();
        return events.length;
    }

    async getTrackPlays(trackId: string): Promise<number> {
        const events = await this.getEvents();
        return events.filter((event) => event.trackId === trackId).length;
    }

    async getTopTracks(limit: number = 10, options?: { days?: number }): Promise<TrackStats[]> {
        const events = this.filterEventsByDays(await this.getEvents(), options?.days);
        const albums = await db.getAllAlbums();
        const total = events.length;

        const counter: Record<string, { count: number; lastPlayed: number; albumId: string }> = {};
        for (const event of events) {
            if (!counter[event.trackId]) {
                counter[event.trackId] = {
                    count: 0,
                    lastPlayed: 0,
                    albumId: event.albumId || '',
                };
            }
            counter[event.trackId].count += 1;
            counter[event.trackId].lastPlayed = Math.max(counter[event.trackId].lastPlayed, safeTimestamp(event));
            if (!counter[event.trackId].albumId && event.albumId) {
                counter[event.trackId].albumId = event.albumId;
            }
        }

        const trackLookup = new Map<string, { trackTitle: string; albumId: string; albumTitle: string }>();
        for (const album of albums) {
            for (const track of album.tracks) {
                trackLookup.set(track.id, {
                    trackTitle: track.title,
                    albumId: album.id,
                    albumTitle: album.title,
                });
            }
        }

        const stats: TrackStats[] = Object.entries(counter).map(([trackId, info]) => {
            const lookup = trackLookup.get(trackId);
            const playCount = info.count;
            return {
                trackId,
                trackTitle: lookup?.trackTitle || `Track ${trackId}`,
                albumId: lookup?.albumId || info.albumId || 'unknown',
                albumTitle: lookup?.albumTitle || 'Album desconocido',
                playCount,
                lastPlayed: info.lastPlayed,
                sharePercent: total > 0 ? (playCount / total) * 100 : 0,
            };
        });

        stats.sort((a, b) => b.playCount - a.playCount);
        return stats.slice(0, limit);
    }

    async getDailyStats(days: number = 30): Promise<DailyStats[]> {
        const events = this.filterEventsByDays(await this.getEvents(), days);
        return this.buildDailyStats(events, days);
    }

    async getWeeklyStats(): Promise<DailyStats[]> {
        return this.getDailyStats(7);
    }

    async getMonthlyStats(): Promise<DailyStats[]> {
        return this.getDailyStats(30);
    }

    async getAlbumPerformance(limit: number = 8, options?: { days?: number }): Promise<AlbumStats[]> {
        const events = this.filterEventsByDays(await this.getEvents(), options?.days);
        const albums = await db.getAllAlbums();
        const total = events.length;

        const albumMap: Record<string, { playCount: number; lastPlayed: number }> = {};
        for (const event of events) {
            const albumId = event.albumId || 'unknown';
            if (!albumMap[albumId]) {
                albumMap[albumId] = { playCount: 0, lastPlayed: 0 };
            }
            albumMap[albumId].playCount += 1;
            albumMap[albumId].lastPlayed = Math.max(albumMap[albumId].lastPlayed, safeTimestamp(event));
        }

        const albumLookup = new Map(albums.map((album) => [album.id, album]));
        const stats: AlbumStats[] = Object.entries(albumMap).map(([albumId, info]) => {
            const album = albumLookup.get(albumId);
            return {
                albumId,
                albumTitle: album?.title || 'Album desconocido',
                playCount: info.playCount,
                trackCount: album?.tracks.length || 0,
                lastPlayed: info.lastPlayed,
                sharePercent: total > 0 ? (info.playCount / total) * 100 : 0,
            };
        });

        stats.sort((a, b) => b.playCount - a.playCount);
        return stats.slice(0, limit);
    }

    async getHourlyStats(options?: { days?: number }): Promise<HourlyStats[]> {
        const events = this.filterEventsByDays(await this.getEvents(), options?.days);
        const bucket = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            label: `${hour.toString().padStart(2, '0')}:00`,
            playCount: 0,
        }));

        for (const event of events) {
            const hour = new Date(safeTimestamp(event)).getHours();
            bucket[hour].playCount += 1;
        }

        return bucket;
    }

    async getStatsSummary(days: number = 30): Promise<StatsSummary> {
        const events = await this.getEvents();
        const inRange = this.filterEventsByDays(events, days);
        const prevRangeStart = Date.now() - (days * 2 - 1) * DAY_MS;
        const prevRangeEnd = Date.now() - days * DAY_MS;
        const previousRange = events.filter((event) => {
            const ts = safeTimestamp(event);
            return ts >= prevRangeStart && ts < prevRangeEnd;
        });

        const today = toYmd(Date.now());
        const weekAgo = Date.now() - 6 * DAY_MS;
        const uniqueTracks = new Set(events.map((event) => event.trackId)).size;
        const uniqueAlbums = new Set(events.map((event) => event.albumId).filter(Boolean)).size;
        const playsToday = events.filter((event) => event.date === today).length;
        const playsThisWeek = events.filter((event) => safeTimestamp(event) >= weekAgo).length;
        const playsInRange = inRange.length;
        const previousRangePlays = previousRange.length;
        const avgDailyPlays = days > 0 ? playsInRange / days : 0;
        const growthPercent =
            previousRangePlays === 0
                ? playsInRange > 0
                    ? 100
                    : 0
                : ((playsInRange - previousRangePlays) / previousRangePlays) * 100;

        const dailyStats = this.buildDailyStats(inRange, days);
        const bestDay = dailyStats.reduce<DailyStats | null>((best, current) => {
            if (!best) return current;
            return current.playCount > best.playCount ? current : best;
        }, null);

        const hourlyStats = await this.getHourlyStats({ days });
        const peakHour = hourlyStats.reduce<HourlyStats | null>((best, current) => {
            if (!best) return current;
            return current.playCount > best.playCount ? current : best;
        }, null);

        const [topAlbum] = await this.getAlbumPerformance(1, { days });

        return {
            totalPlays: events.length,
            uniqueTracks,
            uniqueAlbums,
            playsToday,
            playsThisWeek,
            playsInRange,
            previousRangePlays,
            avgDailyPlays,
            growthPercent,
            bestDay,
            peakHour: peakHour && peakHour.playCount > 0 ? peakHour : null,
            topAlbum: topAlbum || null,
        };
    }

    async getAnalyticsDashboard(days: number = 30): Promise<AnalyticsDashboard> {
        const [summary, topTracks, dailyStats, hourlyStats, albumStats] = await Promise.all([
            this.getStatsSummary(days),
            this.getTopTracks(10, { days }),
            this.getDailyStats(days),
            this.getHourlyStats({ days }),
            this.getAlbumPerformance(8, { days }),
        ]);

        return {
            summary,
            topTracks,
            dailyStats,
            hourlyStats,
            albumStats,
        };
    }
}

export const statsService = new StatsService();
export default statsService;
