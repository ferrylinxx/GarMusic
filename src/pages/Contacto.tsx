import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaEnvelope, FaInstagram, FaSpotify, FaYoutube, FaTwitter } from 'react-icons/fa';
import db from '../services/DatabaseService';
import { useSiteSettings } from '../context/SiteSettingsContext';
import './Contacto.css';

type ContactFormState = {
    name: string;
    email: string;
    subject: string;
    message: string;
};

const initialFormState: ContactFormState = {
    name: '',
    email: '',
    subject: '',
    message: '',
};

const getSocialHandle = (url: string): string => {
    try {
        const parsed = new URL(url);
        if (parsed.pathname && parsed.pathname !== '/') {
            return parsed.pathname.replace(/^\/+/, '@');
        }
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

const Contacto = () => {
    const { settings } = useSiteSettings();
    const [formData, setFormData] = useState<ContactFormState>(initialFormState);
    const [isSending, setIsSending] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

    const socialLinks = useMemo(
        () =>
            [
                { name: 'Instagram', url: settings.instagramUrl, icon: FaInstagram },
                { name: 'Spotify', url: settings.spotifyUrl, icon: FaSpotify },
                { name: 'YouTube', url: settings.youtubeUrl, icon: FaYoutube },
                { name: 'Twitter', url: settings.twitterUrl, icon: FaTwitter },
            ].filter((item) => Boolean(item.url)),
        [settings.instagramUrl, settings.spotifyUrl, settings.youtubeUrl, settings.twitterUrl]
    );

    const updateField = <K extends keyof ContactFormState>(field: K, value: ContactFormState[K]) => {
        setFormData((previous) => ({ ...previous, [field]: value }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSending) return;

        const name = formData.name.trim();
        const email = formData.email.trim();
        const subject = formData.subject.trim() || 'Mensaje desde formulario web';
        const message = formData.message.trim();

        if (!name || !email || !message) {
            setFeedback({ type: 'error', text: 'Completa nombre, email y mensaje.' });
            return;
        }

        setIsSending(true);
        setFeedback(null);

        try {
            await db.saveMessage({
                id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name,
                email,
                subject,
                message,
                timestamp: Date.now(),
                read: false,
            });
            setFormData(initialFormState);
            setFeedback({ type: 'ok', text: 'Mensaje enviado correctamente.' });
        } catch (error) {
            console.error('Error sending contact message:', error);
            setFeedback({ type: 'error', text: 'No se pudo enviar el mensaje. Intentalo de nuevo.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="contacto-page container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="page-title text-gradient">Contacto</h1>

                <div className="contacto-content">
                    <div className="social-section glass">
                        <h2 className="section-subtitle">Sigueme en redes</h2>
                        <div className="social-links">
                            {socialLinks.length > 0 ? (
                                socialLinks.map(({ name, url, icon: Icon }) => (
                                    <a
                                        key={name}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-card glass"
                                    >
                                        <Icon className="social-card-icon" />
                                        <div>
                                            <div className="social-card-name">{name}</div>
                                            <div className="social-card-handle">{getSocialHandle(url || '')}</div>
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <p className="contact-empty-social">No hay redes configuradas.</p>
                            )}
                        </div>
                    </div>

                    <div className="contact-form-section glass">
                        <h2 className="section-subtitle">Enviame un mensaje</h2>
                        <form className="contact-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Nombre</label>
                                <input
                                    type="text"
                                    id="name"
                                    className="form-input glass"
                                    value={formData.name}
                                    onChange={(event) => updateField('name', event.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="form-input glass"
                                    value={formData.email}
                                    onChange={(event) => updateField('email', event.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="subject">Asunto</label>
                                <input
                                    type="text"
                                    id="subject"
                                    className="form-input glass"
                                    value={formData.subject}
                                    onChange={(event) => updateField('subject', event.target.value)}
                                    placeholder="Colaboracion, evento, prensa..."
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="message">Mensaje</label>
                                <textarea
                                    id="message"
                                    rows={6}
                                    className="form-input glass"
                                    value={formData.message}
                                    onChange={(event) => updateField('message', event.target.value)}
                                    required
                                ></textarea>
                            </div>
                            {feedback && (
                                <p className={`contact-feedback ${feedback.type === 'ok' ? 'ok' : 'error'}`}>
                                    {feedback.text}
                                </p>
                            )}
                            <button type="submit" className="submit-btn" disabled={isSending}>
                                <FaEnvelope /> {isSending ? 'Enviando...' : 'Enviar Mensaje'}
                            </button>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Contacto;
