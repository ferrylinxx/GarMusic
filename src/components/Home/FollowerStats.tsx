import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FaInstagram, FaSpotify, FaYoutube } from 'react-icons/fa';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface CounterProps {
    end: number;
    duration?: number;
    suffix?: string;
}

const AnimatedCounter = ({ end, duration = 2, suffix = '' }: CounterProps) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (!isInView) return;

        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOutQuart * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isInView, end, duration]);

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toLocaleString();
    };

    return (
        <span ref={ref} className="counter-value">
            {formatNumber(count)}
            {suffix}
        </span>
    );
};

interface StatItem {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    url?: string;
}

const FollowerStats = () => {
    const { settings } = useSiteSettings();

    const stats: StatItem[] = [
        {
            icon: <FaSpotify />,
            label: 'Oyentes mensuales',
            value: settings.spotifyFollowers || 125000,
            color: '#1DB954',
            url: settings.spotifyUrl,
        },
        {
            icon: <FaInstagram />,
            label: 'Seguidores',
            value: settings.instagramFollowers || 85000,
            color: '#E4405F',
            url: settings.instagramUrl,
        },
        {
            icon: <FaYoutube />,
            label: 'Suscriptores',
            value: settings.youtubeFollowers || 50000,
            color: '#FF0000',
            url: settings.youtubeUrl,
        },
    ];

    return (
        <section className="follower-stats-section">
            <motion.div
                className="section-header"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <h2 className="section-title">Unete a la comunidad</h2>
                <p className="section-subtitle">Sigue el crecimiento en todas las plataformas</p>
            </motion.div>

            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <motion.a
                        key={stat.label}
                        href={stat.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="stat-item glass"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.15 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                    >
                        <div className="stat-icon-wrapper" style={{ background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}40)` }}>
                            <span className="stat-icon" style={{ color: stat.color }}>
                                {stat.icon}
                            </span>
                        </div>
                        <div className="stat-content">
                            <AnimatedCounter end={stat.value} duration={2.5} />
                            <span className="stat-label">{stat.label}</span>
                        </div>
                        <div className="stat-glow" style={{ background: stat.color }} />
                    </motion.a>
                ))}
            </div>
        </section>
    );
};

export default FollowerStats;
