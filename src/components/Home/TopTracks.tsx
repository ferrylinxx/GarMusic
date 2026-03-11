import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaFire, FaPlay } from 'react-icons/fa';
import { useDiscography } from '../../context/DiscographyContext';
import { usePlayer } from '../../context/PlayerContext';
import statsService from '../../services/StatsService';
import type { Album, Track } from '../../types/music';
import './TopTracks.css';

interface TrackWithStats extends Track {
    plays: number;
    album?: Album;
}

const TARGET_TOP_TRACKS = 8;
const FETCH_TOP_TRACKS = 14;

const TopTracks = () => {
    const { albums } = useDiscography();
    const { playTrack, prepareTrackPlayback } = usePlayer();
    const [topTracks, setTopTracks] = useState<TrackWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        void loadTopTracks();
    }, [albums]);

    const loadTopTracks = async () => {
        setIsLoading(true);
        try {
            const trackStats = await statsService.getTopTracks(FETCH_TOP_TRACKS);
            const tracksWithStats: TrackWithStats[] = [];
            const usedTrackIds = new Set<string>();

            for (const stat of trackStats) {
                for (const album of albums) {
                    const track = album.tracks.find((item) => item.id === stat.trackId);
                    if (track) {
                        if (usedTrackIds.has(track.id)) break;
                        tracksWithStats.push({
                            ...track,
                            plays: stat.playCount,
                            album,
                        });
                        usedTrackIds.add(track.id);
                        break;
                    }
                }

                if (tracksWithStats.length >= TARGET_TOP_TRACKS) break;
            }

            if (tracksWithStats.length < TARGET_TOP_TRACKS && albums.length > 0) {
                for (const album of albums) {
                    for (const track of album.tracks) {
                        if (usedTrackIds.has(track.id)) continue;
                        tracksWithStats.push({
                            ...track,
                            plays: 0,
                            album,
                        });
                        usedTrackIds.add(track.id);
                        if (tracksWithStats.length >= TARGET_TOP_TRACKS) break;
                    }
                    if (tracksWithStats.length >= TARGET_TOP_TRACKS) break;
                }
            }

            if (tracksWithStats.length === 0 && albums.length > 0) {
                for (const album of albums) {
                    if (!album.tracks[0]) continue;
                    tracksWithStats.push({
                        ...album.tracks[0],
                        plays: 0,
                        album,
                    });
                    if (tracksWithStats.length >= TARGET_TOP_TRACKS) break;
                }
            }

            setTopTracks(tracksWithStats);
        } catch (error) {
            console.error('Error loading top tracks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlay = (track: TrackWithStats) => {
        if (!track.album) return;
        playTrack(track, track.album);
    };

    const formatPlays = (plays: number): string => {
        if (plays >= 1000000) return `${(plays / 1000000).toFixed(1)}M`;
        if (plays >= 1000) return `${(plays / 1000).toFixed(1)}K`;
        return plays.toString();
    };

    const totalPlays = useMemo(() => topTracks.reduce((acc, track) => acc + track.plays, 0), [topTracks]);
    const [featuredTrack, ...otherTracks] = topTracks;

    if (isLoading || topTracks.length === 0) return null;

    return (
        <section className="top-tracks-section container">
            <motion.div
                className="top-tracks-shell"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <div className="top-tracks-headline">
                    <div className="top-tracks-kicker">
                        <FaFire />
                        <span>Top canciones</span>
                    </div>
                    <div className="top-tracks-metrics">
                        <span><strong>{formatPlays(totalPlays)}</strong> reproducciones</span>
                        <span><strong>{topTracks.length}</strong> en rotacion</span>
                    </div>
                </div>

                {featuredTrack && (
                    <motion.button
                        type="button"
                        className="top-track-feature glass"
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35 }}
                        whileHover={{ scale: 1.01 }}
                        onTouchStart={() => prepareTrackPlayback(featuredTrack)}
                        onClick={() => handlePlay(featuredTrack)}
                    >
                        <span className="top-track-feature-rank">#1</span>
                        <div className="top-track-feature-cover">
                            <img
                                src={featuredTrack.album?.coverArt || '/images/default-cover.jpg'}
                                alt={featuredTrack.title}
                            />
                        </div>
                        <div className="top-track-feature-copy">
                            <strong>{featuredTrack.title}</strong>
                            <small>{featuredTrack.album?.title}</small>
                            <span>{formatPlays(featuredTrack.plays)} reproducciones</span>
                        </div>
                        <span className="top-track-feature-play">
                            <FaPlay />
                        </span>
                    </motion.button>
                )}

                <div className="top-track-compact-list">
                    {otherTracks.map((track, index) => (
                        <motion.button
                            key={track.id}
                            type="button"
                            className="top-track-compact-item glass"
                            initial={{ opacity: 0, x: -14 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: index * 0.08 }}
                            whileHover={{ x: 6 }}
                            onTouchStart={() => prepareTrackPlayback(track)}
                            onClick={() => handlePlay(track)}
                        >
                            <span className={`top-track-compact-rank ${index < 2 ? 'top-three' : ''}`}>
                                #{index + 2}
                            </span>

                            <div className="top-track-compact-cover">
                                <img
                                    src={track.album?.coverArt || '/images/default-cover.jpg'}
                                    alt={track.title}
                                />
                            </div>

                            <div className="top-track-compact-copy">
                                <strong>{track.title}</strong>
                                <small>{track.album?.title}</small>
                            </div>

                            <span className="top-track-compact-plays">
                                <FaChartLine />
                                {formatPlays(track.plays)}
                            </span>

                            <span className="top-track-compact-play">
                                <FaPlay />
                            </span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </section>
    );
};

export default TopTracks;
