import React, { useState, useRef, useEffect } from 'react';
import { askChatbot } from '../../services/api';

function ChatbotWidget({ hidden = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Bienvenido al soporte técnico de **C&C Ferretería — Casa y Construcción**.\n\nPuedo ayudarte con especificaciones de materiales, herramientas, cálculo de insumos, stock y facturación.\n\n¿Qué material o herramienta estás buscando?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Consultas técnicas rápidas (sin emojis decorativos — Impeccable Craft Floor)
  const quickQuestions = [
    '¿Qué cemento usar para una losa?',
    '¿Pintura para fachada exterior?',
    '¿Calibre de cable para tomacorrientes?',
    '¿Cómo reservo con QR Simple?',
    '¿Tornillos para placas Drywall?',
    '¿Emiten factura electrónica SIAT?'
  ];

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...messages, { sender: 'user', text, time: userTime }];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await askChatbot(text, newMessages);
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: res?.reply || 'Entendido. Si necesitas más especificaciones sobre productos o cotizaciones, indícame el ítem.',
          time: botTime
        }
      ]);
    } catch (err) {
      console.error('Error enviando mensaje al chatbot:', err);
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'No se pudo establecer conexión con el asistente en este momento. Intenta nuevamente en unos segundos o contáctanos por WhatsApp.',
          time: botTime
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: 'Conversación reiniciada. ¿Tienes otra consulta sobre herramientas, materiales o pedidos en C&C Ferretería?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Formateador de negritas y saltos de línea alineado a la paleta Industrial de Precisión
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={idx} className="block min-h-[1.1rem]">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="text-amber-400 font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </span>
      );
    });
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Ventana flotante del Chat (Emil Kowalski: origin-bottom-right + animate-popover-in 180ms ease-out-expo) */}
      {isOpen && (
        <div className="w-[350px] sm:w-[390px] h-[520px] max-h-[82vh] bg-[#12151c] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 origin-bottom-right animate-popover-in">
          {/* Header del Chat */}
          <div className="bg-[#0c0e12] border-b border-zinc-800 px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0c0e12] rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-100 leading-none">
                    Asesor Técnico C&C
                  </h3>
                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 font-semibold px-1.5 py-0.5 rounded border border-zinc-700">
                    IA
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  <span>Consultas de catálogo y obra</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Reiniciar conversación"
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors duration-160 cursor-pointer"
                aria-label="Reiniciar conversación"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Cerrar asistente"
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors duration-160 cursor-pointer"
                aria-label="Cerrar asistente"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lista de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-[#0c0e12]">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-amber-500 text-zinc-950 font-medium rounded-br-xs'
                      : 'bg-[#14171f] border border-zinc-800/90 text-zinc-200 rounded-bl-xs'
                  }`}
                >
                  {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}
                </div>
                <span className="text-[10px] font-mono tabular-nums text-zinc-500 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            ))}

            {/* Indicador de consulta en curso */}
            {loading && (
              <div className="flex items-center gap-2 bg-[#14171f] border border-zinc-800 rounded-xl px-3.5 py-2.5 w-fit rounded-bl-xs text-zinc-400 text-xs animate-fade-in">
                <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-[11px] text-zinc-300 font-medium">Verificando catálogo...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas Frecuentes Rápidas */}
          <div className="px-3 py-2 bg-[#12151c] border-t border-zinc-800/90 overflow-x-auto flex gap-1.5 custom-scrollbar whitespace-nowrap">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={loading}
                className="text-[11px] font-medium bg-[#0c0e12] hover:bg-zinc-800 hover:text-amber-400 hover:border-zinc-700 text-zinc-300 border border-zinc-800 rounded-lg px-2.5 py-1 transition-colors duration-160 flex-shrink-0 cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input de Mensaje */}
          <div className="p-3 bg-[#12151c] border-t border-zinc-800 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Consulta un material, herramienta o medida..."
              disabled={loading}
              className="flex-1 bg-[#0c0e12] border border-zinc-800 focus:border-amber-500/70 text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors duration-160 placeholder:text-zinc-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 p-2.5 rounded-xl btn-press flex-shrink-0 cursor-pointer"
              aria-label="Enviar consulta"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Botón Flotante Activador (Tactile btn-press, sin hover:scale-105 ni ping infinito) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Cerrar asesor técnico" : "Abrir asesor técnico C&C"}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-bold cursor-pointer btn-press ${
          isOpen
            ? 'bg-[#14171f] hover:bg-zinc-800 text-zinc-200 border-zinc-700'
            : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400/50'
        }`}
      >
        <div className="relative flex items-center justify-center">
          {isOpen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </>
          )}
        </div>
        <span>{isOpen ? 'Ocultar asesor' : 'Asesor técnico'}</span>
      </button>
    </div>
  );
}

export default ChatbotWidget;
