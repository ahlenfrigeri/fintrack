import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Home, PlusCircle, BarChart3, Settings, TrendingUp, TrendingDown, DollarSign, Download, Moon, Sun, Target, Trash2, LogOut, User, Bell, Calendar, Upload, FileText, Plus, X, Users, Share2, UserPlus, Clock, Check } from 'lucide-react';
import Auth from './Auth';
import { format, subMonths, parseISO, isValid } from 'date-fns';
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [transactionType, setTransactionType] = useState('entrada');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [currency, setCurrency] = useState('BRL');
  const [exchangeRates] = useState({ BRL: 1, USD: 5.0, EUR: 5.5, GBP: 6.5 });
  const [monthlyGoal, setMonthlyGoal] = useState(1000);
  const [transactions, setTransactions] = useState([]);
  const [customCategories, setCustomCategories] = useState({ entrada: [], divida: [] });
  const [notifications, setNotifications] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [shareEmail, setShareEmail] = useState('');

  // 🔧 FIX: Adicionar estado para controlar salvamento
  const [settingsChanged, setSettingsChanged] = useState(false);

  const [formData, setFormData] = useState({
    value: '', date: '', category: '', description: '', status: 'pendente', recurrent: false, installments: 1
  });

  const [newCategory, setNewCategory] = useState({ name: '', type: 'divida' });
  const [expandedGroups, setExpandedGroups] = useState({});

  const defaultCategories = {
    entrada: ['Salário', 'Freelance', 'Investimentos', 'Recebimento', 'Outros'],
    divida: ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Contas', 'Outros']
  };

  const categories = {
    entrada: [...defaultCategories.entrada, ...customCategories.entrada],
    divida: [...defaultCategories.divida, ...customCategories.divida]
  };

  const COLORS = ['#6b7280', '#4b5563', '#374151', '#9ca3af', '#1f2937', '#d1d5db', '#111827', '#e5e7eb'];
  const currencySymbols = { BRL: 'R$', USD: '$', EUR: '€', GBP: '£' };

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load transactions and settings
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;

    // Transactions listener
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const unsubTransactions = onSnapshot(
      transactionsRef,
      (snapshot) => {
        const transactionsData = [];
        snapshot.forEach((doc) => {
          transactionsData.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(transactionsData);
      },
      (error) => {
        console.error('Erro ao carregar transações:', error);
        alert('Erro ao carregar transações. Verifique sua conexão.');
      }
    );

    // Load settings
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
          setSharedUsers(data.sharedUsers || []);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        alert('Erro ao carregar configurações.');
      }
    };

    loadUserSettings();
    return () => unsubTransactions();
  }, [currentUser]);

  // 🔧 FIX: Salvar configurações apenas quando necessário
  const saveSettings = useCallback(async () => {
    if (!currentUser || !settingsChanged) return;

    try {
      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
      await setDoc(settingsRef, {
        monthlyGoal,
        currency,
        darkMode,
        customCategories,
        sharedUsers,
        updatedAt: new Date().toISOString()
      });
      setSettingsChanged(false);
      console.log('✅ Configurações salvas');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações.');
    }
  }, [currentUser, monthlyGoal, currency, darkMode, customCategories, sharedUsers, settingsChanged]);

  // 🔧 FIX: Debounce para salvar configurações
  useEffect(() => {
    if (!settingsChanged) return;

    const timer = setTimeout(() => {
      saveSettings();
    }, 2000); // Salva após 2 segundos de inatividade

    return () => clearTimeout(timer);
  }, [saveSettings, settingsChanged]);

  // Marcar que configurações mudaram
  useEffect(() => {
    if (currentUser) {
      setSettingsChanged(true);
    }
  }, [monthlyGoal, currency, darkMode, customCategories, sharedUsers, currentUser]);

  const saveTransaction = async (transaction) => {
    if (!currentUser) return;

    try {
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', transaction.id.toString());
      await setDoc(transactionRef, transaction);
      console.log('✅ Transação salva');
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      alert('Erro ao salvar transação. Tente novamente.');
    }
  };

  const deleteTransactionFromFirestore = async (transactionId) => {
    if (!currentUser) return;

    try {
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', transactionId.toString());
      await setDoc(transactionRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
      console.log('✅ Transação deletada');
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      alert('Erro ao deletar transação.');
    }
  };

  const handleShareWithUser = async () => {
    if (!shareEmail.trim()) {
      alert('Digite um email válido');
      return;
    }

    if (shareEmail === currentUser.email) {
      alert('Você não pode compartilhar com você mesmo!');
      return;
    }

    if (sharedUsers.includes(shareEmail)) {
      alert('Este usuário já tem acesso');
      return;
    }

    const updatedUsers = [...sharedUsers, shareEmail];
    setSharedUsers(updatedUsers);
    setShareEmail('');
    setShowShareModal(false);
    alert(`Acesso compartilhado com ${shareEmail}!`);
  };

  const handleRemoveSharedUser = (email) => {
    if (window.confirm(`Remover acesso de ${email}?`)) {
      setSharedUsers(sharedUsers.filter(u => u !== email));
    }
  };

  // 🔧 FIX: Notificações com tratamento de erro
  useEffect(() => {
    if (!currentUser) return;

    try {
      const today = new Date();
      const upcoming = transactions.filter(t => {
        // 🔧 FIX: Filtrar deletados
        if (t.deleted) return false;
        if (t.type !== 'divida' || t.status !== 'pendente') return false;

        // 🔧 FIX: Validar data antes de usar
        const dueDate = parseISO(t.date);
        if (!isValid(dueDate)) return false;

        const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
      }).map(t => ({
        id: t.id,
        message: `Conta "${t.description}" vence em ${Math.ceil((parseISO(t.date) - today) / (1000 * 60 * 60 * 24))} dias`,
        date: t.date,
        value: t.value
      }));
      setNotifications(upcoming);
    } catch (error) {
      console.error('Erro ao calcular notificações:', error);
    }
  }, [transactions, currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      alert('Erro ao fazer logout.');
    }
  };

  const convertCurrency = (value) => {
    return (value / exchangeRates[currency]).toFixed(2);
  };

  const formatCurrency = (value) => {
    return `${currencySymbols[currency]} ${convertCurrency(value)}`;
  };

  // 🔧 FIX: Usar useMemo para evitar recalcular
  const getFilteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 🔧 FIX: Sempre filtrar deletados
      if (t.deleted) return false;

      // 🔧 FIX: Validar data antes de usar
      try {
        const transDate = parseISO(t.date);
        if (!isValid(transDate)) return false;

        const monthKey = format(transDate, 'yyyy-MM');
        return monthKey === selectedMonth;
      } catch (error) {
        console.error('Erro ao filtrar transação:', error);
        return false;
      }
    });
  }, [transactions, selectedMonth]);

  // 🔧 FIX: Usar useMemo para cálculos
  const calculateTotals = useCallback((filtered = false) => {
    const data = filtered ? getFilteredTransactions : transactions.filter(t => !t.deleted);

    const entradas = data.filter(t => t.type === 'entrada' && (t.status === 'recebido' || t.status === 'paga')).reduce((sum, t) => sum + t.value, 0);
    const entradasPendentes = data.filter(t => t.type === 'entrada' && t.status === 'pendente').reduce((sum, t) => sum + t.value, 0);
    const dividasPendentes = data.filter(t => t.type === 'divida' && t.status === 'pendente').reduce((sum, t) => sum + t.value, 0);
    const dividasPagas = data.filter(t => t.type === 'divida' && t.status === 'paga').reduce((sum, t) => sum + t.value, 0);
    const saldo = entradas - dividasPagas;
    const saldoProjetado = entradas + entradasPendentes - dividasPendentes - dividasPagas;

    return { entradas, entradasPendentes, dividasPendentes, dividasPagas, saldo, saldoProjetado };
  }, [transactions, getFilteredTransactions]);

  const getExpensesByCategory = useMemo(() => {
    const categoryMap = {};
    getFilteredTransactions
      .filter(t => t.type === 'divida')
      .forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.value;
      });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [getFilteredTransactions]);

  const getIncomeByCategory = useMemo(() => {
    const categoryMap = {};
    getFilteredTransactions
      .filter(t => t.type === 'entrada')
      .forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.value;
      });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [getFilteredTransactions]);

  const getMonthlyEvolution = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM/yy', { locale: ptBR });

      const monthTransactions = transactions.filter(t => {
        // 🔧 FIX: Filtrar deletados
        if (t.deleted) return false;

        try {
          const transDate = parseISO(t.date);
          if (!isValid(transDate)) return false;

          const transMonth = format(transDate, 'yyyy-MM');
          return transMonth === monthKey;
        } catch (error) {
          return false;
        }
      });

      const entradas = monthTransactions.filter(t => t.type === 'entrada' && (t.status === 'recebido' || t.status === 'paga')).reduce((sum, t) => sum + t.value, 0);
      const dividas = monthTransactions.filter(t => t.type === 'divida' && t.status === 'paga').reduce((sum, t) => sum + t.value, 0);

      months.push({
        name: monthName,
        Entradas: entradas,
        Despesas: dividas,
        Saldo: entradas - dividas,
        month: monthKey
      });
    }
    return months;
  }, [transactions]);

  const getCategoryTrends = useMemo(() => {
    const last3Months = [];
    for (let i = 2; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM', { locale: ptBR });

      const monthTransactions = transactions.filter(t => {
        // 🔧 FIX: Filtrar deletados
        if (t.deleted || t.type !== 'divida') return false;

        try {
          const transDate = parseISO(t.date);
          if (!isValid(transDate)) return false;

          const transMonth = format(transDate, 'yyyy-MM');
          return transMonth === monthKey;
        } catch (error) {
          return false;
        }
      });

      const categoryData = { month: monthName };

      categories.divida.slice(0, 5).forEach(cat => {
        const total = monthTransactions
          .filter(t => t.category === cat)
          .reduce((sum, t) => sum + t.value, 0);
        if (total > 0) categoryData[cat] = total;
      });

      last3Months.push(categoryData);
    }
    return last3Months;
  }, [transactions, categories.divida]);

  const getUpcomingBills = useMemo(() => {
    return transactions
      .filter(t => !t.deleted && t.type === 'divida' && t.status === 'pendente')
      .sort((a, b) => {
        try {
          const dateA = parseISO(a.date);
          const dateB = parseISO(b.date);
          return dateA - dateB;
        } catch (error) {
          return 0;
        }
      })
      .slice(0, 5);
  }, [transactions]);

  const handleSubmit = async () => {
    if (!formData.value || !formData.date || !formData.category || !formData.description) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    // 🔧 FIX: Validar valor
    const value = parseFloat(formData.value);
    if (value <= 0 || isNaN(value)) {
      alert('Por favor, insira um valor válido maior que zero');
      return;
    }

    try {
      if (formData.installments > 1) {
        const installmentValue = value / parseInt(formData.installments);

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
            createdAt: new Date().toISOString(),
            deleted: false
          };

          await saveTransaction(transaction);
        }
      } else {
        const transaction = {
          id: `${Date.now()}-${Math.random()}`,
          type: transactionType,
          value: value,
          date: formData.date,
          category: formData.category,
          description: formData.description,
          status: formData.status,
          recurrent: formData.recurrent,
          createdAt: new Date().toISOString(),
          deleted: false
        };

        await saveTransaction(transaction);
      }

      setShowModal(false);
      setFormData({ value: '', date: '', category: '', description: '', status: 'pendente', recurrent: false, installments: 1 });
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      alert('Erro ao criar transação. Tente novamente.');
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      alert('Digite o nome da categoria');
      return;
    }

    // 🔧 FIX: Verificar duplicatas
    if (categories[newCategory.type].includes(newCategory.name)) {
      alert('Esta categoria já existe!');
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
    if (!transaction) return;

    try {
      let newStatus = transaction.status;

      if (transaction.type === 'divida') {
        newStatus = transaction.status === 'pendente' ? 'paga' : 'pendente';
      } else if (transaction.type === 'entrada') {
        newStatus = transaction.status === 'pendente' ? 'recebido' : 'pendente';
      }

      const updatedTransaction = {
        ...transaction,
        status: newStatus
      };
      await saveTransaction(updatedTransaction);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status.');
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

  const groupTransactions = useCallback((transactionsList) => {
    const groups = {};

    transactionsList.forEach(t => {
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
  }, []);

  const exportToCSV = () => {
    try {
      const headers = ['Tipo,Valor,Data,Categoria,Descrição,Status'];
      const rows = transactions
        .filter(t => !t.deleted)
        .map(t => `${t.type},${t.value},${t.date},${t.category},"${t.description}",${t.status}`);
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fintrack-relatorio-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar relatório.');
    }
  };

  const exportToPDF = () => {
    try {
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
            .summary { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .summary-item { display: flex; justify-content: space-between; margin: 12px 0; font-size: 16px; }
            @media print { body { padding: 20px; background: white; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>💰 FinTrack - Relatório Financeiro</h1>
            <p>Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div class="summary">
            <h2>📊 Resumo Financeiro</h2>
            <div class="summary-item">
              <span><strong>Entradas Recebidas:</strong></span>
              <span>${formatCurrency(totals.entradas)}</span>
            </div>
            <div class="summary-item">
              <span><strong>A Receber:</strong></span>
              <span>${formatCurrency(totals.entradasPendentes)}</span>
            </div>
            <div class="summary-item">
              <span><strong>A Pagar:</strong></span>
              <span>${formatCurrency(totals.dividasPendentes)}</span>
            </div>
            <div class="summary-item">
              <span><strong>Despesas Pagas:</strong></span>
              <span>${formatCurrency(totals.dividasPagas)}</span>
            </div>
            <div class="summary-item" style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
              <span><strong>Saldo:</strong></span>
              <span style="font-size: 20px; font-weight: bold;">${formatCurrency(totals.saldo)}</span>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF.');
    }
  };

  const exportBackup = () => {
    try {
      const backup = {
        transactions: transactions.filter(t => !t.deleted),
        monthlyGoal,
        customCategories,
        currency,
        sharedUsers,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fintrack-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      alert('Erro ao exportar backup.');
    }
  };

  const importBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);

        if (!backup.transactions || !Array.isArray(backup.transactions)) {
          throw new Error('Arquivo de backup inválido');
        }

        if (window.confirm(`Isso irá substituir todos os seus dados atuais. Deseja continuar?\n\nTransações no backup: ${backup.transactions.length}`)) {
          for (const transaction of backup.transactions) {
            await saveTransaction(transaction);
          }

          if (backup.monthlyGoal) setMonthlyGoal(backup.monthlyGoal);
          if (backup.customCategories) setCustomCategories(backup.customCategories);
          if (backup.currency) setCurrency(backup.currency);
          if (backup.sharedUsers) setSharedUsers(backup.sharedUsers);

          alert('✅ Backup importado com sucesso!');
        }
      } catch (error) {
        console.error('Erro ao importar backup:', error);
        alert('❌ Erro ao importar backup. Verifique se o arquivo está correto.');
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
  const expensesByCategory = getExpensesByCategory;
  const incomeByCategory = getIncomeByCategory;
  const monthlyEvolution = getMonthlyEvolution;
  const categoryTrends = getCategoryTrends;
  const upcomingBills = getUpcomingBills;
  const savingsProgress = ((filteredTotals.saldo / monthlyGoal) * 100).toFixed(1);
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardClass = darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200';
  const textClass = darkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      {/* Header - mantém o mesmo código */}
      <div className={`${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'} shadow-sm p-3 md:p-4 sticky top-0 z-10 backdrop-blur-sm bg-opacity-95`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3">
            <img src="/logo.png" alt="FinTrack" className="w-8 h-8 md:w-10 md:h-10" />
            <h1 className={`text-lg md:text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>FinTrack</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <Bell size={18} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center font-semibold text-[10px] md:text-xs">{notifications.length}</span>
                )}
              </button>
              {showNotifications && notifications.length > 0 && (
                <div className={`absolute right-0 mt-2 w-72 md:w-80 ${cardClass} rounded-xl shadow-2xl p-4 max-h-96 overflow-y-auto`}>
                  <h3 className="font-bold mb-3 text-base md:text-lg">🔔 Notificações</h3>
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 mb-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-orange-500 font-semibold mt-1">{formatCurrency(n.value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2">
              <User size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{currentUser.email}</span>
            </div>

            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button onClick={handleLogout} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-medium transition-all ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-800 text-white hover:bg-gray-900'}`}>
              <LogOut size={16} />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 md:p-4 pb-24">
        {activeTab === 'dashboard' && (
          <div className="space-y-4 md:space-y-6">
            {/* Filtro de mês */}
            <div className={`${cardClass} p-3 md:p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
              <div className="flex items-center gap-2">
                <Calendar size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                <span className="font-semibold text-sm md:text-base">Filtrar por mês:</span>
              </div>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`w-full sm:w-auto p-2 border rounded-lg font-medium text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
            </div>

            {/* Cards resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <div className="flex flex-col gap-2">
                  <p className={`text-xs md:text-sm font-medium ${textClass}`}>Entradas Recebidas</p>
                  <p className="text-lg md:text-2xl font-bold text-green-500">{formatCurrency(filteredTotals.entradas)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="text-green-600" size={16} />
                    <span className="text-xs text-green-600">Mês atual</span>
                  </div>
                </div>
              </div>

              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <div className="flex flex-col gap-2">
                  <p className={`text-xs md:text-sm font-medium ${textClass}`}>A Receber</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-500">{formatCurrency(filteredTotals.entradasPendentes)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="text-blue-600" size={16} />
                    <span className="text-xs text-blue-600">Pendente</span>
                  </div>
                </div>
              </div>

              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <div className="flex flex-col gap-2">
                  <p className={`text-xs md:text-sm font-medium ${textClass}`}>A Pagar</p>
                  <p className="text-lg md:text-2xl font-bold text-orange-500">{formatCurrency(filteredTotals.dividasPendentes)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="text-orange-600" size={16} />
                    <span className="text-xs text-orange-600">Pendente</span>
                  </div>
                </div>
              </div>

              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <div className="flex flex-col gap-2">
                  <p className={`text-xs md:text-sm font-medium ${textClass}`}>Despesas Pagas</p>
                  <p className="text-lg md:text-2xl font-bold text-red-500">{formatCurrency(filteredTotals.dividasPagas)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Check className="text-red-600" size={16} />
                    <span className="text-xs text-red-600">Mês atual</span>
                  </div>
                </div>
              </div>

              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm col-span-2 lg:col-span-1`}>
                <div className="flex flex-col gap-2">
                  <p className={`text-xs md:text-sm font-medium ${textClass}`}>Saldo Real</p>
                  <p className={`text-lg md:text-2xl font-bold ${filteredTotals.saldo >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>{formatCurrency(filteredTotals.saldo)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className={filteredTotals.saldo >= 0 ? 'text-gray-600' : 'text-red-600'} size={16} />
                    <span className={`text-xs ${filteredTotals.saldo >= 0 ? 'text-gray-600' : 'text-red-600'}`}>Atual</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resto do dashboard continua igual... */}
            {/* Meta de economia */}
            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <div className="flex items-center gap-2 mb-4">
                <Target className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={20} />
                <h2 className="text-lg md:text-xl font-bold">Meta de Economia Mensal</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs md:text-sm font-medium">
                  <span>Progresso: {formatCurrency(filteredTotals.saldo)}</span>
                  <span>Meta: {formatCurrency(monthlyGoal)}</span>
                </div>
                <div className={`w-full rounded-full h-2 md:h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className={`h-2 md:h-3 rounded-full transition-all ${savingsProgress >= 100 ? 'bg-green-500' : 'bg-gray-600'}`} style={{ width: `${Math.min(Math.abs(savingsProgress), 100)}%` }}></div>
                </div>
                <p className={`text-xs md:text-sm text-center font-medium ${textClass}`}>{savingsProgress}% da meta alcançada</p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Despesas por categoria */}
              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <h2 className="text-lg md:text-xl font-bold mb-4">Despesas por Categoria</h2>
                {expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={expensesByCategory} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={window.innerWidth < 640 ? 60 : 80} fill="#8884d8" dataKey="value">
                        {expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={`text-center py-16 ${textClass}`}>Nenhuma despesa neste mês</p>
                )}
              </div>

              {/* Entradas por categoria */}
              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <h2 className="text-lg md:text-xl font-bold mb-4">Entradas por Categoria</h2>
                {incomeByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={incomeByCategory} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={window.innerWidth < 640 ? 60 : 80} fill="#8884d8" dataKey="value">
                        {incomeByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={`text-center py-16 ${textClass}`}>Nenhuma entrada neste mês</p>
                )}
              </div>

              {/* Próximas contas */}
              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <h2 className="text-lg md:text-xl font-bold mb-4">Próximas Contas</h2>
                <div className="space-y-3">
                  {upcomingBills.map(bill => {
                    try {
                      const billDate = parseISO(bill.date);
                      return (
                        <div key={bill.id} className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{bill.description}</p>
                            <p className={`text-xs md:text-sm ${textClass}`}>{bill.category}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="font-bold text-red-500 text-sm md:text-base">{formatCurrency(bill.value)}</p>
                            <p className={`text-xs ${textClass}`}>{isValid(billDate) ? format(billDate, 'dd/MM/yyyy') : 'Data inválida'}</p>
                          </div>
                        </div>
                      );
                    } catch (error) {
                      console.error('Erro ao renderizar conta:', error);
                      return null;
                    }
                  })}
                  {upcomingBills.length === 0 && <p className={textClass}>Nenhuma conta pendente</p>}
                </div>
              </div>

              {/* Tendência de categorias */}
              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <h2 className="text-lg md:text-xl font-bold mb-4">Tendência de Despesas</h2>
                {categoryTrends.length > 0 && categoryTrends.some(m => Object.keys(m).length > 1) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="month" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                      <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                      <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: '1px solid ' + (darkMode ? '#374151' : '#e5e7eb') }} />
                      <Legend />
                      {categories.divida.slice(0, 5).map((cat, index) => (
                        <Bar key={cat} dataKey={cat} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={`text-center py-16 ${textClass}`}>Dados insuficientes</p>
                )}
              </div>
            </div>

            {/* Evolução anual */}
            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <h2 className="text-lg md:text-xl font-bold mb-4">Evolução Anual (Últimos 12 Meses)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyEvolution}>
                  <defs>
                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: '1px solid ' + (darkMode ? '#374151' : '#e5e7eb') }} />
                  <Legend />
                  <Area type="monotone" dataKey="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" />
                  <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorDespesas)" />
                  <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'relatorios' && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Relatórios</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={exportToCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-600 font-medium transition-colors text-sm md:text-base">
                  <Download size={18} />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button onClick={exportToPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-600 font-medium transition-colors text-sm md:text-base">
                  <FileText size={18} />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            </div>

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <h3 className="text-lg md:text-xl font-bold mb-4">Comparativo Mensal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Entradas Recebidas', valor: filteredTotals.entradas, fill: '#10b981' },
                  { name: 'A Receber', valor: filteredTotals.entradasPendentes, fill: '#3b82f6' },
                  { name: 'A Pagar', valor: filteredTotals.dividasPendentes, fill: '#f59e0b' },
                  { name: 'Despesas Pagas', valor: filteredTotals.dividasPagas, fill: '#ef4444' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'} angle={-15} textAnchor="end" height={80} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: '1px solid ' + (darkMode ? '#374151' : '#e5e7eb') }} />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                    {[
                      { name: 'Entradas Recebidas', valor: filteredTotals.entradas, fill: '#10b981' },
                      { name: 'A Receber', valor: filteredTotals.entradasPendentes, fill: '#3b82f6' },
                      { name: 'A Pagar', valor: filteredTotals.dividasPendentes, fill: '#f59e0b' },
                      { name: 'Despesas Pagas', valor: filteredTotals.dividasPagas, fill: '#ef4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <h3 className="text-lg md:text-xl font-bold mb-4">Todas as Transações</h3>
              <div className="space-y-2">
                {groupTransactions(
                  transactions
                    .filter(t => !t.deleted)
                    .sort((a, b) => {
                      try {
                        return new Date(a.date) - new Date(b.date);
                      } catch (error) {
                        return 0;
                      }
                    })
                ).map((group) => {
                  if (!group.isGroup) {
                    const t = group.transactions[0];

                    try {
                      const today = new Date();
                      const dueDate = parseISO(t.date);
                      const daysUntil = isValid(dueDate) ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <div key={t.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex-1 min-w-0 w-full sm:w-auto">
                            <p className="font-semibold truncate">{t.description}</p>
                            <div className="flex items-center gap-2 flex-wrap text-xs md:text-sm">
                              <p className={textClass}>{t.category}</p>
                              <span className={`${textClass} hidden sm:inline`}>•</span>
                              <p className={textClass}>{isValid(dueDate) ? format(dueDate, 'dd/MM/yyyy') : 'Data inválida'}</p>
                              {t.type === 'divida' && t.status === 'pendente' && daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
                                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                  Vence em {daysUntil}d
                                </span>
                              )}
                              {t.type === 'divida' && t.status === 'pendente' && daysUntil !== null && daysUntil < 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse">
                                  ATRASADO {Math.abs(daysUntil)}d
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="text-right">
                              <p className={`font-bold text-sm md:text-base ${t.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                                {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.value)}
                              </p>
                              {(t.type === 'divida' || t.type === 'entrada') && (
                                <button onClick={() => toggleStatus(t.id)} className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${(t.status === 'paga' || t.status === 'recebido')
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-orange-500 text-white hover:bg-orange-600'
                                  }`}>
                                  {t.status === 'paga' ? '✓ Paga' : t.status === 'recebido' ? '✓ Recebido' : '⏱ Pendente'}
                                </button>
                              )}
                            </div>
                            <button onClick={() => deleteTransaction(t.id)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`} title="Excluir transação">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    } catch (error) {
                      console.error('Erro ao renderizar transação:', error);
                      return null;
                    }
                  } else {
                    const totalValue = group.transactions.reduce((sum, t) => sum + t.value, 0);
                    const totalInstallments = group.transactions.length;
                    const pendingCount = group.transactions.filter(t => t.status === 'pendente').length;
                    const paidCount = group.transactions.filter(t => t.status === 'paga' || t.status === 'recebido').length;
                    const isExpanded = expandedGroups[group.name];
                    const firstTransaction = group.transactions[0];

                    return (
                      <div key={group.name} className={`rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 cursor-pointer hover:bg-opacity-90 transition" onClick={() => toggleGroupExpansion(group.name)}>
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-start gap-2">
                              <span className="text-xl flex-shrink-0">📦</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-base md:text-lg truncate">{group.name}</p>
                                <div className="flex items-center gap-2 flex-wrap text-xs md:text-sm">
                                  <span className={`px-2 py-0.5 rounded-full font-semibold ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                                    {totalInstallments}x
                                  </span>
                                  <span className={textClass}>{firstTransaction.category}</span>
                                  {pendingCount > 0 && (
                                    <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                                      {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {paidCount > 0 && (
                                    <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                                      {paidCount} paga{paidCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="text-right">
                              <p className={`font-bold text-sm md:text-base ${firstTransaction.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
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
                              try {
                                const today = new Date();
                                const dueDate = parseISO(t.date);
                                const daysUntil = isValid(dueDate) ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
                                const installmentMatch = t.description.match(/\((\d+)\/(\d+)\)/);
                                const currentInstallment = installmentMatch ? installmentMatch[1] : '';
                                const totalInstallments = installmentMatch ? installmentMatch[2] : '';

                                return (
                                  <div key={t.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                    <div className="flex-1 w-full">
                                      <div className="flex items-center gap-2 flex-wrap text-xs md:text-sm">
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-700'}`}>
                                          {currentInstallment}/{totalInstallments}
                                        </span>
                                        <p className={textClass}>{isValid(dueDate) ? format(dueDate, 'dd/MM') : 'Data inválida'}</p>
                                        {t.type === 'divida' && t.status === 'pendente' && daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
                                          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                            {daysUntil}d
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                      <div className="text-right">
                                        <p className={`font-semibold text-sm ${t.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                                          {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.value)}
                                        </p>
                                        {(t.type === 'divida' || t.type === 'entrada') && (
                                          <button onClick={() => toggleStatus(t.id)} className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${(t.status === 'paga' || t.status === 'recebido')
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-orange-500 text-white hover:bg-orange-600'
                                            }`}>
                                            {t.status === 'paga' ? '✓' : t.status === 'recebido' ? '✓' : '⏱'}
                                          </button>
                                        )}
                                      </div>
                                      <button onClick={() => deleteTransaction(t.id)} className={`p-1 rounded transition-colors ${darkMode ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              } catch (error) {
                                console.error('Erro ao renderizar parcela:', error);
                                return null;
                              }
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
          <div className="space-y-4 md:space-y-6">
            <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Configurações</h2>

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <h3 className="text-base md:text-lg font-bold mb-4">Meta Mensal de Economia</h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(parseFloat(e.target.value) || 0)} className={`flex-1 p-3 border rounded-lg font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
              </div>
            </div>

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <h3 className="text-base md:text-lg font-bold mb-4">Moeda</h3>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`w-full p-3 border rounded-lg font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                <option value="BRL">Real (R$)</option>
                <option value="USD">Dólar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">Libra (£)</option>
              </select>
            </div>

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
                    <Users size={20} />
                    Compartilhar Gastos
                  </h3>
                  <p className={`text-xs md:text-sm ${textClass} mt-1`}>Adicione pessoas para compartilhar suas finanças</p>
                </div>
                <button onClick={() => setShowShareModal(true)} className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 font-medium transition-colors text-sm md:text-base">
                  <UserPlus size={18} />Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {sharedUsers.length > 0 ? (
                  sharedUsers.map(email => (
                    <div key={email} className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <User size={16} className={textClass} />
                        <span className="text-sm font-medium truncate">{email}</span>
                      </div>
                      <button onClick={() => handleRemoveSharedUser(email)} className="ml-2 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors flex-shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={`text-center py-4 ${textClass} text-sm`}>Nenhum usuário compartilhado</p>
                )}
              </div>
            </div>

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-base md:text-lg font-bold">Categorias Personalizadas</h3>
                <button onClick={() => setShowCategoryModal(true)} className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 font-medium transition-colors text-sm md:text-base">
                  <Plus size={16} />Nova
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold mb-2 text-sm md:text-base">Entradas:</p>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.entrada.map(cat => (
                      <span key={cat} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs md:text-sm flex items-center gap-2 font-medium">
                        {cat}
                        <button onClick={() => handleDeleteCategory('entrada', cat)} className="hover:text-red-600 transition-colors">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2 text-sm md:text-base">Despesas:</p>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.divida.map(cat => (
                      <span key={cat} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs md:text-sm flex items-center gap-2 font-medium">
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

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <h3 className="text-base md:text-lg font-bold mb-4">Backup e Restauração</h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button onClick={exportBackup} className="flex-1 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 font-medium transition-colors text-sm md:text-base">
                  <Download size={18} />Exportar Backup
                </button>
                <label className="flex-1 bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 cursor-pointer font-medium transition-colors text-sm md:text-base">
                  <Upload size={18} />Importar Backup
                  <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                </label>
              </div>
            </div>

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <h3 className="text-base md:text-lg font-bold mb-4">Preferências</h3>
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm md:text-base">Modo Escuro</span>
                <button onClick={() => setDarkMode(!darkMode)} className={`w-14 h-7 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} relative transition-colors`}>
                  <div className={`w-6 h-6 rounded-full bg-white absolute top-0.5 ${darkMode ? 'right-0.5' : 'left-0.5'} transition-all shadow-md`}></div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal nova transação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
            <h2 className="text-xl md:text-2xl font-bold mb-4">Nova Transação</h2>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTransactionType('entrada')} className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${transactionType === 'entrada' ? 'bg-green-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Entrada</button>
              <button onClick={() => setTransactionType('divida')} className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${transactionType === 'divida' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Saída</button>
            </div>
            <div className="space-y-4">
              <input type="number" step="0.01" min="0.01" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Valor" />
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                <option value="">Selecione a categoria</option>
                {categories[transactionType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Descrição" />
              {transactionType === 'divida' && (
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                  <option value="pendente">Pendente</option>
                  <option value="paga">Paga</option>
                </select>
              )}
              {transactionType === 'entrada' && (
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                  <option value="pendente">Pendente</option>
                  <option value="recebido">Recebido</option>
                </select>
              )}
              <input type="number" min="1" value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Número de parcelas" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.recurrent} onChange={(e) => setFormData({ ...formData, recurrent: e.target.checked })} className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Transação recorrente</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)} className={`flex-1 py-3 rounded-lg font-medium transition-colors text-sm md:text-base ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}>Cancelar</button>
                <button onClick={handleSubmit} className={`flex-1 py-3 rounded-lg font-medium transition-colors text-sm md:text-base ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-800 text-white hover:bg-gray-900'}`}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal compartilhar */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl p-4 md:p-6 max-w-md w-full shadow-2xl`}>
            <h2 className="text-xl md:text-2xl font-bold mb-4">Compartilhar com usuário</h2>
            <div className="space-y-4">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Email do usuário"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowShareModal(false)} className={`flex-1 py-3 rounded-lg font-medium transition-colors text-sm md:text-base ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}>Cancelar</button>
                <button onClick={handleShareWithUser} className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-medium transition-colors text-sm md:text-base">Compartilhar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal categoria */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl p-4 md:p-6 max-w-md w-full shadow-2xl`}>
            <h2 className="text-xl md:text-2xl font-bold mb-4">Nova Categoria</h2>
            <div className="space-y-4">
              <input type="text" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Nome da categoria" />
              <select value={newCategory.type} onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })} className={`w-full p-3 border rounded-lg text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                <option value="entrada">Entrada</option>
                <option value="divida">Despesa</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowCategoryModal(false)} className={`flex-1 py-3 rounded-lg font-medium transition-colors text-sm md:text-base ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}>Cancelar</button>
                <button onClick={handleAddCategory} className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium transition-colors text-sm md:text-base">Adicionar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <div className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg border-t backdrop-blur-sm bg-opacity-95`}>
        <div className="max-w-7xl mx-auto flex justify-around items-center p-2 md:p-4">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? (darkMode ? 'text-gray-200' : 'text-gray-900') : textClass}`}>
            <Home size={20} />
            <span className="text-[10px] md:text-xs font-medium">Início</span>
          </button>
          <button onClick={() => setShowModal(true)} className="flex flex-col items-center gap-1 text-green-500 transform scale-110">
            <div className="bg-green-500 text-white rounded-full p-2 md:p-3 shadow-lg hover:bg-green-600 transition-colors">
              <PlusCircle size={20} />
            </div>
            <span className="text-[10px] md:text-xs font-medium">Nova</span>
          </button>
          <button onClick={() => setActiveTab('relatorios')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'relatorios' ? (darkMode ? 'text-gray-200' : 'text-gray-900') : textClass}`}>
            <BarChart3 size={20} />
            <span className="text-[10px] md:text-xs font-medium">Relatórios</span>
          </button>
          <button onClick={() => setActiveTab('configuracoes')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'configuracoes' ? (darkMode ? 'text-gray-200' : 'text-gray-900') : textClass}`}>
            <Settings size={20} />
            <span className="text-[10px] md:text-xs font-medium">Config</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinTrack;