import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, BookOpen, Search, CheckCircle2, Loader2, Plus, X, PlusCircle, Trash2, AlertTriangle, Layers, Package, Sliders, Users, Shield, Clock, Calendar } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocaleStore } from "@/store/useLocaleStore";
import { Crown, User, Activity } from "lucide-react";
import { History, ArrowRightCircle } from "lucide-react";
import { UploadCloud } from "lucide-react";


interface Transaction {
  id: string; member_id: string; book_id: string; borrow_date: number; due_date: number; title: string; author: string; member_name: string;
}

interface Book {
  id: string; title: string; author: string; isbn: string; stock: number; cover_url?: string; description?: string;
}

interface SystemMember {
  id: string; full_name: string; identity_number: string; role: string; join_date: number; is_active: number;
}
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { lang, t, setLanguage } = useLocaleStore(); 
  
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // STATE KATEGORI / FILTER BARU
  const [activeFilter, setActiveFilter] = useState<"All" | "Available" | "Out of Stock">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"books" | "users" | "borrowed">("books");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [systemMembers, setSystemMembers] = useState<SystemMember[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [newBook, setNewBook] = useState({ title: "", author: "", isbn: "", stock: "1", description: "", cover_url: "" });
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [memberToDelete, setMemberToDelete] = useState<SystemMember | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  const [borrowBookTarget, setBorrowBookTarget] = useState<Book | null>(null);
  const [borrowAmount, setBorrowAmount] = useState("1");
  const [borrowUnit, setBorrowUnit] = useState<"hours" | "days">("days");

  const API_URL = "https://library-worker.librarysystem.workers.dev/api";

  const confirmDeleteMember = async () => {
    if (!memberToDelete || !user) return;
    setIsDeletingMember(true);
    try {
      const response = await fetch(`${API_URL}/members/${memberToDelete.id}?admin_id=${user.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus pengguna");
      
      setSystemMembers(systemMembers.filter(m => m.id !== memberToDelete.id));
      showToast(lang === "id" ? "Pengguna berhasil dihapus permanen!" : "User deleted permanently!");
    } catch (error: any) { showToast(error.message); } 
    finally { setIsDeletingMember(false); setMemberToDelete(null); }
  };

  const fetchBooks = async () => {
    try {
      const response = await fetch(`${API_URL}/books`);
      const data = await response.json();
      if (data.success && Array.isArray(data.books)) setBooks(data.books);
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`${API_URL}/members`);
      const data = await response.json();
      if (data.success) setSystemMembers(data.members);
    } catch (error) { console.error(error); }
    finally { setIsLoadingUsers(false); }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    setIsLoadingTransactions(true);
    try {
      const url = user.role === 'admin' 
        ? `${API_URL}/transactions?role=admin` 
        : `${API_URL}/transactions?member_id=${user.id}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) setTransactions(data.transactions);
    } catch (error) { console.error(error); }
    finally { setIsLoadingTransactions(false); }
  };

  const handleReturnBook = async (transactionId: string) => {
    setProcessingId(transactionId);
    try {
      const response = await fetch(`${API_URL}/transactions/${transactionId}/return`, { method: "PUT" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to return book");
      
      setTransactions(transactions.filter(t => t.id !== transactionId));
      fetchBooks();
      showToast(lang === "id" ? "Buku sukses dikembalikan!" : "Book returned successfully!");
    } catch (error: any) { showToast(error.message); } 
    finally { setProcessingId(null); }
  };

  const getStatusProps = (dueDateSec: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = dueDateSec - now;
    if (diff < 0) return { color: "bg-red-50 text-red-600 border-red-200 shadow-red-100", icon: <AlertTriangle className="w-3 h-3"/>, label: t("overdue") };
    if (diff < 86400) return { color: "bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100", icon: <Clock className="w-3 h-3"/>, label: `${t("dueIn")} ${Math.floor(diff / 3600)} ${t("hours")}` };
    return { color: "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100", icon: <CheckCircle2 className="w-3 h-3"/>, label: `${t("dueIn")} ${Math.floor(diff / 86400)} ${t("days")}` };
  };

  const toggleMemberRole = async (memberId: string, currentRole: string) => {
    if (!user || user.role !== "admin") return;
    setIsUpdatingRole(memberId);
    try {
      const newRole = currentRole === "admin" ? "member" : "admin";
      const response = await fetch(`${API_URL}/members/${memberId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole, admin_id: user.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setSystemMembers(systemMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      showToast(lang === "id" ? `Sukses: Diubah menjadi ${newRole.toUpperCase()}` : `Success: Promoted to ${newRole.toUpperCase()}`);
    } catch (error: any) { showToast(error.message); } 
    finally { setIsUpdatingRole(null); }
  };

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchBooks();
    fetchTransactions();
    if (user.role === "admin") fetchUsers();
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate("/"); };

  const submitBorrow = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !borrowBookTarget) return;
    setProcessingId(borrowBookTarget.id);
    try {
      const response = await fetch(`${API_URL}/borrow`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          member_id: user.id, 
          book_id: borrowBookTarget.id,
          duration_amount: Number(borrowAmount),
          duration_unit: borrowUnit
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process transaction");
      
      setBooks(books.map(b => b.id === borrowBookTarget.id ? { ...b, stock: b.stock - 1 } : b));
      showToast(lang === "id" ? "Buku berhasil dipinjam!" : "Book borrowed successfully!");
      setBorrowBookTarget(null);
      setBorrowAmount("1");
      setBorrowUnit("days");
    } catch (error: any) { 
      if(error.message.includes("FOREIGN KEY") || error.message.includes("Internal")) {
        showToast("Error: Invalid User Session. Please re-register.");
      } else {
        showToast(error.message); 
      }
    } 
    finally { setProcessingId(null); }
  };

  // AWAL PERUBAHAN: Pastikan hanya ada 2 fungsi ini (hapus handleAddBook yang lama)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      // Kirim ke Backend kita sendiri, BUKAN ke ImgBB langsung
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Image upload failed");
      
      setUploadedImageUrl(data.url);
      setNewBook({ ...newBook, cover_url: data.url });
    } catch (error: any) {
      showToast(error.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddBook = async (e: FormEvent) => {
    e.preventDefault(); 
    setIsAdding(true);
    try {
      const bookData = { ...newBook, cover_url: uploadedImageUrl };
      const response = await fetch(`${API_URL}/books`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(bookData)
      });
      if (!response.ok) throw new Error((await response.json()).error);
      showToast(lang === "id" ? "Buku sukses ditambahkan!" : "New book added!");
      setIsDrawerOpen(false); 
      setNewBook({ title: "", author: "", isbn: "", stock: "1", description: "", cover_url: "" }); 
      setUploadedImageUrl("");
      fetchBooks(); 
    } catch (error: any) { 
      showToast(error.message); 
    } finally { 
      setIsAdding(false); 
    }
  };
// BATAS PERUBAHAN

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/books/${bookToDelete.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Deletion failed");
      setBooks(books.filter(b => b.id !== bookToDelete.id));
      showToast(lang === "id" ? "Buku dihapus permanen!" : "Book deleted permanently!");
    } catch (error: any) { showToast(error.message); } finally { setIsDeleting(false); setBookToDelete(null); }
  };

  const showToast = (message: string) => {
    setToastMessage(message); setTimeout(() => setToastMessage(null), 4000);
  };

  // GENERATOR GRADASI SAMPUL BUKU (AESTHETIC)
  const getGradient = (id: string) => {
    const gradients = [
      "from-orange-100 to-rose-200 text-rose-600",
      "from-cyan-100 to-blue-200 text-blue-600",
      "from-emerald-100 to-teal-200 text-teal-600",
      "from-fuchsia-100 to-purple-200 text-purple-600",
      "from-amber-100 to-orange-200 text-orange-600"
    ];
    const index = id.charCodeAt(id.length - 1) % gradients.length;
    return gradients[index];
  };

  const filteredBooks = books.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === "All" ? true : activeFilter === "Available" ? b.stock > 0 : b.stock === 0;
    return matchSearch && matchFilter;
  });

  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-[#F5F5F7] pb-24 relative overflow-x-hidden">
      
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/20 sticky top-0 z-20 px-4 py-3 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-2xl flex items-center justify-center text-white font-black text-sm uppercase shadow-md">{user?.full_name?.charAt(0) || "M"}</div>
          <div>
            <h1 className="text-sm font-extrabold text-gray-900 leading-tight">{user?.full_name || "Member"}</h1>
            <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">ID: {user?.identity_number?.slice(0, 8) || "0000"}***</p>
          </div>
          
          {user?.role === "admin" && (
            <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center gap-1 border border-blue-200">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex bg-gray-100 p-1 rounded-xl items-center mr-4">
            <button onClick={() => setViewMode("books")} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${viewMode === 'books' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}>{t("catalog")}</button>
            <button onClick={() => {setViewMode("borrowed"); fetchTransactions();}} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'borrowed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}><History className="w-3 h-3"/> {user?.role === "admin" ? t("allBorrows") : t("myBorrows")}</button>
            {user?.role === "admin" && (
              <button onClick={() => setViewMode("users")} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}><Users className="w-3 h-3"/> Pengguna</button>
            )}
          </div>
          
          <div className="bg-gray-200/50 p-1 rounded-xl flex items-center gap-1 mr-2">
            <button onClick={() => setLanguage('en')} className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>EN</button>
            <button onClick={() => setLanguage('id')} className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${lang === 'id' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>ID</button>
          </div>
          <button onClick={handleLogout} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6">
        
        <div className="flex sm:hidden bg-gray-100 p-1 rounded-xl items-center mb-6 w-full shadow-inner overflow-x-auto scrollbar-hide">
          <button onClick={() => setViewMode("books")} className={`flex-1 min-w-[100px] py-2 text-[11px] font-black rounded-lg transition-all ${viewMode === 'books' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>{t("catalog")}</button>
          <button onClick={() => {setViewMode("borrowed"); fetchTransactions();}} className={`flex-1 min-w-[120px] py-2 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1 ${viewMode === 'borrowed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}><History className="w-3 h-3"/> {user?.role === "admin" ? t("allBorrows") : t("myBorrows")}</button>
          {user?.role === "admin" && (
            <button onClick={() => setViewMode("users")} className={`flex-1 min-w-[100px] py-2 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1 ${viewMode === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}><Users className="w-3 h-3"/> Pengguna</button>
          )}
        </div>

        <AnimatePresence mode="wait">
          
          {viewMode === "books" && (
            <motion.div key="books-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <Layers className="w-10 h-10 text-gray-50 absolute -right-2 -bottom-2" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("statsCatalog")}</span>
                  <span className="text-2xl font-black text-gray-900 mt-1">{isLoading ? "-" : books.length}</span>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <Package className="w-10 h-10 text-gray-50 absolute -right-2 -bottom-2" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("statsAvailable")}</span>
                  <span className="text-2xl font-black text-green-600 mt-1">{isLoading ? "-" : books.reduce((a, b) => a + b.stock, 0)}</span>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <Sliders className="w-10 h-10 text-gray-50 absolute -right-2 -bottom-2" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("statsOut")}</span>
                  <span className="text-2xl font-black text-red-500 mt-1">{isLoading ? "-" : books.filter(b => b.stock === 0).length}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-white p-1.5 rounded-[1.2rem] border border-gray-100 shadow-sm w-full sm:w-auto relative">
                  {["All", "Available", "Out of Stock"].map((filter) => (
                    <button 
                      key={filter} 
                      onClick={() => setActiveFilter(filter as any)}
                      className={`relative flex-1 sm:flex-none px-5 py-2.5 text-xs font-black transition-colors whitespace-nowrap z-10 ${activeFilter === filter ? "text-white" : "text-gray-400 hover:text-gray-900"}`}
                    >
                      {activeFilter === filter && (
                        <motion.div
                          layoutId="active-filter-tab"
                          className="absolute inset-0 bg-gray-900 rounded-xl shadow-md -z-10"
                          transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                        />
                      )}
                      {filter === "All" ? t("catalog") : filter === "Available" ? t("available") : t("outOfStock")}
                    </button>
                  ))}
                </div>
                
                <div className="relative w-full sm:w-auto shrink-0">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("search")} className="pl-11 pr-4 py-2.5 bg-white border border-gray-100 rounded-[1.2rem] text-xs font-bold focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100 w-full sm:w-[220px] shadow-sm transition-all" />
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /></div>
              ) : filteredBooks.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                  <p className="text-gray-400 font-bold text-sm">Tidak ada buku di kategori ini.</p>
                </div>
              ) : (
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  <AnimatePresence mode="popLayout">
                    {filteredBooks.map((book) => (
                      <motion.div 
                        layout 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.8 }} 
                        transition={{ type: "tween", duration: 0.3, ease: "easeOut" }} 
                        key={book.id} 
                        className="bg-white p-2.5 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col group relative cursor-pointer active:scale-95 transition-transform origin-center"
                        onClick={() => setSelectedBook(book)}
                      >
                        <motion.div layoutId={`cover-container-${book.id}`} className={`w-full h-48 sm:h-56 rounded-[1.5rem] p-4 flex flex-col justify-between relative overflow-hidden ${!book.cover_url ? `bg-gradient-to-br ${getGradient(book.id)}` : 'bg-gray-100'}`}>
                          {book.cover_url && (
                            <motion.img layoutId={`cover-image-${book.id}`} src={book.cover_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
                          )}
                          {!book.cover_url && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/40 to-transparent rounded-full -mr-10 -mt-10"></div>
                          )}
                          <div className="relative z-10 flex justify-between items-start w-full">
                            {!book.cover_url && <div className="bg-white/80 w-fit p-2.5 rounded-xl text-current"><BookOpen className="w-5 h-5" /></div>}
                            <span className="font-black text-[10px] bg-white/95 px-3 py-1.5 rounded-full w-fit text-gray-900 shadow-sm ml-auto border border-gray-100">
                              {book.stock} {t("left")}
                            </span>
                          </div>
                        </motion.div>

                        <div className="px-3 pt-4 pb-2 flex-1 flex flex-col">
                          <h3 className="font-extrabold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">{book.title}</h3>
                          <p className="text-[11px] font-bold text-gray-400 flex-1">{book.author}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {viewMode === "users" && (
            <motion.div key="users-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total User</p>
                    <p className="text-xl font-black text-gray-900">{isLoadingUsers ? "-" : systemMembers.length}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin</p>
                    <p className="text-xl font-black text-gray-900">{isLoadingUsers ? "-" : systemMembers.filter(m => m.role === 'admin').length}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 items-center gap-4 shadow-sm hidden sm:flex">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</p>
                    <p className="text-xl font-black text-gray-900">{isLoadingUsers ? "-" : systemMembers.filter(m => m.role === 'member').length}</p>
                  </div>
                </div>
              </div>

              {isLoadingUsers ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /></div>
              ) : (
                <motion.div layout className="space-y-3">
                  <AnimatePresence>
                    {systemMembers.map((member, index) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        key={member.id}
                        className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg uppercase shadow-md shrink-0 ${member.role === 'admin' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-gray-700 to-gray-900'}`}>
                            {member.full_name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-sm text-gray-900 line-clamp-1">{member.full_name}</span>
                            <span className="text-[11px] font-bold text-gray-400 font-mono mt-0.5">NIK: {member.identity_number}</span>
                          </div>
                        </div>

                        <div className="flex flex-row items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t border-gray-50 sm:border-t-0 pt-4 sm:pt-0">
                          <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 mr-2 ${member.role === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            {member.role === 'admin' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {member.role}
                          </div>
                          
                          {member.id !== user?.id && (
                            <button onClick={() => setMemberToDelete(member)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleMemberRole(member.id, member.role)}
                            disabled={isUpdatingRole === member.id || member.id === user?.id}
                            className={`text-xs font-black px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center min-w-[130px] shrink-0 ${member.id === user?.id ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : member.role === 'admin' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900' : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/20'}`}
                          >
                            {isUpdatingRole === member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : member.role === 'admin' ? (
                              'Jadikan Member'
                            ) : (
                              'Jadikan Admin'
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {viewMode === "borrowed" && (
            <motion.div key="borrowed-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              {isLoadingTransactions ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /></div>
              ) : transactions.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-center py-24 bg-white border border-gray-100 rounded-[2rem] shadow-sm flex flex-col items-center justify-center min-h-[350px]"
                >
                  <motion.div 
                    animate={{ y: [0, -8, 0] }} 
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-5 shadow-inner"
                  >
                    <History className="w-10 h-10 text-gray-300" />
                  </motion.div>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-1">Daftar Kosong</h3>
                  <p className="text-xs font-bold text-gray-400 max-w-[250px] leading-relaxed">{t("noBorrows")}</p>
                </motion.div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <AnimatePresence mode="popLayout">
                    {transactions.map((tr, index) => {
                      const status = getStatusProps(tr.due_date);
                      return (
                        <motion.div 
                          layout="position"
                          initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                          animate={{ opacity: 1, scale: 1, y: 0 }} 
                          exit={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }} 
                          transition={{ 
                            duration: 0.3, 
                            delay: Math.min(index * 0.04, 0.4),
                            layout: { type: "spring", stiffness: 400, damping: 30 }
                          }} 
                          key={tr.id} 
                          className="bg-white p-3.5 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-3 sm:gap-4 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:border-gray-200 transition-shadow group origin-center"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[0.8rem] sm:rounded-2xl flex items-center justify-center shrink-0 ${status.color.replace('border-', '').replace('shadow-', '').replace('border', '')}`}>
                                {status.icon}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                                <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm truncate leading-tight mb-0.5">{tr.title}</h3>
                                <p className="text-[9px] sm:text-[11px] font-bold text-gray-400 truncate">{tr.author}</p>
                              </div>
                            </div>
                            <div className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm border shrink-0 ${status.color} whitespace-nowrap`}>
                              {status.icon} <span>{status.label}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-50 pt-3">
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
                              {user.role === 'admin' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md text-[9px] sm:text-[10px] font-black text-gray-600 uppercase tracking-wide border border-gray-100 w-max">
                                  <User className="w-2.5 h-2.5" /> {tr.member_name}
                                </span>
                              )}
                              <span className="text-[9px] sm:text-[10px] font-black text-gray-400 flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md w-max">
                                <Calendar className="w-2.5 h-2.5" /> 
                                <span className="uppercase tracking-widest">Pinjam:</span> 
                                {new Date(tr.borrow_date * 1000).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <motion.button 
                              whileTap={{ scale: 0.95 }} 
                              onClick={() => handleReturnBook(tr.id)} 
                              disabled={processingId === tr.id} 
                              className="text-[10px] sm:text-xs font-black px-4 py-2.5 bg-gray-900 text-white rounded-lg sm:rounded-xl hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-gray-900/10 disabled:opacity-50 w-full sm:w-auto shrink-0"
                            >
                              {processingId === tr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ArrowRightCircle className="w-3.5 h-3.5" /> {t("returnBook")}</>}
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* POP-UP KONFIRMASI HAPUS (ANTI-TERPOTONG DI HP) */}
      <AnimatePresence>
        {memberToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMemberToDelete(null)} className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl shadow-2xl p-6 w-[calc(100%-2rem)] max-w-[320px] relative z-10 mx-auto text-center border border-gray-100">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4 mx-auto"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
              <h3 className="text-base font-black text-gray-900 mb-1">{lang === "id" ? "Hapus Pengguna" : "Delete User"}</h3>
              <p className="text-xs font-bold text-gray-400 mb-6 leading-relaxed">
                {lang === "id" ? "Anda yakin ingin menghapus" : "Are you sure to remove"} <span className="text-gray-900 font-extrabold">"{memberToDelete.full_name}"</span>? {lang === "id" ? "Tindakan ini tidak bisa dibatalkan." : "This action cannot be undone."}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setMemberToDelete(null)} className="flex-1 py-3 bg-gray-100 text-gray-900 text-xs font-black rounded-xl hover:bg-gray-200 transition-colors">{t("cancel")}</button>
                <button onClick={confirmDeleteMember} disabled={isDeletingMember} className="flex-1 py-3 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 transition-colors flex justify-center items-center">
                  {isDeletingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : t("delete")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {bookToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBookToDelete(null)} className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl shadow-2xl p-6 w-[calc(100%-2rem)] max-w-[320px] relative z-10 mx-auto text-center border border-gray-100">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4 mx-auto"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
              <h3 className="text-base font-black text-gray-900 mb-1">{t("deleteTitle")}</h3>
              <p className="text-xs font-bold text-gray-400 mb-6 leading-relaxed">Are you sure to remove <span className="text-gray-900 font-extrabold">"{bookToDelete.title}"</span>? {t("deleteDesc")}</p>
              <div className="flex gap-2">
                <button onClick={() => setBookToDelete(null)} className="flex-1 py-3 bg-gray-100 text-gray-900 text-xs font-black rounded-xl hover:bg-gray-200 transition-colors">{t("cancel")}</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-3 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 transition-colors flex justify-center items-center">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("delete")}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOMBOL TAMBAH BUKU MELAYANG */}
      {user?.role === "admin" && viewMode === "books" && (
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDrawerOpen(true)} className="fixed bottom-6 right-6 p-4 bg-gray-900 text-white rounded-[1.2rem] shadow-xl shadow-gray-900/30 z-30"><Plus className="w-6 h-6" /></motion.button>
      )}

      {/* DRAWER FORM TAMBAH BUKU */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26, stiffness: 260 }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] p-6 z-50 max-w-sm mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2"><PlusCircle className="w-5 h-5"/> {t("addTitle")}</h3>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-4 h-4"/></button>
              </div>
              <form onSubmit={handleAddBook} className="space-y-3">
                <div className="flex flex-col items-center justify-center w-full mb-4">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden">
                    {uploadedImageUrl ? (
                      <img src={uploadedImageUrl} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : null}
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                      {isUploadingImage ? (
                        <Loader2 className="w-8 h-8 text-gray-900 animate-spin mb-2" />
                      ) : (
                        <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                      )}
                      <p className="text-xs font-bold text-gray-500">
                        {isUploadingImage ? t("uploading") : t("uploadCover")}
                      </p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                  </label>
                </div>

                <input type="text" required value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" placeholder={t("bookTitle")} />
                <input type="text" required value={newBook.author} onChange={(e) => setNewBook({...newBook, author: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" placeholder={t("authorName")} />
                <input type="text" required value={newBook.isbn} onChange={(e) => setNewBook({...newBook, isbn: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" placeholder={t("isbn")} />
                <textarea rows={2} value={newBook.description} onChange={(e) => setNewBook({...newBook, description: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none resize-none" placeholder={t("description")}></textarea>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 ml-1">{t("stock")}</label>
                  <input type="number" required min="1" value={newBook.stock} onChange={(e) => setNewBook({...newBook, stock: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
                <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={isAdding || isUploadingImage} className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all mt-4 flex items-center justify-center shadow-lg shadow-gray-900/20">{isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : t("publish")}</motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {borrowBookTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBorrowBookTarget(null)} className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-[2rem] shadow-2xl p-6 w-[calc(100%-2rem)] max-w-[340px] relative z-10 mx-auto border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900"><Clock className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 leading-tight">{t("borrowSettings")}</h3>
                  <p className="text-[10px] font-bold text-gray-400 line-clamp-1">{borrowBookTarget.title}</p>
                </div>
              </div>
              
              <form onSubmit={submitBorrow} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 ml-1">{t("setDuration")}</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      value={borrowAmount} 
                      onChange={(e) => setBorrowAmount(e.target.value)} 
                      className="block w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none transition-all text-center" 
                    />
                    <div className="relative shrink-0 w-32">
                      <select 
                        value={borrowUnit} 
                        onChange={(e) => setBorrowUnit(e.target.value as "hours" | "days")} 
                        className="appearance-none w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none transition-all cursor-pointer"
                      >
                        <option value="hours">{t("hours")}</option>
                        <option value="days">{t("days")}</option>
                      </select>
                      <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button type="button" onClick={() => setBorrowBookTarget(null)} className="flex-1 py-3.5 bg-gray-100 text-gray-900 text-xs font-black rounded-xl hover:bg-gray-200 transition-colors">{t("cancel")}</button>
                  <button type="submit" disabled={processingId === borrowBookTarget.id} className="flex-[1.5] py-3.5 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-black transition-colors flex justify-center items-center shadow-lg shadow-gray-900/20">
                    {processingId === borrowBookTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t("confirmBorrow")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ERROR / SUCCESS NOTIFICATION (TOAST) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: 30, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 20, x: "-50%" }} className="fixed bottom-8 left-1/2 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold z-50 whitespace-nowrap">
            {toastMessage.includes("Error") ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4">
            {/* Background solid abu-abu, BUKAN backdrop-blur */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBook(null)} className="absolute inset-0 bg-gray-900/60" />
            
            <motion.div 
              layoutId={`cover-container-${selectedBook.id}`} 
              className="bg-white sm:rounded-[2.5rem] w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl relative z-10 mx-auto flex flex-col md:flex-row overflow-hidden shadow-2xl"
              transition={{ type: "tween", duration: 0.35, ease: [0.25, 1, 0.5, 1] }} // Custom kurva ease (sangat ringan)
            >
              {/* Tombol close tanpa blur */}
              <button onClick={() => setSelectedBook(null)} className="absolute top-4 right-4 z-20 p-3 bg-white hover:bg-gray-100 rounded-full text-gray-900 transition-colors shadow-md">
                <X className="w-5 h-5" />
              </button>

              <div className="w-full md:w-2/5 h-64 md:h-full min-h-[300px] relative bg-gray-100">
                {selectedBook.cover_url ? (
                  <motion.img layoutId={`cover-image-${selectedBook.id}`} src={selectedBook.cover_url} alt={selectedBook.title} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getGradient(selectedBook.id)} flex items-center justify-center`}>
                    <BookOpen className="w-20 h-20 text-white/50" />
                  </div>
                )}
              </div>

              {/* Trik Ilusi: Delay text agar browser tidak ngelag menghitung posisi kata (Layout Thrashing) */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.15, duration: 0.3 }}
                className="flex-1 p-6 sm:p-10 flex flex-col overflow-y-auto"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider rounded-lg">ISBN: {selectedBook.isbn}</span>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${selectedBook.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {selectedBook.stock > 0 ? t("available") : t("outOfStock")} ({selectedBook.stock})
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-gray-900 leading-tight mb-2">{selectedBook.title}</h2>
                <p className="text-sm font-bold text-gray-400 mb-8">{selectedBook.author}</p>

                <div className="mb-8">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">{t("aboutBook")}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {selectedBook.description || t("noDescription")}
                  </p>
                </div>

                <div className="mt-auto pt-6 flex items-center justify-between border-t border-gray-100">
                  {user?.role === "admin" && (
                    <button onClick={() => { setSelectedBook(null); setBookToDelete(selectedBook); }} className="p-3.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  
                  <button 
                    onClick={() => { setSelectedBook(null); setTimeout(() => setBorrowBookTarget(selectedBook), 300); }} 
                    disabled={selectedBook.stock === 0} 
                    className="ml-auto py-4 px-10 bg-gray-900 text-white text-sm font-black rounded-2xl hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-xl shadow-gray-900/20 disabled:shadow-none"
                  >
                    {t("borrow")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}