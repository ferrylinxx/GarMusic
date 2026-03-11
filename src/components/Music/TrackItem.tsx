import type { KeyboardEvent, MouseEvent } from 'react';
import { Track, Album } from '../../types/music';
import { usePlayer } from '../../context/PlayerContext';
import { FaPlay, FaPause, FaPlus, FaHeart, FaRegHeart } from 'react-icons/fa';
import './TrackItem.css';

interface TrackItemProps {
    track: Track;
    album: Album;
    index: number;
}

const TrackItem = ({ track, album, index }: TrackItemProps) => {
    const { playTrack, prepareTrackPlayback, currentTrack, isPlaying, addToQueue, togglePlay, toggleFavoriteTrack, isFavoriteTrack } = usePlayer();

    const isCurrentTrack = currentTrack?.id === track.id;
    const isFavorite = isFavoriteTrack(track.id);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlay = () => {
        if (isCurrentTrack) {
            togglePlay();
            return;
        }
        playTrack(track, album);
    };

    const handleAddToQueue = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        addToQueue(track);
    };

    const handleToggleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        toggleFavoriteTrack(track.id);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlePlay();
        }
    };

    return (
        <div
            className={`track-item ${isCurrentTrack ? 'active' : ''} ${isCurrentTrack && !isPlaying ? 'paused' : ''}`}
            onClick={handlePlay}
            onTouchStart={() => prepareTrackPlayback(track)}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`${isCurrentTrack && isPlaying ? 'Pausar' : 'Reproducir'} ${track.title}`}
            aria-pressed={isCurrentTrack && isPlaying}
        >
            <div className="track-number">
                {isCurrentTrack && isPlaying ? (
                    <FaPause className="track-icon" />
                ) : isCurrentTrack ? (
                    <FaPlay className="track-icon" />
                ) : (
                    <>
                        <span className="number">{index + 1}</span>
                        <FaPlay className="track-icon play-icon" />
                    </>
                )}
            </div>

            <div className="track-info">
                <div className="track-title">{track.title}</div>
                {track.credits?.composers?.length ? (
                    <div className="track-artist">
                        {track.credits.composers.join(', ')}
                    </div>
                ) : null}
            </div>

            <div className="track-actions-inline">
                <button
                    className={`track-action-btn ${isFavorite ? 'is-favorite' : ''}`}
                    onClick={handleToggleFavorite}
                    title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    aria-label={isFavorite ? `Quitar ${track.title} de favoritos` : `Guardar ${track.title} en favoritos`}
                >
                    {isFavorite ? <FaHeart /> : <FaRegHeart />}
                </button>
                <button
                    className="track-action-btn"
                    onClick={handleAddToQueue}
                    title="Anadir a cola"
                    aria-label={`Anadir ${track.title} a la cola`}
                >
                    <FaPlus />
                </button>
            </div>

            <div className="track-duration">{formatDuration(track.duration)}</div>
        </div>
    );
};

export default TrackItem;
