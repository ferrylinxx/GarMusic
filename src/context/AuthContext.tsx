import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    username: string;
    isAdmin: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Credenciales del admin (en producción esto estaría hasheado en un backend)
const ADMIN_CREDENTIALS = {
    username: 'fgarola',
    // Hash simple para no tener la contraseña en texto plano visible
    passwordHash: btoa('ferran2203%'),
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Verificar sesión existente al cargar
        const savedSession = sessionStorage.getItem('admin-session');
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                if (parsed.username && parsed.expiry > Date.now()) {
                    setUser({ username: parsed.username, isAdmin: true });
                } else {
                    sessionStorage.removeItem('admin-session');
                }
            } catch {
                sessionStorage.removeItem('admin-session');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));

        const passwordHash = btoa(password);

        if (
            username === ADMIN_CREDENTIALS.username &&
            passwordHash === ADMIN_CREDENTIALS.passwordHash
        ) {
            const userData: User = { username, isAdmin: true };
            setUser(userData);

            // Guardar sesión con expiración de 24 horas
            sessionStorage.setItem('admin-session', JSON.stringify({
                username,
                expiry: Date.now() + 24 * 60 * 60 * 1000,
            }));

            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('admin-session');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
