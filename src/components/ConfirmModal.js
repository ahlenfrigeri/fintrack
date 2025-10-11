// ConfirmModal.js - Coloque na pasta src/components/
import React, { useState } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning', // warning, danger, info, success
    darkMode = false
}) => {
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('Erro na confirmação:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const icons = {
        warning: <AlertTriangle className="text-orange-500" size={48} />,
        danger: <XCircle className="text-red-500" size={48} />,
        info: <Info className="text-blue-500" size={48} />,
        success: <CheckCircle className="text-green-500" size={48} />
    };

    const confirmColors = {
        warning: 'bg-orange-500 hover:bg-orange-600',
        danger: 'bg-red-500 hover:bg-red-600',
        info: 'bg-blue-500 hover:bg-blue-600',
        success: 'bg-green-500 hover:bg-green-600'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div
                className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                        {icons[type]}
                    </div>

                    <div>
                        <h3 className="text-xl font-bold mb-2">{title}</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {message}
                        </p>
                    </div>

                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${darkMode
                                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {cancelText}
                        </button>

                        <button
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors ${confirmColors[type]} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Processando...</span>
                                </div>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Hook para usar confirmações facilmente
export const useConfirm = (darkMode = false) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar'
    });

    const confirm = ({
        title,
        message,
        onConfirm,
        type = 'warning',
        confirmText = 'Confirmar',
        cancelText = 'Cancelar'
    }) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                onConfirm: async () => {
                    await onConfirm();
                    resolve(true);
                },
                type,
                confirmText,
                cancelText
            });
        });
    };

    const closeConfirm = () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
    };

    const ConfirmDialog = () => (
        <ConfirmModal
            isOpen={confirmState.isOpen}
            onClose={closeConfirm}
            onConfirm={confirmState.onConfirm}
            title={confirmState.title}
            message={confirmState.message}
            type={confirmState.type}
            confirmText={confirmState.confirmText}
            cancelText={confirmState.cancelText}
            darkMode={darkMode}
        />
    );

    return { confirm, ConfirmDialog };
};

export default ConfirmModal;