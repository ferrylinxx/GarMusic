import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscography } from '../context/DiscographyContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { usePlayer } from '../context/PlayerContext';
import useMediaQuery from '../hooks/useMediaQuery';
import AlbumCard from '../components/Music/AlbumCard';
import TrackItem from '../components/Music/TrackItem';
import {
    FaSearch,
    FaThLarge,
    FaList,
    FaCompactDisc,
    FaSortAmountDown,
    FaSortAmountUp,
    FaPlay,
    FaStar,
    FaTimes,
    FaHistory,
    FaTrash,
    FaClock,
    FaMusic,
    FaFilter,
    FaChevronUp,
    FaChevronDown,
    FaRedo,
    FaDownload,
    FaBolt,
} from 'react-icons/fa';
import useDataSaver from '../hooks/useDataSaver';
import './Musica.css';

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'album' | 'ep' | 'single';
type ActivityTab = 'queue' | 'favorites' | 'recent';
type AlbumBadge = 'Nuevo' | 'Programado' | 'Top';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DEFAULT_VIEW: ViewMode = 'grid';
const DEFAULT_FILTER: FilterMode = 'all';
const DEFAULT_SORT: SortOption = 'date-desc';
const NEW_BADGE_WINDOW_DAYS = 30;
const MOBILE_ACTIVITY_VIRTUAL_ROW_HEIGHT = 58;
const MOBILE_ACTIVITY_VIRTUAL_VIEWPORT = 296;
const MOBILE_ACTIVITY_VIRTUAL_OVERSCAN = 4;

const parseViewMode = (value: string | null): ViewMode => (value === 'list' ? 'list' : DEFAULT_VIEW);
const parseFilterMode = (value: string | null): FilterMode =>
    value === 'album' || value === 'ep' || value === 'single' ? value : DEFAULT_FILTER;
const parseSortMode = (value: string | null): SortOption =>
    value === 'date-asc' || value === 'name-asc' || value === 'name-desc' ? value : DEFAULT_SORT;

const sortLabels: Record<SortOption, string> = {
    'date-desc': 'Mas recientes',
    'date-asc': 'Mas antiguos',
    'name-asc': 'A - Z',
    'name-desc': 'Z - A',
};

const Musica = () => {
    const { albums, isLoading, nextScheduledRelease } = useDiscography();
    const { settings } = useSiteSettings();
    const { dataSaverEnabled, setDataSaverEnabled } = useDataSaver();
    const isMobileLayout = useMediaQuery('(max-width: 900px)');
    const {
        playAlbum,
        playTrack,
        queue,
        addToQueue,
        toggleFavoriteTrack,
        isFavoriteTrack,
        removeFromQueue,
        clearQueue,
        favoriteTrackIds,
        recentTrackIds,
        clearRecentlyPlayed,
    } = usePlayer();
    const [searchParams, setSearchParams] = useSearchParams();

    const [viewMode, setViewMode] = useState<ViewMode>(() => parseViewMode(searchParams.get('view')));
    const [filter, setFilter] = useState<FilterMode>(() => parseFilterMode(searchParams.get('type')));
    const [sortBy, setSortBy] = useState<SortOption>(() => parseSortMode(searchParams.get('sort')));
    const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
    const [activityTab, setActivityTab] = useState<ActivityTab>('queue');
    const [activityScrollTop, setActivityScrollTop] = useState(0);
    const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
    const [showFilterSheet, setShowFilterSheet] = useState(false);
    const [showSortSheet, setShowSortSheet] = useState(false);
    const [showResumeCta, setShowResumeCta] = useState(false);
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const activityListRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const debounce = window.setTimeout(() => setSearchQuery(searchInput.trim()), 220);
        return () => window.clearTimeout(debounce);
    }, [searchInput]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (viewMode !== DEFAULT_VIEW) params.set('view', viewMode);
        if (filter !== DEFAULT_FILTER) params.set('type', filter);
        if (sortBy !== DEFAULT_SORT) params.set('sort', sortBy);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        setSearchParams(params, { replace: true });
    }, [viewMode, filter, sortBy, searchQuery, setSearchParams]);

    useEffect(() => {
        if (!isMobileLayout) {
            setIsMobileSummaryOpen(true);
            setShowFilterSheet(false);
            setShowSortSheet(false);
            return;
        }
        setIsMobileSummaryOpen(false);
    }, [isMobileLayout]);

    useEffect(() => {
        if (!isMobileLayout) {
            setShowResumeCta(false);
            return;
        }
        const onScroll = () => setShowResumeCta(window.scrollY > 680);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [isMobileLayout]);

    useEffect(() => {
        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPromptEvent(event as BeforeInstallPromptEvent);
        };

        const onAppInstalled = () => {
            setInstallPromptEvent(null);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, []);

    useEffect(() => {
        setActivityScrollTop(0);
        if (activityListRef.current) {
            activityListRef.current.scrollTop = 0;
        }
    }, [activityTab]);

    const featuredCarouselAlbums = useMemo(() => {
        const sortedByDate = [...albums].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        const result: typeof albums = [];
        const used = new Set<string>();

        if (settings.featuredAlbumId) {
            const selected = albums.find((item) => item.id === settings.featuredAlbumId);
            if (selected) {
                result.push(selected);
                used.add(selected.id);
            }
        }

        sortedByDate.forEach((album) => {
            if (used.has(album.id)) return;
            result.push(album);
            used.add(album.id);
        });

        return result.slice(0, 8);
    }, [albums, settings.featuredAlbumId]);

    const featuredAlbum = featuredCarouselAlbums[0] || null;
    const topAlbumIds = useMemo(() => new Set(featuredCarouselAlbums.slice(0, 3).map((album) => album.id)), [featuredCarouselAlbums]);

    const trackLookup = useMemo(() => {
        const map = new Map<string, { track: (typeof albums)[number]['tracks'][number]; album: (typeof albums)[number] }>();
        albums.forEach((album) => album.tracks.forEach((track) => map.set(track.id, { track, album })));
        return map;
    }, [albums]);

    const queueItems = useMemo(
        () => queue.map((track, queueIndex) => ({ track, album: trackLookup.get(track.id)?.album || null, queueIndex })),
        [queue, trackLookup]
    );

    const favoriteItems = useMemo(
        () =>
            favoriteTrackIds
                .map((trackId) => trackLookup.get(trackId))
                .filter((entry): entry is { track: (typeof albums)[number]['tracks'][number]; album: (typeof albums)[number] } => Boolean(entry))
                .map((entry) => ({ ...entry, queueIndex: undefined as number | undefined })),
        [favoriteTrackIds, trackLookup]
    );

    const recentItems = useMemo(
        () =>
            recentTrackIds
                .map((trackId) => trackLookup.get(trackId))
                .filter((entry): entry is { track: (typeof albums)[number]['tracks'][number]; album: (typeof albums)[number] } => Boolean(entry))
                .map((entry) => ({ ...entry, queueIndex: undefined as number | undefined })),
        [recentTrackIds, trackLookup]
    );

    const counters = useMemo(
        () =>
            albums.reduce(
                (acc, album) => {
                    acc.all += 1;
                    acc[album.type] += 1;
                    return acc;
                },
                { all: 0, album: 0, ep: 0, single: 0 } as Record<FilterMode, number>
            ),
        [albums]
    );

    const totalTracks = useMemo(() => albums.reduce((sum, album) => sum + album.tracks.length, 0), [albums]);

    const totalMinutes = useMemo(() => {
        const totalSeconds = albums.reduce((sum, album) => sum + album.tracks.reduce((albumSum, track) => albumSum + track.duration, 0), 0);
        return Math.floor(totalSeconds / 60);
    }, [albums]);

    const filteredAndSortedAlbums = useMemo(() => {
        const loweredQuery = searchQuery.toLowerCase();
        const result = albums.filter((album) => {
            const matchesFilter = filter === 'all' || album.type === filter;
            const matchesSearch =
                loweredQuery.length === 0 ||
                album.title.toLowerCase().includes(loweredQuery) ||
                album.description?.toLowerCase().includes(loweredQuery) ||
                album.tracks.some((track) => track.title.toLowerCase().includes(loweredQuery));
            return matchesFilter && matchesSearch;
        });

        result.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
                case 'date-asc':
                    return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
                case 'name-asc':
                    return a.title.localeCompare(b.title);
                case 'name-desc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });

        return result;
    }, [albums, filter, searchQuery, sortBy]);

    const buildAlbumBadges = (album: (typeof albums)[number]): AlbumBadge[] => {
        const badges: AlbumBadge[] = [];
        const now = Date.now();
        const releaseDateMs = Date.parse(album.releaseDate);
        const publishAtMs = album.publishAt ? Date.parse(album.publishAt) : Number.NaN;

        if (Number.isFinite(publishAtMs) && publishAtMs > now) {
            badges.push('Programado');
        }

        if (Number.isFinite(releaseDateMs)) {
            const diffDays = Math.floor((now - releaseDateMs) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= NEW_BADGE_WINDOW_DAYS) {
                badges.push('Nuevo');
            }
        }

        if (topAlbumIds.has(album.id)) {
            badges.push('Top');
        }

        return badges.slice(0, 3);
    };

    const hasActiveFilters =
        filter !== DEFAULT_FILTER || sortBy !== DEFAULT_SORT || viewMode !== DEFAULT_VIEW || searchInput.trim().length > 0;

    const activeActivityItems = activityTab === 'queue' ? queueItems : activityTab === 'favorites' ? favoriteItems : recentItems;
    const useVirtualizedActivity = isMobileLayout && activeActivityItems.length > 18;
    const virtualizedStartIndex = useVirtualizedActivity
        ? Math.max(0, Math.floor(activityScrollTop / MOBILE_ACTIVITY_VIRTUAL_ROW_HEIGHT) - MOBILE_ACTIVITY_VIRTUAL_OVERSCAN)
        : 0;
    const virtualizedEndIndex = useVirtualizedActivity
        ? Math.min(
              activeActivityItems.length,
              Math.ceil((activityScrollTop + MOBILE_ACTIVITY_VIRTUAL_VIEWPORT) / MOBILE_ACTIVITY_VIRTUAL_ROW_HEIGHT) +
                  MOBILE_ACTIVITY_VIRTUAL_OVERSCAN
          )
        : activeActivityItems.length;
    const visibleActivityItems = useVirtualizedActivity
        ? activeActivityItems.slice(virtualizedStartIndex, virtualizedEndIndex)
        : activeActivityItems;
    const virtualizedSpacerTop = useVirtualizedActivity ? virtualizedStartIndex * MOBILE_ACTIVITY_VIRTUAL_ROW_HEIGHT : 0;
    const virtualizedSpacerBottom = useVirtualizedActivity
        ? Math.max(0, (activeActivityItems.length - virtualizedEndIndex) * MOBILE_ACTIVITY_VIRTUAL_ROW_HEIGHT)
        : 0;
    const resumeEntry = recentItems[0] || null;

    const upcomingReleaseLabel =
        nextScheduledRelease?.publishAt && Number.isFinite(Date.parse(nextScheduledRelease.publishAt))
            ? new Date(nextScheduledRelease.publishAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
            : '';

    const clearFilters = () => {
        setFilter(DEFAULT_FILTER);
        setSortBy(DEFAULT_SORT);
        setViewMode(DEFAULT_VIEW);
        setSearchInput('');
    };

    const toggleDataSaverMode = () => {
        setDataSaverEnabled(!dataSaverEnabled);
    };

    const handleInstallApp = async () => {
        if (!installPromptEvent) return;

        await installPromptEvent.prompt();
        const choice = await installPromptEvent.userChoice;
        if (choice.outcome === 'accepted') {
            setInstallPromptEvent(null);
        }
    };

    const clearActiveTab = () => {
        if (activityTab === 'queue') {
            clearQueue();
            return;
        }
        if (activityTab === 'recent') {
            clearRecentlyPlayed();
        }
    };

    const handlePlayFeatured = () => {
        if (featuredAlbum) {
            playAlbum(featuredAlbum);
        }
    };

    const handlePlayByTrackId = (trackId: string) => {
        const entry = trackLookup.get(trackId);
        if (!entry) return;
        playTrack(entry.track, entry.album);
    };

    const handleAddAlbumToQueue = (album: (typeof albums)[number]) => {
        album.tracks.forEach((track) => addToQueue(track));
    };

    const handleToggleAlbumFavorite = (album: (typeof albums)[number]) => {
        const leadTrackId = album.tracks[0]?.id;
        if (!leadTrackId) return;
        toggleFavoriteTrack(leadTrackId);
    };

    const isAlbumFavorite = (album: (typeof albums)[number]): boolean => {
        const leadTrackId = album.tracks[0]?.id;
        if (!leadTrackId) return false;
        return isFavoriteTrack(leadTrackId);
    };

    const renderFilterButtons = () => (
        <>
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                Todos ({counters.all})
            </button>
            <button className={`filter-btn ${filter === 'album' ? 'active' : ''}`} onClick={() => setFilter('album')}>
                Albumes ({counters.album})
            </button>
            <button className={`filter-btn ${filter === 'ep' ? 'active' : ''}`} onClick={() => setFilter('ep')}>
                EPs ({counters.ep})
            </button>
            <button className={`filter-btn ${filter === 'single' ? 'active' : ''}`} onClick={() => setFilter('single')}>
                Singles ({counters.single})
            </button>
        </>
    );
    return (
        <div className="musica-page container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <section className={`music-intro glass-strong ${isMobileLayout ? 'is-mobile' : ''}`}>
                    <div className="music-intro-copy">
                        <div className="music-intro-headline">
                            <h1 className="page-title text-gradient">{settings.musicPageTitle}</h1>
                            {isMobileLayout && (
                                <button
                                    type="button"
                                    className="summary-toggle-btn"
                                    onClick={() => setIsMobileSummaryOpen((previous) => !previous)}
                                >
                                    {isMobileSummaryOpen ? <FaChevronUp /> : <FaChevronDown />}
                                    {isMobileSummaryOpen ? 'Ocultar resumen' : 'Ver resumen'}
                                </button>
                            )}
                        </div>
                        {(!isMobileLayout || isMobileSummaryOpen) && (
                            <p className="music-intro-subtitle">{settings.musicPageSubtitle}</p>
                        )}
                    </div>
                    {(!isMobileLayout || isMobileSummaryOpen) && (
                        <div className="music-intro-metrics" aria-label="Resumen de biblioteca">
                            <article className="music-metric">
                                <span className="metric-icon">
                                    <FaCompactDisc />
                                </span>
                                <div>
                                    <strong>{albums.length}</strong>
                                    <small>Albums</small>
                                </div>
                            </article>
                            <article className="music-metric">
                                <span className="metric-icon">
                                    <FaMusic />
                                </span>
                                <div>
                                    <strong>{totalTracks}</strong>
                                    <small>Canciones</small>
                                </div>
                            </article>
                            <article className="music-metric">
                                <span className="metric-icon">
                                    <FaClock />
                                </span>
                                <div>
                                    <strong>{totalMinutes}</strong>
                                    <small>Minutos</small>
                                </div>
                            </article>
                        </div>
                    )}
                </section>

                {featuredCarouselAlbums.length > 0 && !searchInput.trim() && filter === DEFAULT_FILTER && (
                    <section className="featured-carousel-section glass">
                        <header className="featured-carousel-head">
                            <h2>
                                <FaStar /> Destacado
                            </h2>
                            <div className="featured-carousel-head-right">
                                {upcomingReleaseLabel && <small className="featured-next-release">Proximo: {upcomingReleaseLabel}</small>}
                                {featuredAlbum && (
                                    <button type="button" className="featured-play-btn compact" onClick={handlePlayFeatured}>
                                        <FaPlay /> Reproducir todo
                                    </button>
                                )}
                            </div>
                        </header>
                        <div className="featured-carousel-track">
                            {featuredCarouselAlbums.map((album) => (
                                <article key={album.id} className="featured-carousel-card">
                                    <Link to={`/musica/album/${album.id}`} className="featured-carousel-cover-link">
                                        <img src={album.coverArt} alt={album.title} className="featured-carousel-cover" />
                                    </Link>
                                    <div className="featured-carousel-info">
                                        <div className="featured-carousel-badges">
                                            {buildAlbumBadges(album).map((badge) => (
                                                <span key={`${album.id}-${badge}`} className={`album-status-badge badge-${badge.toLowerCase()}`}>
                                                    {badge}
                                                </span>
                                            ))}
                                        </div>
                                        <h3>{album.title}</h3>
                                        <p>
                                            {album.tracks.length} canciones - {new Date(album.releaseDate).getFullYear()}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                <div className={`music-controls glass ${isMobileLayout ? 'mobile-compact' : ''}`}>
                    <div className="search-container">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar canciones o albumes..."
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="search-input"
                            aria-label="Buscar canciones o albumes"
                        />
                    </div>
                    {isMobileLayout ? (
                        <div className="mobile-controls-row">
                            <button type="button" className="mobile-control-btn" onClick={() => setShowFilterSheet(true)}>
                                <FaFilter /> Filtros
                            </button>
                            <button type="button" className="mobile-control-btn" onClick={() => setShowSortSheet(true)}>
                                {sortBy.includes('desc') ? <FaSortAmountDown /> : <FaSortAmountUp />} Orden
                            </button>
                            <button
                                type="button"
                                className={`mobile-control-btn data-saver-toggle ${dataSaverEnabled ? 'active' : ''}`}
                                onClick={toggleDataSaverMode}
                                title={dataSaverEnabled ? 'Desactivar ahorro de datos' : 'Activar ahorro de datos'}
                            >
                                <FaBolt /> {dataSaverEnabled ? 'Ahorro ON' : 'Ahorro OFF'}
                            </button>
                            {installPromptEvent && (
                                <button type="button" className="mobile-control-btn install-app-btn" onClick={() => void handleInstallApp()}>
                                    <FaDownload /> Instalar
                                </button>
                            )}
                            <div className="view-toggle" role="group" aria-label="Cambiar vista">
                                <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                                    <FaThLarge />
                                </button>
                                <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                                    <FaList />
                                </button>
                            </div>
                            {hasActiveFilters && (
                                <button className="clear-filters-btn" onClick={clearFilters}>
                                    <FaTimes /> Limpiar
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="controls-row">
                            <div className="filter-buttons" role="group" aria-label="Filtrar por tipo">
                                {renderFilterButtons()}
                            </div>
                            <div className="sort-container">
                                <select
                                    value={sortBy}
                                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                                    className="sort-select"
                                    aria-label="Ordenar albums"
                                >
                                    <option value="date-desc">Mas recientes</option>
                                    <option value="date-asc">Mas antiguos</option>
                                    <option value="name-asc">A - Z</option>
                                    <option value="name-desc">Z - A</option>
                                </select>
                                {sortBy.includes('desc') ? <FaSortAmountDown /> : <FaSortAmountUp />}
                            </div>
                            <div className="view-toggle" role="group" aria-label="Cambiar vista">
                                <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                                    <FaThLarge />
                                </button>
                                <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                                    <FaList />
                                </button>
                            </div>
                            <button
                                type="button"
                                className={`clear-filters-btn data-saver-toggle ${dataSaverEnabled ? 'active' : ''}`}
                                onClick={toggleDataSaverMode}
                            >
                                <FaBolt /> {dataSaverEnabled ? 'Ahorro datos ON' : 'Ahorro datos OFF'}
                            </button>
                            {installPromptEvent && (
                                <button type="button" className="clear-filters-btn install-app-btn" onClick={() => void handleInstallApp()}>
                                    <FaDownload /> Instalar app
                                </button>
                            )}
                            {hasActiveFilters && (
                                <button className="clear-filters-btn" onClick={clearFilters}>
                                    <FaTimes /> Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Cargando musica...</p>
                    </div>
                ) : (
                    <div className="music-spotify-layout">
                        <aside className="music-activity-sidebar">
                            <section className="music-activity-card glass">
                                <header className="library-section-head">
                                    <div>
                                        <h2>{settings.musicActivityTitle}</h2>
                                        <p>{settings.musicActivityDescription}</p>
                                    </div>
                                    {(activityTab === 'queue' || activityTab === 'recent') && activeActivityItems.length > 0 && (
                                        <button type="button" className="library-clear-btn" onClick={clearActiveTab}>
                                            <FaTrash /> Limpiar
                                        </button>
                                    )}
                                </header>
                                <div className="activity-tabs" role="tablist" aria-label="Actividad personal">
                                    <button type="button" className={`activity-tab ${activityTab === 'queue' ? 'active' : ''}`} onClick={() => setActivityTab('queue')}>
                                        Cola ({queueItems.length})
                                    </button>
                                    <button type="button" className={`activity-tab ${activityTab === 'favorites' ? 'active' : ''}`} onClick={() => setActivityTab('favorites')}>
                                        Favoritos ({favoriteItems.length})
                                    </button>
                                    <button type="button" className={`activity-tab ${activityTab === 'recent' ? 'active' : ''}`} onClick={() => setActivityTab('recent')}>
                                        Recientes ({recentItems.length})
                                    </button>
                                </div>
                                <div
                                    ref={activityListRef}
                                    className={`music-library-body ${useVirtualizedActivity ? 'is-virtualized' : ''}`}
                                    onScroll={(event) => {
                                        if (!useVirtualizedActivity) return;
                                        setActivityScrollTop(event.currentTarget.scrollTop);
                                    }}
                                    style={
                                        useVirtualizedActivity
                                            ? { maxHeight: `${MOBILE_ACTIVITY_VIRTUAL_VIEWPORT}px` }
                                            : undefined
                                    }
                                >
                                    {activeActivityItems.length > 0 ? (
                                        <>
                                            {useVirtualizedActivity && virtualizedSpacerTop > 0 && (
                                                <div className="music-library-spacer" style={{ height: `${virtualizedSpacerTop}px` }} aria-hidden />
                                            )}

                                            {visibleActivityItems.map((entry, index) => {
                                                const absoluteIndex = useVirtualizedActivity ? virtualizedStartIndex + index : index;

                                                if (activityTab === 'queue') {
                                                    return (
                                                        <div key={`queue-${entry.track.id}-${absoluteIndex}`} className="library-track-row">
                                                            <button type="button" className="library-track-main" onClick={() => handlePlayByTrackId(entry.track.id)}>
                                                                <strong>{entry.track.title}</strong>
                                                                <span>{entry.album?.title || 'Single'}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="library-track-action"
                                                                onClick={() => removeFromQueue(entry.track.id, entry.queueIndex ?? absoluteIndex)}
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        type="button"
                                                        key={`${activityTab}-${entry.track.id}-${absoluteIndex}`}
                                                        className="library-track-main full-row"
                                                        onClick={() => playTrack(entry.track, entry.album || undefined)}
                                                    >
                                                        <strong>{entry.track.title}</strong>
                                                        <span>{entry.album?.title || 'Single'}</span>
                                                    </button>
                                                );
                                            })}

                                            {useVirtualizedActivity && virtualizedSpacerBottom > 0 && (
                                                <div className="music-library-spacer" style={{ height: `${virtualizedSpacerBottom}px` }} aria-hidden />
                                            )}
                                        </>
                                    ) : (
                                        <p className="library-empty">
                                            {activityTab === 'queue'
                                                ? 'No hay canciones en cola.'
                                                : activityTab === 'favorites'
                                                ? 'Marca canciones con el corazon para verlas aqui.'
                                                : 'Aun no has reproducido canciones en esta sesion.'}
                                        </p>
                                    )}
                                </div>
                            </section>
                        </aside>
                        <section className="music-catalog-area">
                            {recentItems.length > 0 && (
                                <section className="continue-listening-card glass">
                                    <header className="continue-listening-head">
                                        <h3>
                                            <FaHistory /> Seguir escuchando
                                        </h3>
                                    </header>
                                    <div className="continue-listening-track">
                                        {recentItems.slice(0, isMobileLayout ? 6 : 8).map(({ track, album }) => (
                                            <button
                                                key={`continue-${track.id}`}
                                                type="button"
                                                className="continue-track-btn"
                                                onClick={() => playTrack(track, album)}
                                            >
                                                <img src={track.coverArt || album.coverArt} alt={track.title} />
                                                <span>
                                                    <strong>{track.title}</strong>
                                                    <small>{album.title}</small>
                                                </span>
                                                <FaPlay />
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <p className="results-count" aria-live="polite">
                                {filteredAndSortedAlbums.length} {filteredAndSortedAlbums.length === 1 ? 'resultado' : 'resultados'}
                            </p>

                            <AnimatePresence mode="wait">
                                {viewMode === 'grid' ? (
                                    <motion.div className="albums-grid" key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        {filteredAndSortedAlbums.map((album, index) => (
                                            <motion.div
                                                key={album.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                            >
                                                <AlbumCard
                                                    album={album}
                                                    badges={buildAlbumBadges(album)}
                                                    isFavorite={isAlbumFavorite(album)}
                                                    onAddToQueue={() => handleAddAlbumToQueue(album)}
                                                    onToggleFavorite={() => handleToggleAlbumFavorite(album)}
                                                />
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div className="tracks-list" key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        {filteredAndSortedAlbums.map((album) => (
                                            <div key={album.id} className="album-section">
                                                <div className="album-header glass">
                                                    <img src={album.coverArt} alt={album.title} className="album-mini-cover" />
                                                    <div>
                                                        <h3 className="album-section-title">{album.title}</h3>
                                                        <p className="album-section-meta">
                                                            {album.type.toUpperCase()} - {new Date(album.releaseDate).getFullYear()}
                                                        </p>
                                                        <div className="album-section-badges">
                                                            {buildAlbumBadges(album).map((badge) => (
                                                                <span key={`${album.id}-list-${badge}`} className={`album-status-badge badge-${badge.toLowerCase()}`}>
                                                                    {badge}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <Link to={`/musica/album/${album.id}`} className="album-open-link">
                                                        Ver album
                                                    </Link>
                                                </div>
                                                <div className="tracks-container">
                                                    {(isMobileLayout ? album.tracks.slice(0, 6) : album.tracks).map((track, index) => (
                                                        <TrackItem key={track.id} track={track} album={album} index={index} />
                                                    ))}
                                                    {isMobileLayout && album.tracks.length > 6 && (
                                                        <Link to={`/musica/album/${album.id}`} className="mobile-more-tracks-link">
                                                            Ver {album.tracks.length - 6} mas de este album
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {filteredAndSortedAlbums.length === 0 && (
                                <div className="empty-state glass">
                                    <FaCompactDisc className="empty-icon" />
                                    {searchInput.trim() ? (
                                        <>
                                            <h3>No se encontraron resultados</h3>
                                            <p>No hay coincidencias para "{searchInput.trim()}"</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3>No hay musica disponible</h3>
                                            <p>Los albumes apareceran aqui cuando los crees desde el panel admin</p>
                                        </>
                                    )}
                                    {hasActiveFilters && (
                                        <button className="btn-secondary" onClick={clearFilters}>
                                            Limpiar filtros y mostrar todo
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                <AnimatePresence>
                    {isMobileLayout && showResumeCta && resumeEntry && (
                        <motion.button
                            type="button"
                            className="mobile-resume-cta"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={() => playTrack(resumeEntry.track, resumeEntry.album)}
                        >
                            <img src={resumeEntry.track.coverArt || resumeEntry.album.coverArt} alt={resumeEntry.track.title} />
                            <span>
                                <strong>Volver a reproducir</strong>
                                <small>{resumeEntry.track.title}</small>
                            </span>
                            <FaRedo />
                        </motion.button>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isMobileLayout && showFilterSheet && (
                        <motion.div
                            className="mobile-sheet-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFilterSheet(false)}
                        >
                            <motion.div
                                className="mobile-sheet"
                                initial={{ y: 80 }}
                                animate={{ y: 0 }}
                                exit={{ y: 80 }}
                                transition={{ duration: 0.2 }}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <header className="mobile-sheet-head">
                                    <h3>
                                        <FaFilter /> Filtros
                                    </h3>
                                    <button type="button" className="sheet-close-btn" onClick={() => setShowFilterSheet(false)}>
                                        <FaTimes />
                                    </button>
                                </header>
                                <div className="filter-carousel-wrapper mobile-sheet-carousel">{renderFilterButtons()}</div>
                                <div className="mobile-sheet-actions">
                                    <button type="button" className="btn-secondary" onClick={clearFilters}>
                                        Limpiar
                                    </button>
                                    <button type="button" className="btn-primary" onClick={() => setShowFilterSheet(false)}>
                                        Aplicar
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isMobileLayout && showSortSheet && (
                        <motion.div
                            className="mobile-sheet-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSortSheet(false)}
                        >
                            <motion.div
                                className="mobile-sheet"
                                initial={{ y: 80 }}
                                animate={{ y: 0 }}
                                exit={{ y: 80 }}
                                transition={{ duration: 0.2 }}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <header className="mobile-sheet-head">
                                    <h3>{sortBy.includes('desc') ? <FaSortAmountDown /> : <FaSortAmountUp />} Ordenar</h3>
                                    <button type="button" className="sheet-close-btn" onClick={() => setShowSortSheet(false)}>
                                        <FaTimes />
                                    </button>
                                </header>
                                <div className="mobile-sort-options" role="radiogroup" aria-label="Ordenar albums">
                                    {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            className={`mobile-sort-option ${sortBy === option ? 'active' : ''}`}
                                            onClick={() => setSortBy(option)}
                                        >
                                            {sortLabels[option]}
                                        </button>
                                    ))}
                                </div>
                                <div className="mobile-sheet-actions">
                                    <button type="button" className="btn-primary" onClick={() => setShowSortSheet(false)}>
                                        Aplicar
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default Musica;
