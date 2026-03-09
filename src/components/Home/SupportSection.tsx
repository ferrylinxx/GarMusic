import { motion } from 'framer-motion';
import { FaCoffee, FaHeart, FaPatreon, FaPaypal } from 'react-icons/fa';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface DonationLink {
    icon: React.ReactNode;
    name: string;
    url: string;
    color: string;
    description: string;
}

const SupportSection = () => {
    const { settings } = useSiteSettings();

    const donationLinks: DonationLink[] = [
        {
            icon: <FaCoffee />,
            name: 'Ko-fi',
            url: settings.kofiUrl || 'https://ko-fi.com/',
            color: '#FF5E5B',
            description: 'Invitame a un cafe',
        },
        {
            icon: <FaPatreon />,
            name: 'Patreon',
            url: settings.patreonUrl || 'https://patreon.com/',
            color: '#FF424D',
            description: 'Unete a mi comunidad',
        },
        {
            icon: <FaPaypal />,
            name: 'PayPal',
            url: settings.paypalUrl || 'https://paypal.me/',
            color: '#00457C',
            description: 'Donacion directa',
        },
    ].filter((link) => link.url && link.url !== 'https://ko-fi.com/' && link.url !== 'https://patreon.com/' && link.url !== 'https://paypal.me/');

    const showPlaceholder = donationLinks.length === 0;

    return (
        <section className="support-section">
            <motion.div
                className="support-content"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className="support-header">
                    <motion.div className="heart-icon-wrapper" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <FaHeart className="heart-icon" />
                    </motion.div>
                    <h2 className="section-title">Apoya mi musica</h2>
                    <p className="section-subtitle">Tu apoyo me ayuda a seguir creando musica. Cada contribucion cuenta.</p>
                </div>

                {showPlaceholder ? (
                    <motion.div className="support-placeholder glass" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        <p>Configura tus enlaces de donacion en el panel de administracion</p>
                    </motion.div>
                ) : (
                    <div className="donation-buttons">
                        {donationLinks.map((link, index) => (
                            <motion.a
                                key={link.name}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="donation-btn"
                                style={
                                    {
                                        '--btn-color': link.color,
                                        background: `linear-gradient(135deg, ${link.color}, ${link.color}dd)`,
                                    } as React.CSSProperties
                                }
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                whileHover={{ scale: 1.05, boxShadow: `0 10px 40px ${link.color}50` }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="btn-icon">{link.icon}</span>
                                <div className="btn-text">
                                    <span className="btn-name">{link.name}</span>
                                    <span className="btn-description">{link.description}</span>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                )}

                <motion.p className="support-thanks" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}>
                    Gracias por apoyar este proyecto.
                </motion.p>
            </motion.div>
        </section>
    );
};

export default SupportSection;
