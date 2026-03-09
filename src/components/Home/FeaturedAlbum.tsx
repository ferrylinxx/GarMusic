import { motion } from 'framer-motion';
import { FaStar, FaPlay, FaMusic } from 'react-icons/fa';
import { useDiscography } from '../../context/DiscographyContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { usePlayer } from '../../context/PlayerContext';
import './FeaturedAlbum.css';

const FeaturedAlbum = () => {
    const { albums } = useDiscography();
    const { settings } = useSiteSettings();
    const { playAlbum } = usePlayer();

    // Get featured album from settings or default to newest
    const featuredAlbum = settings.featuredAlbumId
        ? albums.find(a => a.id === settings.featuredAlbumId)
        : albums.length > 0
            ? [...albums].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())[0]
            : null;

    if (!featuredAlbum) return null;

    return (
        <section className="featured-album-section">
            <motion.div
                className="featured-album-container container"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
            >
                {/* Background blur */}
                <div className="featured-bg">
                    <img
                        src={featuredAlbum.coverArt}
                        alt=""
                        className="featured-bg-blur"
                    />
                    <div className="featured-gradient"></div>
                </div>

                <div className="featured-content">
                    <motion.div
                        className="featured-badge"
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <FaStar /> Álbum Destacado
                    </motion.div>

                    <div className="featured-layout">
                        <motion.div
                            className="featured-cover-wrapper"
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <img
                                src={featuredAlbum.coverArt}
                                alt={featuredAlbum.title}
                                className="featured-cover"
                            />
                            <div className="cover-reflection" />
                        </motion.div>

                        <motion.div
                            className="featured-info"
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <span className="album-type">{featuredAlbum.type.toUpperCase()}</span>
                            <h2 className="album-title">{featuredAlbum.title}</h2>

                            <div className="album-meta">
                                <span className="meta-item">
                                    <FaMusic />
                                    {featuredAlbum.tracks.length} canciones
                                </span>
                                <span className="meta-item">
                                    {new Date(featuredAlbum.releaseDate).getFullYear()}
                                </span>
                            </div>

                            {featuredAlbum.description && (
                                <p className="album-description">
                                    {featuredAlbum.description}
                                </p>
                            )}

                            <motion.button
                                className="play-album-btn"
                                onClick={() => playAlbum(featuredAlbum)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FaPlay /> Reproducir Álbum
                            </motion.button>

                            {/* Track list preview */}
                            <div className="track-preview">
                                <span className="preview-label">Canciones:</span>
                                <ul className="track-list">
                                    {featuredAlbum.tracks.slice(0, 4).map((track, i) => (
                                        <li key={track.id}>
                                            <span className="track-num">{i + 1}</span>
                                            <span className="track-name">{track.title}</span>
                                        </li>
                                    ))}
                                    {featuredAlbum.tracks.length > 4 && (
                                        <li className="more-tracks">
                                            +{featuredAlbum.tracks.length - 4} más
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

export default FeaturedAlbum;
