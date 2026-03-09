import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
    analyser: AnalyserNode | null;
    isPlaying: boolean;
}

const AudioVisualizer = ({ analyser, isPlaying }: AudioVisualizerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const bars = 64;

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw static or animated bars
        const drawBars = (dataArray?: Uint8Array) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = canvas.width / bars;
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.5, '#764ba2');
            gradient.addColorStop(1, '#f5576c');

            for (let i = 0; i < bars; i++) {
                let barHeight: number;
                if (dataArray) {
                    const dataIndex = Math.floor(i * dataArray.length / bars);
                    barHeight = (dataArray[dataIndex] / 255) * canvas.height * 0.8;
                } else {
                    barHeight = Math.random() * 10 + 5;
                }

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(
                    i * barWidth + 1,
                    canvas.height - barHeight,
                    barWidth - 2,
                    barHeight,
                    [4, 4, 0, 0]
                );
                ctx.fill();
            }
        };

        if (!analyser || !isPlaying) {
            // Draw static bars when not playing
            drawBars();
            return;
        }

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            drawBars(dataArray);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [analyser, isPlaying, bars]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={60}
            className="audio-visualizer"
        />
    );
};

export default AudioVisualizer;
