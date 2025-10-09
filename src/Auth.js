import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <DollarSign className="text-green-500" size={48} />
                    <h1 className="text-4xl font-bold text-gray-900">FinTrack</h1>
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
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <input
                                type="password"
                                placeholder="Senha"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <button
                                onClick={handleLogin}
                                className="w-full bg-blue-500 text-white py-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                            >
                                Entrar
                            </button>
                        </div>
                        <p className="text-center text-gray-600">
                            Não tem uma conta?{' '}
                            <button onClick={() => setShowLogin(false)} className="text-blue-500 font-semibold hover:underline">
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
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={registerForm.email}
                                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <input
                                type="password"
                                placeholder="Senha (mínimo 6 caracteres)"
                                value={registerForm.password}
                                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <input
                                type="password"
                                placeholder="Confirmar senha"
                                value={registerForm.confirmPassword}
                                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleRegister}
                                className="w-full bg-green-500 text-white py-4 rounded-lg font-semibold hover:bg-green-600 transition-colors"
                            >
                                Cadastrar
                            </button>
                        </div>
                        <p className="text-center text-gray-600">
                            Já tem uma conta?{' '}
                            <button onClick={() => setShowLogin(true)} className="text-blue-500 font-semibold hover:underline">
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