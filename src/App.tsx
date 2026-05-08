import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { auth, signIn, signOut, db } from './firebase';
import { analyzeThought, JewelType } from './gemini';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LogOut, PenTool, Sparkles, X, Heart, Link as LinkIcon, Scroll } from 'lucide-react';

// --- Types ---
interface Thought {
  id: string;
  content: string;
  title?: string;
  userId: string;
  createdAt: any;
  jewelType: JewelType;
  relatedTo: string[];
}

// --- Components ---

function AuthView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-bg-main p-8 overflow-hidden relative">
      {/* Decorative Atmosphere */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gold/5 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-white/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 relative z-10"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-12 h-0.5 bg-gold/20" />
          <div className="w-3 h-3 rounded-full bg-gold shadow-[0_0_15px_#D4AF37]" />
          <div className="w-12 h-0.5 bg-gold/20" />
        </div>
        <h1 className="text-7xl font-serif font-light tracking-tight text-white italic">
          Bag of Thoughts
        </h1>
        <p className="text-gold-muted font-serif italic text-xl max-w-lg mx-auto leading-relaxed">
          "A sanctuary where every whisper of the mind is polished into a timeless treasure."
        </p>
        <div className="pt-12">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={signIn}
            className="group flex items-center gap-4 px-10 py-5 bg-transparent border border-gold/30 hover:border-gold transition-all rounded-full text-sm uppercase tracking-[0.2em] font-semibold text-gold"
          >
            <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
            Enter the Sanctuary
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

const JEWEL_COLORS: Record<JewelType, string> = {
  diamond: 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]',
  emerald: 'bg-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)]',
  ruby: 'bg-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.3)]',
  sapphire: 'bg-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.3)]',
  amethyst: 'bg-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.3)]',
  topaz: 'bg-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.3)]',
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [newThought, setNewThought] = useState({ title: '', content: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setThoughts([]);
      return;
    }

    const q = query(
      collection(db, 'thoughts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Thought));
      setThoughts(data);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return unsubscribe;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newThought.content.trim()) return;

    setIsAnalyzing(true);
    setIsWriting(false);

    try {
      const analysis = await analyzeThought(newThought.content, thoughts);

      const docRef = await addDoc(collection(db, 'thoughts'), {
        title: newThought.title || 'Untitled Thought',
        content: newThought.content,
        userId: user.uid,
        createdAt: serverTimestamp(),
        jewelType: analysis.jewelType,
        relatedTo: analysis.relatedThoughtIds
      });

      for (const relatedId of analysis.relatedThoughtIds) {
        const relatedThought = thoughts.find(t => t.id === relatedId);
        if (relatedThought && !relatedThought.relatedTo.includes(docRef.id)) {
           await updateDoc(doc(db, 'thoughts', relatedId), {
             relatedTo: [...relatedThought.relatedTo, docRef.id]
           });
        }
      }

      setNewThought({ title: '', content: '' });
      setSelectedThought(null);
    } catch (err) {
      console.error("Error saving thought:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="flex h-screen w-full bg-bg-main overflow-hidden text-[#E0D7D0]">
      {/* Sidebar: The Bag */}
      <aside className="w-[380px] border-r border-border-dim bg-bg-side flex flex-col shrink-0">
        <header className="p-10 pb-8 border-b border-border-dim">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-gold shadow-[0_0_10px_#D4AF37]" />
            <h2 className="label-caps text-gold-muted font-sans">The Bag of Thoughts</h2>
          </div>
          <h1 className="text-4xl font-serif italic text-white leading-tight">Your Precious Jewels</h1>
        </header>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-5">
            {/* New Thought Button */}
            <button
              onClick={() => { setIsWriting(true); setSelectedThought(null); }}
              className="group aspect-square bg-bg-card border border-dashed border-border-dim rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-gold/50 hover:bg-gold/5 transition-all text-gold-muted/40 hover:text-gold"
            >
              <PenTool size={32} strokeWidth={1} />
              <span className="text-[10px] uppercase font-bold tracking-widest">New Pearl</span>
            </button>

            {thoughts.map((thought) => (
              <motion.button
                key={thought.id}
                onClick={() => setSelectedThought(thought)}
                whileHover={{ y: -4 }}
                className={`group text-left aspect-square bg-bg-card border border-border-dim p-5 rounded-2xl flex flex-col justify-between transition-all hover:border-gold/30 hover:shadow-2xl ${selectedThought?.id === thought.id ? 'border-gold ring-1 ring-gold/20' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full ${JEWEL_COLORS[thought.jewelType] || JEWEL_COLORS.diamond} transition-transform group-hover:scale-110`} />
                <div>
                  <div className="text-[10px] text-gold-muted uppercase tracking-widest mb-2 font-bold opacity-60">
                    {thought.createdAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Stardust'}
                  </div>
                  <div className="text-xs font-medium text-[#E0D7D0] leading-snug line-clamp-2 italic font-serif">
                    {thought.title || thought.content}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <footer className="p-8 bg-bg-main border-t border-border-dim flex items-center justify-between">
          <div className="text-[11px] text-[#666] uppercase tracking-[0.3em] font-bold">
            {thoughts.length} Jewels Collected
          </div>
          <button onClick={signOut} className="text-[#666] hover:text-white transition-colors">
            <LogOut size={16} />
          </button>
        </footer>
      </aside>

      {/* Main Content: The Letter */}
      <main className="flex-1 flex flex-col bg-bg-main relative overflow-y-auto">
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-gold/20 animate-ping absolute inset-0" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-24 h-24 rounded-full bg-gold/10 backdrop-blur-md border border-gold flex items-center justify-center"
                >
                   <Sparkles className="text-gold" size={40} />
                </motion.div>
              </div>
              <p className="text-2xl font-serif italic text-gold-muted animate-pulse tracking-wide">
                Polishing your thought into a jewel...
              </p>
            </motion.div>
          ) : isWriting || selectedThought ? (
            <motion.div 
              key={selectedThought ? selectedThought.id : 'writing'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col px-32 py-24 max-w-5xl mx-auto w-full relative"
            >
              {/* Resonance Overlay */}
              {selectedThought && selectedThought.relatedTo.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-10 right-10 w-72 glass-panel p-5 border-gold/30 shadow-2xl z-20"
                >
                   <div className="flex items-center gap-2 mb-3">
                     <LinkIcon size={14} className="text-gold" />
                     <span className="label-caps text-gold text-[10px]">Resonance Found</span>
                   </div>
                   <div className="space-y-3">
                     {selectedThought.relatedTo.slice(0, 2).map(id => {
                       const related = thoughts.find(t => t.id === id);
                       return related ? (
                         <button 
                           key={id} 
                           onClick={() => setSelectedThought(related)}
                           className="text-xs italic text-gold-muted hover:text-white transition-colors block leading-relaxed border-l border-gold/20 pl-3"
                         >
                           "{related.title || related.content.slice(0, 50)}..."
                         </button>
                       ) : null;
                     })}
                   </div>
                </motion.div>
              )}

              <div className="mb-16">
                <span className="label-caps text-[#666] block mb-4 tracking-[0.4em]">Current Letter</span>
                <input 
                  type="text" 
                  placeholder="Title of this thought..." 
                  readOnly={!!selectedThought}
                  className="bg-transparent text-5xl font-serif italic text-white outline-none w-full border-none placeholder-[#2A2A2A] transition-all"
                  value={selectedThought ? selectedThought.title : newThought.title}
                  onChange={e => setNewThought(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <textarea 
                className={`flex-1 bg-transparent text-2xl font-serif leading-[1.8] text-gold-muted outline-none resize-none border-none placeholder-[#1A1A1A] italic ${selectedThought ? 'pointer-events-none' : ''}`}
                placeholder="Dear future self..."
                readOnly={!!selectedThought}
                value={selectedThought ? selectedThought.content : newThought.content}
                onChange={e => setNewThought(prev => ({ ...prev, content: e.target.value }))}
              />

              <div className="mt-16 flex items-center justify-between border-t border-border-dim pt-10">
                <div className="flex gap-10">
                  {!selectedThought && (
                    <>
                      <button 
                        onClick={handleSubmit}
                        className="label-caps text-gold-muted hover:text-gold transition-colors"
                      >
                         Seal & Store
                      </button>
                      <button 
                        onClick={() => { setIsWriting(false); setNewThought({ title: '', content: '' }); }}
                        className="label-caps text-[#444] hover:text-[#666]"
                      >
                         Discard
                      </button>
                    </>
                  )}
                  {selectedThought && (
                    <button 
                      onClick={() => setSelectedThought(null)}
                      className="label-caps text-gold-muted hover:text-white"
                    >
                       Back to the quiet
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-6">
                  {selectedThought && (
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-gold/10 bg-gold/5">
                      <div className={`w-3 h-3 rounded-full ${JEWEL_COLORS[selectedThought.jewelType]}`} />
                      <span className="label-caps text-gold text-[10px]">The {selectedThought.jewelType} Thought</span>
                    </div>
                  )}
                  {!selectedThought && (
                    <>
                      <span className="text-[10px] text-[#444] uppercase tracking-widest italic font-sans">
                        Drafted in the starlight
                      </span>
                      <button 
                        onClick={handleSubmit}
                        className="bg-gold text-black px-8 py-3.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#F2D17D] transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                      >
                        Polish into Jewel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30">
               <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
                className="w-[500px] h-[500px] border border-gold/5 rounded-full flex items-center justify-center p-20"
               >
                 <div className="w-full h-full border border-gold/5 rounded-full flex items-center justify-center p-20">
                   <div className="w-full h-full border border-gold/5 rounded-full" />
                 </div>
               </motion.div>
               <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                 <Scroll size={48} strokeWidth={1} className="text-gold/40" />
                 <p className="text-xl font-serif italic text-gold-muted">Select a treasure from your bag...</p>
               </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

