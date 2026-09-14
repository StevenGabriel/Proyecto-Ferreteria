import React, { useState, useRef, useEffect } from 'react';
import { askChatbot } from '../../services/api';

function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '¡Hola! 👋 Soy el **Asistente Virtual** de **C&C Ferretería Casa y Construcción**.\n\nPuedo asesorarte en materiales, herramientas, electricidad, plomería, pinturas, pedidos y facturación.\n\n¿En qué te puedo ayudar hoy?',
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

  // Preguntas rápidas sugeridas (sin lealtad, enfocadas en materiales y servicios)
  const quickQuestions = [
    '🏗️ ¿Qué cemento usar para una losa?',
    '🎨 ¿Pintura para fachada exterior?',
    '⚡ ¿Calibre de cable para tomacorrientes?',
    '🛒 ¿Cómo compro por WhatsApp?',
    '🔩 ¿Tornillos para placas Drywall?',
    '🧾 ¿Emiten factura electrónica?'
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
          text: res?.reply || 'Entendido. Si necesitas más información sobre productos o cotizaciones, con gusto te asesoramos.',
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
          text: 'Disculpa, tuve un inconveniente temporal para conectarme. Puedes intentar de nuevo o comunicarte directamente por WhatsApp. 🔨',
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
        text: 'Chat reiniciado. ¿Tienes alguna otra consulta sobre materiales, herramientas o pedidos en C&C Ferretería?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Formateador simple de negritas y saltos de línea para las respuestas
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Reemplazar **texto** con <strong>texto</strong>
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={idx} className="block min-h-[1.1rem]">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="text-cyan-300 font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </span>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Ventana flotante del Chat */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[540px] max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-fade-in transition-all duration-300 backdrop-blur-xl">
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-cyan-500/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  Asistente Virtual C&C
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-semibold px-1.5 py-0.5 rounded border border-cyan-500/30">IA</span>
                </h3>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  En línea • Ferretería Casa y Construcción
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Limpiar conversación"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Cerrar chat"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lista de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-slate-950/60">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800/95 border border-slate-700/70 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {renderFormattedText(msg.text)}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {/* Indicador de escribiendo */}
            {loading && (
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl px-3.5 py-2.5 w-fit rounded-bl-none text-slate-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                <span className="ml-1 text-[11px] text-cyan-300">Consultando asistente...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas Frecuentes Rápidas */}
          <div className="px-3 py-2 bg-slate-900 border-t border-slate-800/80 overflow-x-auto flex gap-1.5 no-scrollbar whitespace-nowrap">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.replace(/^[^\w¿]+/, ''))}
                disabled={loading}
                className="text-[11px] font-medium bg-slate-800 hover:bg-cyan-950/60 hover:text-cyan-300 hover:border-cyan-500/40 text-slate-300 border border-slate-700/70 rounded-full px-2.5 py-1 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input de Mensaje */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta sobre materiales o pedidos..."
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all placeholder:text-slate-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all shadow-md shadow-cyan-500/20 flex-shrink-0 cursor-pointer"
            >
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Botón Flotante Activador */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Cerrar asistente" : "Consultar al Asistente Virtual"}
        className="group relative flex items-center gap-2.5 bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-3 rounded-full shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105 cursor-pointer font-bold text-sm"
      >
        <div className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
        </div>
        <span className="hidden sm:inline font-semibold">¿Necesitas ayuda?</span>
      </button>
    </div>
  );
}

export default ChatbotWidget;
