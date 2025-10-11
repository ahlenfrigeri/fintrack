import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuração do Firebase - Credenciais do seu projeto
const firebaseConfig = {
    apiKey: "AIzaSyD5a6kk7YKwkVdizUCyD4_bkVAkZ8802p8",
    authDomain: "fintrack-41ad4.firebaseapp.com",
    projectId: "fintrack-41ad4",
    storageBucket: "fintrack-41ad4.firebasestorage.app",
    messagingSenderId: "455417269789",
    appId: "1:455417269789:web:6b946ecf04470b4c59c0f4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;