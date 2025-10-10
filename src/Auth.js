import React, { useState } from 'react';

const Auth = ({ onLogin }) => {
    const [showLogin, setShowLogin] = useState(true);
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });

    const handleLogin = () => {
        if (!loginForm.email || !loginForm.password) {
            alert('Preencha todos os campos!');
            return;
        }
        const users = JSON.parse(localStorage.getItem('fintrack-users') || '[]');
        const user = users.find(u => u.email === loginForm.email && u.password === loginForm.password);
        if (user) {
            localStorage.setItem('fintrack-current-user', user.email);
            onLogin(user.email);
            setLoginForm({ email: '', password: '' });
        } else {
            alert('Email ou senha incorretos!');
        }
    };

    const handleRegister = () => {
        if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
            alert('Preencha todos os campos!');
            return;
        }
        if (registerForm.password !== registerForm.confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }
        if (registerForm.password.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres!');
            return;
        }
        const users = JSON.parse(localStorage.getItem('fintrack-users') || '[]');
        if (users.find(u => u.email === registerForm.email)) {
            alert('Este email já está cadastrado!');
            return;
        }
        users.push({ name: registerForm.name, email: registerForm.email, password: registerForm.password });
        localStorage.setItem('fintrack-users', JSON.stringify(users));
        alert('Conta criada com sucesso! Faça login para continuar.');
        setShowLogin(true);
        setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center p-4">
            {/* Elemento decorativo de fundo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-gray-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-200">
                {/* Logo e Header */}
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
                                />
                            </div>
                            <button
                                onClick={handleLogin}
                                className="w-full bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Entrar
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
                            onClick={() => setShowLogin(false)}
                            className="w-full border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
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
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={registerForm.email}
                                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                                className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                            />
                            <input
                                type="password"
                                placeholder="Senha (mínimo 6 caracteres)"
                                value={registerForm.password}
                                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                            />
                            <input
                                type="password"
                                placeholder="Confirmar senha"
                                value={registerForm.confirmPassword}
                                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                                className="w-full p-4 pl-5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300 bg-gray-50 text-gray-900 placeholder-gray-400"
                            />
                            <button
                                onClick={handleRegister}
                                className="w-full bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Criar conta
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
                            onClick={() => setShowLogin(true)}
                            className="w-full border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
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