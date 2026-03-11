export interface TrackCredits {
  composers?: string[];
  producers?: string[];
  musicians?: string[];
  mixingEngineers?: string[];
}

export interface TrackMetadata {
  genre?: string;
  language?: string;
  musicalKey?: string;
}

export interface Track {
  id: string;
  title: string;
  duration: number; // en segundos
  audioFile: string;
  coverArt?: string; // Portada individual de la cancion
  spotifyUrl?: string; // URL de Spotify
  description?: string; // Descripcion corta para ficha de la cancion
  lyrics?: string;
  credits?: TrackCredits;
  metadata?: TrackMetadata;
}

export interface ReleaseAutomation {
  autoFeatureOnRelease?: boolean;
  autoPopupOnRelease?: boolean;
  popupTitle?: string;
  popupDescription?: string;
  popupLinkText?: string;
  processedAt?: string;
}

export interface Album {
  id: string;
  title: string;
  type: 'album' | 'ep' | 'single';
  releaseDate: string;
  publishAt?: string; // ISO date-time para programar publicacion real
  workflowStatus?: 'draft' | 'published'; // Borrador o listo para publicar
  coverArt: string;
  description?: string;
  spotifyUrl?: string; // URL del album en Spotify
  tracks: Track[];
  releaseAutomation?: ReleaseAutomation;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverArt?: string;
  trackIds: string[];
  isPublic?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface PlayerState {
  currentTrack: Track | null;
  currentAlbum: Album | null;
  queue: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isExpanded: boolean;
  showLyrics: boolean;
  showCredits: boolean;
  repeat: 'off' | 'one' | 'all';
  shuffle: boolean;
}
