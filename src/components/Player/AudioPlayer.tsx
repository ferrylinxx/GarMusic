import { useEffect, useMemo, useRef, type CSSProperties, type TouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaAlignLeft,
    FaCompress,
    FaExpand,
    FaHeart,
    FaListUl,
    FaPause,
    FaPlay,
    FaRandom,
    FaRedoAlt,
    FaRegHeart,
    FaStepBackward,
    FaStepForward,
    FaTimes,
    FaUserEdit,
    FaVolumeMute,
    FaVolumeUp,
} from 'react-icons/fa';
import { useDiscography } from '../../context/DiscographyContext';
import { usePlayer } from '../../context/PlayerContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import type { Track } from '../../types/music';
import './AudioPlayer.css';

const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const joinCredits = (value?: string[]): string =>
    Array.isArray(value) && value.length > 0 ? value.join(', ') : 'No especificado';

const withFallback = (value?: string): string => {
    const normalized = String(value || '').trim();
    return normalized || 'No especificado';
};

type PanelView = 'queue' | 'lyrics' | 'credits';

type LyricLine = {
    time: number;
    text: string;
};

const parseLrcLyrics = (lyrics?: string): { timedLines: LyricLine[]; plainText: string } => {
    const raw = String(lyrics || '');
    if (!raw.trim()) {
        return { timedLines: [], plainText: '' };
    }

    const lines = raw.split(/\r?\n/);
    const timedLines: LyricLine[] = [];
    const timestampPattern = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    for (const line of lines) {
        const text = line.replace(timestampPattern, '').trim();
        let match: RegExpExecArray | null;
        let found = false;
        while ((match = timestampPattern.exec(line)) !== null) {
            const minutes = Number(match[1] || 0);
            const seconds = Number(match[2] || 0);
            const fractionRaw = String(match[3] || '');
            const fraction = fractionRaw ? Number(`0.${fractionRaw.padEnd(3, '0').slice(0, 3)}`) : 0;
            timedLines.push({
                time: minutes * 60 + seconds + fraction,
                text: text || '...',
            });
            found = true;
        }

        if (!found && text) {
            timedLines.push({
                time: Number.NaN,
                text,
            });
        }
    }

    const hasTimed = timedLines.some((line) => Number.isFinite(line.time));
    if (!hasTimed) {
        return {
            timedLines: [],
            plainText: raw,
        };
    }

    const normalized = timedLines
        .filter((line) => Number.isFinite(line.time))
        .sort((a, b) => a.time - b.time);

    return {
        timedLines: normalized,
        plainText: raw,
    };
};

const AudioPlayer = () => {
    const { albums } = useDiscography();
    const isMobilePlayer = useMediaQuery('(max-width: 768px)');
    const {
        currentTrack,
        currentAlbum,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        queue,
        volume,
        playbackError,
        isExpanded,
        showLyrics,
        showCredits,
        shuffle,
        repeat,
        togglePlay,
        nextTrack,
        previousTrack,
        seekTo,
        setVolume,
        toggleExpanded,
        toggleShuffle,
        toggleRepeat,
        toggleLyrics,
        toggleCredits,
        playTrack,
        removeFromQueue,
        clearQueue,
        clearPlaybackError,
        toggleFavoriteTrack,
        isFavoriteTrack,
    } = usePlayer();

    const trackAlbumMap = useMemo(() => {
        const map = new Map<string, { title: string; album: (typeof albums)[number] }>();
        for (const album of albums) {
            for (const track of album.tracks) {
                map.set(track.id, { title: album.title, album });
            }
        }
        return map;
    }, [albums]);

    const activeLyricLineRef = useRef<HTMLParagraphElement | null>(null);
    const barSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const panelHandleSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const parsedLyrics = useMemo(() => parseLrcLyrics(currentTrack?.lyrics), [currentTrack?.id, currentTrack?.lyrics]);
    const activeLyricIndex = useMemo(() => {
        if (!currentTrack) return -1;
        if (parsedLyrics.timedLines.length === 0) return -1;
        for (let index = parsedLyrics.timedLines.length - 1; index >= 0; index -= 1) {
            if (currentTime >= parsedLyrics.timedLines[index].time) {
                return index;
            }
        }
        return -1;
    }, [currentTrack, currentTime, parsedLyrics.timedLines]);

    useEffect(() => {
        if (!currentTrack) return;
        if (!showLyrics) return;
        if (!activeLyricLineRef.current) return;
        activeLyricLineRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }, [activeLyricIndex, showLyrics, currentTrack]);

    if (!currentTrack) return null;

    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const progress = safeDuration > 0 ? Math.min(100, Math.max(0, (currentTime / safeDuration) * 100)) : 0;
    const volumePercent = Math.round(Math.min(1, Math.max(0, volume)) * 100);
    const currentIsFavorite = isFavoriteTrack(currentTrack.id);
    const remainingTime = Math.max(0, safeDuration - currentTime);
    const panelView: PanelView = showLyrics ? 'lyrics' : showCredits ? 'credits' : 'queue';
    const playerArtwork = currentTrack.coverArt || currentAlbum?.coverArt || '/images/default-cover.jpg';
    const playbackStatusLabel = playbackError
        ? 'Error de reproduccion'
        : isBuffering
        ? 'Conectando...'
        : isPlaying
        ? 'Reproduciendo'
        : 'En pausa';
    const playToggleLabel = isBuffering ? 'Cargando audio' : isPlaying ? 'Pausar' : 'Reproducir';
    const playButtonContent = isBuffering ? <span className="control-loader" aria-hidden /> : isPlaying ? <FaPause /> : <FaPlay />;

    const showQueuePanel = () => {
        if (showLyrics) toggleLyrics();
        if (showCredits) toggleCredits();
        if (!isExpanded) toggleExpanded();
    };

    const showLyricsPanel = () => {
        if (!showLyrics) toggleLyrics();
        if (showCredits) toggleCredits();
        if (!isExpanded) toggleExpanded();
    };

    const showCreditsPanel = () => {
        if (showLyrics) toggleLyrics();
        if (!showCredits) toggleCredits();
        if (!isExpanded) toggleExpanded();
    };

    const playQueuedTrack = (track: Track) => {
        const albumMatch = trackAlbumMap.get(track.id);
        playTrack(track, albumMatch?.album);
    };

    const retryCurrentTrack = () => {
        clearPlaybackError();
        playTrack(currentTrack, currentAlbum || undefined);
    };

    const shouldIgnoreSwipeTarget = (target: EventTarget | null): boolean => {
        const element = target as HTMLElement | null;
        if (!element) return false;
        return Boolean(element.closest('button, a, input, textarea, select, label, [role="button"]'));
    };

    const handleBarTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        if (!isMobilePlayer || shouldIgnoreSwipeTarget(event.target)) {
            barSwipeStartRef.current = null;
            return;
        }
        const touch = event.changedTouches[0];
        barSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleBarTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
        const start = barSwipeStartRef.current;
        barSwipeStartRef.current = null;
        if (!isMobilePlayer || !start) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX < 72 || absX < absY * 1.2) return;

        if (deltaX < 0) {
            nextTrack();
        } else {
            previousTrack();
        }
    };

    const handlePanelHandleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        if (!isMobilePlayer) return;
        const touch = event.changedTouches[0];
        panelHandleSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handlePanelHandleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
        const start = panelHandleSwipeStartRef.current;
        panelHandleSwipeStartRef.current = null;
        if (!isMobilePlayer || !start) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        const absX = Math.abs(deltaX);

        if (deltaY > 64 && deltaY > absX * 1.15) {
            toggleExpanded();
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="audio-player-shell"
                initial={{ y: 120 }}
                animate={{ y: 0 }}
                exit={{ y: 120 }}
                transition={{ duration: 0.28 }}
            >
                <AnimatePresence>
                    {isExpanded && (
                        <>
                            {isMobilePlayer && (
                                <button
                                    type="button"
                                    className="audio-player-sheet-backdrop"
                                    onClick={toggleExpanded}
                                    aria-label="Cerrar panel del reproductor"
                                />
                            )}
                            <motion.section
                                className={`audio-player-panel glass-strong ${isMobilePlayer ? 'is-mobile-sheet' : ''}`}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 14 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isMobilePlayer && (
                                    <>
                                        <div
                                            className="panel-sheet-handle"
                                            onTouchStart={handlePanelHandleTouchStart}
                                            onTouchEnd={handlePanelHandleTouchEnd}
                                            aria-hidden
                                        >
                                            <span />
                                        </div>
                                        <div className="mobile-panel-now-playing">
                                            <img src={playerArtwork} alt={currentTrack.title} className="mobile-panel-cover" />
                                            <div className="mobile-panel-copy">
                                                <span className={`mobile-player-status ${isBuffering ? 'buffering' : playbackError ? 'error' : isPlaying ? 'playing' : ''}`}>
                                                    {playbackStatusLabel}
                                                </span>
                                                <strong>{currentTrack.title}</strong>
                                                <small>{currentAlbum?.title || 'Single'}</small>
                                            </div>
                                            <button
                                                type="button"
                                                className="control-btn control-btn-play mobile-panel-play-btn"
                                                onClick={togglePlay}
                                                aria-label={playToggleLabel}
                                                disabled={isBuffering}
                                            >
                                                {playButtonContent}
                                            </button>
                                        </div>
                                    </>
                                )}
                                <header className="panel-header">
                                    <div className="panel-tabs" role="tablist" aria-label="Vistas del reproductor">
                                        <button
                                            type="button"
                                            className={`panel-tab ${panelView === 'queue' ? 'active' : ''}`}
                                            onClick={showQueuePanel}
                                        >
                                            <FaListUl /> Cola ({queue.length})
                                        </button>
                                        <button
                                            type="button"
                                            className={`panel-tab ${panelView === 'lyrics' ? 'active' : ''}`}
                                            onClick={showLyricsPanel}
                                        >
                                            <FaAlignLeft /> Letra
                                        </button>
                                        <button
                                            type="button"
                                            className={`panel-tab ${panelView === 'credits' ? 'active' : ''}`}
                                            onClick={showCreditsPanel}
                                        >
                                            <FaUserEdit /> Creditos
                                        </button>
                                    </div>
                                    <button type="button" className="panel-close-btn" onClick={toggleExpanded} aria-label="Cerrar panel">
                                        <FaTimes />
                                    </button>
                                </header>

                                <div className="panel-body">
                                    {panelView === 'queue' && (
                                        <div className="panel-queue">
                                            <div className="panel-queue-head">
                                                <p>Tu cola persistente se mantiene sincronizada con tu sesion.</p>
                                                <button
                                                    type="button"
                                                    className="panel-clear-btn"
                                                    onClick={clearQueue}
                                                    disabled={queue.length === 0}
                                                >
                                                    Limpiar cola
                                                </button>
                                            </div>
                                            {queue.length === 0 ? (
                                                <p className="panel-empty">No hay canciones en cola.</p>
                                            ) : (
                                                <div className="panel-queue-list">
                                                    {queue.map((track, index) => {
                                                        const albumInfo = trackAlbumMap.get(track.id);
                                                        return (
                                                            <div key={`${track.id}-${index}`} className="panel-queue-row">
                                                                <button
                                                                    type="button"
                                                                    className="queue-row-main"
                                                                    onClick={() => playQueuedTrack(track)}
                                                                >
                                                                    <strong>{track.title}</strong>
                                                                    <span>{albumInfo?.title || 'Single'}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="queue-row-remove"
                                                                    onClick={() => removeFromQueue(track.id, index)}
                                                                    aria-label={`Quitar ${track.title} de cola`}
                                                                >
                                                                    <FaTimes />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {panelView === 'lyrics' && (
                                        <div className="panel-text">
                                            {currentTrack.lyrics ? (
                                                parsedLyrics.timedLines.length > 0 ? (
                                                    <div className="karaoke-lyrics">
                                                        {parsedLyrics.timedLines.map((line, index) => (
                                                            <p
                                                                key={`${line.time}-${index}`}
                                                                ref={index === activeLyricIndex ? activeLyricLineRef : null}
                                                                className={index === activeLyricIndex ? 'active' : ''}
                                                            >
                                                                {line.text}
                                                            </p>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <pre>{parsedLyrics.plainText}</pre>
                                                )
                                            ) : (
                                                <p className="panel-empty">Esta cancion aun no tiene letra cargada.</p>
                                            )}
                                        </div>
                                    )}

                                    {panelView === 'credits' && (
                                        <div className="panel-text">
                                            <p><strong>Compositores:</strong> {joinCredits(currentTrack.credits?.composers)}</p>
                                            <p><strong>Productores:</strong> {joinCredits(currentTrack.credits?.producers)}</p>
                                            <p><strong>Mezcla:</strong> {joinCredits(currentTrack.credits?.mixingEngineers)}</p>
                                            <p><strong>Genero:</strong> {withFallback(currentTrack.metadata?.genre)}</p>
                                            <p><strong>Tonalidad:</strong> {withFallback(currentTrack.metadata?.musicalKey)}</p>
                                        </div>
                                    )}
                                </div>
                            </motion.section>
                        </>
                    )}
                </AnimatePresence>

                <motion.div
                    className={`audio-player glass-strong ${isMobilePlayer ? 'is-mobile-player' : ''}`}
                    onTouchStart={handleBarTouchStart}
                    onTouchEnd={handleBarTouchEnd}
                >
                    {isMobilePlayer ? (
                        <>
                            <div className="mobile-player-top">
                                <button
                                    type="button"
                                    className="mobile-track-button"
                                    onClick={toggleExpanded}
                                    aria-label="Abrir panel del reproductor"
                                >
                                    <img src={playerArtwork} alt={currentTrack.title} className="player-cover" />
                                    <div className="player-text">
                                        <span className={`mobile-player-status ${isBuffering ? 'buffering' : playbackError ? 'error' : isPlaying ? 'playing' : ''}`}>
                                            {playbackStatusLabel}
                                        </span>
                                        <div className="player-track-title">{currentTrack.title}</div>
                                        <div className="player-track-artist">{currentAlbum?.title || 'Single'}</div>
                                    </div>
                                </button>
                                <div className="mobile-player-header-actions">
                                    <button
                                        type="button"
                                        className={`player-favorite-btn ${currentIsFavorite ? 'active' : ''}`}
                                        onClick={() => toggleFavoriteTrack(currentTrack.id)}
                                        aria-label={currentIsFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                                    >
                                        {currentIsFavorite ? <FaHeart /> : <FaRegHeart />}
                                    </button>
                                    <button
                                        type="button"
                                        className="control-btn player-expand-btn"
                                        onClick={toggleExpanded}
                                        aria-label={isExpanded ? 'Cerrar panel del reproductor' : 'Abrir panel del reproductor'}
                                    >
                                        {isExpanded ? <FaCompress /> : <FaExpand />}
                                    </button>
                                </div>
                            </div>

                            <div className="mobile-progress-block">
                                <input
                                    type="range"
                                    min="0"
                                    max={safeDuration || 1}
                                    value={Math.min(currentTime, safeDuration || 1)}
                                    onChange={(event) => seekTo(parseFloat(event.target.value))}
                                    className="progress-bar mobile-progress-bar"
                                    style={{ '--progress': `${progress}%` } as CSSProperties}
                                    aria-label="Progreso de reproduccion"
                                />
                                <div className="mobile-time-row">
                                    <span className="time-display">{formatTime(currentTime)}</span>
                                    <span className="time-display">-{formatTime(remainingTime)}</span>
                                </div>
                            </div>

                            {playbackError && (
                                <div className="player-error-banner" role="status" aria-live="polite">
                                    <span>{playbackError}</span>
                                    <div className="player-error-actions">
                                        <button type="button" className="player-error-btn" onClick={retryCurrentTrack}>
                                            Reintentar
                                        </button>
                                        <button type="button" className="player-error-btn secondary" onClick={clearPlaybackError}>
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="player-controls mobile-primary-controls">
                                <button
                                    type="button"
                                    className={`control-btn ${shuffle ? 'active' : ''}`}
                                    onClick={toggleShuffle}
                                    aria-label="Alternar aleatorio"
                                >
                                    <FaRandom />
                                </button>
                                <button type="button" className="control-btn" onClick={previousTrack} aria-label="Cancion anterior">
                                    <FaStepBackward />
                                </button>
                                <button
                                    type="button"
                                    className="control-btn control-btn-play"
                                    onClick={togglePlay}
                                    aria-label={playToggleLabel}
                                    disabled={isBuffering}
                                >
                                    {playButtonContent}
                                </button>
                                <button type="button" className="control-btn" onClick={nextTrack} aria-label="Siguiente cancion">
                                    <FaStepForward />
                                </button>
                                <button
                                    type="button"
                                    className={`control-btn ${repeat !== 'off' ? 'active' : ''}`}
                                    onClick={toggleRepeat}
                                    aria-label={`Alternar repeticion (${repeat})`}
                                    title={repeat === 'off' ? 'Repeticion desactivada' : repeat === 'all' ? 'Repetir todo' : 'Repetir una'}
                                >
                                    <FaRedoAlt />
                                    {repeat === 'one' && <span className="control-badge">1</span>}
                                </button>
                            </div>

                            <div className="mobile-secondary-controls">
                                <button type="button" className="mobile-chip-btn" onClick={showQueuePanel}>
                                    <FaListUl /> Cola <strong>{queue.length}</strong>
                                </button>
                                <button type="button" className="mobile-chip-btn" onClick={showLyricsPanel}>
                                    <FaAlignLeft /> Letra
                                </button>
                                <button type="button" className="mobile-chip-btn" onClick={showCreditsPanel}>
                                    <FaUserEdit /> Creditos
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="player-track-info">
                                <img src={playerArtwork} alt={currentTrack.title} className="player-cover" />
                                <div className="player-text">
                                    <div className="player-track-title">{currentTrack.title}</div>
                                    <div className="player-track-artist">{currentAlbum?.title || 'Single'}</div>
                                </div>
                                <button
                                    type="button"
                                    className={`player-favorite-btn ${currentIsFavorite ? 'active' : ''}`}
                                    onClick={() => toggleFavoriteTrack(currentTrack.id)}
                                    aria-label={currentIsFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                                >
                                    {currentIsFavorite ? <FaHeart /> : <FaRegHeart />}
                                </button>
                            </div>

                            <div className="player-center">
                                <div className="player-controls">
                                    <button
                                        type="button"
                                        className={`control-btn ${shuffle ? 'active' : ''}`}
                                        onClick={toggleShuffle}
                                        aria-label="Alternar aleatorio"
                                    >
                                        <FaRandom />
                                    </button>
                                    <button type="button" className="control-btn" onClick={previousTrack} aria-label="Cancion anterior">
                                        <FaStepBackward />
                                    </button>
                                    <button
                                        type="button"
                                        className="control-btn control-btn-play"
                                        onClick={togglePlay}
                                        aria-label={playToggleLabel}
                                        disabled={isBuffering}
                                    >
                                        {playButtonContent}
                                    </button>
                                    <button type="button" className="control-btn" onClick={nextTrack} aria-label="Siguiente cancion">
                                        <FaStepForward />
                                    </button>
                                    <button
                                        type="button"
                                        className={`control-btn ${repeat !== 'off' ? 'active' : ''}`}
                                        onClick={toggleRepeat}
                                        aria-label={`Alternar repeticion (${repeat})`}
                                        title={repeat === 'off' ? 'Repeticion desactivada' : repeat === 'all' ? 'Repetir todo' : 'Repetir una'}
                                    >
                                        <FaRedoAlt />
                                        {repeat === 'one' && <span className="control-badge">1</span>}
                                    </button>
                                </div>

                                <div className="player-progress">
                                    <span className="time-display">{formatTime(currentTime)}</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max={safeDuration || 1}
                                        value={Math.min(currentTime, safeDuration || 1)}
                                        onChange={(event) => seekTo(parseFloat(event.target.value))}
                                        className="progress-bar"
                                        style={{ '--progress': `${progress}%` } as CSSProperties}
                                        aria-label="Progreso de reproduccion"
                                    />
                                    <span className="time-display">-{formatTime(remainingTime)}</span>
                                </div>

                                {playbackError && (
                                    <div className="player-error-banner" role="status" aria-live="polite">
                                        <span>{playbackError}</span>
                                        <div className="player-error-actions">
                                            <button type="button" className="player-error-btn" onClick={retryCurrentTrack}>
                                                Reintentar
                                            </button>
                                            <button type="button" className="player-error-btn secondary" onClick={clearPlaybackError}>
                                                Cerrar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="player-right">
                                <button
                                    type="button"
                                    className="control-btn queue-toggle"
                                    onClick={showQueuePanel}
                                    aria-label="Abrir cola"
                                >
                                    <FaListUl />
                                    <span>{queue.length}</span>
                                </button>

                                <div className="volume-control">
                                    <span className="volume-icon">{volumePercent <= 2 ? <FaVolumeMute /> : <FaVolumeUp />}</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={volume}
                                        onChange={(event) => setVolume(parseFloat(event.target.value))}
                                        className="volume-slider"
                                        style={{ '--progress': `${volumePercent}%` } as CSSProperties}
                                        aria-label="Volumen"
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="control-btn player-expand-btn"
                                    onClick={toggleExpanded}
                                    aria-label={isExpanded ? 'Cerrar panel del reproductor' : 'Abrir panel del reproductor'}
                                >
                                    {isExpanded ? <FaCompress /> : <FaExpand />}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AudioPlayer;
