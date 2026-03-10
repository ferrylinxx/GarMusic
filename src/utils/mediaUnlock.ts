const SILENT_WAV_DATA_URI =
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

let unlockAttempt: Promise<boolean> | null = null;

export const primeMediaPlayback = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (unlockAttempt) return unlockAttempt;

    unlockAttempt = (async () => {
        try {
            const audio = new Audio(SILENT_WAV_DATA_URI);
            audio.muted = true;
            audio.volume = 0;
            audio.setAttribute('playsinline', 'true');
            audio.preload = 'auto';

            await audio.play();
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
            return true;
        } catch {
            unlockAttempt = null;
            return false;
        }
    })();

    return unlockAttempt;
};
