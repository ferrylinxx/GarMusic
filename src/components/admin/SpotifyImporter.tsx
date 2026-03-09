import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpotify, FaDownload, FaSearch, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import './SpotifyImporter.css';

interface SpotifyImporterProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: SpotifyAlbumData) => void;
}

export interface SpotifyAlbumData {
    title: string;
    type: 'album' | 'ep' | 'single';
    releaseDate: string;
    coverArt: string;
    spotifyUrl: string;
    tracks: {
        title: string;
        duration: number;
        spotifyUrl: string;
    }[];
}

// Note: This is a simplified importer that works with public album URLs
// For full API access, you'd need Spotify Developer credentials

const SpotifyImporter = ({ isOpen, onClose, onImport }: SpotifyImporterProps) => {
    const [spotifyUrl, setSpotifyUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<SpotifyAlbumData | null>(null);

    const extractSpotifyId = (url: string): string | null => {
        // Match Spotify album/single URLs
        const patterns = [
            /spotify\.com\/album\/([a-zA-Z0-9]+)/,
            /spotify\.com\/intl-[a-z]+\/album\/([a-zA-Z0-9]+)/,
            /open\.spotify\.com\/album\/([a-zA-Z0-9]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    const fetchSpotifyData = async () => {
        const albumId = extractSpotifyId(spotifyUrl);

        if (!albumId) {
            setError('URL de Spotify no válida. Usa un enlace de álbum como: https://open.spotify.com/album/xxx');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Using Spotify's oEmbed endpoint (no API key needed)
            const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/album/${albumId}`;
            const response = await fetch(oembedUrl);

            if (!response.ok) {
                throw new Error('No se pudo obtener información del álbum');
            }

            const data = await response.json();

            // Create preview data from oEmbed response
            const albumData: SpotifyAlbumData = {
                title: data.title?.split(' by ')[0] || 'Álbum sin título',
                type: 'album',
                releaseDate: new Date().toISOString().split('T')[0],
                coverArt: data.thumbnail_url || '',
                spotifyUrl: `https://open.spotify.com/album/${albumId}`,
                tracks: []
            };

            setPreviewData(albumData);
        } catch (err) {
            setError('No se pudo cargar el álbum. Verifica la URL e intenta de nuevo.');
            console.error('Spotify import error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = () => {
        if (previewData) {
            onImport(previewData);
            handleClose();
        }
    };

    const handleClose = () => {
        setSpotifyUrl('');
        setError(null);
        setPreviewData(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="spotify-importer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
            >
                <motion.div
                    className="spotify-importer-modal glass"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="importer-header">
                        <div className="header-title">
                            <FaSpotify className="spotify-icon" />
                            <h2>Importar desde Spotify</h2>
                        </div>
                        <button className="close-btn" onClick={handleClose}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="importer-content">
                        <p className="importer-description">
                            Pega el enlace de un álbum de Spotify para importar la información básica.
                            Luego podrás añadir los archivos de audio manualmente.
                        </p>

                        <div className="url-input-group">
                            <FaSpotify className="input-icon" />
                            <input
                                type="text"
                                value={spotifyUrl}
                                onChange={(e) => setSpotifyUrl(e.target.value)}
                                placeholder="https://open.spotify.com/album/..."
                                className="spotify-url-input"
                            />
                            <button
                                className="btn-search"
                                onClick={fetchSpotifyData}
                                disabled={isLoading || !spotifyUrl}
                            >
                                {isLoading ? (
                                    <span className="loading-spinner-small"></span>
                                ) : (
                                    <FaSearch />
                                )}
                            </button>
                        </div>

                        {error && (
                            <motion.div
                                className="importer-error"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <FaExclamationTriangle />
                                {error}
                            </motion.div>
                        )}

                        {previewData && (
                            <motion.div
                                className="preview-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="preview-cover">
                                    <img src={previewData.coverArt} alt={previewData.title} />
                                </div>
                                <div className="preview-info">
                                    <span className="preview-type">{previewData.type.toUpperCase()}</span>
                                    <h3>{previewData.title}</h3>
                                    <p className="preview-url">{previewData.spotifyUrl}</p>
                                    <div className="import-success">
                                        <FaCheck /> Listo para importar
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="importer-actions">
                        <button className="btn-cancel" onClick={handleClose}>
                            Cancelar
                        </button>
                        <button
                            className="btn-import"
                            onClick={handleImport}
                            disabled={!previewData}
                        >
                            <FaDownload /> Importar Álbum
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpotifyImporter;
