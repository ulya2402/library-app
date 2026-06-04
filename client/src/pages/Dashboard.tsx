import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, BookOpen, Search, CheckCircle2, Loader2, Plus, X, PlusCircle, Trash2, AlertTriangle, Layers, Package, Sliders } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocaleStore } from "@/store/useLocaleStore";

interface Book {
  id: string; title: string; author: string; isbn: string; stock: number;
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
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newBook, setNewBook] = useState({ title: "", author: "", isbn: "", stock: "1" });
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const API_URL = "https://library-worker.librarysystem.workers.dev/api";

  const fetchBooks = async () => {
    try {
      const response = await fetch(`${API_URL}/books`);
      const data = await response.json();
      if (data.success && Array.isArray(data.books)) setBooks(data.books);
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchBooks();
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate("/"); };

  const handleBorrow = async (bookId: string) => {
    if (!user) return;
    setProcessingId(bookId);
    try {
      const response = await fetch(`${API_URL}/borrow`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: user.id, book_id: bookId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal meminjam buku");
      
      setBooks(books.map(b => b.id === bookId ? { ...b, stock: b.stock - 1 } : b));
      showToast(lang === "id" ? "Buku berhasil dipinjam!" : "Book borrowed successfully!");
    } catch (error: any) { 
      // PENANGANAN ERROR JIKA MENGGUNAKAN AKUN DUMMY
      if(error.message.includes("FOREIGN KEY") || error.message.includes("Internal")) {
        showToast("Error: Anda menggunakan akun Dummy. Silakan Register wajah asli.");
      } else {
        showToast(error.message); 
      }
    } 
    finally { setProcessingId(null); }
  };

  const handleAddBook = async (e: FormEvent) => {
    e.preventDefault(); setIsAdding(true);
    try {
      const response = await fetch(`${API_URL}/books`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newBook)
      });
      if (!response.ok) throw new Error((await response.json()).error);
      showToast(lang === "id" ? "Buku sukses ditambahkan!" : "New book added!");
      setIsDrawerOpen(false); setNewBook({ title: "", author: "", isbn: "", stock: "1" }); fetchBooks(); 
    } catch (error: any) { alert(error.message); } finally { setIsAdding(false); }
  };

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

  // LOGIKA FILTER KATEGORI
  const filteredBooks = books.filter(b => {
    if (activeFilter === "Available") return b.stock > 0;
    if (activeFilter === "Out of Stock") return b.stock === 0;
    return true;
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
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-gray-200/50 p-1 rounded-xl flex items-center gap-1 mr-2">
            <button onClick={() => setLanguage('en')} className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>EN</button>
            <button onClick={() => setLanguage('id')} className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${lang === 'id' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>ID</button>
          </div>
          <button onClick={handleLogout} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6">
        
        {/* STATISTIK BENTO GRID */}
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

        {/* KATEGORI PILLS & SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {["All", "Available", "Out of Stock"].map((filter) => (
              <button 
                key={filter} 
                onClick={() => setActiveFilter(filter as any)}
                className={`px-4 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap ${activeFilter === filter ? "bg-gray-900 text-white shadow-md" : "bg-white text-gray-400 border border-gray-200 hover:bg-gray-50"}`}
              >
                {filter === "All" ? t("catalog") : filter === "Available" ? t("available") : t("outOfStock")}
              </button>
            ))}
          </div>
          
          <div className="relative w-full sm:w-auto shrink-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder={t("search")} className="pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold focus:outline-none focus:border-gray-900 w-full sm:w-[220px] shadow-sm transition-all" />
          </div>
        </div>

        {/* BUKU GRID */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /></div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
            <p className="text-gray-400 font-bold text-sm">Tidak ada buku di kategori ini.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <AnimatePresence>
              {filteredBooks.map((book) => (
                <motion.div 
                  layout 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }} 
                  transition={{ type: "spring", stiffness: 400, damping: 30 }} 
                  key={book.id} 
                  className="bg-white p-2.5 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col group relative"
                >
                  {/* SAMPUL BUKU AESTHETIC */}
                  <div className={`w-full h-40 rounded-[1.5rem] bg-gradient-to-br ${getGradient(book.id)} p-4 flex flex-col justify-between relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/30 rounded-full blur-2xl -mr-8 -mt-8"></div>
                    <div className="bg-white/60 backdrop-blur-md w-fit p-2.5 rounded-xl text-current"><BookOpen className="w-5 h-5" /></div>
                    <span className="font-black text-[10px] bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full w-fit text-gray-900">
                      {book.stock} {t("left")}
                    </span>
                  </div>

                  {/* DETAIL BUKU */}
                  <div className="px-3 pt-4 pb-2 flex-1 flex flex-col">
                    <h3 className="font-extrabold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">{book.title}</h3>
                    <p className="text-[11px] font-bold text-gray-400 flex-1">{book.author}</p>

                    <div className="mt-4 flex items-center justify-between">
                      <button onClick={() => setBookToDelete(book)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                      <motion.button 
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleBorrow(book.id)} 
                        disabled={book.stock === 0 || processingId === book.id} 
                        className="py-2.5 px-6 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 transition-colors flex items-center justify-center shadow-lg shadow-gray-900/20 disabled:shadow-none"
                      >
                        {processingId === book.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t("borrow")}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* POP-UP KONFIRMASI HAPUS (ANTI-TERPOTONG DI HP) */}
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
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDrawerOpen(true)} className="fixed bottom-6 right-6 p-4 bg-gray-900 text-white rounded-[1.2rem] shadow-xl shadow-gray-900/30 z-30"><Plus className="w-6 h-6" /></motion.button>

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
                <input type="text" required value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" placeholder={t("bookTitle")} />
                <input type="text" required value={newBook.author} onChange={(e) => setNewBook({...newBook, author: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" placeholder={t("authorName")} />
                <input type="text" required value={newBook.isbn} onChange={(e) => setNewBook({...newBook, isbn: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" placeholder={t("isbn")} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 ml-1">{t("stock")}</label>
                  <input type="number" required min="1" value={newBook.stock} onChange={(e) => setNewBook({...newBook, stock: e.target.value})} className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
                <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={isAdding} className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all mt-4 flex items-center justify-center shadow-lg shadow-gray-900/20">{isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : t("publish")}</motion.button>
              </form>
            </motion.div>
          </>
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
    </motion.div>
  );
}