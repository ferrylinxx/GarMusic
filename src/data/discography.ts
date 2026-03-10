import { Album } from '../types/music';

export const discography: Album[] = [
    {
        id: 'album-1',
        title: 'Primer Álbum',
        type: 'album',
        releaseDate: '2024-01-15',
        coverArt: '/images/albums/album-1.svg',
        description: 'Mi primer álbum de estudio con 10 canciones originales.',
        tracks: [
            {
                id: 'track-1',
                title: 'Canción de Apertura',
                duration: 245,
                audioFile: '/audio/albums/album-1/track-1.mp3',
                lyrics: `Verso 1
Esta es la letra de ejemplo
De mi primera canción
Que habla de emociones

Coro
Y este es el coro
Que se repite dos veces
Con mucha pasión`,
                credits: {
                    composers: ['Tu Nombre'],
                    producers: ['Productor Ejemplo'],
                    musicians: ['Guitarra: Músico 1', 'Batería: Músico 2', 'Bajo: Músico 3'],
                },
            },
            {
                id: 'track-2',
                title: 'Segunda Canción',
                duration: 198,
                audioFile: '/audio/albums/album-1/track-2.mp3',
                lyrics: `Letra de la segunda canción
Con versos profundos
Y un mensaje especial`,
                credits: {
                    composers: ['Tu Nombre', 'Co-escritor'],
                    producers: ['Productor Ejemplo'],
                },
            },
            {
                id: 'track-3',
                title: 'Balada Nocturna',
                duration: 267,
                audioFile: '/audio/albums/album-1/track-3.mp3',
            },
        ],
    },
    {
        id: 'single-1',
        title: 'Último Single',
        type: 'single',
        releaseDate: '2025-12-01',
        coverArt: '/images/albums/single-1.svg',
        description: 'Mi último lanzamiento, una canción sobre nuevos comienzos.',
        tracks: [
            {
                id: 'track-single-1',
                title: 'Nuevo Amanecer',
                duration: 223,
                audioFile: '/audio/singles/nuevo-amanecer.mp3',
                lyrics: `Cada día es un nuevo comienzo
Una oportunidad de brillar
De dejar atrás el pasado
Y volver a empezar`,
                credits: {
                    composers: ['Tu Nombre'],
                    producers: ['Productor Moderno'],
                    musicians: ['Piano: Pianista', 'Strings: Orquesta'],
                },
            },
        ],
    },
    {
        id: 'ep-1',
        title: 'EP Acústico',
        type: 'ep',
        releaseDate: '2024-06-20',
        coverArt: '/images/albums/ep-1.svg',
        description: 'Versiones acústicas de mis canciones favoritas.',
        tracks: [
            {
                id: 'track-ep-1',
                title: 'Versión Acústica 1',
                duration: 189,
                audioFile: '/audio/albums/ep-1/track-1.mp3',
            },
            {
                id: 'track-ep-2',
                title: 'Versión Acústica 2',
                duration: 201,
                audioFile: '/audio/albums/ep-1/track-2.mp3',
            },
        ],
    },
];

export const getAllTracks = () => {
    return discography.flatMap(album =>
        album.tracks.map(track => ({ ...track, album }))
    );
};

export const getAlbumById = (id: string) => {
    return discography.find(album => album.id === id);
};

export const getTrackById = (id: string) => {
    for (const album of discography) {
        const track = album.tracks.find(t => t.id === id);
        if (track) return { track, album };
    }
    return null;
};
