import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Cpu, Plus, Trash2, History, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { streamChatResponse } from '../lib/ai';
import { Message, ChatSession } from '../types';
import { cn } from '../lib/utils';

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    // Initial session if none exists
    if (sessions.length === 0) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date()
      };
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !currentSessionId || isTyping) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage],
          title: s.messages.length === 0 ? input.slice(0, 30) : s.title
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInput('');
    setIsTyping(true);

    try {
      const session = updatedSessions.find(s => s.id === currentSessionId)!;
      const history = session.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const modelMessageId = crypto.randomUUID();
      let accumulatedContent = '';

      // Initialize the model message in state
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, {
              id: modelMessageId,
              role: 'model',
              content: '',
              timestamp: new Date()
            }]
          };
        }
        return s;
      }));

      const stream = streamChatResponse(history);
      
      for await (const chunk of stream) {
        if (chunk) {
          accumulatedContent += chunk;
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                messages: s.messages.map(m => 
                  m.id === modelMessageId ? { ...m, content: accumulatedContent } : m
                )
              };
            }
            return s;
          }));
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Handle error in UI
    } finally {
      setIsTyping(false);
    }
  };

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      setCurrentSessionId(newSessions[0]?.id || null);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden text-[#E5E7EB]">
      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ x: isSidebarOpen ? 0 : -300 }}
        initial={false}
        className={cn(
          "fixed md:relative z-50 w-72 h-full bg-[#080808] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
          !isSidebarOpen && "md:w-72"
        )}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="p-4 mb-4">
            <h1 className="font-serif text-2xl tracking-tight text-white">AI Chat</h1>
          </div>
          <button
            onClick={createNewChat}
            className="flex items-center justify-between px-4 py-3 rounded-xl glass text-sm font-medium text-white hover:border-white/20 transition-all mb-6"
          >
            <span>New conversation</span>
            <Plus size={16} />
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 px-1 scrollbar-hide">
            <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-2 flex items-center gap-1">
              Recent Threads
            </div>
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => {
                  setCurrentSessionId(session.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer",
                  currentSessionId === session.id 
                    ? "bg-white/5 text-white" 
                    : "text-white/50 hover:bg-white/5 hover:text-white/70"
                )}
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  currentSessionId === session.id ? "bg-indigo-500" : "bg-white/10"
                )} />
                <span className="truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/5 mt-auto">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20" />
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-white truncate">Account</p>
                <p className="text-[10px] text-white/40 tracking-wider uppercase truncate">Free Plan</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0 h-full">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="text-white/40">Model:</span>
              <div className="flex items-center gap-2 text-white">
                Core Engine v4
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
             <button className="text-white/40 hover:text-white transition-colors">
              <History size={18} />
            </button>
            <button className="text-white/40 hover:text-white transition-colors sm:block hidden">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-8">
            <AnimatePresence initial={false}>
              {currentSession?.messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-20 text-center space-y-6"
                >
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center mx-auto text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                      <Cpu size={32} />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <h2 className="text-3xl font-serif italic tracking-tight text-white">How can I help you today?</h2>
                     <p className="text-white/40 text-sm max-w-sm mx-auto font-light leading-relaxed">
                      Your intelligent companion for reasoning and knowledge exploration.
                     </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto pt-8">
                    {[
                      "Explain the significance of non-Euclidean geometry",
                      "Draft a philosophical essay on aesthetics",
                      "Write a neural network architecture briefing",
                      "Analyze economic trends in renewable energy"
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(suggestion);
                        }}
                        className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-left text-xs text-white/60 transition-all font-light leading-relaxed group"
                      >
                         <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-1 opacity-60 group-hover:opacity-100 transition-opacity">Example Prompt</div>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                currentSession?.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-6 items-start",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs",
                      message.role === 'user' 
                        ? "bg-white/10 text-white/50" 
                        : "bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.4)]"
                    )}>
                      {message.role === 'user' ? "U" : <Cpu size={16} />}
                    </div>
                    
                    <div className={cn(
                      "flex-1 pt-1 space-y-2",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      <div className={cn(
                        "text-sm font-light leading-relaxed",
                        message.role === 'user'
                          ? "text-white"
                          : "text-white/90"
                      )}>
                        <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-code:text-indigo-400 prose-headings:font-serif prose-headings:italic">
                          <ReactMarkdown>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(79,70,229,0.4)]">
                  <Cpu size={16} />
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800/50 p-4 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-10" />
          </div>
        </div>

        <div className="p-8 bg-[#050505]">
          <form 
            onSubmit={handleSend}
            className="max-w-3xl mx-auto relative group"
          >
            <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-end gap-3 p-1.5 rounded-[24px] glass input-gradient shadow-2xl">
              <button 
                type="button"
                className="p-3 text-white/30 hover:text-white/60 transition-colors"
                title="Attach"
              >
                <Plus size={20} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe your next masterpiece..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-white placeholder-white/20 py-3 text-sm resize-none max-h-48 scrollbar-hide font-light"
                style={{ height: 'auto', minHeight: '40px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className={cn(
                  "p-3 rounded-[18px] transition-all shadow-lg",
                  input.trim() && !isTyping
                    ? "bg-white text-black hover:bg-indigo-400 hover:text-white"
                    : "bg-white/10 text-white/20 cursor-not-allowed"
                )}
              >
                <Send size={18} />
              </button>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-[10px] text-white/20 uppercase tracking-[0.2em] font-medium">
              <span className="hover:text-white/40 cursor-pointer transition-colors">Safety Guidelines</span>
              <span className="hover:text-white/40 cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white/40 cursor-pointer transition-colors">Core Engine</span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
