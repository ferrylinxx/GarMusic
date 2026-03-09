import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    FaArrowDown,
    FaArrowUp,
    FaCalendarAlt,
    FaChartBar,
    FaChartLine,
    FaClock,
    FaCompactDisc,
    FaMusic,
    FaPlay,
    FaSignal,
    FaTrophy,
} from 'react-icons/fa';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import statsService, { AnalyticsDashboard } from '../../services/StatsService';
import './admin.css';

type RangeDays = 7 | 30 | 90;

const RANGE_OPTIONS: Array<{ label: string; value: RangeDays }> = [
    { label: '7 dias', value: 7 },
    { label: '30 dias', value: 30 },
    { label: '90 dias', value: 90 },
];

const formatCompact = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return `${value}`;
};

const formatPercent = (value: number): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
};

const Analytics = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [rangeDays, setRangeDays] = useState<RangeDays>(30);
    const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);

    useEffect(() => {
        void loadData();
    }, [rangeDays]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await statsService.getAnalyticsDashboard(rangeDays);
            setDashboard(data);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const trendClass = useMemo(() => {
        const growth = dashboard?.summary.growthPercent ?? 0;
        if (growth > 0) return 'up';
        if (growth < 0) return 'down';
        return 'flat';
    }, [dashboard?.summary.growthPercent]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    if (isLoading || !dashboard) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Cargando estadisticas...</p>
            </div>
        );
    }

    const { summary, dailyStats, topTracks, hourlyStats, albumStats } = dashboard;

    return (
        <motion.div
            className="analytics-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="page-header analytics-header">
                <div className="header-left">
                    <h1><FaChartLine /> Estadisticas avanzadas</h1>
                    <p>Metricas en tiempo real para entender rendimiento, tendencia y horarios de escucha.</p>
                </div>
                <div className="time-toggle analytics-toggle">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            className={rangeDays === option.value ? 'active' : ''}
                            onClick={() => setRangeDays(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="analytics-kpi-grid">
                <motion.article className="stat-card glass" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="stat-icon"><FaPlay /></div>
                    <div className="stat-info">
                        <div className="stat-value">{formatCompact(summary.playsInRange)}</div>
                        <div className="stat-label">Reproducciones ({rangeDays} dias)</div>
                    </div>
                </motion.article>

                <motion.article className="stat-card glass" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <div className={`stat-icon growth ${trendClass}`}>
                        {trendClass === 'up' ? <FaArrowUp /> : trendClass === 'down' ? <FaArrowDown /> : <FaSignal />}
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{formatPercent(summary.growthPercent)}</div>
                        <div className="stat-label">Crecimiento vs periodo anterior</div>
                    </div>
                </motion.article>

                <motion.article className="stat-card glass" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="stat-icon"><FaCalendarAlt /></div>
                    <div className="stat-info">
                        <div className="stat-value">{summary.avgDailyPlays.toFixed(1)}</div>
                        <div className="stat-label">Promedio diario</div>
                    </div>
                </motion.article>

                <motion.article className="stat-card glass" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="stat-icon"><FaMusic /></div>
                    <div className="stat-info">
                        <div className="stat-value">{summary.uniqueTracks}</div>
                        <div className="stat-label">Canciones activas</div>
                    </div>
                </motion.article>

                <motion.article className="stat-card glass" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="stat-icon"><FaTrophy /></div>
                    <div className="stat-info">
                        <div className="stat-value stat-value-tight">
                            {summary.topAlbum ? summary.topAlbum.albumTitle : 'Sin datos'}
                        </div>
                        <div className="stat-label">
                            Album lider {summary.topAlbum ? `(${summary.topAlbum.playCount} plays)` : ''}
                        </div>
                    </div>
                </motion.article>

                <motion.article className="stat-card glass" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div className="stat-icon"><FaClock /></div>
                    <div className="stat-info">
                        <div className="stat-value">{summary.peakHour ? summary.peakHour.label : '--:--'}</div>
                        <div className="stat-label">Hora pico</div>
                    </div>
                </motion.article>
            </div>

            <div className="analytics-grid">
                <motion.div className="chart-card glass" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="chart-header">
                        <h3><FaChartLine /> Evolucion diaria</h3>
                        {summary.bestDay && (
                            <span className="chart-chip">
                                Mejor dia: {formatDate(summary.bestDay.date)} ({summary.bestDay.playCount})
                            </span>
                        )}
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={dailyStats}>
                                <defs>
                                    <linearGradient id="playsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.65} />
                                        <stop offset="95%" stopColor="#667eea" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.09)" />
                                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(0,0,0,0.88)',
                                        border: '1px solid rgba(255,255,255,0.14)',
                                        borderRadius: '10px',
                                    }}
                                    labelFormatter={(label) => formatDate(String(label))}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="playCount"
                                    stroke="#667eea"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#playsAreaGradient)"
                                    name="Reproducciones"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div className="chart-card glass" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="chart-header">
                        <h3><FaTrophy /> Top canciones</h3>
                    </div>
                    {topTracks.length > 0 ? (
                        <div className="top-tracks-list">
                            {topTracks.slice(0, 10).map((track, index) => (
                                <div key={track.trackId} className="top-track-item">
                                    <span className={`track-rank rank-${index + 1}`}>{index + 1}</span>
                                    <div className="track-info">
                                        <span className="track-title">{track.trackTitle}</span>
                                        <span className="track-album">{track.albumTitle}</span>
                                        <div className="analytics-progress">
                                            <div className="analytics-progress-fill" style={{ width: `${Math.max(track.sharePercent, 4)}%` }} />
                                        </div>
                                    </div>
                                    <div className="track-plays">
                                        <FaPlay /> {track.playCount}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FaMusic className="empty-icon" />
                            <h3>Sin datos aun</h3>
                            <p>Las estadisticas aparecen cuando se reproducen canciones.</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <div className="analytics-grid analytics-grid-secondary">
                <motion.div className="chart-card glass" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div className="chart-header">
                        <h3><FaClock /> Distribucion por hora</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={hourlyStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} interval={2} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(0,0,0,0.88)',
                                        border: '1px solid rgba(255,255,255,0.14)',
                                        borderRadius: '10px',
                                    }}
                                />
                                <Bar dataKey="playCount" fill="#f5576c" radius={[6, 6, 0, 0]} name="Plays" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div className="chart-card glass" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="chart-header">
                        <h3><FaCompactDisc /> Rendimiento por album</h3>
                    </div>
                    {albumStats.length > 0 ? (
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={albumStats.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 12 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                    <YAxis type="category" dataKey="albumTitle" stroke="#94a3b8" fontSize={11} width={120} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(0,0,0,0.88)',
                                            border: '1px solid rgba(255,255,255,0.14)',
                                            borderRadius: '10px',
                                        }}
                                    />
                                    <Bar dataKey="playCount" fill="#667eea" radius={[0, 6, 6, 0]} name="Plays" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FaChartBar className="empty-icon" />
                            <h3>Sin datos por album</h3>
                            <p>Aun no hay reproducciones para comparar albumes.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Analytics;
