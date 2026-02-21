import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Home, PlusCircle, BarChart3, Settings, TrendingUp, TrendingDown, DollarSign, Download, Moon, Sun, Target, Trash2, LogOut, User, Bell, Calendar, Upload, FileText, Plus, X, Users, Share2, UserPlus, Clock, Check, CreditCard, Filter, ArrowLeft, Pencil } from 'lucide-react';
import Auth from './Auth';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth, db } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const FinTrack = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFilteredList, setShowFilteredList] = useState(null);
  const [transactionType, setTransactionType] = useState('entrada');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('todas');

  const [currency, setCurrency] = useState('BRL');
  const [exchangeRates] = useState({ BRL: 1, USD: 5.0, EUR: 5.5, GBP: 6.5 });
  const [monthlyGoal, setMonthlyGoal] = useState(1000);
  const [transactions, setTransactions] = useState([]);
  const [customCategories, setCustomCategories] = useState({ entrada: [], divida: [] });
  const [notifications, setNotifications] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [shareEmail, setShareEmail] = useState('');

  const [formData, setFormData] = useState({
    value: '',
    date: '',
    category: '',
    description: '',
    notes: '',
    status: 'pendente',
    recurrent: false,
    installments: 1,
    paymentMethod: 'pix'
  });

  const [newCategory, setNewCategory] = useState({ name: '', type: 'divida' });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: null });

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmModal({ show: true, message, onConfirm });
  };

  const handleConfirm = () => {
    if (confirmModal.onConfirm) confirmModal.onConfirm();
    setConfirmModal({ show: false, message: '', onConfirm: null });
  };

  const handleCancelConfirm = () => {
    setConfirmModal({ show: false, message: '', onConfirm: null });
  };

  const paymentMethods = {
    'pix': { label: 'PIX', color: 'bg-teal-500' },
    'cartao-credito': { label: 'Cartão de Crédito', color: 'bg-purple-500' },
    'cartao-debito': { label: 'Cartão de Débito', color: 'bg-blue-500' },
    'boleto': { label: 'Boleto', color: 'bg-orange-500' },
    'dinheiro': { label: 'Dinheiro', color: 'bg-green-500' },
    'transferencia': { label: 'Transferência', color: 'bg-indigo-500' }
  };

  const handleValueChange = (value) => {
    let formatted = value.replace(/[^\d,\.]/g, '');
    formatted = formatted.replace(',', '.');
    const parts = formatted.split('.');
    if (parts.length > 2) {
      formatted = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      formatted = parts[0] + '.' + parts[1].substring(0, 2);
    }
    return formatted;
  };

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const transactionsData = [];
      snapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(transactionsData);
    });

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
      }
    };

    loadUserSettings();
    return () => unsubTransactions();
  }, [currentUser]);

  const saveSettings = async () => {
    if (!currentUser) return;
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
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        saveSettings();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [monthlyGoal, currency, darkMode, customCategories, sharedUsers]);

  const saveTransaction = async (transaction) => {
    if (!currentUser) return;
    try {
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', transaction.id.toString());
      await setDoc(transactionRef, transaction);
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      showToast('Erro ao salvar transação. Tente novamente.', 'error');
    }
  };

  const deleteTransactionFromFirestore = async (transactionId) => {
    if (!currentUser) return;
    try {
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', transactionId.toString());
      await setDoc(transactionRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
    }
  };

  const handleShareWithUser = async () => {
    if (!shareEmail.trim()) {
      showToast('Digite um email válido', 'error');
      return;
    }
    if (shareEmail === currentUser.email) {
      showToast('Você não pode compartilhar com você mesmo!', 'error');
      return;
    }
    if (sharedUsers.includes(shareEmail)) {
      showToast('Este usuário já tem acesso', 'error');
      return;
    }
    const updatedUsers = [...sharedUsers, shareEmail];
    setSharedUsers(updatedUsers);
    setShareEmail('');
    setShowShareModal(false);
    showToast(`Acesso compartilhado com ${shareEmail}!`, 'success');
  };

  const handleRemoveSharedUser = (email) => {
    showConfirm(`Remover acesso de ${email}?`, () => {
      setSharedUsers(sharedUsers.filter(u => u !== email));
    });
  };

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
      const matchesMonth = transDate === selectedMonth;
      const matchesPayment = paymentMethodFilter === 'todas' || t.paymentMethod === paymentMethodFilter;
      return matchesMonth && matchesPayment;
    });
  };

  const calculateTotals = (filtered = false) => {
    const data = filtered ? getFilteredTransactions() : transactions.filter(t => !t.deleted);
    const entradas = data.filter(t => t.type === 'entrada' && (t.status === 'recebido' || t.status === 'paga')).reduce((sum, t) => sum + t.value, 0);
    const entradasPendentes = data.filter(t => t.type === 'entrada' && t.status === 'pendente').reduce((sum, t) => sum + t.value, 0);
    const dividasPendentes = data.filter(t => t.type === 'divida' && t.status === 'pendente').reduce((sum, t) => sum + t.value, 0);
    const dividasPagas = data.filter(t => t.type === 'divida' && t.status === 'paga').reduce((sum, t) => sum + t.value, 0);
    const saldo = entradas - dividasPagas;
    const saldoProjetado = entradas + entradasPendentes - dividasPendentes - dividasPagas;
    return { entradas, entradasPendentes, dividasPendentes, dividasPagas, saldo, saldoProjetado };
  };

  const getExpensesByCategory = () => {
    const filtered = getFilteredTransactions();
    const categoryMap = {};
    filtered.filter(t => t.type === 'divida').forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.value;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  const getIncomeByCategory = () => {
    const filtered = getFilteredTransactions();
    const categoryMap = {};
    filtered.filter(t => t.type === 'entrada').forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.value;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  const getMonthlyEvolution = () => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM/yy', { locale: ptBR });

      const monthTransactions = transactions.filter(t => {
        if (t.deleted) return false;
        const transDate = format(parseISO(t.date), 'yyyy-MM');
        return transDate === monthKey;
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
  };

  const getCategoryTrends = () => {
    const last3Months = [];
    for (let i = 2; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM', { locale: ptBR });

      const monthTransactions = transactions.filter(t => {
        if (t.deleted || t.type !== 'divida') return false;
        const transDate = format(parseISO(t.date), 'yyyy-MM');
        return transDate === monthKey;
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
  };

  const getUpcomingBills = () => {
    return transactions.filter(t => !t.deleted && t.type === 'divida' && t.status === 'pendente').sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  };

  const openEditModal = (transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setFormData({
      value: transaction.value.toString(),
      date: transaction.date,
      category: transaction.category,
      description: transaction.description,
      notes: transaction.notes || '',
      status: transaction.status,
      recurrent: transaction.recurrent || false,
      installments: 1,
      paymentMethod: transaction.paymentMethod || 'pix'
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
    setFormData({
      value: '', date: '', category: '', description: '', notes: '',
      status: 'pendente', recurrent: false, installments: 1, paymentMethod: 'pix'
    });
  };

  const handleSubmit = async () => {
    const valorFormatado = formData.value?.toString().replace(',', '.').trim();
    const valorNumerico = parseFloat(valorFormatado);
    const data = formData.date?.trim();
    const categoria = formData.category?.trim();
    const descricao = formData.description?.trim();

    const camposVazios = [];
    if (!valorFormatado || isNaN(valorNumerico) || valorNumerico <= 0) camposVazios.push('Valor (digite um número válido)');
    if (!data) camposVazios.push('Data');
    if (!categoria) camposVazios.push('Categoria');
    if (!descricao) camposVazios.push('Descrição');

    if (camposVazios.length > 0) {
      showToast(`Campos obrigatórios: ${camposVazios.join(', ')}`, 'error');
      return;
    }

    try {
      // Se estiver editando uma transação existente
      if (editingTransaction) {
        const updatedTransaction = {
          ...editingTransaction,
          type: transactionType,
          value: valorNumerico,
          date: data,
          category: categoria,
          description: descricao,
          notes: formData.notes || '',
          status: formData.status,
          recurrent: formData.recurrent,
          paymentMethod: formData.paymentMethod,
          updatedAt: new Date().toISOString()
        };
        await saveTransaction(updatedTransaction);
        showToast('Transação atualizada com sucesso!', 'success');
        closeModal();
        return;
      }

      if (formData.installments > 1) {
        const installmentValue = valorNumerico / parseInt(formData.installments);

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
            category: categoria,
            description: `${descricao} (${i + 1}/${formData.installments})`,
            status: 'pendente',
            recurrent: formData.recurrent,
            paymentMethod: formData.paymentMethod,
            createdAt: new Date().toISOString()
          };

          await saveTransaction(transaction);
        }
        showToast(`${formData.installments} parcelas adicionadas com sucesso!`, 'success');
      } else {
        const transaction = {
          id: `${Date.now()}-${Math.random()}`,
          type: transactionType,
          value: valorNumerico,
          date: data,
          category: categoria,
          description: descricao,
          notes: formData.notes || '',
          status: formData.status,
          recurrent: formData.recurrent,
          paymentMethod: formData.paymentMethod,
          createdAt: new Date().toISOString()
        };

        await saveTransaction(transaction);
        showToast('Transação adicionada com sucesso!', 'success');
      }

      closeModal();

    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      showToast('Erro ao salvar a transação. Tente novamente.', 'error');
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      showToast('Digite o nome da categoria', 'error');
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
    showConfirm(`Excluir a categoria "${categoryName}"?`, () => {
      setCustomCategories(prev => ({
        ...prev,
        [type]: prev[type].filter(c => c !== categoryName)
      }));
    });
  };

  const toggleStatus = async (id) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
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
    }
  };

  const deleteTransaction = async (id) => {
    showConfirm('Excluir esta transação?', async () => {
      await deleteTransactionFromFirestore(id);
    });
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
    const headers = ['Tipo,Valor,Data,Categoria,Descrição,Status,Forma de Pagamento'];
    const rows = transactions.filter(t => !t.deleted).map(t => {
      const paymentLabel = paymentMethods[t.paymentMethod]?.label || t.paymentMethod || 'N/A';
      return `${t.type},${t.value},${t.date},${t.category},${t.description},${t.status},${paymentLabel}`;
    });
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
          .entrada { color: #10b981; font-weight: 600; }
          .divida { color: #8b5cf6; font-weight: 600; }
          @media print { body { padding: 20px; background: white; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FinTrack - Relatório Financeiro</h1>
        </div>
        <div class="info">
          <p><strong>Usuário:</strong> ${currentUser.email}</p>
          <p><strong>Data do Relatório:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
        <div class="summary">
          <h2>Resumo Financeiro</h2>
          <div class="summary-item">
            <span><strong>Entradas Recebidas:</strong></span>
            <span class="entrada">${formatCurrency(totals.entradas)}</span>
          </div>
          <div class="summary-item">
            <span><strong>Entradas Pendentes:</strong></span>
            <span style="color: #3b82f6;">${formatCurrency(totals.entradasPendentes)}</span>
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
    const backup = { transactions: transactions.filter(t => !t.deleted), monthlyGoal, customCategories, currency, sharedUsers, exportDate: new Date().toISOString() };
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
        showConfirm('Isso irá substituir todos os seus dados atuais. Deseja continuar?', async () => {
          for (const transaction of backup.transactions) {
            await saveTransaction(transaction);
          }
          setMonthlyGoal(backup.monthlyGoal || 1000);
          setCustomCategories(backup.customCategories || { entrada: [], divida: [] });
          setCurrency(backup.currency || 'BRL');
          if (backup.sharedUsers) setSharedUsers(backup.sharedUsers);
          showToast('Backup importado com sucesso!', 'success');
        });
      } catch (error) {
        showToast('Erro ao importar backup. Verifique o arquivo.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const openFilteredList = (filterType) => {
    setShowFilteredList(filterType);
  };

  const getFilteredListData = () => {
    const filtered = getFilteredTransactions();

    switch (showFilteredList) {
      case 'entradas':
        return {
          title: 'Entradas Recebidas',
          transactions: filtered.filter(t => t.type === 'entrada' && (t.status === 'recebido' || t.status === 'paga')),
          color: 'green'
        };
      case 'entradas-pendentes':
        return {
          title: 'Entradas a Receber',
          transactions: filtered.filter(t => t.type === 'entrada' && t.status === 'pendente'),
          color: 'blue'
        };
      case 'dividas-pendentes':
        return {
          title: 'Contas a Pagar',
          transactions: filtered.filter(t => t.type === 'divida' && t.status === 'pendente'),
          color: 'orange'
        };
      case 'dividas-pagas':
        return {
          title: 'Despesas Pagas',
          transactions: filtered.filter(t => t.type === 'divida' && t.status === 'paga'),
          color: 'purple'
        };
      default:
        return { title: '', transactions: [], color: 'gray' };
    }
  };

  const FilteredListModal = () => {
    if (!showFilteredList) return null;

    const { title, transactions: listTransactions, color } = getFilteredListData();

    const colorClasses = {
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      orange: 'bg-orange-500',
      purple: 'bg-purple-500'
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`${cardClass} rounded-2xl p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilteredList(null)}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <span className={`${colorClasses[color]} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
              {listTransactions.length} transações
            </span>
          </div>

          {listTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className={textClass}>Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listTransactions.map(t => {
                const payment = paymentMethods[t.paymentMethod] || { label: 'N/A', color: 'bg-gray-500' };
                return (
                  <div key={t.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg truncate">{t.description}</p>
                        <div className="flex items-center gap-2 flex-wrap text-sm mt-1">
                          <span className={`${payment.color} text-white px-2 py-0.5 rounded-full text-xs font-semibold`}>
                            {payment.label}
                          </span>
                          <span className={textClass}>{t.category}</span>
                          <span className={textClass}>•</span>
                          <span className={textClass}>{format(parseISO(t.date), 'dd/MM/yyyy')}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`font-bold text-xl ${t.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                          {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.value)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => toggleStatus(t.id)}
                        className={`flex-1 text-xs px-3 py-2 rounded-lg font-semibold transition-colors ${(t.status === 'paga' || t.status === 'recebido')
                          ? 'bg-purple-500 text-white hover:bg-purple-600'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                      >
                        {t.status === 'paga' ? '✓ Paga' : t.status === 'recebido' ? '✓ Recebido' : '⏱ Pendente'}
                      </button>
                      <button
                        onClick={() => { setShowFilteredList(null); openEditModal(t); }}
                        className={`px-3 py-2 rounded-lg transition-colors ${darkMode ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteTransaction(t.id)}
                        className={`px-3 py-2 rounded-lg transition-colors ${darkMode ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Componente Toast
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium max-w-xs pointer-events-auto animate-pulse-once
            ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ animation: 'slideIn 0.3s ease' }}
        >
          <span className="text-lg">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  // Modal de confirmação
  const ConfirmModal = () => {
    if (!confirmModal.show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90] p-4">
        <div className={`${cardClass} rounded-2xl p-6 w-full max-w-sm shadow-2xl`}>
          <p className="text-base font-semibold mb-6 text-center">{confirmModal.message}</p>
          <div className="flex gap-3">
            <button
              onClick={handleCancelConfirm}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-all"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
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

  const filteredTotals = calculateTotals(true);
  const expensesByCategory = getExpensesByCategory();
  const incomeByCategory = getIncomeByCategory();
  const monthlyEvolution = getMonthlyEvolution();
  const categoryTrends = getCategoryTrends();
  const upcomingBills = getUpcomingBills();
  const savingsProgress = ((filteredTotals.saldo / monthlyGoal) * 100).toFixed(1);
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardClass = darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200';
  const textClass = darkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      <div
        className={`${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'} shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-opacity-95`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FinTrack" className="w-8 h-8" />
            <h1 className={`text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>FinTrack</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <Bell size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">{notifications.length}</span>
                )}
              </button>
              {showNotifications && notifications.length > 0 && (
                <div className={`absolute right-0 mt-2 w-72 ${cardClass} rounded-xl shadow-2xl p-4 max-h-[70vh] overflow-y-auto`}>
                  <h3 className="font-bold mb-3 text-base">Notificações</h3>
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 mb-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-orange-500 font-semibold mt-1">{formatCurrency(n.value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <User size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{currentUser.email}</span>
            </div>

            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl transition-all ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button onClick={handleLogout} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 pt-4 pb-32 sm:px-4 sm:pb-28">
        {activeTab === 'dashboard' && (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className={`${cardClass} p-2.5 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl shadow-sm`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar size={16} className={`sm:w-5 sm:h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <div className="flex-1">
                    <span className="font-semibold text-xs sm:text-sm lg:text-base block mb-1">Filtrar por mês:</span>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`w-full p-1.5 sm:p-2 border rounded-lg text-xs sm:text-sm font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Filter size={16} className={`sm:w-5 sm:h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <div className="flex-1">
                    <span className="font-semibold text-xs sm:text-sm lg:text-base block mb-1">Forma de pagamento:</span>
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value)}
                      className={`w-full p-1.5 sm:p-2 border rounded-lg text-xs sm:text-sm font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="todas">Todas</option>
                      {Object.entries(paymentMethods).map(([key, method]) => (
                        <option key={key} value={key}>{method.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <button onClick={() => openFilteredList('entradas')} className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer text-left`}>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <p className={`text-[10px] sm:text-xs lg:text-sm font-medium ${textClass}`}>Entradas Recebidas</p>
                  <p className="text-sm sm:text-lg lg:text-2xl font-bold text-green-500">{formatCurrency(filteredTotals.entradas)}</p>
                  <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                    <TrendingUp className="text-green-600" size={12} />
                    <span className="text-[9px] sm:text-xs text-green-600">Clique p/ detalhes</span>
                  </div>
                </div>
              </button>

              <button onClick={() => openFilteredList('entradas-pendentes')} className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer text-left`}>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <p className={`text-[10px] sm:text-xs lg:text-sm font-medium ${textClass}`}>A Receber</p>
                  <p className="text-sm sm:text-lg lg:text-2xl font-bold text-blue-500">{formatCurrency(filteredTotals.entradasPendentes)}</p>
                  <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                    <Clock className="text-blue-600" size={12} />
                    <span className="text-[9px] sm:text-xs text-blue-600">Clique p/ detalhes</span>
                  </div>
                </div>
              </button>

              <button onClick={() => openFilteredList('dividas-pendentes')} className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer text-left`}>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <p className={`text-[10px] sm:text-xs lg:text-sm font-medium ${textClass}`}>A Pagar</p>
                  <p className="text-sm sm:text-lg lg:text-2xl font-bold text-orange-500">{formatCurrency(filteredTotals.dividasPendentes)}</p>
                  <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                    <TrendingDown className="text-orange-600" size={12} />
                    <span className="text-[9px] sm:text-xs text-orange-600">Clique p/ detalhes</span>
                  </div>
                </div>
              </button>

              <button onClick={() => openFilteredList('dividas-pagas')} className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer text-left`}>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <p className={`text-[10px] sm:text-xs lg:text-sm font-medium ${textClass}`}>Despesas Pagas</p>
                  <p className="text-sm sm:text-lg lg:text-2xl font-bold text-purple-500">{formatCurrency(filteredTotals.dividasPagas)}</p>
                  <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                    <Check className="text-purple-600" size={12} />
                    <span className="text-[9px] sm:text-xs text-purple-600">Clique p/ detalhes</span>
                  </div>
                </div>
              </button>

              <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm col-span-2 sm:col-span-2 lg:col-span-1`}>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <p className={`text-[10px] sm:text-xs lg:text-sm font-medium ${textClass}`}>Saldo Real</p>
                  <p className={`text-sm sm:text-lg lg:text-2xl font-bold ${filteredTotals.saldo >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>{formatCurrency(filteredTotals.saldo)}</p>
                  <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                    <DollarSign className={filteredTotals.saldo >= 0 ? 'text-gray-600' : 'text-red-600'} size={12} />
                    <span className={`text-[9px] sm:text-xs ${filteredTotals.saldo >= 0 ? 'text-gray-600' : 'text-red-600'}`}>Atual</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <Target className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={20} />
                <h2 className="text-sm sm:text-base lg:text-xl font-bold">Meta de Economia Mensal</h2>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between text-xs sm:text-sm font-medium">
                  <span>Progresso: {formatCurrency(filteredTotals.saldo)}</span>
                  <span>Meta: {formatCurrency(monthlyGoal)}</span>
                </div>
                <div className={`w-full rounded-full h-2 sm:h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className={`h-2 sm:h-3 rounded-full transition-all ${savingsProgress >= 100 ? 'bg-green-500' : 'bg-gray-600'}`} style={{ width: `${Math.min(Math.abs(savingsProgress), 100)}%` }}></div>
                </div>
                <p className={`text-xs sm:text-sm text-center font-medium ${textClass}`}>{savingsProgress}% da meta alcançada</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
                <h2 className="text-sm sm:text-base lg:text-xl font-bold mb-3 sm:mb-4">Despesas por Categoria</h2>
                {expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expensesByCategory} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={60} fill="#8884d8" dataKey="value">
                        {expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={`text-center py-12 sm:py-16 text-xs sm:text-sm ${textClass}`}>Nenhuma despesa neste mês</p>
                )}
              </div>

              <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
                <h2 className="text-sm sm:text-base lg:text-xl font-bold mb-3 sm:mb-4">Entradas por Categoria</h2>
                {incomeByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={incomeByCategory} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={60} fill="#8884d8" dataKey="value">
                        {incomeByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={`text-center py-12 sm:py-16 text-xs sm:text-sm ${textClass}`}>Nenhuma entrada neste mês</p>
                )}
              </div>

              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <h2 className="text-lg md:text-xl font-bold mb-4">Próximas Contas</h2>
                <div className="space-y-3">
                  {upcomingBills.map(bill => (
                    <div key={bill.id} className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{bill.description}</p>
                        <p className={`text-sm ${textClass}`}>{bill.category}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-bold text-red-500">{formatCurrency(bill.value)}</p>
                        <p className={`text-xs ${textClass}`}>{format(parseISO(bill.date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                  ))}
                  {upcomingBills.length === 0 && <p className={textClass}>Nenhuma conta pendente</p>}
                </div>
              </div>

              <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
                <h2 className="text-lg md:text-xl font-bold mb-4">Tendência de Despesas (3 meses)</h2>
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
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
              <h2 className={`text-base sm:text-xl lg:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Relatórios</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={exportToCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 bg-green-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-green-600 text-xs sm:text-sm font-medium transition-colors">
                  <Download size={14} className="sm:w-[18px] sm:h-[18px]" />CSV
                </button>
                <button onClick={exportToPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-red-600 text-xs sm:text-sm font-medium transition-colors">
                  <FileText size={14} className="sm:w-[18px] sm:h-[18px]" />PDF
                </button>
              </div>
            </div>

            <div className={`${cardClass} p-4 md:p-6 rounded-xl shadow-sm`}>
              <h3 className="text-lg md:text-xl font-bold mb-4">Comparativo Mensal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Entradas', valor: filteredTotals.entradas, fill: '#10b981' },
                  { name: 'A Receber', valor: filteredTotals.entradasPendentes, fill: '#3b82f6' },
                  { name: 'A Pagar', valor: filteredTotals.dividasPendentes, fill: '#f59e0b' },
                  { name: 'Pagas', valor: filteredTotals.dividasPagas, fill: '#8b5cf6' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: '1px solid ' + (darkMode ? '#374151' : '#e5e7eb') }} />
                  <Bar dataKey="valor" fill={darkMode ? '#6b7280' : '#4b5563'} radius={[8, 8, 0, 0]}>
                    {[
                      { name: 'Entradas', valor: filteredTotals.entradas, fill: '#10b981' },
                      { name: 'A Receber', valor: filteredTotals.entradasPendentes, fill: '#3b82f6' },
                      { name: 'A Pagar', valor: filteredTotals.dividasPendentes, fill: '#f59e0b' },
                      { name: 'Pagas', valor: filteredTotals.dividasPagas, fill: '#8b5cf6' }
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
                {groupTransactions(transactions.filter(t => !t.deleted).sort((a, b) => new Date(a.date) - new Date(b.date)))
                  .map((group) => {
                    if (!group.isGroup) {
                      const t = group.transactions[0];
                      const today = new Date();
                      const dueDate = new Date(t.date);
                      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                      const payment = paymentMethods[t.paymentMethod] || { label: 'N/A', color: 'bg-gray-500' };

                      return (
                        <div key={t.id} className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight truncate">{t.description}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                <span className={`${payment.color} text-white px-2 py-0.5 rounded-full text-[10px] font-bold`}>{payment.label}</span>
                                <span className={`text-xs ${textClass}`}>{t.category}</span>
                                <span className={`text-xs ${textClass}`}>• {format(parseISO(t.date), 'dd/MM')}</span>
                                {t.type === 'divida' && t.status === 'pendente' && daysUntil >= 0 && daysUntil <= 7 && (
                                  <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{daysUntil}d</span>
                                )}
                                {t.type === 'divida' && t.status === 'pendente' && daysUntil < 0 && (
                                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">{Math.abs(daysUntil)}d atraso</span>
                                )}
                              </div>
                            </div>
                            <p className={`font-bold text-sm shrink-0 ${t.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                              {t.type === 'entrada' ? '+' : '-'}{formatCurrency(t.value)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-2.5">
                            <button onClick={() => toggleStatus(t.id)} className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg font-semibold transition-colors ${(t.status === 'paga' || t.status === 'recebido') ? 'bg-purple-500 text-white' : 'bg-orange-500 text-white'}`}>
                              {t.status === 'paga' ? '✓ Paga' : t.status === 'recebido' ? '✓ Recebido' : '⏱ Pendente'}
                            </button>
                            <button onClick={() => openEditModal(t)} className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-600'}`}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => deleteTransaction(t.id)} className={`p-2 rounded-lg ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-600'}`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      const totalValue = group.transactions.reduce((sum, t) => sum + t.value, 0);
                      const totalInstallments = group.transactions.length;
                      const pendingCount = group.transactions.filter(t => t.status === 'pendente').length;
                      const paidCount = group.transactions.filter(t => t.status === 'paga' || t.status === 'recebido').length;
                      const isExpanded = expandedGroups[group.name];
                      const firstTransaction = group.transactions[0];

                      return (
                        <div key={group.name} className={`rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-opacity-90 transition" onClick={() => toggleGroupExpansion(group.name)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-lg truncate">{group.name}</p>
                                  <div className="flex items-center gap-2 flex-wrap text-sm">
                                    <span className={`px-2 py-0.5 rounded-full font-semibold ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                                      {totalInstallments}x
                                    </span>
                                    <span className={textClass}>{firstTransaction.category}</span>
                                    {pendingCount > 0 && (
                                      <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                                        {pendingCount} pendente
                                      </span>
                                    )}
                                    {paidCount > 0 && (
                                      <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                                        {paidCount} paga
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
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
                                const totalInst = installmentMatch ? installmentMatch[2] : '';
                                const payment = paymentMethods[t.paymentMethod] || { label: 'N/A', color: 'bg-gray-500' };

                                return (
                                  <div key={t.id} className={`flex justify-between items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap text-sm">
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-700'}`}>
                                          {currentInstallment}/{totalInst}
                                        </span>
                                        <p className={textClass}>{format(parseISO(t.date), 'dd/MM')}</p>
                                        {t.type === 'divida' && t.status === 'pendente' && daysUntil >= 0 && daysUntil <= 7 && (
                                          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                            {daysUntil}d
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-right">
                                        <p className={`font-semibold ${t.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                                          {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.value)}
                                        </p>
                                        <button onClick={() => toggleStatus(t.id)} className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${(t.status === 'paga' || t.status === 'recebido')
                                          ? 'bg-purple-500 text-white hover:bg-purple-600'
                                          : 'bg-orange-500 text-white hover:bg-orange-600'
                                          }`}>
                                          {(t.status === 'paga' || t.status === 'recebido') ? '✓' : '⏱'}
                                        </button>
                                      </div>
                                      <div className="flex gap-1">
                                        <button onClick={() => openEditModal(t)} className={`p-1 rounded transition-colors ${darkMode ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                                          <Pencil size={14} />
                                        </button>
                                        <button onClick={() => deleteTransaction(t.id)} className={`p-1 rounded transition-colors ${darkMode ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
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
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <h2 className={`text-base sm:text-xl lg:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Configurações</h2>

            <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold mb-3 sm:mb-4">Meta Mensal de Economia</h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(parseFloat(e.target.value))} className={`flex-1 p-2.5 sm:p-3 border rounded-lg text-sm sm:text-base font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                <button onClick={saveSettings} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-800 text-white hover:bg-gray-900'}`}>Salvar</button>
              </div>
            </div>

            <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold mb-3 sm:mb-4">Moeda</h3>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`w-full p-2.5 sm:p-3 border rounded-lg text-sm sm:text-base font-medium ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                <option value="BRL">Real (R$)</option>
                <option value="USD">Dólar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">Libra (£)</option>
              </select>
            </div>

            <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold flex items-center gap-1.5 sm:gap-2">
                    <Users size={16} className="sm:w-5 sm:h-5" />
                    Compartilhar Gastos
                  </h3>
                  <p className={`text-xs sm:text-sm ${textClass} mt-0.5 sm:mt-1`}>Adicione pessoas para compartilhar suas finanças</p>
                </div>
                <button onClick={() => setShowShareModal(true)} className="w-full sm:w-auto bg-blue-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors">
                  <UserPlus size={14} className="sm:w-[18px] sm:h-[18px]" />Adicionar
                </button>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                {sharedUsers.length > 0 ? (
                  sharedUsers.map(email => (
                    <div key={email} className={`flex justify-between items-center p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <User size={14} className={`sm:w-4 sm:h-4 ${textClass}`} />
                        <span className="text-xs sm:text-sm font-medium truncate">{email}</span>
                      </div>
                      <button onClick={() => handleRemoveSharedUser(email)} className="ml-2 p-1.5 sm:p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                        <X size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={`text-center py-3 sm:py-4 text-xs sm:text-sm ${textClass}`}>Nenhum usuário compartilhado</p>
                )}
              </div>
            </div>

            <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base lg:text-lg font-bold">Categorias Personalizadas</h3>
                <button onClick={() => setShowCategoryModal(true)} className="w-full sm:w-auto bg-green-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors">
                  <Plus size={14} className="sm:w-4 sm:h-4" />Nova
                </button>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <p className="font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Entradas:</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {customCategories.entrada.map(cat => (
                      <span key={cat} className="bg-green-100 text-green-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 font-medium">
                        {cat}
                        <button onClick={() => handleDeleteCategory('entrada', cat)} className="hover:text-red-600 transition-colors">
                          <X size={12} className="sm:w-[14px] sm:h-[14px]" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Saídas:</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {customCategories.divida.map(cat => (
                      <span key={cat} className="bg-red-100 text-red-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 font-medium">
                        {cat}
                        <button onClick={() => handleDeleteCategory('divida', cat)} className="hover:text-red-600 transition-colors">
                          <X size={12} className="sm:w-[14px] sm:h-[14px]" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold mb-3 sm:mb-4">Backup e Restauração</h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button onClick={exportBackup} className="flex-1 bg-green-500 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-green-600 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors">
                  <Download size={14} className="sm:w-[18px] sm:h-[18px]" />Exportar Backup
                </button>
                <label className="flex-1 bg-orange-500 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-orange-600 flex items-center justify-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm font-medium transition-colors">
                  <Upload size={14} className="sm:w-[18px] sm:h-[18px]" />Importar Backup
                  <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                </label>
              </div>
            </div>

            <div className={`${cardClass} p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm`}>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold mb-3 sm:mb-4">Preferências</h3>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium">Modo Escuro</span>
                <button onClick={() => setDarkMode(!darkMode)} className={`w-12 sm:w-14 h-6 sm:h-7 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} relative transition-colors`}>
                  <div className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-white absolute top-0.5 ${darkMode ? 'right-0.5' : 'left-0.5'} transition-all shadow-md`}></div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nova/Editar Transação */}
      {showModal && (() => {
        const modalStep = !formData.value || !formData.date ? 1 : !formData.category || !formData.description ? 2 : 3;
        const progress = modalStep === 1 ? 33 : modalStep === 2 ? 66 : 100;
        const accentColor = transactionType === 'entrada' ? 'green' : 'red';
        const valueNum = parseFloat(formData.value?.replace(',', '.')) || 0;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`${cardClass} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl`}>

              {/* Header */}
              <div className={`p-5 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">
                    {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                  </h2>
                  <button onClick={closeModal} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                    <X size={20} />
                  </button>
                </div>

                {/* Tipo: Entrada ou Saída */}
                <div className={`flex gap-2 p-1 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <button
                    onClick={() => setTransactionType('entrada')}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${transactionType === 'entrada'
                      ? 'bg-green-500 text-white shadow-md'
                      : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Entrada
                  </button>
                  <button
                    onClick={() => setTransactionType('divida')}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${transactionType === 'divida'
                      ? 'bg-red-500 text-white shadow-md'
                      : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Saída
                  </button>
                </div>

                {/* Barra de progresso */}
                <div className="mt-4">
                  <div className={`w-full h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${transactionType === 'entrada' ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {['Valor e Data', 'Categoria', 'Detalhes'].map((step, i) => (
                      <span key={i} className={`text-[10px] font-medium ${modalStep > i ? (transactionType === 'entrada' ? 'text-green-500' : 'text-red-500') : textClass}`}>
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">

                {/* Preview do valor */}
                <div className={`rounded-2xl p-4 text-center ${transactionType === 'entrada'
                  ? darkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-100'
                  : darkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-100'}`}>
                  <p className={`text-xs font-medium mb-1 ${textClass}`}>
                    {transactionType === 'entrada' ? 'Valor a receber' : 'Valor a pagar'}
                  </p>
                  <p className={`text-3xl font-bold ${transactionType === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                    {valueNum > 0 ? `${currencySymbols[currency]} ${valueNum.toFixed(2).replace('.', ',')}` : `${currencySymbols[currency]} 0,00`}
                  </p>
                  {formData.installments > 1 && valueNum > 0 && (
                    <p className={`text-xs mt-1 ${textClass}`}>
                      {formData.installments}x de {currencySymbols[currency]} {(valueNum / formData.installments).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>

                {/* Linha: Valor + Data */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textClass}`}>Valor <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: handleValueChange(e.target.value) })}
                      className={`w-full p-3 rounded-xl font-medium border-2 text-sm transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500'} focus:outline-none`}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textClass}`}>Data <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={`w-full p-3 rounded-xl font-medium border-2 text-sm transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500'} focus:outline-none`}
                    />
                  </div>
                </div>

                {/* Seleção visual de categoria */}
                <div>
                  <label className={`block text-xs font-semibold mb-2 ${textClass}`}>Categoria <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {categories[transactionType].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${formData.category === cat
                          ? transactionType === 'entrada'
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-red-500 text-white border-red-500'
                          : darkMode
                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-400'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Forma de pagamento visual */}
                <div>
                  <label className={`block text-xs font-semibold mb-2 ${textClass}`}>Forma de pagamento <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(paymentMethods).map(([key, method]) => (
                      <button
                        key={key}
                        onClick={() => setFormData({ ...formData, paymentMethod: key })}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border-2 ${formData.paymentMethod === key
                          ? `${method.color} text-white border-transparent`
                          : darkMode
                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-400'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'}`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${textClass}`}>Descrição <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full p-3 rounded-xl font-medium border-2 text-sm transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500'} focus:outline-none`}
                    placeholder="Ex: Salário de outubro"
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${textClass}`}>Observações <span className={`font-normal ${textClass}`}>(opcional)</span></label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className={`w-full p-3 rounded-xl font-medium border-2 text-sm transition-all resize-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500'} focus:outline-none`}
                    placeholder="Algum detalhe adicional..."
                  />
                </div>

                {/* Linha: Status + Parcelas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textClass}`}>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full p-3 rounded-xl font-medium border-2 text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none`}
                    >
                      {transactionType === 'divida' ? (
                        <>
                          <option value="pendente">Pendente</option>
                          <option value="paga">Paga</option>
                        </>
                      ) : (
                        <>
                          <option value="pendente">Pendente</option>
                          <option value="recebido">Recebido</option>
                        </>
                      )}
                    </select>
                  </div>
                  {!editingTransaction && (
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${textClass}`}>Parcelas</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.installments}
                        onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                        className={`w-full p-3 rounded-xl font-medium border-2 text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none`}
                        placeholder="1"
                      />
                    </div>
                  )}
                </div>

                {/* Recorrente toggle */}
                <label className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <input
                    type="checkbox"
                    checked={formData.recurrent}
                    onChange={(e) => setFormData({ ...formData, recurrent: e.target.checked })}
                    className="w-5 h-5 accent-green-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-semibold">Transação recorrente</p>
                    <p className={`text-xs ${textClass}`}>Repete todo mês na mesma data</p>
                  </div>
                </label>

                {/* Botões */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={closeModal}
                    className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className={`flex-1 py-3.5 rounded-xl font-semibold text-sm text-white shadow-md hover:shadow-lg transition-all ${transactionType === 'entrada'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'}`}
                  >
                    {editingTransaction ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Categoria */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl p-5 w-full max-w-sm shadow-2xl`}>
            <h2 className="text-xl font-bold mb-4">Nova Categoria</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome da categoria"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className={`w-full p-3.5 rounded-xl font-medium border-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none`}
              />
              <select
                value={newCategory.type}
                onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                className={`w-full p-3.5 rounded-xl font-medium border-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none`}
              >
                <option value="divida">Saída</option>
                <option value="entrada">Entrada</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => setShowCategoryModal(false)} className={`flex-1 py-3 rounded-xl font-semibold ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                  Cancelar
                </button>
                <button onClick={handleAddCategory} className="flex-1 py-3 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compartilhar */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl p-5 w-full max-w-sm shadow-2xl`}>
            <h2 className="text-xl font-bold mb-4">Compartilhar com</h2>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email do usuário"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className={`w-full p-3.5 rounded-xl font-medium border-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none`}
              />
              <div className="flex gap-3">
                <button onClick={() => setShowShareModal(false)} className={`flex-1 py-3 rounded-xl font-semibold ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                  Cancelar
                </button>
                <button onClick={handleShareWithUser} className="flex-1 py-3 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600">
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FilteredListModal />

      <ToastContainer />
      <ConfirmModal />

      {/* Barra de navegação */}
      <div
        className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'} border-t backdrop-blur-md shadow-2xl`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center px-2 pt-2 pb-1">
          {[
            { tab: 'dashboard', icon: <Home size={24} />, label: 'Início' },
            { tab: 'relatorios', icon: <BarChart3 size={24} />, label: 'Relatórios' },
            { tab: 'configuracoes', icon: <Settings size={24} />, label: 'Config' },
          ].map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition-all active:scale-95 ${activeTab === tab
                  ? darkMode ? 'text-white' : 'text-gray-900'
                  : textClass
                }`}
            >
              {icon}
              <span className="text-[11px] font-semibold">{label}</span>
              {activeTab === tab && <div className="w-4 h-0.5 rounded-full bg-green-500" />}
            </button>
          ))}
          <button
            onClick={() => { setEditingTransaction(null); setFormData({ value: '', date: '', category: '', description: '', notes: '', status: 'pendente', recurrent: false, installments: 1, paymentMethod: 'pix' }); setShowModal(true); }}
            className="flex flex-col items-center gap-0.5 px-2 py-1 -mt-4"
          >
            <div className="bg-green-500 text-white rounded-2xl p-3.5 shadow-lg shadow-green-200 hover:bg-green-600 transition-all active:scale-95">
              <Plus size={24} />
            </div>
            <span className="text-[11px] font-semibold text-green-500 mt-0.5">Nova</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinTrack;
