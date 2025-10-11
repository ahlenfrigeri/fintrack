import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Home, PlusCircle, BarChart3, Settings, TrendingUp, TrendingDown, DollarSign, Download, Moon, Sun, Target, Trash2, LogOut, User, Bell, Calendar, Upload, FileText, Plus, X } from 'lucide-react';
import Auth from './Auth';
import { format, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth, db } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';

const FinTrack = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [transactionType, setTransactionType] = useState('entrada');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [currency, setCurrency] = useState('BRL');
  const [exchangeRates] = useState({ BRL: 1, USD: 5.0, EUR: 5.5, GBP: 6.5 });
  const [monthlyGoal, setMonthlyGoal] = useState(1000);
  const [transactions, setTransactions] = useState([]);
  const [customCategories, setCustomCategories] = useState({ entrada: [], divida: [] });
  const [notifications, setNotifications] = useState([]);

  const [formData, setFormData] = useState({
    value: '', date: '', category: '', description: '', status: 'pendente', recurrent: false, installments: 1
  });

  const [newCategory, setNewCategory] = useState({ name: '', type: 'divida' });
  const [expandedGroups, setExpandedGroups] = useState({});

  const defaultCategories = {
    entrada: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
    divida: ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Contas', 'Outros']
  };

  const categories = {
    entrada: [...defaultCategories.entrada, ...customCategories.entrada],
    divida: [...defaultCategories.divida, ...customCategories.divida]
  };

  const COLORS = ['#6b7280', '#4b5563', '#374151', '#9ca3af', '#1f2937', '#d1d5db', '#111827', '#e5e7eb'];
  const currencySymbols = { BRL: 'R$', USD: '$', EUR: '€', GBP: '£' };

  // Monitorar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Carregar dados do Firestore quando usuário autenticar
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;

    // Listener em tempo real para transações
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const transactionsData = [];
      snapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(transactionsData);
    });

    // Carregar configurações do usuário
    const loadUserSettings = async () => {
      try {
        const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setMonthlyGoal(data.monthlyGoal || 1000);
          setCurrency(data.currency || 'BRL');
          setDarkMode(data.darkMode || false);
          setCustomCategories(data.customCategories || { entrada: [], divida: [] });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    loadUserSettings();

    return () => unsubTransactions();
  }, [currentUser]);

  // Salvar configurações no Firestore
  const saveSettings = async () => {
    if (!currentUser) return;

    try {
      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
      await setDoc(settingsRef, {
        monthlyGoal,
        currency,
        darkMode,
        customCategories,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  };

  // Salvar configurações quando mudarem
  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        saveSettings();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [monthlyGoal, currency, darkMode, customCategories]);

  // Salvar transação no Firestore
  const saveTransaction = async (transaction) => {
    if (!currentUser) return;

    try {
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', transaction.id.toString());
      await setDoc(transactionRef, transaction);
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      alert('Erro ao salvar transação. Tente novamente.');
    }
  };

  // Deletar transação do Firestore
  const deleteTransactionFromFirestore = async (transactionId) => {
    if (!currentUser) return;

    try {
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', transactionId.toString());
      await setDoc(transactionRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
    }
  };

  // Verificar notificações
  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    const upcoming = transactions.filter(t => {
      if (t.type !== 'divida' || t.status !== 'pendente' || t.deleted) return false;
      const dueDate = new Date(t.date);
      const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }).map(t => ({
      id: t.id,
      message: `Conta "${t.description}" vence em ${Math.ceil((new Date(t.date) - today) / (1000 * 60 * 60 * 24))} dias`,
      date: t.date,
      value: t.value
    }));
    setNotifications(upcoming);
  }, [transactions, currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const convertCurrency = (value) => {
    return (value / exchangeRates[currency]).toFixed(2);
  };

  const formatCurrency = (value) => {
    return `${currencySymbols[currency]} ${convertCurrency(value)}`;
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      if (t.deleted) return false;
      const transDate = format(parseISO(t.date), 'yyyy-MM');
      return transDate === selectedMonth;
    });
  };

  const calculateTotals = (filtered = false) => {
    const data = filtered ? getFilteredTransactions() : transactions.filter(t => !t.deleted);
    const entradas = data.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.value, 0);
    const dividasPendentes = data.filter(t => t.type === 'divida' && t.status === 'pendente').reduce((sum, t) => sum + t.value, 0);
    const dividasPagas = data.filter(t => t.type === 'divida' && t.status === 'paga').reduce((sum, t) => sum + t.value, 0);
    const saldo = entradas - dividasPendentes - dividasPagas;
    return { entradas, dividasPendentes, dividasPagas, saldo };
  };

  const getExpensesByCategory = () => {
    const filtered = getFilteredTransactions();
    const categoryMap = {};
    filtered.filter(t => t.type === 'divida').forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.value;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  const getMonthlyEvolution = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM/yy', { locale: ptBR });

      const monthTransactions = transactions.filter(t => {
        if (t.deleted) return false;
        const transDate = format(parseISO(t.date), 'yyyy-MM');
        return transDate === monthKey;
      });

      const entradas = monthTransactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.value, 0);
      const dividas = monthTransactions.filter(t => t.type === 'divida').reduce((sum, t) => sum + t.value, 0);

      months.push({ name: monthName, Entradas: entradas, Despesas: dividas, Saldo: entradas - dividas });
    }
    return months;
  };

  const getUpcomingBills = () => {
    return transactions.filter(t => !t.deleted && t.type === 'divida' && t.status === 'pendente').sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  };

  const handleSubmit = async () => {
    if (!formData.value || !formData.date || !formData.category || !formData.description) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    if (formData.installments > 1) {
      const installmentValue = parseFloat(formData.value) / parseInt(formData.installments);
      const newTransactions = [];

      for (let i = 0; i < formData.installments; i++) {
        const installmentDate = new Date(formData.date);
        installmentDate.setMonth(installmentDate.getMonth() + i);

        const targetDay = new Date(formData.date).getDate();
        const lastDayOfMonth = new Date(installmentDate.getFullYear(), installmentDate.getMonth() + 1, 0).getDate();
        installmentDate.setDate(Math.min(targetDay, lastDayOfMonth));

        const transaction = {
          id: `${Date.now()}-${i}-${Math.random()}`,
          type: transactionType,
          value: installmentValue,
          date: installmentDate.toISOString().split('T')[0],
          category: formData.category,
          description: `${formData.description} (${i + 1}/${formData.installments})`,
          status: 'pendente',
          recurrent: formData.recurrent,
          createdAt: new Date().toISOString()
        };

        newTransactions.push(transaction);
        await saveTransaction(transaction);
      }
    } else {
      const transaction = {
        id: `${Date.now()}-${Math.random()}`,
        type: transactionType,
        value: parseFloat(formData.value),
        date: formData.date,
        category: formData.category,
        description: formData.description,
        status: formData.status,
        recurrent: formData.recurrent,
        createdAt: new Date().toISOString()
      };

      await saveTransaction(transaction);
    }

    setShowModal(false);
    setFormData({ value: '', date: '', category: '', description: '', status: 'pendente', recurrent: false, installments: 1 });
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      alert('Digite o nome da categoria');
      return;
    }
    setCustomCategories(prev => ({
      ...prev,
      [newCategory.type]: [...prev[newCategory.type], newCategory.name]
    }));
    setNewCategory({ name: '', type: 'divida' });
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (type, categoryName) => {
    if (window.confirm(`Tem certeza que deseja excluir a categoria "${categoryName}"?`)) {
      setCustomCategories(prev => ({
        ...prev,
        [type]: prev[type].filter(c => c !== categoryName)
      }));
    }
  };

  const toggleStatus = async (id) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      const updatedTransaction = {
        ...transaction,
        status: transaction.status === 'pendente' ? 'paga' : 'pendente'
      };
      await saveTransaction(updatedTransaction);
    }
  };

  const deleteTransaction = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      await deleteTransactionFromFirestore(id);
    }
  };

  const toggleGroupExpansion = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const groupTransactions = (transactions) => {
    const groups = {};

    transactions.forEach(t => {
      const baseName = t.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
      const hasInstallments = /\(\d+\/\d+\)/.test(t.description);

      if (hasInstallments) {
        if (!groups[baseName]) {
          groups[baseName] = {
            name: baseName,
            transactions: [],
            isGroup: true
          };
        }
        groups[baseName].transactions.push(t);
      } else {
        groups[`${baseName}-${t.id}`] = {
          name: baseName,
          transactions: [t],
          isGroup: false
        };
      }
    });

    return Object.values(groups);
  };

  const exportToCSV = () => {
    const headers = ['Tipo,Valor,Data,Categoria,Descrição,Status'];
    const rows = transactions.filter(t => !t.deleted).map(t => `${t.type},${t.value},${t.date},${t.category},${t.description},${t.status}`);
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fintrack-relatorio.csv';
    a.click();
  };

  const exportToPDF = () => {
    const totals = calculateTotals();
    const printWindow = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FinTrack - Relatório</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1f2937; background: #f9fafb; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #374151; padding-bottom: 20px; }
          .header h1 { color: #111827; margin: 0; font-size: 32px; font-weight: 700; }
          .info { margin: 20px 0; font-size: 14px; color: #6b7280; }
          .summary { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .summary-item { display: flex; justify-content: space-between; margin: 12px 0; font-size: 16px; }
          .summary-item strong { color: #1f2937; }
          .total { font-size: 18px; font-weight: bold; border-top: 2px solid #374151; padding-top: 12px; margin-top: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th { background: #374151; color: white; padding: 14px; text-align: left; font-weight: 600; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .entrada { color: #10b981; font-weight: 600; }
          .divida { color: #ef4444; font-weight: 600; }
          .status-paga { background: #10b981; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
          .status-pendente { background: #f59e0b; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
          @media print { body { padding: 20px; background: white; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 FinTrack - Relatório Financeiro</h1>
        </div>
        <div class="info">
          <p><strong>Usuário:</strong> ${currentUser.email}</p>
          <p><strong>Data do Relatório:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
        <div class="summary">
          <h2>📊 Resumo Financeiro</h2>
          <div class="summary-item">
            <span><strong>Entradas:</strong></span>
            <span class="entrada">${formatCurrency(totals.entradas)}</span>
          </div>
          <div class="summary-item">
            <span><strong>Dívidas Pendentes:</strong></span>
            <span style="color: #f59e0b;">${formatCurrency(totals.dividasPendentes)}</span>
          </div>
          <div class="summary-item">
            <span><strong>Dívidas Pagas:</strong></span>
            <span class="divida">${formatCurrency(totals.dividasPagas)}</span>
          </div>
          <div class="summary-item total">
            <span><strong>Saldo Atual:</strong></span>
            <span style="color: ${totals.saldo >= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(totals.saldo)}</span>
          </div>
        </div>
        <h2>📝 Todas as Transações</h2>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.filter(t => !t.deleted).map(t => `
              <tr>
                <td><span class="${t.type}">${t.type === 'entrada' ? '📈 Entrada' : '📉 Despesa'}</span></td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td>${format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                <td class="${t.type}">${t.type === 'entrada' ? '+' : '-'} ${formatCurrency(t.value)}</td>
                <td><span class="status-${t.status}">${t.status === 'paga' ? 'Paga' : t.status === 'recebido' ? 'Recebido' : 'Pendente'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportBackup = () => {
    const backup = { transactions: transactions.filter(t => !t.deleted), monthlyGoal, customCategories, currency, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  const importBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (window.confirm('Isso irá substituir todos os seus dados atuais. Deseja continuar?')) {
          // Importar transações
          for (const transaction of backup.transactions) {
            await saveTransaction(transaction);
          }
          setMonthlyGoal(backup.monthlyGoal || 1000);
          setCustomCategories(backup.customCategories || { entrada: [], divida: [] });
          setCurrency(backup.currency || 'BRL');
          alert('Backup importado com sucesso!');
        }
      } catch (error) {
        alert('Erro ao importar backup. Verifique se o arquivo está correto.');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={(user) => setCurrentUser(user)} />;
  }

  const totals = calculateTotals();
  const filteredTotals = calculateTotals(true);
  const expensesByCategory = getExpensesByCategory();
  const monthlyEvolution = getMonthlyEvolution();
  const upcomingBills = getUpcomingBills();
  const savingsProgress = ((filteredTotals.saldo / monthlyGoal) * 100).toFixed(1);
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardClass = darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200';
  const textClass = darkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      <div className={`${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'} shadow-sm p-4 sticky top-0 z-10 backdrop-blur-sm bg-opacity-95`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="FinTrack" className="w-10 h-10" />
            <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>FinTrack</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <Bell size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">{notifications.length}</span>
                )}
              </button>
              {showNotifications && notifications.length > 0 && (
                <div className={`absolute right-0 mt-2 w-80 ${cardClass} rounded-xl shadow-2xl p-4 max-h-96 overflow-y-auto`}>
                  <h3 className="font-bold mb-3 text-lg">🔔 Notificações</h3>
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 mb-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-orange-500 font-semibold mt-1">{formatCurrency(n.value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <User size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{currentUser.email}</span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-800 text-white hover:bg-gray-900'}`}>
              <LogOut size={18} />Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 pb-24">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className={`${cardClass} p-4 rounded-xl shadow-sm flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Calendar size={20} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                <span className="font-semibold">Filtrar por mês:</span>
              </div>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`p-2 border rounded-lg font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className={`text-sm font-medium ${textClass}`}>Entradas</p>
                    <p className="text-2xl font-bold text-green-500">{formatCurrency(filteredTotals.entradas)}</p>
                  </div>
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                </div>
              </div>
              <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className={`text-sm font-medium ${textClass}`}>Pendentes</p>
                    <p className="text-2xl font-bold text-orange-500">{formatCurrency(filteredTotals.dividasPendentes)}</p>
                  </div>
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <TrendingDown className="text-orange-600 dark:text-orange-400" size={24} />
                  </div>
                </div>
              </div>
              <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className={`text-sm font-medium ${textClass}`}>Pagas</p>
                    <p className="text-2xl font-bold text-red-500">{formatCurrency(filteredTotals.dividasPagas)}</p>
                  </div>
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                  </div>
                </div>
              </div>
              <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className={`text-sm font-medium ${textClass}`}>Saldo</p>
                    <p className={`text-2xl font-bold ${filteredTotals.saldo >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>{formatCurrency(filteredTotals.saldo)}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${filteredTotals.saldo >= 0 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-red-100 dark:bg-red-900'}`}>
                    <DollarSign className={filteredTotals.saldo >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-red-600 dark:text-red-400'} size={24} />
                  </div>
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <div className="flex items-center gap-2 mb-4">
                <Target className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={24} />
                <h2 className="text-xl font-bold">Meta de Economia Mensal</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Progresso: {formatCurrency(filteredTotals.saldo)}</span>
                  <span>Meta: {formatCurrency(monthlyGoal)}</span>
                </div>
                <div className={`w-full rounded-full h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className={`h-3 rounded-full transition-all ${savingsProgress >= 100 ? 'bg-green-500' : 'bg-gray-600'}`} style={{ width: `${Math.min(Math.abs(savingsProgress), 100)}%` }}></div>
                </div>
                <p className={`text-sm text-center font-medium ${textClass}`}>{savingsProgress}% da meta alcançada</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
                <h2 className="text-xl font-bold mb-4">Gastos por Categoria</h2>
                {expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={expensesByCategory} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                        {expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={`text-center py-16 ${textClass}`}>Nenhuma despesa neste mês</p>
                )}
              </div>
              <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
                <h2 className="text-xl font-bold mb-4">Próximas Contas</h2>
                <div className="space-y-3">
                  {upcomingBills.map(bill => (
                    <div key={bill.id} className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex-1">
                        <p className="font-semibold">{bill.description}</p>
                        <p className={`text-sm ${textClass}`}>{bill.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-500">{formatCurrency(bill.value)}</p>
                        <p className={`text-xs ${textClass}`}>{format(parseISO(bill.date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                  ))}
                  {upcomingBills.length === 0 && <p className={textClass}>Nenhuma conta pendente</p>}
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <h2 className="text-xl font-bold mb-4">Evolução Mensal (Últimos 6 Meses)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: '1px solid ' + (darkMode ? '#374151' : '#e5e7eb') }} />
                  <Legend />
                  <Line type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="Saldo" stroke="#6b7280" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'relatorios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Relatórios</h2>
              <div className="flex gap-2">
                <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium transition-colors">
                  <Download size={20} />CSV
                </button>
                <button onClick={exportToPDF} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-medium transition-colors">
                  <FileText size={20} />PDF
                </button>
              </div>
            </div>
            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <h3 className="text-xl font-bold mb-4">Entradas vs Dívidas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[{ name: 'Entradas', valor: totals.entradas }, { name: 'Pendentes', valor: totals.dividasPendentes }, { name: 'Pagas', valor: totals.dividasPagas }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: '1px solid ' + (darkMode ? '#374151' : '#e5e7eb') }} />
                  <Bar dataKey="valor" fill={darkMode ? '#6b7280' : '#4b5563'} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <h3 className="text-xl font-bold mb-4">Todas as Transações</h3>
              <div className="space-y-2">
                {groupTransactions(transactions.filter(t => !t.deleted).sort((a, b) => new Date(a.date) - new Date(b.date)))
                  .map((group) => {
                    if (!group.isGroup) {
                      const t = group.transactions[0];
                      const today = new Date();
                      const dueDate = new Date(t.date);
                      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                      return (
                        <div key={t.id} className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex-1">
                            <p className="font-semibold">{t.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm ${textClass}`}>{t.category}</p>
                              <span className={`text-xs ${textClass}`}>•</span>
                              <p className={`text-sm ${textClass}`}>{format(parseISO(t.date), 'dd/MM/yyyy')}</p>
                              {t.type === 'divida' && t.status === 'pendente' && daysUntil >= 0 && daysUntil <= 7 && (
                                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                  Vence em {daysUntil} {daysUntil === 1 ? 'dia' : 'dias'}
                                </span>
                              )}
                              {t.type === 'divida' && t.status === 'pendente' && daysUntil < 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse">
                                  ATRASADO {Math.abs(daysUntil)} {Math.abs(daysUntil) === 1 ? 'dia' : 'dias'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`font-bold ${t.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                                {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.value)}
                              </p>
                              {t.type === 'divida' && (
                                <button onClick={() => toggleStatus(t.id)} className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${t.status === 'paga' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                                  {t.status === 'paga' ? '✓ Paga' : '⏱ Pendente'}
                                </button>
                              )}
                            </div>
                            <button onClick={() => deleteTransaction(t.id)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`} title="Excluir transação">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      const totalValue = group.transactions.reduce((sum, t) => sum + t.value, 0);
                      const totalInstallments = group.transactions.length;
                      const pendingCount = group.transactions.filter(t => t.status === 'pendente').length;
                      const paidCount = group.transactions.filter(t => t.status === 'paga').length;
                      const isExpanded = expandedGroups[group.name];
                      const firstTransaction = group.transactions[0];

                      return (
                        <div key={group.name} className={`rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-opacity-90 transition" onClick={() => toggleGroupExpansion(group.name)}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">📦</span>
                                <div>
                                  <p className="font-bold text-lg">{group.name}</p>
                                  <div className="flex items-center gap-2 flex-wrap text-sm">
                                    <span className={`px-2 py-0.5 rounded-full font-semibold ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                                      {totalInstallments} {totalInstallments === 1 ? 'parcela' : 'parcelas'}
                                    </span>
                                    <span className={textClass}>•</span>
                                    <span className={textClass}>{firstTransaction.category}</span>
                                    {pendingCount > 0 && (
                                      <>
                                        <span className={textClass}>•</span>
                                        <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                                          {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                                        </span>
                                      </>
                                    )}
                                    {paidCount > 0 && (
                                      <>
                                        <span className={textClass}>•</span>
                                        <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                                          {paidCount} paga{paidCount > 1 ? 's' : ''}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`font-bold ${firstTransaction.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                                  {firstTransaction.type === 'entrada' ? '+' : '-'} {formatCurrency(totalValue)}
                                </p>
                                <p className={`text-xs ${textClass}`}>Total</p>
                              </div>
                              <button className={`p-2 rounded-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className={`border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'} p-3 space-y-2 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                              {group.transactions.map((t) => {
                                const today = new Date();
                                const dueDate = new Date(t.date);
                                const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                                const installmentMatch = t.description.match(/\((\d+)\/(\d+)\)/);
                                const currentInstallment = installmentMatch ? installmentMatch[1] : '';
                                const totalInstallments = installmentMatch ? installmentMatch[2] : '';

                                return (
                                  <div key={t.id} className={`flex justify-between items-center p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-700'}`}>
                                          {currentInstallment}/{totalInstallments}
                                        </span>
                                        <p className={`text-sm ${textClass}`}>{format(parseISO(t.date), 'dd/MM/yyyy')}</p>
                                        {t.type === 'divida' && t.status === 'pendente' && daysUntil >= 0 && daysUntil <= 7 && (
                                          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                            Vence em {daysUntil} {daysUntil === 1 ? 'dia' : 'dias'}
                                          </span>
                                        )}
                                        {t.type === 'divida' && t.status === 'pendente' && daysUntil < 0 && (
                                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse">
                                            ATRASADO {Math.abs(daysUntil)} {Math.abs(daysUntil) === 1 ? 'dia' : 'dias'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-right">
                                        <p className={`font-semibold ${t.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                                          {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.value)}
                                        </p>
                                        {t.type === 'divida' && (
                                          <button onClick={() => toggleStatus(t.id)} className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${t.status === 'paga' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                                            {t.status === 'paga' ? '✓ Paga' : '⏱ Pendente'}
                                          </button>
                                        )}
                                      </div>
                                      <button onClick={() => deleteTransaction(t.id)} className={`p-1 rounded transition-colors ${darkMode ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`} title="Excluir parcela">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Configurações</h2>
            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <h3 className="text-lg font-bold mb-4">Meta Mensal de Economia</h3>
              <div className="flex gap-4">
                <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(parseFloat(e.target.value))} className={`flex-1 p-3 border rounded-lg font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                <button onClick={saveSettings} className={`px-6 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-800 text-white hover:bg-gray-900'}`}>Salvar</button>
              </div>
            </div>
            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <h3 className="text-lg font-bold mb-4">Moeda</h3>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`w-full p-3 border rounded-lg font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                <option value="BRL">Real (R$)</option>
                <option value="USD">Dólar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">Libra (£)</option>
              </select>
            </div>
            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Categorias Personalizadas</h3>
                <button onClick={() => setShowCategoryModal(true)} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2 font-medium transition-colors">
                  <Plus size={16} />Nova
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold mb-2">Entradas:</p>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.entrada.map(cat => (
                      <span key={cat} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2 font-medium">
                        {cat}
                        <button onClick={() => handleDeleteCategory('entrada', cat)} className="hover:text-red-600 transition-colors">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2">Despesas:</p>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.divida.map(cat => (
                      <span key={cat} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-2 font-medium">
                        {cat}
                        <button onClick={() => handleDeleteCategory('divida', cat)} className="hover:text-red-600 transition-colors">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <h3 className="text-lg font-bold mb-4">Backup e Restauração</h3>
              <div className="flex gap-4">
                <button onClick={exportBackup} className="flex-1 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 font-medium transition-colors">
                  <Download size={20} />Exportar Backup
                </button>
                <label className="flex-1 bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 cursor-pointer font-medium transition-colors">
                  <Upload size={20} />Importar Backup
                  <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                </label>
              </div>
            </div>
            <div className={`${cardClass} p-6 rounded-xl shadow-sm`}>
              <h3 className="text-lg font-bold mb-4">Preferências</h3>
              <div className="flex justify-between items-center">
                <span className="font-medium">Modo Escuro</span>
                <button onClick={() => setDarkMode(!darkMode)} className={`w-14 h-7 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} relative transition-colors`}>
                  <div className={`w-6 h-6 rounded-full bg-white absolute top-0.5 ${darkMode ? 'right-0.5' : 'left-0.5'} transition-all shadow-md`}></div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
            <h2 className="text-2xl font-bold mb-4">Nova Transação</h2>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTransactionType('entrada')} className={`flex-1 py-2 rounded-lg font-medium transition-colors ${transactionType === 'entrada' ? 'bg-green-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Entrada</button>
              <button onClick={() => setTransactionType('divida')} className={`flex-1 py-2 rounded-lg font-medium transition-colors ${transactionType === 'divida' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Dívida</button>
            </div>
            <div className="space-y-4">
              <input type="number" step="0.01" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Valor" />
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                <option value="">Selecione a categoria</option>
                {categories[transactionType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Descrição" />
              {transactionType === 'divida' && (
                <>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                    <option value="pendente">Pendente</option>
                    <option value="paga">Paga</option>
                  </select>
                  <input type="number" min="1" value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: e.target.value })} className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Número de parcelas" />
                </>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.recurrent} onChange={(e) => setFormData({ ...formData, recurrent: e.target.checked })} className="w-5 h-5" />
                <span>Transação recorrente</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)} className={`flex-1 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}>Cancelar</button>
                <button onClick={handleSubmit} className={`flex-1 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-800 text-white hover:bg-gray-900'}`}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl p-6 max-w-md w-full shadow-2xl`}>
            <h2 className="text-2xl font-bold mb-4">Nova Categoria</h2>
            <div className="space-y-4">
              <input type="text" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Nome da categoria" />
              <select value={newCategory.type} onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })} className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                <option value="entrada">Entrada</option>
                <option value="divida">Despesa</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowCategoryModal(false)} className={`flex-1 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}>Cancelar</button>
                <button onClick={handleAddCategory} className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium transition-colors">Adicionar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg border-t backdrop-blur-sm bg-opacity-95`}>
        <div className="max-w-6xl mx-auto flex justify-around items-center p-4">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? (darkMode ? 'text-gray-200' : 'text-gray-900') : textClass}`}>
            <Home size={24} /><span className="text-xs font-medium">Início</span>
          </button>
          <button onClick={() => setShowModal(true)} className="flex flex-col items-center gap-1 text-green-500 transform scale-110">
            <div className="bg-green-500 text-white rounded-full p-3 shadow-lg hover:bg-green-600 transition-colors"><PlusCircle size={24} /></div><span className="text-xs font-medium">Nova</span>
          </button>
          <button onClick={() => setActiveTab('relatorios')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'relatorios' ? (darkMode ? 'text-gray-200' : 'text-gray-900') : textClass}`}>
            <BarChart3 size={24} /><span className="text-xs font-medium">Relatórios</span>
          </button>
          <button onClick={() => setActiveTab('configuracoes')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'configuracoes' ? (darkMode ? 'text-gray-200' : 'text-gray-900') : textClass}`}>
            <Settings size={24} /><span className="text-xs font-medium">Config</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinTrack;