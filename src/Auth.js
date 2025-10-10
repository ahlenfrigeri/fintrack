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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                {/* Logo */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <img
                        src="/logo.png"
                        alt="FinTrack Logo"
                        className="w-32 h-32 object-contain mb-4"
                    />
                    <p className="text-gray-600 text-sm mt-2">Gestão Financeira Pessoal</p>
                </div>

                {showLogin ? (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center text-gray-800">Entrar</h2>
                        <div className="space-y-4">
                            <input
                                type="email"
                                placeholder="Email"
                                value={loginForm.email}
                                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <input
                                type="password"
                                placeholder="Senha"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <button
                                onClick={handleLogin}
                                className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-4 rounded-lg font-semibold hover:from-gray-900 hover:to-black transition-all duration-300 shadow-lg"
                            >
                                Entrar
                            </button>
                        </div>
                        <p className="text-center text-gray-600">
                            Não tem uma conta?{' '}
                            <button onClick={() => setShowLogin(false)} className="text-gray-800 font-semibold hover:underline">
                                Cadastre-se
                            </button>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center text-gray-800">Criar Conta</h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nome completo"
                                value={registerForm.name}
                                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={registerForm.email}
                                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                            />
                            <input
                                type="password"
                                placeholder="Senha (mínimo 6 caracteres)"
                                value={registerForm.password}
                                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                            />
                            <input
                                type="password"
                                placeholder="Confirmar senha"
                                value={registerForm.confirmPassword}
                                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                            />
                            <button
                                onClick={handleRegister}
                                className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-4 rounded-lg font-semibold hover:from-gray-900 hover:to-black transition-all duration-300 shadow-lg"
                            >
                                Cadastrar
                            </button>
                        </div>
                        <p className="text-center text-gray-600">
                            Já tem uma conta?{' '}
                            <button onClick={() => setShowLogin(true)} className="text-gray-800 font-semibold hover:underline">
                                Entrar
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auth;