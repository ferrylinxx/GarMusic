import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    FaBolt,
    FaBullhorn,
    FaCalendar,
    FaEdit,
    FaImage,
    FaLink,
    FaPlus,
    FaSave,
    FaTimes,
    FaToggleOff,
    FaToggleOn,
    FaTrash,
    FaUpload,
} from 'react-icons/fa';
import db, { Popup } from '../../services/DatabaseService';
import './admin.css';

const todayYmd = () => new Date().toISOString().split('T')[0];

const Popups = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [popups, setPopups] = useState<Popup[]>([]);
    const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        void loadPopups();
    }, []);

    const sortedPopups = useMemo(() => {
        return [...popups].sort((a, b) => {
            const aTrigger = Date.parse(a.lastTriggeredAt || '') || 0;
            const bTrigger = Date.parse(b.lastTriggeredAt || '') || 0;
            if (aTrigger !== bTrigger) return bTrigger - aTrigger;
            return (b.startDate || '').localeCompare(a.startDate || '');
        });
    }, [popups]);

    const loadPopups = async () => {
        setIsLoading(true);
        try {
            const data = await db.getAllPopups();
            setPopups(data);
        } catch (error) {
            console.error('Error loading popups:', error);
            alert('No se pudieron cargar los popups');
        } finally {
            setIsLoading(false);
        }
    };

    const createNewPopup = (): Popup => ({
        id: `popup-${Date.now()}`,
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        linkText: 'Ver mas',
        startDate: todayYmd(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        active: true,
        triggerVersion: 0,
        lastTriggeredAt: '',
    });

    const handleCreate = () => {
        setEditingPopup(createNewPopup());
        setIsCreating(true);
    };

    const handleEdit = (popup: Popup) => {
        setEditingPopup({ ...popup });
        setIsCreating(false);
    };

    const persistPopup = async (popup: Popup) => {
        await db.savePopup(popup);
        setPopups((previous) => {
            const exists = previous.some((item) => item.id === popup.id);
            if (!exists) return [popup, ...previous];
            return previous.map((item) => (item.id === popup.id ? popup : item));
        });
    };

    const handleSave = async () => {
        if (!editingPopup) return;

        const title = editingPopup.title.trim();
        if (!title) {
            alert('El titulo es obligatorio');
            return;
        }

        if (editingPopup.endDate < editingPopup.startDate) {
            alert('La fecha de fin no puede ser menor que la fecha de inicio');
            return;
        }

        const sanitized: Popup = {
            ...editingPopup,
            title,
            description: editingPopup.description?.trim() || '',
            linkText: editingPopup.linkText?.trim() || 'Ver mas',
            triggerVersion: editingPopup.triggerVersion ?? 0,
        };

        try {
            await persistPopup(sanitized);
            setEditingPopup(null);
            setIsCreating(false);
        } catch (error) {
            console.error('Error saving popup:', error);
            alert('No se pudo guardar el popup');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Seguro que quieres eliminar este popup?')) return;
        try {
            await db.deletePopup(id);
            setPopups((previous) => previous.filter((item) => item.id !== id));
        } catch (error) {
            console.error('Error deleting popup:', error);
            alert('No se pudo eliminar el popup');
        }
    };

    const toggleActive = async (popup: Popup) => {
        const updated: Popup = {
            ...popup,
            active: !popup.active,
        };
        try {
            await persistPopup(updated);
        } catch (error) {
            console.error('Error toggling popup:', error);
            alert('No se pudo actualizar el popup');
        }
    };

    const triggerNow = async (popup: Popup) => {
        const today = todayYmd();
        const updated: Popup = {
            ...popup,
            active: true,
            startDate: popup.startDate > today ? today : popup.startDate,
            endDate: popup.endDate < today ? today : popup.endDate,
            triggerVersion: (popup.triggerVersion ?? 0) + 1,
            lastTriggeredAt: new Date().toISOString(),
        };
        try {
            await persistPopup(updated);
            alert('Popup ejecutado. Ya puede mostrarse en la web.');
        } catch (error) {
            console.error('Error triggering popup:', error);
            alert('No se pudo ejecutar el popup');
        }
    };

    const updateField = <K extends keyof Popup>(field: K, value: Popup[K]) => {
        if (!editingPopup) return;
        setEditingPopup({ ...editingPopup, [field]: value });
    };

    const isPopupActive = (popup: Popup) => {
        const now = todayYmd();
        return popup.active && popup.startDate <= now && popup.endDate >= now;
    };

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Cargando popups...</p>
            </div>
        );
    }

    return (
        <motion.div className="popups-page" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="page-header">
                <div className="header-left">
                    <h1><FaBullhorn /> Popups</h1>
                    <p>Gestiona anuncios y activalos cuando quieras</p>
                </div>
                <button className="btn-add" onClick={handleCreate}>
                    <FaPlus /> Nuevo popup
                </button>
            </div>

            <div className="popups-grid">
                {sortedPopups.length > 0 ? (
                    sortedPopups.map((popup) => (
                        <motion.div
                            key={popup.id}
                            className={`popup-card glass ${isPopupActive(popup) ? 'active' : ''}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            layout
                        >
                            {popup.imageUrl && (
                                <div className="popup-image">
                                    <img src={popup.imageUrl} alt={popup.title} />
                                </div>
                            )}

                            <div className="popup-content">
                                <div className="popup-header">
                                    <h3>{popup.title}</h3>
                                    <button
                                        className={`toggle-btn ${popup.active ? 'on' : 'off'}`}
                                        onClick={() => void toggleActive(popup)}
                                        title={popup.active ? 'Desactivar' : 'Activar'}
                                    >
                                        {popup.active ? <FaToggleOn /> : <FaToggleOff />}
                                    </button>
                                </div>

                                <p className="popup-description">{popup.description || 'Sin descripcion'}</p>

                                <div className="popup-dates">
                                    <FaCalendar />
                                    <span>{popup.startDate} - {popup.endDate}</span>
                                </div>

                                {popup.linkUrl && (
                                    <div className="popup-link">
                                        <FaLink />
                                        <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer">
                                            {popup.linkText || 'Ver mas'}
                                        </a>
                                    </div>
                                )}

                                {popup.lastTriggeredAt && (
                                    <div className="popup-link">
                                        <FaBolt />
                                        <span>Ultima ejecucion: {new Date(popup.lastTriggeredAt).toLocaleString('es-ES')}</span>
                                    </div>
                                )}

                                <div className="popup-status">
                                    {isPopupActive(popup) ? (
                                        <span className="status-badge active">Activo</span>
                                    ) : popup.active ? (
                                        <span className="status-badge scheduled">Programado</span>
                                    ) : (
                                        <span className="status-badge inactive">Inactivo</span>
                                    )}
                                </div>
                            </div>

                            <div className="popup-actions">
                                <button className="btn-icon edit" onClick={() => handleEdit(popup)} title="Editar">
                                    <FaEdit />
                                </button>
                                <button className="btn-icon trigger" onClick={() => void triggerNow(popup)} title="Ejecutar ahora">
                                    <FaBolt />
                                </button>
                                <button className="btn-icon delete" onClick={() => void handleDelete(popup.id)} title="Eliminar">
                                    <FaTrash />
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="empty-state glass">
                        <FaBullhorn className="empty-icon" />
                        <h3>No hay popups</h3>
                        <p>Crea un popup y luego usa "Ejecutar ahora" cuando quieras mostrarlo.</p>
                        <button className="btn-add" onClick={handleCreate}>
                            <FaPlus /> Crear primer popup
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {editingPopup && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingPopup(null)}
                    >
                        <motion.div
                            className="modal edit-modal glass"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>{isCreating ? 'Nuevo popup' : 'Editar popup'}</h2>
                                <button className="btn-close" onClick={() => setEditingPopup(null)}>
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Titulo *</label>
                                    <input
                                        type="text"
                                        value={editingPopup.title}
                                        onChange={(event) => updateField('title', event.target.value)}
                                        placeholder="Titulo del anuncio"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Descripcion</label>
                                    <textarea
                                        value={editingPopup.description}
                                        onChange={(event) => updateField('description', event.target.value)}
                                        placeholder="Texto del anuncio..."
                                        rows={4}
                                    />
                                </div>

                                <div className="form-group">
                                    <label><FaImage /> URL de imagen</label>
                                    <input
                                        type="text"
                                        value={editingPopup.imageUrl || ''}
                                        onChange={(event) => updateField('imageUrl', event.target.value)}
                                        placeholder="/images/promo.jpg"
                                    />
                                </div>

                                <div className="form-group">
                                    <label><FaUpload /> Subir imagen</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (event) => {
                                            const file = event.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                const imageUrl = await db.uploadImageFile(file, 'popups');
                                                updateField('imageUrl', imageUrl);
                                            } catch (error) {
                                                console.error('Error uploading popup image:', error);
                                                alert('No se pudo subir la imagen del popup');
                                            }
                                        }}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label><FaLink /> URL del enlace</label>
                                        <input
                                            type="url"
                                            value={editingPopup.linkUrl || ''}
                                            onChange={(event) => updateField('linkUrl', event.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Texto del boton</label>
                                        <input
                                            type="text"
                                            value={editingPopup.linkText || ''}
                                            onChange={(event) => updateField('linkText', event.target.value)}
                                            placeholder="Ver mas"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label><FaCalendar /> Fecha inicio</label>
                                        <input
                                            type="date"
                                            value={editingPopup.startDate}
                                            onChange={(event) => updateField('startDate', event.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><FaCalendar /> Fecha fin</label>
                                        <input
                                            type="date"
                                            value={editingPopup.endDate}
                                            onChange={(event) => updateField('endDate', event.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-group checkbox-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editingPopup.active}
                                            onChange={(event) => updateField('active', event.target.checked)}
                                        />
                                        Popup activo
                                    </label>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setEditingPopup(null)}>
                                    Cancelar
                                </button>
                                <button className="btn-save" onClick={() => void handleSave()}>
                                    <FaSave /> Guardar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Popups;
