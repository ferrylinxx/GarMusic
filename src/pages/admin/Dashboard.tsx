import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FaMusic, FaCompactDisc, FaList, FaChartLine,
    FaSignOutAlt, FaHome, FaBars, FaTimes, FaCog,
    FaEnvelope, FaBullhorn, FaClock, FaListUl, FaSyncAlt
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import db from '../../services/DatabaseService';
import { Album } from '../../types/music';
import './admin.css';

const Dashboard = () => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalAlbums: 0,
        totalTracks: 0,
        totalDuration: 0,
    });

    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        void loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const [albumsData, unread] = await Promise.all([db.getAllAlbums(true), db.getUnreadMessageCount()]);
            setAlbums(albumsData);
            setUnreadMessages(unread);

            const totalTracks = albumsData.reduce((acc, album) => acc + album.tracks.length, 0);
            const totalDuration = albumsData.reduce((acc, album) =>
                acc + album.tracks.reduce((t, track) => t + track.duration, 0), 0
            );

            setStats({
                totalAlbums: albumsData.length,
                totalTracks,
                totalDuration,
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setLoadError('No se pudieron cargar los datos del dashboard.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins} min`;
    };

    const menuItems = [
        { path: '/admin', icon: FaChartLine, label: 'Dashboard', exact: true },
        { path: '/admin/albums', icon: FaCompactDisc, label: 'Albumes' },
        { path: '/admin/tracks', icon: FaList, label: 'Canciones' },
        { path: '/admin/playlists', icon: FaListUl, label: 'Playlists' },
        { path: '/admin/analytics', icon: FaChartLine, label: 'Estadisticas' },
        { path: '/admin/messages', icon: FaEnvelope, label: 'Mensajes', badge: unreadMessages },
        { path: '/admin/popups', icon: FaBullhorn, label: 'Pop-ups' },
        { path: '/admin/settings', icon: FaCog, label: 'Configuracion' },
    ];

    const isActive = (path: string, exact?: boolean) => {
        if (exact) {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    const closeSidebarOnMobile = () => {
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            setIsSidebarOpen(false);
        }
    };

    return (
        <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <button
                type="button"
                className={`mobile-sidebar-trigger ${isSidebarOpen ? 'is-open' : ''}`}
                onClick={() => setIsSidebarOpen((previous) => !previous)}
                aria-label={isSidebarOpen ? 'Cerrar menu del panel' : 'Abrir menu del panel'}
            >
                {isSidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
            {isSidebarOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-label="Cerrar menu lateral"
                />
            )}

            {/* Sidebar */}
            <aside className="admin-sidebar glass-strong">
                <div className="sidebar-header">
                    <FaMusic className="sidebar-logo" />
                    <span className="sidebar-title">Admin Panel</span>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        {isSidebarOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${isActive(item.path, item.exact) ? 'active' : ''}`}
                            onClick={closeSidebarOnMobile}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                            {item.badge && item.badge > 0 && (
                                <span className="sidebar-badge">{item.badge}</span>
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <span className="user-name">{user?.username}</span>
                        <span className="user-role">Administrador</span>
                    </div>
                    <div className="sidebar-actions">
                        <Link to="/" className="sidebar-link" onClick={closeSidebarOnMobile}>
                            <FaHome />
                            <span>Ver Sitio</span>
                        </Link>
                        <button
                            onClick={() => {
                                closeSidebarOnMobile();
                                handleLogout();
                            }}
                            className="sidebar-link logout"
                        >
                            <FaSignOutAlt />
                            <span>Cerrar sesion</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {/* Show dashboard stats only on main admin page */}
                {location.pathname === '/admin' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="dashboard-content"
                    >
                        <div className="dashboard-title-row">
                            <h1 className="admin-title">
                                Bienvenido, <span className="text-gradient">{user?.username}</span>
                            </h1>
                            <button
                                type="button"
                                className="btn-secondary dashboard-refresh-btn"
                                onClick={() => void loadData()}
                                disabled={isLoading}
                            >
                                <FaSyncAlt /> {isLoading ? 'Actualizando...' : 'Actualizar'}
                            </button>
                        </div>

                        {loadError && <div className="admin-inline-feedback error">{loadError}</div>}

                        {isLoading ? (
                            <div className="admin-loading">
                                <div className="loading-spinner"></div>
                                <p>Cargando dashboard...</p>
                            </div>
                        ) : (
                            <>
                                <div className="stats-cards">
                                    <div className="stat-card glass">
                                        <FaCompactDisc className="stat-icon" />
                                        <div className="stat-info">
                                            <span className="stat-value">{stats.totalAlbums}</span>
                                            <span className="stat-label">Albumes</span>
                                        </div>
                                    </div>
                                    <div className="stat-card glass">
                                        <FaMusic className="stat-icon" />
                                        <div className="stat-info">
                                            <span className="stat-value">{stats.totalTracks}</span>
                                            <span className="stat-label">Canciones</span>
                                        </div>
                                    </div>
                                    <div className="stat-card glass">
                                        <FaClock className="stat-icon" />
                                        <div className="stat-info">
                                            <span className="stat-value">{formatDuration(stats.totalDuration)}</span>
                                            <span className="stat-label">Duracion total</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="recent-section">
                                    <h2>Albumes recientes</h2>
                                    <div className="recent-albums">
                                        {albums.slice(0, 4).map((album) => (
                                            <Link
                                                key={album.id}
                                                to={`/admin/albums/${album.id}`}
                                                className="recent-album-card glass"
                                            >
                                                <img src={album.coverArt} alt={album.title} />
                                                <div className="album-info">
                                                    <h3>{album.title}</h3>
                                                    <span>{album.tracks.length} canciones</span>
                                                </div>
                                            </Link>
                                        ))}
                                        {albums.length === 0 && (
                                            <p className="no-data">No hay albumes aun. <Link to="/admin/albums/new">Crear uno</Link></p>
                                        )}
                                    </div>
                                </div>

                                <div className="quick-actions">
                                    <h2>Acciones rapidas</h2>
                                    <div className="action-buttons">
                                        <Link to="/admin/albums/new" className="action-btn primary">
                                            <FaCompactDisc /> Nuevo album
                                        </Link>
                                        <Link to="/admin/tracks" className="action-btn secondary">
                                            <FaList /> Gestionar Canciones
                                        </Link>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* Outlet for nested routes */}
                <Outlet context={{ albums, loadData }} />
            </main>
        </div>
    );
};

export default Dashboard;

