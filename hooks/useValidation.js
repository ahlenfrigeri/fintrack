// useValidation.js - Coloque na pasta src/hooks/
import { useState } from 'react';

export const useValidation = () => {
    const [errors, setErrors] = useState({});

    // Validadores individuais
    const validators = {
        required: (value, fieldName = 'Campo') => {
            if (!value || (typeof value === 'string' && !value.trim())) {
                return `${fieldName} é obrigatório`;
            }
            return null;
        },

        email: (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (value && !emailRegex.test(value)) {
                return 'Email inválido';
            }
            return null;
        },

        minLength: (value, min, fieldName = 'Campo') => {
            if (value && value.length < min) {
                return `${fieldName} deve ter no mínimo ${min} caracteres`;
            }
            return null;
        },

        maxLength: (value, max, fieldName = 'Campo') => {
            if (value && value.length > max) {
                return `${fieldName} deve ter no máximo ${max} caracteres`;
            }
            return null;
        },

        min: (value, min, fieldName = 'Campo') => {
            const num = parseFloat(value);
            if (!isNaN(num) && num < min) {
                return `${fieldName} deve ser no mínimo ${min}`;
            }
            return null;
        },

        max: (value, max, fieldName = 'Campo') => {
            const num = parseFloat(value);
            if (!isNaN(num) && num > max) {
                return `${fieldName} deve ser no máximo ${max}`;
            }
            return null;
        },

        positive: (value, fieldName = 'Valor') => {
            const num = parseFloat(value);
            if (isNaN(num) || num <= 0) {
                return `${fieldName} deve ser maior que zero`;
            }
            return null;
        },

        number: (value, fieldName = 'Campo') => {
            if (value && isNaN(parseFloat(value))) {
                return `${fieldName} deve ser um número válido`;
            }
            return null;
        },

        integer: (value, fieldName = 'Campo') => {
            const num = parseFloat(value);
            if (value && (!Number.isInteger(num) || num < 1)) {
                return `${fieldName} deve ser um número inteiro positivo`;
            }
            return null;
        },

        date: (value, fieldName = 'Data') => {
            if (value && isNaN(Date.parse(value))) {
                return `${fieldName} inválida`;
            }
            return null;
        },

        futureDate: (value, fieldName = 'Data') => {
            if (value) {
                const date = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (date < today) {
                    return `${fieldName} não pode ser no passado`;
                }
            }
            return null;
        },

        pastDate: (value, fieldName = 'Data') => {
            if (value) {
                const date = new Date(value);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (date > today) {
                    return `${fieldName} não pode ser no futuro`;
                }
            }
            return null;
        }
    };

    // Validar um campo individual
    const validateField = (fieldName, value, rules = []) => {
        for (const rule of rules) {
            let error = null;

            if (typeof rule === 'function') {
                error = rule(value);
            } else if (typeof rule === 'object') {
                const { type, ...params } = rule;
                error = validators[type]?.(value, ...Object.values(params));
            }

            if (error) {
                setErrors(prev => ({ ...prev, [fieldName]: error }));
                return error;
            }
        }

        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
        });
        return null;
    };

    // Validar múltiplos campos
    const validateForm = (formData, rules) => {
        const newErrors = {};
        let isValid = true;

        Object.entries(rules).forEach(([fieldName, fieldRules]) => {
            const value = formData[fieldName];
            const error = validateField(fieldName, value, fieldRules);
            if (error) {
                newErrors[fieldName] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return { isValid, errors: newErrors };
    };

    // Limpar erros
    const clearErrors = (fieldName) => {
        if (fieldName) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        } else {
            setErrors({});
        }
    };

    // Validações específicas do FinTrack
    const finTrackValidators = {
        transactionValue: (value) => {
            const errors = [];

            if (!value) {
                errors.push('Valor é obrigatório');
            }

            const num = parseFloat(value);
            if (isNaN(num)) {
                errors.push('Valor deve ser um número válido');
            } else if (num <= 0) {
                errors.push('Valor deve ser maior que zero');
            } else if (num > 1000000000) {
                errors.push('Valor muito alto');
            }

            return errors.length > 0 ? errors[0] : null;
        },

        category: (value) => {
            if (!value || !value.trim()) {
                return 'Selecione uma categoria';
            }
            return null;
        },

        description: (value) => {
            if (!value || !value.trim()) {
                return 'Descrição é obrigatória';
            }
            if (value.length > 200) {
                return 'Descrição muito longa (máx. 200 caracteres)';
            }
            return null;
        },

        installments: (value) => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1) {
                return 'Número de parcelas inválido';
            }
            if (num > 60) {
                return 'Máximo de 60 parcelas';
            }
            return null;
        },

        monthlyGoal: (value) => {
            const num = parseFloat(value);
            if (isNaN(num) || num <= 0) {
                return 'Meta deve ser maior que zero';
            }
            if (num > 1000000000) {
                return 'Meta muito alta';
            }
            return null;
        },

        shareEmail: (value, currentUserEmail) => {
            if (!value || !value.trim()) {
                return 'Digite um email';
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return 'Email inválido';
            }

            if (value.toLowerCase() === currentUserEmail?.toLowerCase()) {
                return 'Você não pode compartilhar com você mesmo';
            }

            return null;
        },

        categoryName: (value, existingCategories = []) => {
            if (!value || !value.trim()) {
                return 'Nome da categoria é obrigatório';
            }

            if (value.length > 30) {
                return 'Nome muito longo (máx. 30 caracteres)';
            }

            if (existingCategories.includes(value.trim())) {
                return 'Esta categoria já existe';
            }

            return null;
        }
    };

    return {
        errors,
        validateField,
        validateForm,
        clearErrors,
        validators: { ...validators, ...finTrackValidators }
    };
};

// Componente de erro para inputs
export const InputError = ({ error, darkMode = false }) => {
    if (!error) return null;

    return (
        <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-600'} flex items-center gap-1`}>
            <span>⚠️</span>
            <span>{error}</span>
        </p>
    );
};

export default useValidation;