import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
    FaArrowLeft,
    FaClock,
    FaEllipsisH,
    FaHeart,
    FaInfoCircle,
    FaMusic,
    FaPlay,
    FaPlus,
    FaRandom,
    FaRegHeart,
    FaSearch,
    FaSpotify,
} from 'react-icons/fa';
import { useDiscography } from '../context/DiscographyContext';
import { usePlayer } from '../context/PlayerContext';
import useMediaQuery from '../hooks/useMediaQuery';
import type { Track } from '../types/music';
import './AlbumDetalle.css';

type PlaylistSort = 'album' | 'title' | 'duration';

const formatDuration = (seconds: number): string => {
    const duration = Number.isFinite(seconds) ? seconds : 0;
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const joinCredits = (value?: string[]): string =>
    Array.isArray(value) && value.length > 0 ? value.join(', ') : 'No especificado';

const AlbumDetalle = () => {
    const { albumId } = useParams<{ albumId: string }>();
    const { getAlbumById, isLoading } = useDiscography();
    const isMobileLayout = useMediaQuery('(max-width: 600px)');
    const {
        playAlbum,
        playTrack,
        currentTrack,
        isPlaying,
        addToQueue,
        toggleFavoriteTrack,
        isFavoriteTrack,
    } = usePlayer();

    const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
    const [infoTrack, setInfoTrack] = useState<Track | null>(null);
    const [showAllTracksMobile, setShowAllTracksMobile] = useState(false);
    const [expandDescriptionMobile, setExpandDescriptionMobile] = useState(false);
    const [playlistQuery, setPlaylistQuery] = useState('');
    const [playlistSort, setPlaylistSort] = useState<PlaylistSort>('album');

    const album = albumId ? getAlbumById(albumId) : undefined;
    const trackPositions = useMemo(() => {
        if (!album) return new Map<string, number>();
        return new Map(album.tracks.map((track, index) => [track.id, index + 1]));
    }, [album]);

    const totalSeconds = useMemo(
        () => (album ? album.tracks.reduce((sum, track) => sum + track.duration, 0) : 0),
        [album]
    );
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const mobileTrackLimit = 10;
    const sortedPlaylistTracks = useMemo(() => {
        if (!album) return [] as Track[];
        const next = [...album.tracks];
        if (playlistSort === 'title') {
            next.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
        } else if (playlistSort === 'duration') {
            next.sort((a, b) => b.duration - a.duration);
        }
        return next;
    }, [album, playlistSort]);
    const filteredPlaylistTracks = useMemo(() => {
        const query = playlistQuery.trim().toLowerCase();
        if (!query) return sortedPlaylistTracks;
        return sortedPlaylistTracks.filter((track) => {
            const inTitle = track.title.toLowerCase().includes(query);
            const inComposers = (track.credits?.composers || []).some((name) =>
                name.toLowerCase().includes(query)
            );
            return inTitle || inComposers;
        });
    }, [sortedPlaylistTracks, playlistQuery]);
    const visibleTracks = !album
        ? []
        : isMobileLayout && !showAllTracksMobile
        ? filteredPlaylistTracks.slice(0, mobileTrackLimit)
        : filteredPlaylistTracks;
    const filteredPlaylistSeconds = useMemo(
        () => filteredPlaylistTracks.reduce((sum, track) => sum + track.duration, 0),
        [filteredPlaylistTracks]
    );
    const filteredPlaylistMinutes = Math.floor(filteredPlaylistSeconds / 60);
    const filteredPlaylistHours = Math.floor(filteredPlaylistMinutes / 60);
    const filteredRemainingMinutes = filteredPlaylistMinutes % 60;
    const filteredPlaylistDurationLabel =
        filteredPlaylistHours > 0
            ? `${filteredPlaylistHours} h ${filteredRemainingMinutes} min`
            : `${filteredPlaylistMinutes} min`;
    const hasPlaylistFilters = playlistQuery.trim().length > 0 || playlistSort !== 'album';
    const hasPlaylistResults = filteredPlaylistTracks.length > 0;
    const hasLongDescription = Boolean(album?.description && album.description.length > 180);

    useEffect(() => {
        const handleWindowClick = () => setOpenMenuTrackId(null);
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenMenuTrackId(null);
                setInfoTrack(null);
            }
        };

        window.addEventListener('click', handleWindowClick);
        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('click', handleWindowClick);
            window.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        setShowAllTracksMobile(false);
        setExpandDescriptionMobile(false);
        setPlaylistQuery('');
        setPlaylistSort('album');
    }, [album?.id, isMobileLayout]);

    if (isLoading) {
        return (
            <div className="album-detail-page container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Cargando album...</p>
                </div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="album-detail-page container">
                <div className="album-not-found glass">
                    <h1>Album no encontrado</h1>
                    <p>Este lanzamiento no existe o fue eliminado.</p>
                    <Link to="/musica" className="btn-secondary">
                        Volver a musica
                    </Link>
                </div>
            </div>
        );
    }

    const releaseYear = new Date(album.releaseDate).getFullYear();
    const totalDurationLabel = totalHours > 0 ? `${totalHours} h ${remainingMinutes} min` : `${totalMinutes} min`;
    const handlePlayPlaylist = () => {
        if (!album || filteredPlaylistTracks.length === 0) return;
        void playTrack(filteredPlaylistTracks[0], album);
    };
    const handlePlayRandom = () => {
        if (!album || filteredPlaylistTracks.length === 0) return;
        const randomTrack = filteredPlaylistTracks[Math.floor(Math.random() * filteredPlaylistTracks.length)];
        void playTrack(randomTrack, album);
    };
    const handleQueueAll = () => {
        if (!album || filteredPlaylistTracks.length === 0) return;
        filteredPlaylistTracks.forEach((track) => addToQueue(track));
    };

    return (
        <div className="album-detail-page container">
            <Link to="/musica" className="album-back-link">
                <FaArrowLeft /> Volver a musica
            </Link>

            <motion.section
                className="album-detail-hero glass-strong"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="album-hero-bg" aria-hidden="true">
                    <img src={album.coverArt} alt="" />
                    <div className="album-hero-overlay" />
                </div>

                <div className="album-detail-cover">
                    <img src={album.coverArt} alt={album.title} />
                </div>

                <div className="album-detail-info">
                    <span className="album-detail-type">{album.type.toUpperCase()}</span>
                    <h1>{album.title}</h1>
                    <p className="album-detail-meta">
                        {releaseYear} &middot; {album.tracks.length} canciones &middot; {totalDurationLabel}
                    </p>
                    {album.description && (
                        <>
                            <p
                                className={`album-detail-description ${
                                    isMobileLayout && hasLongDescription && !expandDescriptionMobile ? 'clamped' : ''
                                }`}
                            >
                                {album.description}
                            </p>
                            {isMobileLayout && hasLongDescription && (
                                <button
                                    type="button"
                                    className="album-description-toggle"
                                    onClick={() => setExpandDescriptionMobile((previous) => !previous)}
                                >
                                    {expandDescriptionMobile ? 'Ver menos' : 'Ver mas'}
                                </button>
                            )}
                        </>
                    )}

                    <div className="album-detail-actions">
                        <button className="btn-primary" onClick={() => playAlbum(album)}>
                            <FaPlay /> Reproducir album
                        </button>
                        {album.spotifyUrl && (
                            <a
                                href={album.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                            >
                                <FaSpotify /> Abrir en Spotify
                            </a>
                        )}
                    </div>

                    <div className="album-detail-stats">
                        <article>
                            <strong>{album.tracks.length}</strong>
                            <span>Pistas</span>
                        </article>
                        <article>
                            <strong>{releaseYear}</strong>
                            <span>Lanzamiento</span>
                        </article>
                        <article>
                            <strong>{totalDurationLabel}</strong>
                            <span>Duracion</span>
                        </article>
                    </div>
                </div>
            </motion.section>

            <motion.section
                className="album-tracklist-panel glass"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <div className="album-tracklist-header">
                    <div className="album-tracklist-title">
                        <h2>Playlist del album</h2>
                        <span>
                            {filteredPlaylistTracks.length} de {album.tracks.length} pistas &middot;{' '}
                            {filteredPlaylistDurationLabel}
                        </span>
                    </div>
                    <div className="album-tracklist-actions">
                        <button
                            type="button"
                            className="btn-primary playlist-action-btn"
                            onClick={handlePlayPlaylist}
                            disabled={!hasPlaylistResults}
                        >
                            <FaPlay /> Reproducir todo
                        </button>
                        <button
                            type="button"
                            className="btn-secondary playlist-action-btn"
                            onClick={handlePlayRandom}
                            disabled={!hasPlaylistResults}
                        >
                            <FaRandom /> Aleatorio
                        </button>
                        <button
                            type="button"
                            className="btn-secondary playlist-action-btn"
                            onClick={handleQueueAll}
                            disabled={!hasPlaylistResults}
                        >
                            <FaPlus /> Anadir a cola
                        </button>
                    </div>
                </div>

                <div className="album-playlist-toolbar">
                    <div className="album-playlist-search">
                        <FaSearch />
                        <input
                            type="text"
                            value={playlistQuery}
                            onChange={(event) => setPlaylistQuery(event.target.value)}
                            placeholder="Buscar dentro de este album..."
                            aria-label="Buscar canciones del album"
                        />
                    </div>
                    <div className="album-playlist-sort">
                        <label htmlFor="albumPlaylistSort">Orden</label>
                        <select
                            id="albumPlaylistSort"
                            value={playlistSort}
                            onChange={(event) => setPlaylistSort(event.target.value as PlaylistSort)}
                        >
                            <option value="album">Orden del album</option>
                            <option value="title">Titulo A-Z</option>
                            <option value="duration">Mas largas primero</option>
                        </select>
                    </div>
                    {hasPlaylistFilters && (
                        <button
                            type="button"
                            className="btn-secondary playlist-clear-btn"
                            onClick={() => {
                                setPlaylistQuery('');
                                setPlaylistSort('album');
                            }}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                <div className="album-tracklist-body">
                    {visibleTracks.map((track, index) => {
                        const isCurrent = currentTrack?.id === track.id;
                        const isFavorite = isFavoriteTrack(track.id);
                        const displayIndex =
                            playlistSort === 'album'
                                ? trackPositions.get(track.id) || index + 1
                                : index + 1;

                        return (
                            <div
                                key={track.id}
                                className={`album-track-row ${isCurrent ? 'active' : ''} ${
                                    openMenuTrackId === track.id ? 'menu-open' : ''
                                }`}
                            >
                                <button
                                    className="album-track-main"
                                    onClick={() => playTrack(track, album)}
                                >
                                    <span className="album-track-index">
                                        {isCurrent && isPlaying ? <FaPlay /> : displayIndex}
                                    </span>
                                    <span className="album-track-cover" aria-hidden="true">
                                        <img src={track.coverArt || album.coverArt} alt="" />
                                    </span>
                                    <span className="album-track-title-wrap">
                                        <span className="album-track-title">
                                            {track.title}
                                            {isCurrent && (
                                                <span className={`track-now-pill ${isPlaying ? 'playing' : 'paused'}`}>
                                                    {isPlaying ? 'Sonando' : 'En pausa'}
                                                </span>
                                            )}
                                        </span>
                                        <span className="album-track-subtitle">
                                            {track.credits?.composers?.join(', ') || album.title}
                                        </span>
                                    </span>
                                    <span className="album-track-duration">
                                        <FaClock /> {formatDuration(track.duration)}
                                    </span>
                                </button>

                                <div className="album-track-row-actions">
                                    <button
                                        type="button"
                                        className={`track-mini-btn ${isFavorite ? 'is-favorite' : ''}`}
                                        onClick={() => toggleFavoriteTrack(track.id)}
                                        aria-label={isFavorite ? `Quitar ${track.title} de favoritos` : `Guardar ${track.title} en favoritos`}
                                        title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                                    >
                                        {isFavorite ? <FaHeart /> : <FaRegHeart />}
                                    </button>

                                    <button
                                        type="button"
                                        className={`track-mini-btn menu-trigger ${openMenuTrackId === track.id ? 'open' : ''}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setOpenMenuTrackId((prev) => (prev === track.id ? null : track.id));
                                        }}
                                        aria-label={`Abrir menu de ${track.title}`}
                                        title="Mas opciones"
                                    >
                                        <FaEllipsisH />
                                    </button>

                                    <AnimatePresence>
                                        {openMenuTrackId === track.id && (
                                            <motion.div
                                                className="track-context-menu glass-strong"
                                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                                transition={{ duration: 0.16 }}
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        addToQueue(track);
                                                        setOpenMenuTrackId(null);
                                                    }}
                                                >
                                                    <FaPlus /> Agregar a cola
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        toggleFavoriteTrack(track.id);
                                                        setOpenMenuTrackId(null);
                                                    }}
                                                >
                                                    {isFavorite ? <FaRegHeart /> : <FaHeart />}
                                                    {isFavorite ? 'Quitar me gusta' : 'Me gusta'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setInfoTrack(track);
                                                        setOpenMenuTrackId(null);
                                                    }}
                                                >
                                                    <FaInfoCircle /> Ver informacion
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {visibleTracks.length === 0 && (
                    <div className="album-playlist-empty">
                        <FaMusic />
                        <p>No hay canciones que coincidan con tu busqueda en este album.</p>
                    </div>
                )}

                {isMobileLayout && filteredPlaylistTracks.length > mobileTrackLimit && (
                    <button
                        type="button"
                        className="album-mobile-toggle-tracks btn-secondary"
                        onClick={() => setShowAllTracksMobile((previous) => !previous)}
                    >
                        {showAllTracksMobile
                            ? 'Mostrar menos'
                            : `Mostrar ${filteredPlaylistTracks.length - mobileTrackLimit} canciones mas`}
                    </button>
                )}
            </motion.section>

            <AnimatePresence>
                {infoTrack && (
                    <motion.div
                        className="track-info-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setInfoTrack(null)}
                    >
                        <motion.article
                            className="track-info-modal glass-strong"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 18, scale: 0.98 }}
                            transition={{ duration: 0.18 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <h3>{infoTrack.title}</h3>
                            <p><FaMusic /> Album: {album.title}</p>
                            <p><FaClock /> Duracion: {formatDuration(infoTrack.duration)}</p>
                            <p className="track-info-description">
                                <FaInfoCircle />
                                <span>
                                    <strong>Descripcion:</strong>{' '}
                                    {infoTrack.description?.trim() || 'Sin descripcion para esta cancion.'}
                                </span>
                            </p>
                            <div className="track-info-metadata">
                                <p><FaInfoCircle /> <strong>Compositores:</strong> {joinCredits(infoTrack.credits?.composers)}</p>
                                <p><FaInfoCircle /> <strong>Productores:</strong> {joinCredits(infoTrack.credits?.producers)}</p>
                                <p><FaInfoCircle /> <strong>Genero:</strong> {infoTrack.metadata?.genre?.trim() || 'No especificado'}</p>
                                <p><FaInfoCircle /> <strong>Idioma:</strong> {infoTrack.metadata?.language?.trim() || 'No especificado'}</p>
                            </div>
                            <button type="button" className="btn-secondary" onClick={() => setInfoTrack(null)}>
                                Cerrar
                            </button>
                        </motion.article>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AlbumDetalle;
