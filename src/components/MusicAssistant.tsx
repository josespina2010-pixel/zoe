import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send, MapPin, Loader2, MessageSquare } from 'lucide-react';
import type { ChatMessage } from '../types/catalog';

interface MusicAssistantProps {
  onFocusVenue: (venueId: string) => void;
}

const SAMPLE_PROMPTS = [
  '¿Qué tiendas registradas venden guitarras?',
  '¿Qué instrumento es recomendable para comenzar a estudiar música?',
  '¿Qué escuelas del catálogo ofrecen clases de piano?',
];

export function MusicAssistant({ onFocusVenue }: MusicAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hola. Puedo consultar en tiempo real las tiendas, estudios, escuelas, instrumentos, clases y precios registrados en la base de datos. Elige una consulta rápida o escribe tu pregunta.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const historyPayload = nextMessages
        .filter((m) => m.id !== 'welcome')
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        referencedVenues?: ChatMessage['referencedVenues'];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo obtener respuesta del asistente.');
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Sin respuesta disponible.',
        referencedVenues: data.referencedVenues,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error de conexión con el asistente.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="h-[520px] flex flex-col rounded-xl border border-[#E6E4DD] bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E6E4DD] flex items-center justify-between gap-3 bg-[#FAFAF8]">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-[#A16207] shrink-0" />
          <h3 className="font-display text-sm font-semibold text-[#141413] truncate">
            Asistente musical inteligente
          </h3>
        </div>
        <span className="text-xs text-[#71716A] whitespace-nowrap shrink-0">
          Consulta en vivo
        </span>
      </div>

      {/* Quick Test Prompts */}
      <div className="px-4 py-2.5 border-b border-[#E6E4DD] bg-[#FAFAF8]/60 flex flex-wrap gap-1.5">
        {SAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isLoading}
            onClick={() => void sendMessage(prompt)}
            className="text-left text-[11px] leading-snug px-2.5 py-1.5 rounded-md border border-[#E6E4DD] bg-white text-[#272724] hover:border-[#141413] hover:text-[#141413] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#141413] text-white'
                  : 'bg-[#F3F2EE] text-[#141413]'
              }`}
            >
              {msg.content}
            </div>

            {msg.referencedVenues && msg.referencedVenues.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%]">
                {msg.referencedVenues.map((venue) => (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => onFocusVenue(venue.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-[#E6E4DD] bg-white text-[#141413] hover:border-[#A16207] hover:text-[#A16207] transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 shrink-0 text-[#A16207]" />
                    <span className="truncate max-w-[190px]">{venue.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#71716A]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A16207]" />
            <span>Consultando registros del catálogo…</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-[#E6E4DD] bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre instrumentos, clases, estudios o precios…"
          aria-label="Consulta para el asistente musical"
          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] text-[#141413] placeholder:text-[#8E8D85] focus:outline-none focus:border-[#141413]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Enviar consulta"
          className="px-3.5 py-2 rounded-lg bg-[#141413] text-white text-sm font-medium hover:bg-[#2C2C2A] disabled:opacity-40 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
}
