import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaEnvelope, FaTrash, FaEye, FaCheck, FaInbox,
    FaClock, FaUser, FaReply
} from 'react-icons/fa';
import db, { ContactMessage } from '../../services/DatabaseService';
import './admin.css';

type FeedbackKind = 'success' | 'error' | 'info';

const Messages = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [feedback, setFeedback] = useState<{ kind: FeedbackKind; message: string } | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isMarkingReadId, setIsMarkingReadId] = useState<string | null>(null);
    const feedbackTimeoutRef = useRef<number | null>(null);

    const showFeedback = (kind: FeedbackKind, message: string) => {
        if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
        }
        setFeedback({ kind, message });
        feedbackTimeoutRef.current = window.setTimeout(() => {
            setFeedback(null);
            feedbackTimeoutRef.current = null;
        }, 3200);
    };

    useEffect(() => {
        void loadMessages();

        return () => {
            if (feedbackTimeoutRef.current) {
                window.clearTimeout(feedbackTimeoutRef.current);
            }
        };
    }, []);

    const loadMessages = async () => {
        setIsLoading(true);
        try {
            const data = await db.getAllMessages();
            setMessages(data);
        } catch (error) {
            console.error('Error loading messages:', error);
            showFeedback('error', 'No se pudieron cargar los mensajes.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        const target = messages.find((message) => message.id === id);
        if (!target || target.read) return;

        setIsMarkingReadId(id);
        try {
            await db.markMessageAsRead(id);
            setMessages((previous) => previous.map((message) =>
                message.id === id ? { ...message, read: true } : message
            ));
            if (selectedMessage?.id === id) {
                setSelectedMessage({ ...selectedMessage, read: true });
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
            showFeedback('error', 'No se pudo marcar el mensaje como leido.');
        } finally {
            setIsMarkingReadId(null);
        }
    };

    const requestDeleteMessage = (id: string) => {
        setPendingDeleteId(id);
    };

    const confirmDeleteMessage = async () => {
        if (!pendingDeleteId) return;

        setIsDeletingId(pendingDeleteId);
        try {
            await db.deleteMessage(pendingDeleteId);
            setMessages((previous) => previous.filter((message) => message.id !== pendingDeleteId));
            if (selectedMessage?.id === pendingDeleteId) {
                setSelectedMessage(null);
            }
            showFeedback('success', 'Mensaje eliminado.');
        } catch (error) {
            console.error('Error deleting message:', error);
            showFeedback('error', 'No se pudo eliminar el mensaje.');
        } finally {
            setIsDeletingId(null);
            setPendingDeleteId(null);
        }
    };

    const openMessage = async (message: ContactMessage) => {
        setSelectedMessage(message);
        if (!message.read) {
            await handleMarkAsRead(message.id);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const filteredMessages = messages.filter((message) => {
        if (filter === 'unread') return !message.read;
        if (filter === 'read') return message.read;
        return true;
    });

    const unreadCount = messages.filter((message) => !message.read).length;

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Cargando mensajes...</p>
            </div>
        );
    }

    return (
        <motion.div
            className="messages-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="page-header">
                <div className="header-left">
                    <h1>
                        <FaEnvelope /> Mensajes
                        {unreadCount > 0 && (
                            <span className="unread-badge">{unreadCount}</span>
                        )}
                    </h1>
                    <p>Mensajes recibidos del formulario de contacto</p>
                </div>
            </div>

            {feedback && <div className={`admin-inline-feedback ${feedback.kind}`}>{feedback.message}</div>}

            <div className="message-filters">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    Todos ({messages.length})
                </button>
                <button
                    className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilter('unread')}
                >
                    No leidos ({unreadCount})
                </button>
                <button
                    className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                    onClick={() => setFilter('read')}
                >
                    Leidos ({messages.length - unreadCount})
                </button>
            </div>

            <div className="messages-layout">
                <div className="messages-list glass">
                    {filteredMessages.length > 0 ? (
                        filteredMessages.map((message) => (
                            <motion.div
                                key={message.id}
                                className={`message-item ${!message.read ? 'unread' : ''} ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                                onClick={() => void openMessage(message)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ x: 5 }}
                            >
                                <div className="message-status">
                                    {!message.read && <span className="unread-dot"></span>}
                                </div>
                                <div className="message-content">
                                    <div className="message-header">
                                        <span className="message-sender">{message.name}</span>
                                        <span className="message-date">
                                            <FaClock /> {formatDate(message.timestamp)}
                                        </span>
                                    </div>
                                    <div className="message-subject">{message.subject}</div>
                                    <div className="message-preview">
                                        {message.message.substring(0, 80)}...
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <FaInbox className="empty-icon" />
                            <h3>No hay mensajes</h3>
                            <p>Los mensajes del formulario de contacto apareceran aqui</p>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {selectedMessage ? (
                        <motion.div
                            key={selectedMessage.id}
                            className="message-detail glass"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="detail-header">
                                <h2>{selectedMessage.subject}</h2>
                                <div className="detail-actions">
                                    {!selectedMessage.read && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => void handleMarkAsRead(selectedMessage.id)}
                                            title="Marcar como leido"
                                            disabled={isMarkingReadId === selectedMessage.id}
                                        >
                                            <FaCheck />
                                        </button>
                                    )}
                                    <button
                                        className="btn-icon delete"
                                        onClick={() => requestDeleteMessage(selectedMessage.id)}
                                        title="Eliminar"
                                        disabled={isDeletingId === selectedMessage.id}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>

                            <div className="detail-meta">
                                <div className="meta-item">
                                    <FaUser /> {selectedMessage.name}
                                </div>
                                <div className="meta-item">
                                    <FaEnvelope /> {selectedMessage.email}
                                </div>
                                <div className="meta-item">
                                    <FaClock /> {formatDate(selectedMessage.timestamp)}
                                </div>
                            </div>

                            <div className="detail-body">
                                {selectedMessage.message}
                            </div>

                            <div className="detail-footer">
                                <a
                                    href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                                    className="btn-primary"
                                >
                                    <FaReply /> Responder
                                </a>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="message-detail glass empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <FaEye className="empty-icon" />
                            <p>Selecciona un mensaje para ver su contenido</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {pendingDeleteId && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPendingDeleteId(null)}
                    >
                        <motion.div
                            className="modal glass-strong"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <h2>Eliminar mensaje?</h2>
                            <p>Esta accion no se puede deshacer.</p>
                            <div className="modal-actions">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setPendingDeleteId(null)}
                                    disabled={isDeletingId === pendingDeleteId}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => void confirmDeleteMessage()}
                                    disabled={isDeletingId === pendingDeleteId}
                                >
                                    {isDeletingId === pendingDeleteId ? 'Eliminando...' : 'Eliminar'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Messages;
