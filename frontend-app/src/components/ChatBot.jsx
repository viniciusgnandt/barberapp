import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, ChevronDown } from 'lucide-react';
import { Chat } from '../utils/api';
import { cn } from '../utils/cn';

const STORAGE_KEY = 'lia_chat_accepted';
const HISTORY_KEY = 'lia_chat_history';
const MAX_HISTORY = 20; // messages kept in memory for context

const SUGGESTIONS = [
  'Ver agendamentos de hoje',
  'Listar meus serviços',
  'Listar meus clientes',
  'Como funciona a Recepcionista IA?',
  'Verificar disponibilidade de horários',
];

function AcceptModal({ onAccept, onClose }) {
  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center">
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-100 dark:border-gray-800 animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Lia — Sua Recepcionista</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Assistente inteligente JubaOS</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
          As mensagens trocadas com a Lia são contabilizadas no seu{' '}
          <strong className="text-gray-800 dark:text-gray-200">Uso mensal de IA</strong> (limite de 2.000 mensagens/ciclo).{' '}
          Ao continuar, você concorda com os{' '}
          <a href="#" className="text-violet-600 dark:text-violet-400 underline">termos de uso da plataforma</a>.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 px-3 py-2 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
          >
            Entendi, continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-2 mb-3', isUser && 'flex-row-reverse')}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={10} className="text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[82%] text-xs leading-relaxed rounded-2xl px-3 py-2 whitespace-pre-wrap',
          isUser
            ? 'bg-violet-600 text-white rounded-tr-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm',
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function ChatBot() {
  const [open,     setOpen]     = useState(false);
  const [accepted, setAccepted] = useState(() => !!localStorage.getItem(STORAGE_KEY));
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  // Focus input when opening
  useEffect(() => {
    if (open && accepted) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, accepted]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  }, [messages]);

  const handleToggle = () => {
    if (!open && !accepted) {
      setOpen(true);
      setShowModal(true);
    } else {
      setOpen(o => !o);
    }
  };

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setAccepted(true);
    setShowModal(false);
    // Greeting
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Olá! Sou a Lia, sua recepcionista virtual 👋\n\nPosso te ajudar a gerenciar agendamentos, clientes, serviços e muito mais. O que você precisa hoje?',
      }]);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setShowModal(false);
  };

  const buildHistory = () =>
    messages.slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content }));

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const r = await Chat.sendMessage(trimmed, buildHistory());
    setLoading(false);

    if (r.ok) {
      setMessages(prev => [...prev, { role: 'assistant', content: r.data?.data?.reply || '…' }]);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: r.data?.message || 'Erro ao processar sua mensagem.' }]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80 h-[480px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-violet-600 shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white leading-none">Lia</p>
              <p className="text-[10px] text-violet-200 mt-0.5">Recepcionista Virtual · JubaOS</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Acceptance modal overlay */}
          {showModal && <AcceptModal onAccept={handleAccept} onClose={handleClose} />}

          {/* Messages */}
          {accepted && (
            <>
              <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
                {messages.length === 0 && !loading && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-3">Olá! Como posso ajudar?</p>
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => sendMessage(s)}
                        className="w-full text-left text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg} />
                ))}

                {loading && (
                  <div className="flex gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={10} className="text-white" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="px-3 pb-3 shrink-0">
                <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreva uma mensagem..."
                    rows={1}
                    className="flex-1 bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none outline-none max-h-20 scrollbar-thin"
                    style={{ lineHeight: '1.5' }}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition-colors shrink-0"
                  >
                    <Send size={12} />
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 dark:text-gray-600 text-center mt-1.5">
                  Apenas assuntos relacionados à plataforma JubaOS
                </p>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={handleToggle}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-700 shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
        title="Lia — Recepcionista Virtual"
      >
        {open
          ? <X size={20} />
          : <MessageCircle size={20} />
        }
        {/* Pulse indicator */}
        {!open && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-950" />
        )}
      </button>
    </>
  );
}
