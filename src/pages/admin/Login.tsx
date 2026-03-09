import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaMusic, FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './admin.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const success = await login(username, password);

            if (success) {
                navigate(from, { replace: true });
            } else {
                setError('Usuario o contraseña incorrectos');
            }
        } catch {
            setError('Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <motion.div
                className="login-container glass-strong"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="login-header">
                    <FaMusic className="login-logo" />
                    <h1>Panel Admin</h1>
                    <p>Accede para gestionar tu música</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">
                            <FaUser /> Usuario
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Tu usuario"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            <FaLock /> Contraseña
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Tu contraseña"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <motion.div
                            className="login-error"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="loading-spinner-small"></span>
                        ) : (
                            <>
                                <FaSignInAlt /> Iniciar Sesión
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <a href="/">← Volver al sitio</a>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
