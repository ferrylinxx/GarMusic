import { memo, useMemo } from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import './GlobalVideoBackground.css';

const GlobalVideoBackground = () => {
    const { settings } = useSiteSettings();

    const videoSrc = useMemo(() => settings.heroVideoUrl || '/videos/hero-bg.mp4', [settings.heroVideoUrl]);

    return (
        <div className="global-video-bg" aria-hidden="true">
            <video
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="global-video-bg-media"
                poster="/images/hero-poster.jpg"
                src={videoSrc}
                crossOrigin="anonymous"
                key={videoSrc}
            />
            <div className="global-video-bg-overlay" />
        </div>
    );
};

export default memo(GlobalVideoBackground);
