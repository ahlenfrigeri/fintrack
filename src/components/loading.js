// Loading.js - Coloque na pasta src/components/
import React from 'react';
import { Loader2 } from 'lucide-react';

// Loading Spinner simples
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12'
    };

    return (
        <Loader2 className={`animate-spin ${sizes[size]} ${className}`} />
    );
};

// Loading Overlay (cobre a tela toda)
export const LoadingOverlay = ({ message = 'Carregando...' }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 min-w-[200px]">
                <LoadingSpinner size="xl" className="text-gray-600 dark:text-gray-300" />
                <p className="text-gray-700 dark:text-gray-200 font-medium">{message}</p>
            </div>
        </div>
    );
};

// Loading Button (botão com loading)
export const LoadingButton = ({
    loading,
    children,
    onClick,
    className = '',
    disabled,
    type = 'button',
    ...props
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={loading || disabled}
            className={`relative ${className} ${loading || disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
            {...props}
        >
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingSpinner size="sm" className="text-current" />
                </div>
            )}
            <span className={loading ? 'opacity-0' : 'opacity-100'}>
                {children}
            </span>
        </button>
    );
};

// Loading Skeleton (placeholder para conteúdo)
export const LoadingSkeleton = ({ className = '', count = 1, height = 'h-4' }) => {
    return (
        <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${height} ${className}`}
                />
            ))}
        </div>
    );
};

// Loading Card (skeleton de um card)
export const LoadingCard = ({ darkMode = false }) => {
    return (
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="animate-pulse space-y-4">
                <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4`}></div>
                <div className={`h-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2`}></div>
                <div className="space-y-2">
                    <div className={`h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
                    <div className={`h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-5/6`}></div>
                </div>
            </div>
        </div>
    );
};

// Loading Dots (para textos)
export const LoadingDots = () => {
    return (
        <span className="inline-flex gap-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
        </span>
    );
};

export default LoadingSpinner;