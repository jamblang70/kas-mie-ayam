import React, { useState, useEffect } from 'react';
import { 
  Home, PlusCircle, List, TrendingUp, TrendingDown, 
  ShoppingBag, Package, Receipt, Building, Truck, 
  Megaphone, Wrench, MoreHorizontal, Wallet, Coins,
  CheckCircle2, PieChart, Edit2, X, Trash2, Plus,
  CalendarDays, ChevronUp, Download, Loader2, Search,
  Calendar
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';

// =====================================================================
// KONFIGURASI FIREBASE ARIEF 
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBgP66PLL9Smp7T9AgewsqKtK5jdKGFyA8",
  authDomain: "kas-sadjian.firebaseapp.com",
  projectId: "kas-sadjian",
  storageBucket: "kas-sadjian.firebasestorage.app",
  messagingSenderId: "1016460128776",
  appId: "1:1016460128776:web:dc28f7b7f68eefda4357bd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kas-mie-ayam";

// --- DATA KATEGORI ---
const EXPENSE_CATEGORIES = [
  { id: 'bahan_baku', label: 'Bahan Baku', icon: ShoppingBag, color: 'bg-orange-100 text-orange-600', hex: '#f97316' },
  { id: 'kemasan', label: 'Kemasan', icon: Package, color: 'bg-amber-100 text-amber-600', hex: '#f59e0b' },
  { id: 'tagihan', label: 'Tagihan', icon: Receipt, color: 'bg-blue-100 text-blue-600', hex: '#3b82f6' },
  { id: 'fixed', label: 'Fixed Cost', icon: Building, color: 'bg-purple-100 text-purple-600', hex: '#a855f7' },
  { id: 'transport', label: 'Transport', icon: Truck, color: 'bg-teal-100 text-teal-600', hex: '#14b8a6' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, color: 'bg-pink-100 text-pink-600', hex: '#ec4899' },
  { id: 'maintenance', label: 'Perbaikan', icon: Wrench, color: 'bg-slate-100 text-slate-600', hex: '#64748b' },
  { id: 'lain', label: 'Lain-lain', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600', hex: '#9ca3af' },
];

const INCOME_CATEGORIES = [
  { id: 'penjualan', label: 'Penjualan', icon: TrendingUp, color: 'bg-green-100 text-green-600', hex: '#22c55e' },
  { id: 'lain', label: 'Pemasukan Lain', icon: Coins, color: 'bg-emerald-100 text-emerald-600', hex: '#10b981' },
  { id: 'modal', label: 'Modal Awal', icon: Wallet, color: 'bg-blue-100 text-blue-600', hex: '#3b82f6' },
];

const DEFAULT_SUBCATEGORIES = {
  'bahan_baku': ['Ayam', 'Dimsum', 'Mie', 'Sayur & Bumbu', 'Minyak', 'Pelengkap'],
  'kemasan': ['Mangkok/Kertas', 'Sumpit/Sendok', 'Plastik', 'Karet/Lainnya'],
  'tagihan': ['Listrik', 'Sampah', 'Gas', 'Air'],
  'fixed': ['Sewa Tempat', 'Gaji Karyawan', 'Internet/Wifi'],
  'transport': ['Kurir Dimsum', 'Kurir Mie', 'Kurir Pengiriman', 'Bensin'],
  'marketing': ['Cetak Spanduk/Brosur', 'Iklan Sosmed', 'Diskon/Promo'],
  'maintenance': ['Servis Kompor', 'Alat Masak', 'Lainnya'],
  'lain': ['Sewa QRIS', 'Pajak/Retribusi', 'Lainnya'],
  'penjualan': ['Offline (Dine-in / Bungkus)', 'Online (Gofood/Grab/Shopee)'],
  'lain_income': ['Tips', 'Lainnya'],
  'modal': ['Suntikan Dana', 'Pinjaman']
};

const formatRp = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const getCurrentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Helper Format Input Waktu Lokal (YYYY-MM-DDTHH:mm)
const getLocalDatetimeLocal = (dateParam = new Date()) => {
  const d = new Date(dateParam);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('add'); 
  const [viewMonth, setViewMonth] = useState(getCurrentMonthStr()); 
  const [transactions, setTransactions] = useState([]);
  const [subcategories, setSubcategories] = useState(DEFAULT_SUBCATEGORIES);
  const [editingTx, setEditingTx] = useState(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. FIREBASE AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.warn("Mencoba login anonim...", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. FETCH DATA ---
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const txRef = collection(db, 'artifacts', appId, 'users', user.uid, `transactions_${viewMonth}`);
    const unsubscribeTx = onSnapshot(txRef, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Gagal mengambil transaksi:", error);
        setIsLoading(false);
      }
    );

    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
    const unsubscribeSettings = onSnapshot(settingsRef, 
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().subcategories) {
          setSubcategories(docSnap.data().subcategories);
        }
      },
      (error) => console.error("Gagal mengambil sub-kategori:", error)
    );

    return () => {
      unsubscribeTx();
      unsubscribeSettings();
    };
  }, [user, viewMonth]); 

  // --- 3. DATABASE OPERATIONS ---
  const addTransaction = async (data) => {
    if (!user) return;
    try {
      // Hitung laci bulan berdasarkan tanggal transaksi yang dipilih user (mendukung backdate)
      const d = new Date(data.date);
      const targetMonth = `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const txRef = collection(db, 'artifacts', appId, 'users', user.uid, `transactions_${targetMonth}`);
      await addDoc(txRef, data);
      
      // Auto ganti view ke bulan transaksi tersebut
      setViewMonth(targetMonth);
      setActiveTab('history');
    } catch (e) {
      console.error("Gagal menambah transaksi: ", e);
    }
  };

  const updateTransaction = async (updatedTx) => {
    if (!user) return;
    try {
      const newDate = new Date(updatedTx.date);
      const newMonth = `${newDate.getFullYear()}_${String(newDate.getMonth() + 1).padStart(2, '0')}`;

      // Jika user edit tanggal hingga lompat bulan, kita harus pindah laci (Hapus yg lama, Buat yg baru)
      if (newMonth !== viewMonth) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, `transactions_${viewMonth}`, updatedTx.id));
        const { id, ...dataToUpdate } = updatedTx; 
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, `transactions_${newMonth}`), dataToUpdate);
        setViewMonth(newMonth); // Pindah view ke bulan baru
      } else {
        // Update normal di laci yang sama
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, `transactions_${viewMonth}`, updatedTx.id);
        const { id, ...dataToUpdate } = updatedTx; 
        await updateDoc(docRef, dataToUpdate);
      }
      setEditingTx(null);
    } catch (e) {
      console.error("Gagal update transaksi: ", e);
    }
  };

  const deleteTransaction = async (id) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, `transactions_${viewMonth}`, id);
      await deleteDoc(docRef);
      setEditingTx(null);
    } catch (e) {
      console.error("Gagal menghapus transaksi: ", e);
    }
  };

  const updateSubcategories = async (categoryId, newSubs) => {
    if (!user) return;
    const updatedSubcategories = { ...subcategories, [categoryId]: newSubs };
    setSubcategories(updatedSubcategories); 
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, { subcategories: updatedSubcategories }, { merge: true });
    } catch (e) {}
  };

  // --- FITUR EKSPOR ---
  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Tanggal', 'Waktu', 'Tipe', 'Kategori Utama', 'Sub Kategori', 'Nominal (Rp)', 'Catatan'];
    const rows = transactions.map(tx => {
      const d = new Date(tx.date);
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const typeStr = tx.type === 'expense' ? 'Pengeluaran' : 'Pemasukan';
      const safeNote = tx.note ? `"${tx.note.replace(/"/g, '""')}"` : '""';
      return [dateStr, timeStr, typeStr, tx.category, tx.subcategory || '-', tx.amount, safeNote].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Sadjian_${viewMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScroll = (e) => setShowTopBtn(e.target.scrollTop > 300);
  const scrollToTop = () => {
    const scrollContainer = document.getElementById('main-scroll-area');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && !transactions.length) {
    return (
      <div className="flex justify-center items-center bg-gray-100 h-[100dvh] font-sans text-gray-800">
        <div className="flex flex-col items-center text-orange-500">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="font-bold">Menyiapkan Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-gray-100 h-[100dvh] font-sans text-gray-800 overflow-hidden">
      <div className="w-full max-w-md bg-white h-full shadow-2xl relative flex flex-col">
        
        {/* Header */}
        <div className="pt-10 pb-4 px-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-b-3xl shadow-md z-10 shrink-0 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kas Mie Ayam</h1>
            <p className="text-orange-100 text-sm font-medium">Buku Kas Digital Arief</p>
          </div>
          <button onClick={exportToCSV} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex flex-col items-center">
            <Download size={20} />
            <span className="text-[9px] font-bold mt-1">Ekspor</span>
          </button>
        </div>

        {/* Content */}
        <div id="main-scroll-area" onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pt-6 pb-28 scroll-smooth">
          {activeTab === 'dashboard' && <DashboardTab transactions={transactions} />}
          {activeTab === 'add' && <AddTransactionTab onSave={addTransaction} subcategories={subcategories} onUpdateSubs={updateSubcategories} />}
          {activeTab === 'history' && <HistoryTab transactions={transactions} onEditClick={setEditingTx} viewMonth={viewMonth} setViewMonth={setViewMonth} />}
        </div>

        {/* Tombol Back to Top */}
        {showTopBtn && (
          <button onClick={scrollToTop} className="fixed bottom-24 right-6 bg-gray-800 text-white p-3 rounded-full shadow-xl shadow-gray-500/30 z-30 animate-in fade-in zoom-in hover:bg-gray-700 active:scale-90 transition-all">
            <ChevronUp size={24} />
          </button>
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around items-center pb-safe pt-2 pb-6 px-2 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20 rounded-t-2xl">
          <NavButton icon={<PieChart size={24} />} label="Beranda" isActive={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setViewMonth(getCurrentMonthStr()); }} />
          <NavButton icon={<PlusCircle size={28} />} label="Catat" isActive={activeTab === 'add'} onClick={() => { setActiveTab('add'); setViewMonth(getCurrentMonthStr()); }} isPrimary />
          <NavButton icon={<List size={24} />} label="Riwayat" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </div>

        {editingTx && <EditTransactionModal tx={editingTx} onClose={() => setEditingTx(null)} onSave={updateTransaction} onDelete={deleteTransaction} />}
      </div>
    </div>
  );
}

// --- TAB: BERANDA / DASHBOARD ---
function DashboardTab({ transactions }) {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const pendapatanMurni = transactions.filter(t => t.type === 'income' && t.categoryId !== 'modal').reduce((a, b) => a + b.amount, 0);
  const hpp = transactions.filter(t => t.type === 'expense' && ['bahan_baku', 'kemasan'].includes(t.categoryId)).reduce((a, b) => a + b.amount, 0);
  const labaKotor = pendapatanMurni - hpp;
  const operasional = transactions.filter(t => t.type === 'expense' && !['bahan_baku', 'kemasan'].includes(t.categoryId)).reduce((a, b) => a + b.amount, 0);
  const labaBersih = labaKotor - operasional;

  const expenseStats = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    expenseStats[t.categoryId] = (expenseStats[t.categoryId] || 0) + t.amount;
  });

  const pieData = Object.keys(expenseStats).map(catId => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === catId);
    return { id: catId, label: cat?.label || catId, amount: expenseStats[catId], color: cat?.hex || '#ccc' };
  }).sort((a, b) => b.amount - a.amount);

  let conicString = '';
  let startPercent = 0;
  pieData.forEach(item => {
    const percent = (item.amount / totalExpense) * 100;
    conicString += `${item.color} ${startPercent}% ${startPercent + percent}%, `;
    startPercent += percent;
  });
  conicString = conicString.slice(0, -2); 

  let currentAngle = 0;
  const labelsData = pieData.map(item => {
    const percent = (item.amount / totalExpense) * 100;
    const sliceAngle = (percent / 100) * 360;
    const middleAngle = currentAngle + (sliceAngle / 2);
    currentAngle += sliceAngle;
    const rad = (middleAngle - 90) * (Math.PI / 180);
    const radius = 68; 
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    return { ...item, percent, x, y };
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <p className="text-gray-400 text-sm font-medium mb-1">Arus Kas Kotor (Bulan Ini)</p>
        <h2 className="text-3xl font-bold mb-6">{formatRp(balance)}</h2>
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1 text-green-400"><TrendingUp size={16} /><span className="text-xs font-semibold">Uang Masuk</span></div>
            <p className="text-sm font-bold">{formatRp(totalIncome)}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1 text-red-400"><TrendingDown size={16} /><span className="text-xs font-semibold">Uang Keluar</span></div>
            <p className="text-sm font-bold">{formatRp(totalExpense)}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-5 border border-orange-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-orange-500" size={20} /> 
          Analisis Laba Rugi
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Pendapatan Jualan</span>
            <span className="font-bold text-gray-800">{formatRp(pendapatanMurni)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">HPP (Bahan & Kemasan)</span>
            <span className="font-bold text-red-500">-{formatRp(hpp)}</span>
          </div>
          <div className="border-t border-orange-200/50 pt-2 flex justify-between items-center">
            <span className="font-bold text-gray-700 text-sm">Laba Kotor</span>
            <span className="font-black text-gray-800">{formatRp(labaKotor)}</span>
          </div>
          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-gray-600">Biaya Operasional (Gaji, dll)</span>
            <span className="font-bold text-red-500">-{formatRp(operasional)}</span>
          </div>
          <div className="border-t border-orange-200/50 pt-3 flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm">
            <span className="font-bold text-orange-600">Laba Bersih</span>
            <span className={`font-black text-lg ${labaBersih >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRp(labaBersih)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Pengeluaran Terbesar</h3>
        {totalExpense === 0 ? (
          <p className="text-sm text-center text-gray-400 py-4">Belum ada pengeluaran bulan ini.</p>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40 rounded-full mb-6 shadow-inner" style={{ background: `conic-gradient(${conicString})` }}>
               <div className="absolute inset-0 m-auto w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center flex-col z-10">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Total Cost</span>
                  <span className="text-sm font-bold text-gray-800">{formatRp(totalExpense).replace(',00', '')}</span>
               </div>
               {labelsData.map(item => {
                 if (item.percent < 4) return null; 
                 return (
                   <div key={item.id} className="absolute w-8 h-8 flex items-center justify-center z-20 pointer-events-none" style={{ left: `calc(50% + ${item.x}px - 16px)`, top: `calc(50% + ${item.y}px - 16px)` }}>
                     <span className="bg-white/95 backdrop-blur-md text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm border border-gray-100" style={{ color: item.color }}>{item.percent.toFixed(0)}%</span>
                   </div>
                 )
               })}
            </div>
            <div className="w-full space-y-2">
              {pieData.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-600">{item.label}</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatRp(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- TAB: TAMBAH TRANSAKSI ---
function AddTransactionTab({ onSave, subcategories, onUpdateSubs }) {
  const [type, setType] = useState('expense');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSub, setSelectedSub] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [txDate, setTxDate] = useState(getLocalDatetimeLocal()); // State Waktu Transaksi (Bisa diedit)
  
  const [isEditingSubs, setIsEditingSubs] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const currentSubs = selectedCategory ? (subcategories[selectedCategory.id] || []) : [];

  useEffect(() => { setSelectedSub(''); setIsEditingSubs(false); }, [selectedCategory]);
  useEffect(() => { 
    setSelectedCategory(null); 
    setSelectedSub(''); 
    setIsEditingSubs(false); 
    setTxDate(getLocalDatetimeLocal()); // Reset ke waktu sekarang tiap ganti tipe
  }, [type]);

  const handleAmountChange = (e) => setAmount(e.target.value.replace(/[^0-9]/g, ''));
  const isFormValid = selectedCategory && amount && Number(amount) > 0 && (currentSubs.length === 0 || selectedSub !== '') && txDate;

  const handleSubmit = () => {
    if (!isFormValid) return;
    onSave({ 
      type, 
      category: selectedCategory.label, 
      categoryId: selectedCategory.id, 
      subcategory: selectedSub, 
      amount: Number(amount), 
      note,
      date: new Date(txDate).toISOString() // Kirim waktu yang dipilih user
    });
    setAmount(''); setNote(''); setTxDate(getLocalDatetimeLocal());
  };

  const handleAddSub = () => {
    if (!newSubName.trim()) return;
    onUpdateSubs(selectedCategory.id, [...currentSubs, newSubName.trim()]);
    setNewSubName('');
  };

  const handleDeleteSub = (subToRemove) => {
    onUpdateSubs(selectedCategory.id, currentSubs.filter(s => s !== subToRemove));
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex bg-gray-200 p-1 rounded-2xl mb-6">
        <button onClick={() => setType('expense')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Pengeluaran</button>
        <button onClick={() => setType('income')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Pemasukan</button>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-500 mb-3 ml-1 uppercase tracking-wider">1. Pilih Pos</h3>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat) => {
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat)} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${isSelected ? `ring-2 ring-offset-2 ${type==='expense'?'ring-red-500 bg-red-50':'ring-green-500 bg-green-50'}` : 'bg-white border shadow-sm'}`}>
                <div className={`p-2.5 rounded-full mb-2 ${cat.color} ${isSelected ? 'scale-110 shadow-sm' : ''}`}><cat.icon size={22} strokeWidth={isSelected ? 2.5 : 2} /></div>
                <span className={`text-[10px] text-center leading-tight font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedCategory && (
        <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-200 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Detail {selectedCategory.label}</h3>
            <button onClick={() => setIsEditingSubs(!isEditingSubs)} className="text-xs flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              {isEditingSubs ? 'Selesai' : <><Edit2 size={12}/> Edit</>}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentSubs.map((sub) => (
              <div key={sub} className="relative group">
                <button onClick={() => !isEditingSubs && setSelectedSub(sub)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${selectedSub === sub && !isEditingSubs ? `border-transparent text-white ${type === 'expense' ? 'bg-red-500' : 'bg-green-500'}` : 'bg-white text-gray-600 hover:bg-gray-100'} ${isEditingSubs ? 'pr-8 border-dashed' : ''}`}>
                  {sub}
                </button>
                {isEditingSubs && (
                  <button onClick={() => handleDeleteSub(sub)} className="absolute right-1 top-1/2 -translate-y-1/2 bg-red-100 text-red-600 p-1 rounded-full hover:bg-red-200"><X size={14} /></button>
                )}
              </div>
            ))}
          </div>
          {isEditingSubs && (
            <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-1">
              <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Nama sub baru..." className="flex-1 text-sm p-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={handleAddSub} className="bg-blue-600 text-white p-2 rounded-xl flex items-center justify-center"><Plus size={18} /></button>
            </div>
          )}
        </div>
      )}

      <div className={`transition-all duration-500 ${selectedCategory ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4'}`}>
        <div className="bg-white p-5 rounded-3xl border shadow-sm mb-6 space-y-4">
          
          {/* Kolom Input Nominal */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Jumlah (Rp)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">Rp</span>
              <input type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString('id-ID') : ''} onChange={handleAmountChange} placeholder="0" className={`w-full text-right text-3xl font-bold p-4 pl-12 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 ${type === 'expense' ? 'focus:ring-red-400 text-red-600' : 'focus:ring-green-400 text-green-600'}`} />
            </div>
          </div>
          
          {/* FITUR BARU: Kolom Waktu (Bisa diedit manual/mundur) */}
          <div className="pt-2">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Waktu Transaksi</label>
             <input 
               type="datetime-local" 
               value={txDate}
               onChange={(e) => setTxDate(e.target.value)}
               className="w-full p-4 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 border border-transparent text-sm font-medium text-gray-700" 
             />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Catatan</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Pembelian ayam 5kg" className="w-full p-4 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 border border-transparent text-sm" />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!isFormValid} className={`w-full py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2 transition-all ${isFormValid ? `text-white shadow-lg ${type === 'expense' ? 'bg-red-500' : 'bg-green-500'}` : 'bg-gray-200 text-gray-400'}`}><CheckCircle2 size={24} /> Simpan Transaksi</button>
      </div>
    </div>
  );
}

// --- TAB: RIWAYAT BULANAN ---
function HistoryTab({ transactions, onEditClick, viewMonth, setViewMonth }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState(''); // State untuk filter kalender 'YYYY-MM-DD'

  const monthsList = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
    const labelStr = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    return { str: monthStr, label: i === 0 ? 'Bulan Ini' : labelStr };
  });

  // Handle pergantian tanggal dari kalender
  const handleFilterDateChange = (e) => {
    const val = e.target.value; // Format: 'YYYY-MM-DD'
    setFilterDate(val);
    
    // Kalau user pilih tanggal, otomatis ganti "laci" viewMonth ke bulan tersebut
    if (val) {
      const [year, month] = val.split('-');
      setViewMonth(`${year}_${month}`);
    }
  };

  // Filter gabungan: Pencarian Teks & Filter Tanggal Spesifik
  const searchedTxs = transactions.filter(tx => {
    let matchSearch = true;
    let matchDate = true;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matchSearch = tx.category?.toLowerCase().includes(query) ||
                    tx.subcategory?.toLowerCase().includes(query) ||
                    tx.note?.toLowerCase().includes(query);
    }

    if (filterDate) {
      // Ambil YYYY-MM-DD sesuai zona waktu lokal HP pengguna
      const d = new Date(tx.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const txDateStr = `${yyyy}-${mm}-${dd}`;
      
      matchDate = (txDateStr === filterDate);
    }

    return matchSearch && matchDate;
  });

  const groupedTxs = searchedTxs.reduce((groups, tx) => {
    const d = new Date(tx.date);
    const dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    
    if (!groups[dateStr]) {
      groups[dateStr] = { dateStr, dateObj: d, txs: [], dailyIncome: 0, dailyExpense: 0 };
    }
    groups[dateStr].txs.push(tx);
    if (tx.type === 'income') groups[dateStr].dailyIncome += tx.amount;
    else groups[dateStr].dailyExpense += tx.amount;
    return groups;
  }, {});

  const sortedDates = Object.values(groupedTxs).sort((a, b) => b.dateObj - a.dateObj);
  sortedDates.forEach(group => group.txs.sort((a, b) => new Date(b.date) - new Date(a.date)));

  const monthIncome = searchedTxs.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const monthExpense = searchedTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-4 pb-10 animate-in fade-in slide-in-from-left-4 duration-300">
      
      <div className="px-1 mb-2">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Riwayat Transaksi</h2>
        
        {/* Kolom Pencarian & Kalender Filter sejajar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-2xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm transition-all shadow-sm"
              placeholder="Cari transaksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"><X size={16} /></button>
            )}
          </div>
          
          {/* FITUR BARU: Tombol Kalender / Filter Tanggal */}
          <div className="relative">
            <input 
              type="date" 
              value={filterDate}
              onChange={handleFilterDateChange}
              className={`block w-12 opacity-0 absolute inset-0 z-10 cursor-pointer ${filterDate ? 'w-full' : ''}`}
              title="Pilih tanggal spesifik"
            />
            <div className={`h-full flex items-center justify-center px-4 rounded-2xl border transition-all shadow-sm ${filterDate ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {filterDate ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{filterDate.split('-')[2]}/{filterDate.split('-')[1]}</span>
                  <button onClick={(e) => { e.preventDefault(); setFilterDate(''); }} className="z-20 p-1 hover:bg-orange-100 rounded-full"><X size={14}/></button>
                </div>
              ) : (
                <Calendar size={20} />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Scrollable Month Selector - Disembunyikan kalau lagi cari pakai kalender biar ga bingung */}
      {!searchQuery && !filterDate && (
        <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden">
          {monthsList.map((month) => {
            const isSelected = month.str === viewMonth;
            return (
              <button 
                key={month.str} 
                onClick={() => setViewMonth(month.str)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                  isSelected ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {month.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
         <div>
           <p className="text-xs text-gray-500 font-medium mb-1">Total Pemasukan</p>
           <p className="text-sm font-bold text-green-600">{formatRp(monthIncome)}</p>
         </div>
         <div className="h-8 w-px bg-gray-200 mx-4"></div>
         <div className="text-right">
           <p className="text-xs text-gray-500 font-medium mb-1">Total Pengeluaran</p>
           <p className="text-sm font-bold text-red-600">{formatRp(monthExpense)}</p>
         </div>
      </div>

      <div className="space-y-6 mt-2">
        {sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            <CalendarDays size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Transaksi tidak ditemukan.</p>
          </div>
        ) : (
          sortedDates.map((group) => (
            <div key={group.dateStr} className="animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-end mb-2 px-1">
                <h3 className="font-bold text-gray-700 text-sm">{group.dateStr}</h3>
                <div className="flex gap-2 text-[10px] font-bold">
                   {group.dailyIncome > 0 && <span className="text-green-500 bg-green-50 px-2 py-0.5 rounded-md">+{formatRp(group.dailyIncome)}</span>}
                   {group.dailyExpense > 0 && <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-md">-{formatRp(group.dailyExpense)}</span>}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {group.txs.map((tx) => {
                  const isExpense = tx.type === 'expense';
                  const dateObj = new Date(tx.date);
                  const timeString = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={tx.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-full flex-shrink-0 ${isExpense ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                          {isExpense ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-gray-800 text-sm truncate">{tx.subcategory || tx.category}</p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">{tx.category} • {timeString}</p>
                          {tx.note && <p className="text-[11px] text-gray-400 truncate mt-0.5">"{tx.note}"</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 gap-1">
                        <p className={`font-bold text-sm ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                          {isExpense ? '-' : '+'}{formatRp(tx.amount)}
                        </p>
                        <button onClick={() => onEditClick(tx)} className="text-[10px] flex items-center gap-1 font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                          <Edit2 size={10} /> Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- MODAL: EDIT TRANSAKSI ---
function EditTransactionModal({ tx, onClose, onSave, onDelete }) {
  const [amount, setAmount] = useState(tx.amount.toString());
  const [note, setNote] = useState(tx.note || '');
  const [txDate, setTxDate] = useState(getLocalDatetimeLocal(tx.date)); // Tambah state tanggal

  const handleAmountChange = (e) => setAmount(e.target.value.replace(/[^0-9]/g, ''));
  const isFormValid = amount && Number(amount) > 0 && txDate;

  const handleSave = () => {
    if (!isFormValid) return;
    onSave({ ...tx, amount: Number(amount), note, date: new Date(txDate).toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">Edit Transaksi</h3>
            <p className="text-xs text-gray-500">{tx.subcategory || tx.category}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Jumlah (Rp)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">Rp</span>
              <input type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString('id-ID') : ''} onChange={handleAmountChange} className={`w-full text-right text-3xl font-bold p-3 pl-12 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 ${tx.type === 'expense' ? 'focus:ring-red-400 text-red-600' : 'focus:ring-green-400 text-green-600'}`} />
            </div>
          </div>

          {/* Kolom edit tanggal */}
          <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Waktu Transaksi</label>
             <input 
               type="datetime-local" 
               value={txDate}
               onChange={(e) => setTxDate(e.target.value)}
               className="w-full p-3 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 border border-transparent text-sm font-medium" 
             />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Catatan Tambahan</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan..." className="w-full p-3 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 border border-transparent text-sm" />
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button onClick={() => onDelete(tx.id)} className="flex-1 py-3 rounded-xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex justify-center items-center gap-2">
            <Trash2 size={16} /> Hapus
          </button>
          <button onClick={handleSave} disabled={!isFormValid} className={`flex-[2] py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${isFormValid ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30' : 'bg-gray-200 text-gray-400'}`}>
            <CheckCircle2 size={18} /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon, label, isActive, onClick, isPrimary }) {
  if (isPrimary) return (
    <button onClick={onClick} className="relative -top-5 flex flex-col items-center justify-center active:scale-95 transition-transform">
      <div className={`p-4 rounded-full text-white shadow-lg ${isActive ? 'bg-orange-600 shadow-orange-500/40' : 'bg-orange-500'}`}>{icon}</div>
      <span className="text-[10px] font-bold text-orange-600 mt-1">{label}</span>
    </button>
  );
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 active:scale-90 transition-all ${isActive ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
      <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>{icon}</div>
      <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}