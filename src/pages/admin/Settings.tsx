import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    FaChartLine,
    FaCog,
    FaCoffee,
    FaFileAlt,
    FaHeart,
    FaImage,
    FaInstagram,
    FaPalette,
    FaPatreon,
    FaPaypal,
    FaSave,
    FaSpotify,
    FaTwitter,
    FaUpload,
    FaVideo,
    FaYoutube,
} from 'react-icons/fa';
import { FaTiktok } from 'react-icons/fa6';
import db, { SiteSettings } from '../../services/DatabaseService';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import './admin.css';

type SettingsTab = 'hero' | 'social' | 'followers' | 'donations' | 'bio' | 'content' | 'theme';

const normalizeSettings = (input: SiteSettings): SiteSettings => {
    const defaults = db.getDefaultSiteSettings();
    return {
        ...defaults,
        ...input,
        heroSubtitles: Array.isArray(input.heroSubtitles) && input.heroSubtitles.length > 0
            ? input.heroSubtitles
            : defaults.heroSubtitles,
        bioSidebarItems: Array.isArray(input.bioSidebarItems)
            ? input.bioSidebarItems.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : defaults.bioSidebarItems,
    };
};

const toLines = (value: string): string[] =>
    value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8);

const Settings = () => {
    const { refreshSettings } = useSiteSettings();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>('hero');
    const [settings, setSettings] = useState<SiteSettings>(db.getDefaultSiteSettings());
    const [bioSidebarDraft, setBioSidebarDraft] = useState('');

    useEffect(() => {
        void load();
    }, []);

    const load = async () => {
        setIsLoading(true);
        try {
            const data = normalizeSettings(await db.getSiteSettings());
            setSettings(data);
            setBioSidebarDraft(data.bioSidebarItems.join('\n'));
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const save = async () => {
        setIsSaving(true);
        try {
            const payload = normalizeSettings({
                ...settings,
                bioSidebarItems: toLines(bioSidebarDraft),
            });
            await db.saveSiteSettings(payload);
            await refreshSettings();
            alert('Configuracion guardada correctamente.');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('No se pudo guardar la configuracion.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
        setSettings((previous) => ({ ...previous, [key]: value }));
    };

    const subtitleRows = useMemo(
        () => settings.heroSubtitles.map((subtitle, index) => ({ subtitle, index })),
        [settings.heroSubtitles]
    );

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Cargando configuracion...</p>
            </div>
        );
    }

    return (
        <motion.div className="settings-page" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="page-header">
                <div className="header-left">
                    <h1><FaCog /> Configuracion</h1>
                    <p>Panel global para contenido y estilo</p>
                </div>
                <button className="btn-save" onClick={save} disabled={isSaving}>
                    {isSaving ? <><div className="loading-spinner-small"></div> Guardando...</> : <><FaSave /> Guardar cambios</>}
                </button>
            </div>

            <div className="settings-tabs">
                <button className={`tab-btn ${activeTab === 'hero' ? 'active' : ''}`} onClick={() => setActiveTab('hero')}><FaVideo /> Hero</button>
                <button className={`tab-btn ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')}><FaSpotify /> Redes</button>
                <button className={`tab-btn ${activeTab === 'followers' ? 'active' : ''}`} onClick={() => setActiveTab('followers')}><FaChartLine /> Seguidores</button>
                <button className={`tab-btn ${activeTab === 'donations' ? 'active' : ''}`} onClick={() => setActiveTab('donations')}><FaHeart /> Donaciones</button>
                <button className={`tab-btn ${activeTab === 'bio' ? 'active' : ''}`} onClick={() => setActiveTab('bio')}><FaImage /> Bio</button>
                <button className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}><FaFileAlt /> Contenido</button>
                <button className={`tab-btn ${activeTab === 'theme' ? 'active' : ''}`} onClick={() => setActiveTab('theme')}><FaPalette /> Tema</button>
            </div>

            <div className="settings-content glass">
                {activeTab === 'hero' && (
                    <div className="settings-section">
                        <h2>Hero principal</h2>
                        <div className="form-group">
                            <label>Titulo</label>
                            <input type="text" value={settings.heroTitle} onChange={(event) => updateSetting('heroTitle', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Descripcion</label>
                            <input type="text" value={settings.heroDescription} onChange={(event) => updateSetting('heroDescription', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>URL video</label>
                            <input type="text" value={settings.heroVideoUrl} onChange={(event) => updateSetting('heroVideoUrl', event.target.value)} />
                        </div>
                        <div className="form-group">
                            <label><FaUpload /> Subir video</label>
                            <input
                                type="file"
                                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                                onChange={async (event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    try {
                                        const videoUrl = await db.uploadVideoFile(file, 'hero');
                                        updateSetting('heroVideoUrl', videoUrl);
                                    } catch (error) {
                                        console.error('Error uploading hero video:', error);
                                        alert('No se pudo subir el video.');
                                    }
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Subtitulos rotativos</label>
                            <div className="subtitles-list">
                                {subtitleRows.map(({ subtitle, index }) => (
                                    <div className="subtitle-item" key={index}>
                                        <input
                                            type="text"
                                            value={subtitle}
                                            onChange={(event) => {
                                                const next = [...settings.heroSubtitles];
                                                next[index] = event.target.value;
                                                updateSetting('heroSubtitles', next);
                                            }}
                                        />
                                        <button
                                            className="btn-icon delete"
                                            onClick={() => {
                                                if (settings.heroSubtitles.length <= 1) return;
                                                updateSetting('heroSubtitles', settings.heroSubtitles.filter((_, itemIndex) => itemIndex !== index));
                                            }}
                                        >
                                            x
                                        </button>
                                    </div>
                                ))}
                                <button className="btn-add-subtitle" onClick={() => updateSetting('heroSubtitles', [...settings.heroSubtitles, ''])}>
                                    + Anadir subtitulo
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'social' && (
                    <div className="settings-section">
                        <h2>Redes sociales</h2>
                        <div className="form-group"><label><FaSpotify /> Spotify</label><input type="url" value={settings.spotifyUrl} onChange={(event) => updateSetting('spotifyUrl', event.target.value)} /></div>
                        <div className="form-group"><label><FaInstagram /> Instagram</label><input type="url" value={settings.instagramUrl} onChange={(event) => updateSetting('instagramUrl', event.target.value)} /></div>
                        <div className="form-group"><label><FaYoutube /> YouTube</label><input type="url" value={settings.youtubeUrl} onChange={(event) => updateSetting('youtubeUrl', event.target.value)} /></div>
                        <div className="form-group"><label><FaTwitter /> Twitter / X</label><input type="url" value={settings.twitterUrl} onChange={(event) => updateSetting('twitterUrl', event.target.value)} /></div>
                        <div className="form-group"><label><FaTiktok /> TikTok</label><input type="url" value={settings.tiktokUrl} onChange={(event) => updateSetting('tiktokUrl', event.target.value)} /></div>
                    </div>
                )}

                {activeTab === 'followers' && (
                    <div className="settings-section">
                        <h2>Seguidores</h2>
                        <div className="form-group"><label><FaSpotify /> Spotify</label><input type="number" value={settings.spotifyFollowers} onChange={(event) => updateSetting('spotifyFollowers', parseInt(event.target.value, 10) || 0)} /></div>
                        <div className="form-group"><label><FaInstagram /> Instagram</label><input type="number" value={settings.instagramFollowers} onChange={(event) => updateSetting('instagramFollowers', parseInt(event.target.value, 10) || 0)} /></div>
                        <div className="form-group"><label><FaYoutube /> YouTube</label><input type="number" value={settings.youtubeFollowers} onChange={(event) => updateSetting('youtubeFollowers', parseInt(event.target.value, 10) || 0)} /></div>
                    </div>
                )}

                {activeTab === 'donations' && (
                    <div className="settings-section">
                        <h2>Donaciones</h2>
                        <div className="form-group"><label><FaCoffee /> Ko-fi</label><input type="url" value={settings.kofiUrl} onChange={(event) => updateSetting('kofiUrl', event.target.value)} /></div>
                        <div className="form-group"><label><FaPatreon /> Patreon</label><input type="url" value={settings.patreonUrl} onChange={(event) => updateSetting('patreonUrl', event.target.value)} /></div>
                        <div className="form-group"><label><FaPaypal /> PayPal</label><input type="url" value={settings.paypalUrl} onChange={(event) => updateSetting('paypalUrl', event.target.value)} /></div>
                    </div>
                )}

                {activeTab === 'bio' && (
                    <div className="settings-section">
                        <h2>Bio</h2>
                        <div className="form-group">
                            <label>Imagen de bio</label>
                            <div className="bio-image-upload">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            const imageUrl = await db.uploadImageFile(file, 'bio');
                                            updateSetting('bioImage', imageUrl);
                                        } catch (error) {
                                            console.error('Error uploading bio image:', error);
                                            alert('No se pudo subir la imagen.');
                                        }
                                    }}
                                />
                                {settings.bioImage && <div className="bio-image-preview"><img src={settings.bioImage} alt="Bio" /></div>}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Contenido Markdown</label>
                            <textarea rows={14} value={settings.bioContent} onChange={(event) => updateSetting('bioContent', event.target.value)} />
                        </div>
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="settings-section">
                        <h2>Contenido de paginas</h2>
                        <div className="form-group"><label>Inicio · Seccion personal (titulo)</label><input type="text" value={settings.homePersonalTitle} onChange={(event) => updateSetting('homePersonalTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Seccion personal (descripcion)</label><textarea rows={2} value={settings.homePersonalDescription} onChange={(event) => updateSetting('homePersonalDescription', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Countdown (titulo)</label><input type="text" value={settings.homeCountdownTitle} onChange={(event) => updateSetting('homeCountdownTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Countdown (descripcion opcional)</label><textarea rows={2} value={settings.homeCountdownDescription} onChange={(event) => updateSetting('homeCountdownDescription', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Spotlight (titulo)</label><input type="text" value={settings.homeSpotlightTitle} onChange={(event) => updateSetting('homeSpotlightTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Spotlight (descripcion)</label><textarea rows={2} value={settings.homeSpotlightDescription} onChange={(event) => updateSetting('homeSpotlightDescription', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Discovery (titulo)</label><input type="text" value={settings.homeDiscoveryTitle} onChange={(event) => updateSetting('homeDiscoveryTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Discovery (descripcion)</label><textarea rows={2} value={settings.homeDiscoveryDescription} onChange={(event) => updateSetting('homeDiscoveryDescription', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Senales (titulo)</label><input type="text" value={settings.homeSignalsTitle} onChange={(event) => updateSetting('homeSignalsTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Senales (descripcion)</label><textarea rows={2} value={settings.homeSignalsDescription} onChange={(event) => updateSetting('homeSignalsDescription', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Comunidad (titulo)</label><input type="text" value={settings.homeCommunityTitle} onChange={(event) => updateSetting('homeCommunityTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Comunidad (descripcion)</label><textarea rows={2} value={settings.homeCommunityDescription} onChange={(event) => updateSetting('homeCommunityDescription', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Newsletter (titulo)</label><input type="text" value={settings.homeNewsletterTitle} onChange={(event) => updateSetting('homeNewsletterTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Newsletter (descripcion)</label><textarea rows={2} value={settings.homeNewsletterDescription} onChange={(event) => updateSetting('homeNewsletterDescription', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Newsletter placeholder</label><input type="text" value={settings.homeNewsletterPlaceholder} onChange={(event) => updateSetting('homeNewsletterPlaceholder', event.target.value)} /></div>
                        <div className="form-group"><label>Inicio · Newsletter boton</label><input type="text" value={settings.homeNewsletterButtonLabel} onChange={(event) => updateSetting('homeNewsletterButtonLabel', event.target.value)} /></div>
                        <div className="form-group"><label>Musica · Titulo principal</label><input type="text" value={settings.musicPageTitle} onChange={(event) => updateSetting('musicPageTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Musica · Subtitulo</label><textarea rows={2} value={settings.musicPageSubtitle} onChange={(event) => updateSetting('musicPageSubtitle', event.target.value)} /></div>
                        <div className="form-group"><label>Musica · Sidebar actividad (titulo)</label><input type="text" value={settings.musicActivityTitle} onChange={(event) => updateSetting('musicActivityTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Musica · Sidebar actividad (descripcion)</label><textarea rows={2} value={settings.musicActivityDescription} onChange={(event) => updateSetting('musicActivityDescription', event.target.value)} /></div>
                        <div className="form-group"><label>Bio · Hero (titulo)</label><input type="text" value={settings.bioHeroTitle} onChange={(event) => updateSetting('bioHeroTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Bio · Hero (resumen)</label><textarea rows={2} value={settings.bioHeroSummary} onChange={(event) => updateSetting('bioHeroSummary', event.target.value)} /></div>
                        <div className="form-group"><label>Bio · Sidebar (titulo)</label><input type="text" value={settings.bioSidebarTitle} onChange={(event) => updateSetting('bioSidebarTitle', event.target.value)} /></div>
                        <div className="form-group"><label>Bio · Sidebar puntos (1 linea por punto)</label><textarea rows={4} value={bioSidebarDraft} onChange={(event) => setBioSidebarDraft(event.target.value)} /></div>
                    </div>
                )}

                {activeTab === 'theme' && (
                    <div className="settings-section">
                        <h2>Tema</h2>
                        <div className="color-pickers">
                            <div className="form-group color-picker-group">
                                <label>Color principal</label>
                                <div className="color-input-wrapper">
                                    <input type="color" value={settings.accentPrimary} onChange={(event) => updateSetting('accentPrimary', event.target.value)} />
                                    <input type="text" value={settings.accentPrimary} onChange={(event) => updateSetting('accentPrimary', event.target.value)} />
                                </div>
                            </div>
                            <div className="form-group color-picker-group">
                                <label>Color secundario</label>
                                <div className="color-input-wrapper">
                                    <input type="color" value={settings.accentSecondary} onChange={(event) => updateSetting('accentSecondary', event.target.value)} />
                                    <input type="text" value={settings.accentSecondary} onChange={(event) => updateSetting('accentSecondary', event.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Settings;

