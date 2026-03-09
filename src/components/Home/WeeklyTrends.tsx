import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaPlay, FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { useDiscography } from '../../context/DiscographyContext';
import { usePlayer } from '../../context/PlayerContext';
import statsService from '../../services/StatsService';
import type { Track, Album } from '../../types/music';
import './WeeklyTrends.css';

interface TrendingTrack extends Track {
    plays: number;
    album?: Album;
    trend: 'up' | 'down' | 'same';
    position: number;
}

const TARGET_TREND_TRACKS = 8;
const FETCH_TREND_TRACKS = 14;

const WeeklyTrends = () => {
    const { albums } = useDiscography();
    const { playTrack } = usePlayer();
    const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTrends();
    }, [albums]);

    const loadTrends = async () => {
        setIsLoading(true);
        try {
            // Weekly trends should only use recent plays, not all-time history
            const trackStats = await statsService.getTopTracks(FETCH_TREND_TRACKS, { days: 7 });

            const trending: TrendingTrack[] = [];
            const usedTrackIds = new Set<string>();

            for (let i = 0; i < trackStats.length; i++) {
                const stat = trackStats[i];
                for (const album of albums) {
                    const track = album.tracks.find(t => t.id === stat.trackId);
                    if (track) {
                        if (usedTrackIds.has(track.id)) break;
                        trending.push({
                            ...track,
                            plays: stat.playCount,
                            album,
                            trend: i < 2 ? 'up' : i === 2 ? 'same' : 'down',
                            position: i + 1
                        });
                        usedTrackIds.add(track.id);
                        break;
                    }
                }

                if (trending.length >= TARGET_TREND_TRACKS) break;
            }

            if (trending.length < TARGET_TREND_TRACKS && albums.length > 0) {
                for (const album of albums) {
                    for (const track of album.tracks) {
                        if (usedTrackIds.has(track.id)) continue;
                        const position = trending.length + 1;
                        trending.push({
                            ...track,
                            plays: 0,
                            album,
                            trend: position <= 2 ? 'up' : position === 3 ? 'same' : 'down',
                            position,
                        });
                        usedTrackIds.add(track.id);
                        if (trending.length >= TARGET_TREND_TRACKS) break;
                    }
                    if (trending.length >= TARGET_TREND_TRACKS) break;
                }
            }

            setTrendingTracks(trending);
        } catch (error) {
            console.error('Error loading trends:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlay = (track: TrendingTrack) => {
        if (track.album) {
            playTrack(track, track.album);
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up': return <FaArrowUp className="trend-up" />;
            case 'down': return <FaArrowDown className="trend-down" />;
            default: return <FaMinus className="trend-same" />;
        }
    };

    if (isLoading || trendingTracks.length === 0) return null;

    return (
        <section className="weekly-trends-section container">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <div className="section-header">
                    <h2 className="section-title">
                        <FaTrophy className="title-icon trophy" />
                        <span className="text-gradient">Tendencias de la Semana</span>
                    </h2>
                    <p className="section-subtitle">Lo más popular en los últimos 7 días</p>
                </div>

                <div className="trends-grid">
                    {trendingTracks.map((track, index) => (
                        <motion.div
                            key={track.id}
                            className={`trend-card glass ${index === 0 ? 'featured' : ''}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            whileHover={{ scale: 1.03 }}
                            onClick={() => handlePlay(track)}
                        >
                            {index === 0 && (
                                <div className="crown-badge">👑 #1</div>
                            )}

                            <div className="trend-cover">
                                <img
                                    src={track.album?.coverArt || '/images/default-cover.jpg'}
                                    alt={track.title}
                                />
                                <div className="play-overlay">
                                    <FaPlay />
                                </div>
                            </div>

                            <div className="trend-info">
                                <div className="trend-position">
                                    <span className="position">#{track.position}</span>
                                    {getTrendIcon(track.trend)}
                                </div>
                                <h3 className="trend-title">{track.title}</h3>
                                <p className="trend-album">{track.album?.title}</p>
                                <span className="trend-plays">{track.plays} reproducciones</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </section>
    );
};

export default WeeklyTrends;
