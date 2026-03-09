import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { createPortal } from 'react-dom';
import { FaBars, FaMusic, FaPlay, FaTimes } from 'react-icons/fa';
import { useDiscography } from '../../context/DiscographyContext';
import { usePlayer } from '../../context/PlayerContext';
import './MobileMenu.css';

export interface MobileMenuLink {
    to: string;
    label: string;
}

interface MobileMenuProps {
    navLinks: MobileMenuLink[];
}

const panelVariants: Variants = {
    closed: {
        x: '105%',
        opacity: 0.95,
        transition: {
            duration: 0.22,
            ease: 'easeInOut',
        },
    },
    open: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.28,
            ease: 'easeOut',
        },
    },
};

const MobileMenu = ({ navLinks }: MobileMenuProps) => {
    const location = useLocation();
    const { latestRelease } = useDiscography();
    const { playAlbum } = usePlayer();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.body.classList.add('mobile-menu-open');
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.classList.remove('mobile-menu-open');
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    useEffect(() => {
        return () => {
            document.body.classList.remove('mobile-menu-open');
        };
    }, []);

    const spotlightMeta = useMemo(() => {
        if (!latestRelease) return '';
        const year = new Date(latestRelease.releaseDate).getFullYear();
        return `${latestRelease.tracks.length} canciones - ${year}`;
    }, [latestRelease]);

    const handlePlaySpotlight = () => {
        if (!latestRelease) return;
        playAlbum(latestRelease);
        setIsOpen(false);
    };
    const portalTarget = typeof document !== 'undefined' ? document.body : null;

    const menuLayer = (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="menu-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        id="site-mobile-menu"
                        className="mobile-menu-panel glass-strong"
                        variants={panelVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu movil"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mobile-menu-head">
                            <Link to="/" className="mobile-logo" onClick={() => setIsOpen(false)}>
                                <FaMusic className="logo-icon" />
                                <span className="text-gradient">FGAROLA</span>
                            </Link>
                            <button type="button" className="mobile-close" onClick={() => setIsOpen(false)} aria-label="Cerrar menu">
                                <FaTimes />
                            </button>
                        </div>

                        <p className="mobile-menu-subtitle">Navega rapido entre secciones y lanzamientos.</p>

                        <nav className="mobile-menu-nav" aria-label="Navegacion movil">
                            {navLinks.map((link, index) => (
                                <motion.div
                                    key={link.to}
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        transition: { delay: 0.05 + index * 0.06 },
                                    }}
                                    exit={{ opacity: 0, x: 24 }}
                                >
                                    <NavLink
                                        to={link.to}
                                        className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <span className="mobile-nav-index">{String(index + 1).padStart(2, '0')}</span>
                                        <span className="mobile-nav-label">{link.label}</span>
                                    </NavLink>
                                </motion.div>
                            ))}
                        </nav>

                        {latestRelease && (
                            <motion.button
                                type="button"
                                className="mobile-menu-spotlight glass"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: 0.32 } }}
                                onClick={handlePlaySpotlight}
                            >
                                <img src={latestRelease.coverArt} alt={latestRelease.title} />
                                <div className="mobile-spotlight-copy">
                                    <span className="mobile-spotlight-kicker">En foco</span>
                                    <strong>{latestRelease.title}</strong>
                                    <small>{spotlightMeta}</small>
                                </div>
                                <span className="mobile-spotlight-play">
                                    <FaPlay />
                                </span>
                            </motion.button>
                        )}
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );

    return (
        <div className="mobile-menu-container">
            <motion.button
                type="button"
                className={`hamburger-btn ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen((prev) => !prev)}
                whileTap={{ scale: 0.94 }}
                aria-label={isOpen ? 'Cerrar menu' : 'Abrir menu'}
                aria-expanded={isOpen}
                aria-controls="site-mobile-menu"
            >
                {isOpen ? <FaTimes /> : <FaBars />}
            </motion.button>

            {portalTarget ? createPortal(menuLayer, portalTarget) : menuLayer}
        </div>
    );
};

export default MobileMenu;
