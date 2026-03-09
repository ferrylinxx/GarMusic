import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { FaMusic, FaPlay } from 'react-icons/fa';
import { useDiscography } from '../../context/DiscographyContext';
import { usePlayer } from '../../context/PlayerContext';
import MobileMenu, { MobileMenuLink } from './MobileMenu';
import './Navbar.css';

const Navbar = () => {
    const { latestRelease } = useDiscography();
    const { playAlbum } = usePlayer();
    const [isCondensed, setIsCondensed] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, 'change', (value) => {
        setIsCondensed(value > 18);
    });

    const navLinks: MobileMenuLink[] = useMemo(
        () => [
            { to: '/', label: 'Inicio' },
            { to: '/musica', label: 'Musica' },
            { to: '/bio', label: 'Bio' },
            { to: '/contacto', label: 'Contacto' },
        ],
        []
    );

    const releaseMeta = useMemo(() => {
        if (!latestRelease) return '';
        const year = new Date(latestRelease.releaseDate).getFullYear();
        return `${latestRelease.tracks.length} canciones - ${year}`;
    }, [latestRelease]);

    const handlePlayLatest = () => {
        if (!latestRelease) return;
        playAlbum(latestRelease);
    };

    return (
        <motion.nav
            className={`navbar glass ${isCondensed ? 'condensed' : ''}`}
            initial={{ y: -120 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
        >
            <div className="container navbar-content">
                <Link to="/" className="navbar-logo" aria-label="Ir a inicio">
                    <FaMusic className="logo-icon" />
                    <span className="logo-text text-gradient">FGAROLA</span>
                </Link>

                <div className="navbar-links" role="navigation" aria-label="Menu principal">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </div>

                {latestRelease && (
                    <div className="navbar-right">
                        <button
                            type="button"
                            className="navbar-release-chip"
                            onClick={handlePlayLatest}
                            aria-label={`Reproducir ${latestRelease.title}`}
                            title={`Reproducir ${latestRelease.title}`}
                        >
                            <span className="release-chip-kicker">En foco</span>
                            <strong>{latestRelease.title}</strong>
                            <small>{releaseMeta}</small>
                            <FaPlay />
                        </button>
                    </div>
                )}

                <MobileMenu navLinks={navLinks} />
            </div>

        </motion.nav>
    );
};

export default Navbar;
