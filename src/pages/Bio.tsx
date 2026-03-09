import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { FaInstagram, FaMusic, FaSpotify, FaYoutube } from 'react-icons/fa';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useDiscography } from '../context/DiscographyContext';
import useMediaQuery from '../hooks/useMediaQuery';
import './Bio.css';

const Bio = () => {
    const { settings } = useSiteSettings();
    const { albums } = useDiscography();
    const isMobileLayout = useMediaQuery('(max-width: 768px)');
    const [mobileSection, setMobileSection] = useState<'content' | 'sidebar'>('content');

    const defaultBioMarkdown = `## Mi historia
La musica siempre fue mi lenguaje para contar lo que no se puede decir de otra forma.
Empece escribiendo canciones desde adolescente y fui transformando cada etapa en sonido:
momentos personales, cambios reales y todo lo que me mueve a crear.

## Sonido e influencias
Me gusta mezclar estilos sin perder identidad. Tomo ideas del pop, urbano y electronica,
pero siempre busco que cada cancion tenga una emocion clara y una narrativa fuerte.

## Trayectoria
- **2022** - Primer single publicado
- **2023** - Primeros shows en vivo y crecimiento de comunidad
- **2024** - Lanzamiento de proyecto completo con direccion sonora propia

## Vision
Quiero construir un catalogo que evolucione con el tiempo y conecte de forma real con
quien escucha. Cada lanzamiento suma una nueva capa a esa historia.`;

    const firstReleaseYear = useMemo(() => {
        if (albums.length === 0) return null;
        const sorted = [...albums].sort(
            (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
        );
        return new Date(sorted[0].releaseDate).getFullYear();
    }, [albums]);

    const totalTracks = useMemo(
        () => albums.reduce((sum, album) => sum + album.tracks.length, 0),
        [albums]
    );

    const socialLinks = useMemo(
        () =>
            [
                { label: 'Spotify', url: settings.spotifyUrl, icon: <FaSpotify /> },
                { label: 'Instagram', url: settings.instagramUrl, icon: <FaInstagram /> },
                { label: 'YouTube', url: settings.youtubeUrl, icon: <FaYoutube /> },
            ].filter((item) => Boolean(item.url)),
        [settings.instagramUrl, settings.spotifyUrl, settings.youtubeUrl]
    );

    const bioContent = settings.bioContent?.trim()
        ? settings.bioContent
        : defaultBioMarkdown;
    const bioSidebarItems = settings.bioSidebarItems && settings.bioSidebarItems.length > 0
        ? settings.bioSidebarItems
        : [
            'Catalogo actualizado desde el panel admin.',
            'Bio editable con Markdown.',
            'Integrado con pagina de musica y lanzamientos.',
        ];

    return (
        <div className="bio-page container">
            <motion.section
                className="bio-hero glass-strong"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
            >
                <div className="bio-hero-media">
                    <img
                        src={settings.bioImage || '/images/artist/bio-photo.jpg'}
                        alt="Foto del artista"
                        className="bio-image"
                    />
                </div>

                <div className="bio-hero-copy">
                    <span className="bio-kicker">Biografia</span>
                    <h1 className="bio-title text-gradient">{settings.bioHeroTitle}</h1>
                    <p className="bio-summary">
                        {settings.bioHeroSummary}
                    </p>

                    <div className="bio-metrics">
                        <article className="bio-metric">
                            <strong>{albums.length}</strong>
                            <span>Albums</span>
                        </article>
                        <article className="bio-metric">
                            <strong>{totalTracks}</strong>
                            <span>Canciones</span>
                        </article>
                        <article className="bio-metric">
                            <strong>{firstReleaseYear || '-'}</strong>
                            <span>Desde</span>
                        </article>
                    </div>

                    <div className="bio-actions">
                        <Link to="/musica" className="btn-primary">
                            <FaMusic /> Escuchar musica
                        </Link>
                        <Link to="/contacto" className="btn-secondary">
                            Contacto
                        </Link>
                    </div>
                </div>
            </motion.section>

            <section className="bio-layout">
                {isMobileLayout && (
                    <div className="bio-mobile-tabs" role="tablist" aria-label="Secciones de bio">
                        <button
                            type="button"
                            className={`bio-mobile-tab ${mobileSection === 'content' ? 'active' : ''}`}
                            onClick={() => setMobileSection('content')}
                            aria-pressed={mobileSection === 'content'}
                        >
                            Biografia
                        </button>
                        <button
                            type="button"
                            className={`bio-mobile-tab ${mobileSection === 'sidebar' ? 'active' : ''}`}
                            onClick={() => setMobileSection('sidebar')}
                            aria-pressed={mobileSection === 'sidebar'}
                        >
                            Enlaces y resumen
                        </button>
                    </div>
                )}

                <aside className={`bio-sidebar glass ${isMobileLayout && mobileSection !== 'sidebar' ? 'mobile-hidden' : ''}`}>
                    <div className="bio-side-section">
                        <h2>Enlaces</h2>
                        {socialLinks.length > 0 ? (
                            <div className="bio-social-links">
                                {socialLinks.map((link) => (
                                    <a
                                        key={link.label}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {link.icon}
                                        <span>{link.label}</span>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="bio-side-empty">Configura enlaces sociales en el panel admin.</p>
                        )}
                    </div>

                    <div className="bio-side-section">
                        <h2>{settings.bioSidebarTitle}</h2>
                        <ul className="bio-summary-list">
                            {bioSidebarItems.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </aside>

                <article className={`bio-markdown glass-strong ${isMobileLayout && mobileSection !== 'content' ? 'mobile-hidden' : ''}`}>
                    <ReactMarkdown>{bioContent}</ReactMarkdown>
                </article>
            </section>
        </div>
    );
};

export default Bio;
