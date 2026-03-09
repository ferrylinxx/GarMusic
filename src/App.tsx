import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import { AuthProvider } from './context/AuthContext';
import { DiscographyProvider } from './context/DiscographyContext';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import Navbar from './components/Layout/Navbar';
import GlobalVideoBackground from './components/Layout/GlobalVideoBackground';
import AudioPlayer from './components/Player/AudioPlayer';
import PopupHost from './components/Popups/PopupHost';
import ProtectedRoute from './components/admin/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Musica from './pages/Musica';
import AlbumDetalle from './pages/AlbumDetalle';
import PlaylistDetalle from './pages/PlaylistDetalle';
import Bio from './pages/Bio';
import Contacto from './pages/Contacto';

// Admin Pages
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Albums from './pages/admin/Albums';
import AlbumEditor from './pages/admin/AlbumEditor';
import Tracks from './pages/admin/Tracks';
import Playlists from './pages/admin/Playlists';
import Analytics from './pages/admin/Analytics';
import Settings from './pages/admin/Settings';
import Messages from './pages/admin/Messages';
import Popups from './pages/admin/Popups';
import { trackPageView } from './utils/analytics';

import './styles/globals.css';

// Page transition wrapper
const PageWrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
};

// Animated Routes component
const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {/* Public Routes */}
                <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
                <Route path="/musica" element={<PageWrapper><Musica /></PageWrapper>} />
                <Route path="/musica/album/:albumId" element={<PageWrapper><AlbumDetalle /></PageWrapper>} />
                <Route path="/playlist/:playlistId" element={<PageWrapper><PlaylistDetalle /></PageWrapper>} />
                <Route path="/bio" element={<PageWrapper><Bio /></PageWrapper>} />
                <Route path="/contacto" element={<PageWrapper><Contacto /></PageWrapper>} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<Login />} />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                >
                    <Route path="albums" element={<Albums />} />
                    <Route path="albums/:id" element={<AlbumEditor />} />
                    <Route path="tracks" element={<Tracks />} />
                    <Route path="playlists" element={<Playlists />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="popups" element={<Popups />} />
                </Route>
            </Routes>
        </AnimatePresence>
    );
};

// Main App Layout
const AppLayout = () => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const pagePath = `${location.pathname}${location.search}${location.hash}`;
        trackPageView(pagePath, window.location.href, document.title);
    }, [location.pathname, location.search, location.hash]);

    return (
        <div className="app">
            <GlobalVideoBackground />
            <div className="app-content-layer">
                {!isAdminRoute && <Navbar />}
                {!isAdminRoute && <PopupHost />}
                <main className={isAdminRoute ? 'admin-main-wrapper' : 'main-content'}>
                    <AnimatedRoutes />
                </main>
                {!isAdminRoute && <AudioPlayer />}
            </div>
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <SiteSettingsProvider>
                <DiscographyProvider>
                    <PlayerProvider>
                        <Router>
                            <AppLayout />
                        </Router>
                    </PlayerProvider>
                </DiscographyProvider>
            </SiteSettingsProvider>
        </AuthProvider>
    );
}

export default App;
