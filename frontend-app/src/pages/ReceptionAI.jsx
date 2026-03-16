import { useState, useEffect, useRef } from 'react';
import { Bot, Wifi, WifiOff, Loader2, RefreshCw, PhoneOff, MessageSquare, User } from 'lucide-react';
import { Reception as ReceptionAPI } from '../utils/api';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : '';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    connected:    { label: 'Conectado',   cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400'  },
    connecting:   { label: 'Conectando…', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    disconnected: { label: 'Desconectado',cls: 'bg-gray-100   text-gray-500   dark:bg-gray-800      dark:text-gray-400'   },
  };
  const s = map[status] || map.disconnected;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', s.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'connecting' ? 'animate-pulse bg-yellow-500' : status === 'connected' ? 'bg-green-500' : 'bg-gray-400')} />
      {s.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReceptionAI() {
  const [status,         setStatus]         = useState('disconnected');
  const [phone,          setPhone]          = useState(null);
  const [qrCode,         setQrCode]         = useState(null);
  const [connecting,     setConnecting]     = useState(false);
  const [disconnecting,  setDisconnecting]  = useState(false);
  const [conversations,  setConversations]  = useState([]);
  const [selectedConvo,  setSelectedConvo]  = useState(null);
  const [loadingConvos,  setLoadingConvos]  = useState(false);
  const messagesEndRef = useRef(null);
  const esRef          = useRef(null);

  // ── Load initial status ────────────────────────────────────────────────────

  const loadStatus = async () => {
    const r = await ReceptionAPI.getStatus();
    if (r.ok) {
      setStatus(r.data.data?.status || 'disconnected');
      setPhone(r.data.data?.phone   || null);
    }
  };

  const loadConversations = async () => {
    setLoadingConvos(true);
    const r = await ReceptionAPI.getConversations();
    setLoadingConvos(false);
    if (r.ok) setConversations(r.data.data || []);
  };

  useEffect(() => {
    loadStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === 'connected') loadConversations();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvo?.messages?.length]);

  // ── SSE subscription ───────────────────────────────────────────────────────

  const subscribeSSE = () => {
    if (esRef.current) esRef.current.close();

    const url = ReceptionAPI.qrUrl();
    const es  = new EventSource(url);
    esRef.current = es;

    es.addEventListener('qr', (e) => {
      const data = JSON.parse(e.data);
      setQrCode(data.qr);
      setStatus('connecting');
    });

    es.addEventListener('connected', (e) => {
      const data = JSON.parse(e.data);
      setQrCode(null);
      setStatus('connected');
      setPhone(data.phone);
      setConnecting(false);
    });

    es.addEventListener('disconnected', () => {
      setStatus('disconnected');
      setPhone(null);
      setQrCode(null);
      setConnecting(false);
    });

    es.addEventListener('message', () => {
      loadConversations();
      if (selectedConvo) loadSelectedConvo(selectedConvo._id);
    });

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do
    };
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    const r = await ReceptionAPI.connect();
    if (r.ok) {
      subscribeSSE();
    } else {
      setConnecting(false);
      toast(r.data?.message || 'Erro ao conectar WhatsApp.', 'error');
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    const r = await ReceptionAPI.disconnect();
    setDisconnecting(false);
    if (r.ok) {
      toast('WhatsApp desconectado.');
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      setStatus('disconnected');
      setPhone(null);
      setQrCode(null);
      setConversations([]);
      setSelectedConvo(null);
    } else {
      toast(r.data?.message || 'Erro ao desconectar.', 'error');
    }
  };

  const loadSelectedConvo = async (id) => {
    const r = await ReceptionAPI.getConversation(id);
    if (r.ok) setSelectedConvo(r.data.data);
  };

  const handleSelectConvo = (convo) => {
    loadSelectedConvo(convo._id);
  };

  // Open SSE if we're already connecting on mount
  useEffect(() => {
    if (status === 'connecting') subscribeSSE();
    return () => { esRef.current?.close(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl animate-fade-up">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recepção IA</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Atenda clientes via WhatsApp automaticamente com inteligência artificial
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-4">

        {/* ── Connection card ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Bot size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">WhatsApp Business</p>
              {phone
                ? <p className="text-xs text-gray-400 dark:text-gray-500">+{phone}</p>
                : <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum número conectado</p>
              }
            </div>
          </div>

          {/* QR Code */}
          {qrCode && (
            <div className="flex flex-col items-center py-6 gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Abra o WhatsApp no seu celular e escaneie o QR Code
              </p>
              <div className="p-3 bg-white rounded-xl border border-gray-200 dark:border-gray-700 inline-block">
                <img src={qrCode} alt="QR Code" className="w-52 h-52" />
              </div>
              <p className="text-xs text-gray-400">
                WhatsApp → Dispositivos vinculados → Vincular dispositivo
              </p>
            </div>
          )}

          {/* Flow diagram */}
          {!qrCode && status !== 'connected' && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-400 dark:text-gray-500">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium">
                <span>WhatsApp</span>
              </div>
              <span>→</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium">
                <span>Plataforma</span>
              </div>
              <span>→</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium">
                <Bot size={12} />
                <span>Claude IA</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {status === 'connected' && (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                loading={disconnecting}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20"
              >
                <PhoneOff size={14} className="mr-1.5" /> Desconectar
              </Button>
            )}
            {status === 'disconnected' && (
              <Button onClick={handleConnect} loading={connecting}>
                <Wifi size={14} className="mr-1.5" />
                {connecting ? 'Aguardando QR…' : 'Conectar WhatsApp'}
              </Button>
            )}
            {status === 'connecting' && !qrCode && (
              <Button disabled>
                <Loader2 size={14} className="mr-1.5 animate-spin" /> Iniciando…
              </Button>
            )}
          </div>
        </div>

        {/* ── Conversations ─────────────────────────────────────────────────── */}
        {status === 'connected' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conversas</p>
              <button
                onClick={loadConversations}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="flex h-[480px]">
              {/* Conversation list */}
              <div className="w-72 shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto">
                {loadingConvos && (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  </div>
                )}
                {!loadingConvos && conversations.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400 dark:text-gray-600 text-sm">
                    <MessageSquare size={20} />
                    <span>Nenhuma conversa ainda</span>
                  </div>
                )}
                {conversations.map(convo => (
                  <button
                    key={convo._id}
                    onClick={() => handleSelectConvo(convo)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                      selectedConvo?._id === convo._id && 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-l-brand-500',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                        <User size={14} className="text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {convo.contactName || convo.contactPhone}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {fmtDate(convo.lastMessageAt)}
                          </span>
                        </div>
                        {convo.messages?.length > 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                            {convo.messages[convo.messages.length - 1]?.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Message thread */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {!selectedConvo ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400 dark:text-gray-600 text-sm">
                    <MessageSquare size={24} />
                    <span>Selecione uma conversa</span>
                  </div>
                ) : (
                  <>
                    {/* Thread header */}
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User size={14} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {selectedConvo.contactName || selectedConvo.contactPhone}
                        </p>
                        <p className="text-xs text-gray-400">{selectedConvo.contactPhone}</p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                      {selectedConvo.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn('flex', msg.role === 'assistant' ? 'justify-end' : 'justify-start')}
                        >
                          <div className={cn(
                            'max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
                            msg.role === 'assistant'
                              ? 'bg-brand-500 text-white rounded-br-sm'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm',
                          )}>
                            {msg.content}
                            <p className={cn(
                              'text-[10px] mt-1 text-right',
                              msg.role === 'assistant' ? 'text-brand-200' : 'text-gray-400',
                            )}>
                              {fmtTime(msg.timestamp)}
                              {msg.role === 'assistant' && (
                                <span className="ml-1.5 opacity-80">· IA</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Info banner ────────────────────────────────────────────────────── */}
        <div className="bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-900/30 px-6 py-4">
          <div className="flex gap-3">
            <Bot size={16} className="text-violet-500 dark:text-violet-400 shrink-0 mt-0.5" />
            <div className="text-sm text-violet-700 dark:text-violet-300 space-y-1">
              <p className="font-medium">Como funciona</p>
              <p className="text-violet-600 dark:text-violet-400 text-xs leading-relaxed">
                Após conectar seu WhatsApp Business, o Claude IA responderá automaticamente às mensagens dos seus clientes — agendamentos, dúvidas sobre serviços e preços — 24 horas por dia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
