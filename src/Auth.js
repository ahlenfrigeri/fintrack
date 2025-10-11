import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from './firebase';

const Auth = ({ onLogin }) => {
    const [showLogin, setShowLogin] = useState(true);
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!loginForm.email || !loginForm.password) {
            setError('Preencha todos os campos!');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
            onLogin(userCredential.user);
            setLoginForm({ email: '', password: '' });
        } catch (error) {
            console.error('Erro no login:', error);
            if (error.code === 'auth/user-not-found') {
                setError('Usuário não encontrado!');
            } else if (error.code === 'auth/wrong-password') {
                setError('Senha incorreta!');
            } else if (error.code === 'auth/invalid-email') {
                setError('Email inválido!');
            } else if (error.code === 'auth/invalid-credential') {
                setError('Email ou senha incorretos!');
            } else {
                setError('Erro ao fazer login. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
            setError('Preencha todos os campos!');
            return;
        }
        if (registerForm.password !== registerForm.confirmPassword) {
            setError('As senhas não coincidem!');
            return;
        }
        if (registerForm.password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres!');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);

            await updateProfile(userCredential.user, {
                displayName: registerForm.name
            });

            alert('Conta criada com sucesso! Faça login para continuar.');
            setShowLogin(true);
            setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' });
        } catch (error) {
            console.error('Erro no registro:', error);
            if (error.code === 'auth/email-already-in-use') {
                setError('Este email já está cadastrado!');
            } else if (error.code === 'auth/invalid-email') {
                setError('Email inválido!');
            } else if (error.code === 'auth/weak-password') {
                setError('Senha muito fraca! Use pelo menos 6 caracteres.');
            } else {
                setError('Erro ao criar conta. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-gray-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-200">
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="relative">
                        <img
                            src="/logo.png"
                            alt="FinTrack Logo"
                            className="w-24 h-24 object-contain mb-4 drop-shadow-lg"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">FinTrack</h1>
                    <p className="text-gray-500 text-sm mt-2 font-light tracking-wide">Gestão Financeira Inteligente</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {showLogin ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold text-gray-800">Bem-vindo de volta</h2>
                            <p className="text-gray-500 text-sm mt-1">Entre com suas credenciais</p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={loginForm.email}
                                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                    className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                    disabled={loading}
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={loginForm.password}
                                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                    className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                    disabled={loading}
                                />
                            </div>
                            <button
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">Primeira vez aqui?</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowLogin(false);
                                setError('');
                            }}
                            disabled={loading}
                            className="w-full border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Criar nova conta
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold text-gray-800">Criar sua conta</h2>
                            <p className="text-gray-500 text-sm mt-1">Comece sua jornada financeira</p>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nome completo"
                                value={registerForm.name}
                                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                                disabled={loading}
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={registerForm.email}
                                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                                className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                                disabled={loading}
                            />
                            <input
                                type="password"
                                placeholder="Senha (mínimo 6 caracteres)"
                                value={registerForm.password}
                                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                                disabled={loading}
                            />
                            <input
                                type="password"
                                placeholder="Confirmar senha"
                                value={registerForm.confirmPassword}
                                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                                className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                                disabled={loading}
                            />
                            <button
                                onClick={handleRegister}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Criando conta...' : 'Criar conta'}
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">Já tem uma conta?</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowLogin(true);
                                setError('');
                            }}
                            disabled={loading}
                            className="w-full border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Fazer login
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
};

export default Auth;