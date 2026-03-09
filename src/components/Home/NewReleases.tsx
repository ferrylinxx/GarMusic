import { motion } from 'framer-motion';
import { FaStar, FaPlay, FaCalendarAlt, FaMusic } from 'react-icons/fa';
import { useDiscography } from '../../context/DiscographyContext';
import { usePlayer } from '../../context/PlayerContext';
import './NewReleases.css';

const NewReleases = () => {
    const { albums } = useDiscography();
    const { playAlbum } = usePlayer();

    // Sort by release date (newest first) and take first 4
    const newReleases = [...albums]
        .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
        .slice(0, 4);

    const latestRelease = newReleases[0];
    const otherReleases = newReleases.slice(1, 4);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (newReleases.length === 0) return null;

    return (
        <section className="new-releases-section container">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <div className="section-header">
                    <h2 className="section-title">
                        <FaStar className="title-icon gold" />
                        <span className="text-gradient">Nuevos Lanzamientos</span>
                    </h2>
                    <p className="section-subtitle">Lo más reciente</p>
                </div>

                <div className="releases-container">
                    {/* Featured Latest Release */}
                    {latestRelease && (
                        <motion.div
                            className="featured-release glass"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => playAlbum(latestRelease)}
                        >
                            <div className="featured-image">
                                <img src={latestRelease.coverArt} alt={latestRelease.title} />
                                <div className="new-tag">
                                    <FaStar /> NUEVO
                                </div>
                                <div className="hover-play">
                                    <FaPlay />
                                </div>
                            </div>
                            <div className="featured-details">
                                <span className="release-type-tag">{latestRelease.type.toUpperCase()}</span>
                                <h3 className="release-name">{latestRelease.title}</h3>
                                <div className="release-meta-info">
                                    <span><FaCalendarAlt /> {formatDate(latestRelease.releaseDate)}</span>
                                    <span><FaMusic /> {latestRelease.tracks.length} canciones</span>
                                </div>
                                <motion.button
                                    className="listen-btn"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FaPlay /> Escuchar
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* Other Releases Grid */}
                    {otherReleases.length > 0 && (
                        <div className="other-releases-grid">
                            {otherReleases.map((album, index) => (
                                <motion.div
                                    key={album.id}
                                    className="release-card glass"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    onClick={() => playAlbum(album)}
                                >
                                    <div className="card-image">
                                        <img src={album.coverArt} alt={album.title} />
                                        <div className="card-play"><FaPlay /></div>
                                    </div>
                                    <div className="card-content">
                                        <span className="card-type">{album.type}</span>
                                        <h4 className="card-title">{album.title}</h4>
                                        <span className="card-year">{new Date(album.releaseDate).getFullYear()}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </section>
    );
};

export default NewReleases;
