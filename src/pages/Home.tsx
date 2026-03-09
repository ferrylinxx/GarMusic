import { motion, useScroll, useTransform } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    FaCalendarAlt,
    FaCompactDisc,
    FaDownload,
    FaHeart,
    FaHistory,
    FaInstagram,
    FaListUl,
    FaPlay,
    FaRegBell,
    FaSpotify,
    FaTwitter,
    FaYoutube,
} from 'react-icons/fa';
import { FaTiktok } from 'react-icons/fa6';
import AlbumCard from '../components/Music/AlbumCard';
import ScrollReveal from '../components/Effects/ScrollReveal';
import TypewriterText from '../components/Effects/TypewriterText';
import FollowerStats from '../components/Home/FollowerStats';
import SupportSection from '../components/Home/SupportSection';
import TopTracks from '../components/Home/TopTracks';
import WeeklyTrends from '../components/Home/WeeklyTrends';
import { useDiscography } from '../context/DiscographyContext';
import { usePlayer } from '../context/PlayerContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import useMediaQuery from '../hooks/useMediaQuery';
import db from '../services/DatabaseService';
import type { Album, Track } from '../types/music';
import { trackEvent } from '../utils/analytics';
import './Home.css';

interface HeroStat {
    label: string;
    value: number;
    icon: ReactNode;
}

interface CountdownParts {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
}

interface TrackReference {
    track: Track;
    album: Album;
}

type MobilePersonalTab = 'recent' | 'favorites' | 'queue';
type SignalTab = 'top' | 'trends';
type MobileCommunityTab = 'audience' | 'support';

const formatCount = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
};

const formatDuration = (duration: number): string => {
    if (!Number.isFinite(duration) || duration <= 0) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const getCountdownParts = (targetIso: string): CountdownParts | null => {
    const target = Date.parse(targetIso);
    if (!Number.isFinite(target)) return null;

    const diff = target - Date.now();
    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, isLive: false };
};

const formatCalendarTimestamp = (isoDate: string): string | null => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const escapeIcsText = (value: string): string => {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
};

const buildGoogleCalendarUrl = (album: Album): string => {
    if (!album.publishAt) return '#';

    const start = formatCalendarTimestamp(album.publishAt);
    if (!start) return '#';

    const endDate = new Date(album.publishAt);
    endDate.setHours(endDate.getHours() + 1);
    const end = formatCalendarTimestamp(endDate.toISOString());
    if (!end) return '#';

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const details = [album.description || 'Nuevo lanzamiento disponible.', origin ? `${origin}/musica/album/${encodeURIComponent(album.id)}` : '']
        .filter(Boolean)
        .join('\n');

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `Lanzamiento: ${album.title}`,
        dates: `${start}/${end}`,
        details,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const buildReleaseIcs = (album: Album): string | null => {
    if (!album.publishAt) return null;

    const start = formatCalendarTimestamp(album.publishAt);
    if (!start) return null;

    const endDate = new Date(album.publishAt);
    endDate.setHours(endDate.getHours() + 1);
    const end = formatCalendarTimestamp(endDate.toISOString());
    if (!end) return null;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const details = [album.description || 'Nuevo lanzamiento disponible.', origin ? `${origin}/musica/album/${encodeURIComponent(album.id)}` : '']
        .filter(Boolean)
        .join('\n');

    const uid = `release-${album.id}@fgarola`;
    const dtStamp = formatCalendarTimestamp(new Date().toISOString()) || start;

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Fgarola//ReleaseCenter//ES',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeIcsText(`Lanzamiento: ${album.title}`)}`,
        `DESCRIPTION:${escapeIcsText(details)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
};

const downloadReleaseIcs = (album: Album, suffix: string) => {
    const ics = buildReleaseIcs(album);
    if (!ics) return;

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fgarola-${album.id}-${suffix}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
};

const Home = () => {
    const { latestRelease, albums, isLoading, nextScheduledRelease } = useDiscography();
    const isMobileLayout = useMediaQuery('(max-width: 900px)');
    const { playAlbum, playTrack, queue, favoriteTrackIds, recentTrackIds } = usePlayer();
    const { settings } = useSiteSettings();
    const heroRef = useRef<HTMLElement>(null);
    const [releaseCountdown, setReleaseCountdown] = useState<CountdownParts | null>(() =>
        nextScheduledRelease?.publishAt ? getCountdownParts(nextScheduledRelease.publishAt) : null
    );
    const [preregisterName, setPreregisterName] = useState('');
    const [preregisterEmail, setPreregisterEmail] = useState('');
    const [preregisterCount, setPreregisterCount] = useState(0);
    const [preregisterMessage, setPreregisterMessage] = useState('');
    const [isSubmittingPreregister, setIsSubmittingPreregister] = useState(false);
    const [mobilePersonalTab, setMobilePersonalTab] = useState<MobilePersonalTab>('recent');
    const [signalTab, setSignalTab] = useState<SignalTab>('top');
    const [mobileCommunityTab, setMobileCommunityTab] = useState<MobileCommunityTab>('audience');

    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end start'],
    });

    const heroY = useTransform(scrollYProgress, [0, 1], [0, 300]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    useEffect(() => {
        if (!nextScheduledRelease?.publishAt) {
            setReleaseCountdown(null);
            return;
        }

        const updateCountdown = () => {
            setReleaseCountdown(getCountdownParts(nextScheduledRelease.publishAt || ''));
        };

        updateCountdown();
        const interval = window.setInterval(updateCountdown, 1000);
        return () => window.clearInterval(interval);
    }, [nextScheduledRelease?.id, nextScheduledRelease?.publishAt]);

    useEffect(() => {
        let cancelled = false;

        const loadPreregisterCount = async () => {
            if (!nextScheduledRelease) {
                setPreregisterCount(0);
                setPreregisterMessage('');
                return;
            }

            try {
                const count = await db.getReleasePreregistrationCount(nextScheduledRelease.id);
                if (!cancelled) setPreregisterCount(count);
            } catch (error) {
                console.error('Error loading preregistration count:', error);
                if (!cancelled) setPreregisterCount(0);
            }
        };

        void loadPreregisterCount();
        return () => {
            cancelled = true;
        };
    }, [nextScheduledRelease?.id]);

    const heroStats: HeroStat[] = [
        { label: 'Spotify', value: settings.spotifyFollowers || 0, icon: <FaSpotify /> },
        { label: 'Instagram', value: settings.instagramFollowers || 0, icon: <FaInstagram /> },
        { label: 'YouTube', value: settings.youtubeFollowers || 0, icon: <FaYoutube /> },
    ].filter((item) => item.value > 0);

    const trackLookup = useMemo(() => {
        const lookup = new Map<string, TrackReference>();
        for (const album of albums) {
            for (const track of album.tracks) {
                lookup.set(track.id, { track, album });
            }
        }
        return lookup;
    }, [albums]);

    const recentTracks = useMemo(
        () => recentTrackIds.map((trackId) => trackLookup.get(trackId)).filter((item): item is TrackReference => Boolean(item)),
        [recentTrackIds, trackLookup]
    );

    const favoriteTracks = useMemo(
        () => favoriteTrackIds.map((trackId) => trackLookup.get(trackId)).filter((item): item is TrackReference => Boolean(item)),
        [favoriteTrackIds, trackLookup]
    );

    const queueTracks = useMemo(
        () => queue.map((track) => trackLookup.get(track.id)).filter((item): item is TrackReference => Boolean(item)),
        [queue, trackLookup]
    );

    const handlePlayLatest = () => {
        if (!latestRelease) return;
        trackEvent('home_latest_play_all', {
            album_id: latestRelease.id,
            album_title: latestRelease.title,
        });
        playAlbum(latestRelease);
    };

    const handleHeroListenClick = () => {
        trackEvent('hero_cta_click', {
            cta: 'escuchar_ahora',
            destination: 'latest',
        });
    };

    const handleHeroDiscographyClick = () => {
        trackEvent('hero_cta_click', {
            cta: 'ver_discografia',
            destination: '/musica',
        });
    };

    const handlePreregisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!nextScheduledRelease) return;

        const normalizedEmail = preregisterEmail.trim().toLowerCase();
        if (!normalizedEmail) {
            setPreregisterMessage('Introduce un email valido.');
            return;
        }

        setIsSubmittingPreregister(true);
        setPreregisterMessage('');

        try {
            const result = await db.preregisterForRelease(nextScheduledRelease.id, normalizedEmail, preregisterName.trim());
            setPreregisterCount(result.count);
            setPreregisterMessage(
                result.alreadyExists
                    ? 'Este email ya estaba preregistrado para el lanzamiento.'
                    : 'Preregistro guardado. Te avisaremos del lanzamiento.'
            );
            if (!result.alreadyExists) {
                setPreregisterName('');
                setPreregisterEmail('');
            }
            trackEvent('release_preregister', {
                release_id: nextScheduledRelease.id,
                release_title: nextScheduledRelease.title,
                already_exists: result.alreadyExists,
            });
        } catch (error) {
            console.error('Error preregistering release:', error);
            setPreregisterMessage('No se pudo completar el preregistro.');
            trackEvent('release_preregister_error', {
                release_id: nextScheduledRelease.id,
            });
        } finally {
            setIsSubmittingPreregister(false);
        }
    };

    const handleGoogleCalendarClick = () => {
        if (!nextScheduledRelease || googleCalendarUrl === '#') return;
        trackEvent('release_calendar_export', {
            provider: 'google',
            release_id: nextScheduledRelease.id,
            release_title: nextScheduledRelease.title,
        });
    };

    const handleAppleCalendarClick = () => {
        if (!nextScheduledRelease) return;
        trackEvent('release_calendar_export', {
            provider: 'apple',
            release_id: nextScheduledRelease.id,
            release_title: nextScheduledRelease.title,
        });
        downloadReleaseIcs(nextScheduledRelease, 'apple');
    };

    const handleDownloadIcsClick = () => {
        if (!nextScheduledRelease) return;
        trackEvent('release_calendar_export', {
            provider: 'ics',
            release_id: nextScheduledRelease.id,
            release_title: nextScheduledRelease.title,
        });
        downloadReleaseIcs(nextScheduledRelease, 'download');
    };

    const releaseReminderAutoEnabled = Boolean(nextScheduledRelease && nextScheduledRelease.releaseAutomation?.autoPopupOnRelease !== false);
    const googleCalendarUrl = nextScheduledRelease ? buildGoogleCalendarUrl(nextScheduledRelease) : '#';
    const personalTrackLimit = isMobileLayout ? 3 : 4;
    const latestTrackLimit = isMobileLayout ? 3 : 5;

    const renderTrackList = (items: TrackReference[], emptyMessage: string) => {
        if (items.length === 0) return <p className="personal-empty">{emptyMessage}</p>;

        return (
            <div className="personal-track-list">
                {items.slice(0, personalTrackLimit).map(({ track, album }) => (
                    <button
                        key={`${album.id}-${track.id}`}
                        type="button"
                        className="personal-track-item"
                        onClick={() => playTrack(track, album)}
                    >
                        <span className="personal-track-copy">
                            <strong>{track.title}</strong>
                            <small>{album.title}</small>
                        </span>
                        <span className="personal-track-meta">
                            {formatDuration(track.duration)} <FaPlay />
                        </span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="home-page">
            <section className="hero" ref={heroRef}>
                <motion.div className="hero-content" style={{ y: heroY, opacity: heroOpacity }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        <h1 className="hero-title text-gradient">{settings.heroTitle}</h1>
                    </motion.div>

                    <motion.div
                        className="hero-subtitle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <TypewriterText
                            words={settings.heroSubtitles.length > 0 ? settings.heroSubtitles : ['Cantante', 'Compositor', 'Artista', 'Productor']}
                            typingSpeed={100}
                            deletingSpeed={50}
                            pauseDuration={2000}
                        />
                    </motion.div>

                    <motion.div
                        className="hero-description"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        <p>{settings.heroDescription}</p>
                    </motion.div>

                    <motion.div
                        className="hero-actions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                    >
                        <a href="#latest" className="hero-cta primary" onClick={handleHeroListenClick}>
                            <FaPlay /> Escuchar ahora
                        </a>
                        <Link to="/musica" className="hero-cta secondary" onClick={handleHeroDiscographyClick}>
                            Ver discografia
                        </Link>
                    </motion.div>

                    {heroStats.length > 0 && (
                        <motion.div
                            className="hero-stat-pills"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.9 }}
                        >
                            {heroStats.map((stat) => (
                                <div className="hero-stat-pill glass" key={stat.label}>
                                    <span className="pill-icon">{stat.icon}</span>
                                    <span className="pill-value">{formatCount(stat.value)}</span>
                                    <span className="pill-label">{stat.label}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    <motion.div
                        className="hero-social"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 1 }}
                    >
                        {settings.spotifyUrl && (
                            <a href={settings.spotifyUrl} target="_blank" rel="noopener noreferrer" className="social-link">
                                <FaSpotify />
                            </a>
                        )}
                        {settings.instagramUrl && (
                            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="social-link">
                                <FaInstagram />
                            </a>
                        )}
                        {settings.youtubeUrl && (
                            <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" className="social-link">
                                <FaYoutube />
                            </a>
                        )}
                        {settings.twitterUrl && (
                            <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" className="social-link">
                                <FaTwitter />
                            </a>
                        )}
                        {settings.tiktokUrl && (
                            <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="social-link">
                                <FaTiktok />
                            </a>
                        )}
                    </motion.div>
                </motion.div>

                <div className="hero-bg-elements">
                    <div className="floating-element element-1"></div>
                    <div className="floating-element element-2"></div>
                    <div className="floating-element element-3"></div>
                </div>

                <motion.div className="scroll-indicator" animate={{ y: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <span>Desliza</span>
                    <div className="scroll-arrow"></div>
                </motion.div>
            </section>

            <section className="home-block home-block-personal container">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.55 }}
                >
                    <div className="block-header">
                        <span className="block-kicker">Para ti</span>
                        <h2 className="block-title text-gradient">{settings.homePersonalTitle}</h2>
                        <p className="block-copy">{settings.homePersonalDescription}</p>
                    </div>

                    {isMobileLayout && (
                        <div className="personal-mobile-tabs" role="tablist" aria-label="Actividad personal">
                            <button
                                type="button"
                                className={`personal-mobile-tab ${mobilePersonalTab === 'recent' ? 'active' : ''}`}
                                onClick={() => setMobilePersonalTab('recent')}
                                aria-pressed={mobilePersonalTab === 'recent'}
                            >
                                Recientes
                            </button>
                            <button
                                type="button"
                                className={`personal-mobile-tab ${mobilePersonalTab === 'favorites' ? 'active' : ''}`}
                                onClick={() => setMobilePersonalTab('favorites')}
                                aria-pressed={mobilePersonalTab === 'favorites'}
                            >
                                Favoritos
                            </button>
                            <button
                                type="button"
                                className={`personal-mobile-tab ${mobilePersonalTab === 'queue' ? 'active' : ''}`}
                                onClick={() => setMobilePersonalTab('queue')}
                                aria-pressed={mobilePersonalTab === 'queue'}
                            >
                                Cola
                            </button>
                        </div>
                    )}

                    <div className="personal-grid">
                        <article
                            className={`personal-card glass-strong ${isMobileLayout && mobilePersonalTab !== 'recent' ? 'mobile-hidden' : ''}`}
                        >
                            <header className="personal-card-head">
                                <span className="personal-icon"><FaHistory /></span>
                                <div>
                                    <h3>Seguir escuchando</h3>
                                    <p>Tu historial reciente.</p>
                                </div>
                            </header>
                            {renderTrackList(recentTracks, 'Aun no hay reproducciones recientes.')}
                        </article>

                        <article
                            className={`personal-card glass-strong ${isMobileLayout && mobilePersonalTab !== 'favorites' ? 'mobile-hidden' : ''}`}
                        >
                            <header className="personal-card-head">
                                <span className="personal-icon"><FaHeart /></span>
                                <div>
                                    <h3>Tus favoritos</h3>
                                    <p>Acceso rapido a tus temas guardados.</p>
                                </div>
                            </header>
                            {renderTrackList(favoriteTracks, 'Todavia no marcaste canciones favoritas.')}
                        </article>

                        <article
                            className={`personal-card glass-strong ${isMobileLayout && mobilePersonalTab !== 'queue' ? 'mobile-hidden' : ''}`}
                        >
                            <header className="personal-card-head">
                                <span className="personal-icon"><FaListUl /></span>
                                <div>
                                    <h3>Tu cola</h3>
                                    <p>Lo siguiente en reproduccion.</p>
                                </div>
                            </header>
                            {renderTrackList(queueTracks, 'La cola esta vacia por ahora.')}
                        </article>
                    </div>
                </motion.div>
            </section>

            {nextScheduledRelease && releaseCountdown && (
                <section className="home-block home-block-countdown container">
                    <motion.div
                        className="countdown-card glass-strong"
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="countdown-copy">
                            <span className="block-kicker">Proximo lanzamiento</span>
                            <h2 className="block-title text-gradient">{settings.homeCountdownTitle}</h2>
                            <p className="block-copy">
                                {settings.homeCountdownDescription.trim()
                                    ? settings.homeCountdownDescription
                                    : releaseCountdown.isLive
                                    ? 'Ya esta disponible. Se publicara en cualquier momento.'
                                    : `Se publica el ${new Date(nextScheduledRelease.publishAt || '').toLocaleString('es-ES')}.`}
                            </p>
                            <div className={`release-reminder-badge ${releaseReminderAutoEnabled ? 'enabled' : 'disabled'}`}>
                                <FaRegBell />
                                {releaseReminderAutoEnabled
                                    ? 'Recordatorio popup automatico activo'
                                    : 'Recordatorio popup automatico desactivado'}
                            </div>
                            <p className="block-copy" style={{ marginTop: '10px' }}>
                                {nextScheduledRelease.title}
                            </p>
                        </div>

                        <div className="countdown-side">
                            <div className="countdown-grid" aria-live="polite">
                                <div className="countdown-item">
                                    <strong>{releaseCountdown.days}</strong>
                                    <span>Dias</span>
                                </div>
                                <div className="countdown-item">
                                    <strong>{releaseCountdown.hours}</strong>
                                    <span>Horas</span>
                                </div>
                                <div className="countdown-item">
                                    <strong>{releaseCountdown.minutes}</strong>
                                    <span>Min</span>
                                </div>
                                <div className="countdown-item">
                                    <strong>{releaseCountdown.seconds}</strong>
                                    <span>Seg</span>
                                </div>
                            </div>

                            <div className="launch-center glass">
                                <div className="launch-center-head">
                                    <h3>Centro de lanzamiento</h3>
                                    <span>{preregisterCount} preregistros</span>
                                </div>

                                <form className="preregister-form" onSubmit={handlePreregisterSubmit}>
                                    <input
                                        type="text"
                                        value={preregisterName}
                                        onChange={(event) => setPreregisterName(event.target.value)}
                                        placeholder="Nombre (opcional)"
                                        autoComplete="name"
                                    />
                                    <input
                                        type="email"
                                        value={preregisterEmail}
                                        onChange={(event) => setPreregisterEmail(event.target.value)}
                                        placeholder="tu@email.com"
                                        required
                                        autoComplete="email"
                                    />
                                    <button type="submit" className="btn-primary" disabled={isSubmittingPreregister}>
                                        {isSubmittingPreregister ? 'Guardando...' : 'Preregistrarme'}
                                    </button>
                                </form>

                                {preregisterMessage && <p className="preregister-feedback">{preregisterMessage}</p>}

                                <div className="calendar-actions">
                                    <a
                                        href={googleCalendarUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary"
                                        onClick={handleGoogleCalendarClick}
                                    >
                                        <FaCalendarAlt /> Google Calendar
                                    </a>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={handleAppleCalendarClick}
                                    >
                                        <FaCalendarAlt /> Apple Calendar
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={handleDownloadIcsClick}
                                    >
                                        <FaDownload /> Descargar ICS
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>
            )}
            <section id="latest" className="home-block home-block-spotlight container">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="block-header">
                        <span className="block-kicker">Spotlight</span>
                        <h2 className="block-title text-gradient">{settings.homeSpotlightTitle}</h2>
                        <p className="block-copy">{settings.homeSpotlightDescription}</p>
                    </div>

                    {isLoading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Cargando...</p>
                        </div>
                    ) : latestRelease ? (
                        <div className="latest-card glass-strong">
                            <div className="latest-cover-wrapper">
                                <motion.img
                                    src={latestRelease.coverArt}
                                    alt={latestRelease.title}
                                    className="latest-cover"
                                    whileHover={{ scale: 1.05, rotate: 2 }}
                                    transition={{ duration: 0.3 }}
                                />
                                <div className="latest-badge">NUEVO</div>
                            </div>

                            <div className="latest-info">
                                <span className="latest-type">{latestRelease.type.toUpperCase()}</span>
                                <h3 className="latest-title">{latestRelease.title}</h3>
                                <p className="latest-description">
                                    {latestRelease.description ||
                                        'Mi trabajo mas reciente. Una coleccion de canciones que exploran nuevos sonidos y emociones.'}
                                </p>
                                <div className="latest-meta">
                                    <span>{new Date(latestRelease.releaseDate).getFullYear()}</span>
                                    <span>&middot;</span>
                                    <span>{latestRelease.tracks.length} canciones</span>
                                    <span>&middot;</span>
                                    <span>{Math.floor(latestRelease.tracks.reduce((acc, track) => acc + track.duration, 0) / 60)} min</span>
                                </div>

                                <div className="latest-tracklist">
                                    {latestRelease.tracks.slice(0, latestTrackLimit).map((track, index) => (
                                        <motion.div
                                            key={track.id}
                                            className="latest-track-item"
                                            whileHover={{ x: 5 }}
                                            onClick={() => playTrack(track, latestRelease)}
                                        >
                                            <span className="track-number">{index + 1}</span>
                                            <span className="track-name">{track.title}</span>
                                            <span className="track-duration">
                                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                            </span>
                                            <button className="track-play-btn">
                                                <FaPlay />
                                            </button>
                                        </motion.div>
                                    ))}
                                    {latestRelease.tracks.length > latestTrackLimit && (
                                        <Link to="/musica" className="see-more-tracks">
                                            Ver todas las canciones ({latestRelease.tracks.length})
                                        </Link>
                                    )}
                                </div>

                                <div className="latest-actions">
                                    <button className="btn-primary" onClick={handlePlayLatest}>
                                        <FaPlay /> Reproducir todo
                                    </button>
                                    <Link to="/musica" className="btn-secondary">
                                        Ver mas
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state glass">
                            <FaCompactDisc className="empty-icon" />
                            <h3>No hay lanzamientos aun</h3>
                            <p>Pronto habra nueva musica disponible</p>
                        </div>
                    )}
                </motion.div>
            </section>

            <section className="home-block home-block-discovery container">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="block-header">
                        <span className="block-kicker">Coleccion</span>
                        <h2 className="block-title text-gradient">{settings.homeDiscoveryTitle}</h2>
                        <p className="block-copy">{settings.homeDiscoveryDescription}</p>
                    </div>

                    {isLoading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                        </div>
                    ) : albums.length > 0 ? (
                        <>
                            <div className="albums-grid compact-grid">
                                {albums.slice(0, 4).map((album, index) => (
                                    <motion.div
                                        key={album.id}
                                        initial={{ opacity: 0, y: 50 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: '-50px' }}
                                        transition={{ duration: 0.6, delay: index * 0.08 }}
                                    >
                                        <AlbumCard album={album} />
                                    </motion.div>
                                ))}
                            </div>

                            <div className="strip-actions">
                                <Link to="/musica" className="btn-secondary">
                                    Ver discografia completa
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state glass">
                            <FaCompactDisc className="empty-icon" />
                            <h3>No hay albumes</h3>
                            <p>Los albumes apareceran aqui cuando los crees desde el panel admin</p>
                        </div>
                    )}
                </motion.div>
            </section>

            <section className="home-block home-block-signals container">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="block-header">
                        <span className="block-kicker">Actividad</span>
                        <h2 className="block-title text-gradient">{settings.homeSignalsTitle}</h2>
                        <p className="block-copy">{settings.homeSignalsDescription}</p>
                    </div>

                    <div className="signals-grid">
                        <article className="signal-card glass-strong">
                            <div className="signal-card-head">
                                <h3>Top y tendencia</h3>
                                <p>Reproducciones historicas y movimiento semanal en un solo bloque.</p>
                            </div>
                            <div className="signal-tabs" role="tablist" aria-label="Top y tendencia">
                                <button
                                    type="button"
                                    className={`signal-tab ${signalTab === 'top' ? 'active' : ''}`}
                                    onClick={() => setSignalTab('top')}
                                    aria-selected={signalTab === 'top'}
                                >
                                    Top canciones
                                </button>
                                <button
                                    type="button"
                                    className={`signal-tab ${signalTab === 'trends' ? 'active' : ''}`}
                                    onClick={() => setSignalTab('trends')}
                                    aria-selected={signalTab === 'trends'}
                                >
                                    Tendencia semanal
                                </button>
                            </div>
                            <ScrollReveal animation="fadeUp">
                                {signalTab === 'top' ? <TopTracks /> : <WeeklyTrends />}
                            </ScrollReveal>
                        </article>
                    </div>
                </motion.div>
            </section>
            <section className="home-block home-block-community container">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="block-header">
                        <span className="block-kicker">Comunidad</span>
                        <h2 className="block-title text-gradient">{settings.homeCommunityTitle}</h2>
                        <p className="block-copy">{settings.homeCommunityDescription}</p>
                    </div>

                    {isMobileLayout && (
                        <div className="community-mobile-tabs" role="tablist" aria-label="Comunidad y apoyo">
                            <button
                                type="button"
                                className={`community-mobile-tab ${mobileCommunityTab === 'audience' ? 'active' : ''}`}
                                onClick={() => setMobileCommunityTab('audience')}
                                aria-selected={mobileCommunityTab === 'audience'}
                            >
                                Audiencia
                            </button>
                            <button
                                type="button"
                                className={`community-mobile-tab ${mobileCommunityTab === 'support' ? 'active' : ''}`}
                                onClick={() => setMobileCommunityTab('support')}
                                aria-selected={mobileCommunityTab === 'support'}
                            >
                                Apoyo
                            </button>
                        </div>
                    )}

                    <div className="community-layout">
                        <article className={`community-panel glass-strong ${isMobileLayout && mobileCommunityTab !== 'audience' ? 'mobile-hidden' : ''}`}>
                            <div className="community-panel-head">
                                <h3>Audiencia</h3>
                                <p>Seguimiento de comunidad en plataformas clave.</p>
                            </div>
                            <ScrollReveal animation="fadeUp">
                                <FollowerStats />
                            </ScrollReveal>
                        </article>

                        <article className={`community-panel glass-strong ${isMobileLayout && mobileCommunityTab !== 'support' ? 'mobile-hidden' : ''}`}>
                            <div className="community-panel-head">
                                <h3>Apoyo directo</h3>
                                <p>Canales de aportes para sostener nuevos lanzamientos.</p>
                            </div>
                            <ScrollReveal animation="scale">
                                <SupportSection />
                            </ScrollReveal>
                        </article>
                    </div>
                </motion.div>
            </section>

            <section className="home-block newsletter container">
                <motion.div
                    className="newsletter-card glass-strong"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="newsletter-title">
                        <span className="text-gradient">{settings.homeNewsletterTitle}</span>
                    </h2>
                    <p className="newsletter-text">
                        {settings.homeNewsletterDescription}
                    </p>
                    <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}>
                        <input type="email" placeholder={settings.homeNewsletterPlaceholder} className="newsletter-input" required />
                        <button type="submit" className="newsletter-btn">
                            {settings.homeNewsletterButtonLabel}
                        </button>
                    </form>
                </motion.div>
            </section>
        </div>
    );
};

export default Home;
