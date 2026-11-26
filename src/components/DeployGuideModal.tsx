import { useState } from 'react';
import { X, Database, GitBranch, Cloud, Check } from 'lucide-react';

interface DeployGuideModalProps {
  isOpen: boolean;
  supabaseConfigured: boolean;
  onClose: () => void;
  onSeeded: () => Promise<void>;
}

export function DeployGuideModal({
  isOpen,
  supabaseConfigured,
  onClose,
  onSeeded,
}: DeployGuideModalProps) {
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSeed() {
    setSeeding(true);
    setSeedNotice(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = (await res.json()) as { inserted?: number; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo inicializar el catálogo.');
      }
      if (data.inserted && data.inserted > 0) {
        setSeedNotice(`Se cargaron ${data.inserted} locales musicales de ejemplo.`);
      } else {
        setSeedNotice('La base de datos ya cuenta con registros activos.');
      }
      await onSeeded();
    } catch (err) {
      setSeedNotice(
        err instanceof Error ? err.message : 'Error al ejecutar la carga inicial.'
      );
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deploy-modal-title"
    >
      <div className="bg-white border border-[#E6E4DD] rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#E6E4DD] flex items-center justify-between">
          <h2
            id="deploy-modal-title"
            className="font-display text-lg font-semibold text-[#141413]"
          >
            Arquitectura Supabase, GitHub y Render
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía"
            className="p-1.5 rounded-md text-[#57564F] hover:text-[#141413] hover:bg-[#F3F2EE] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 text-sm text-[#272724]">
          <div className="flex items-start gap-3 pb-5 border-b border-[#E6E4DD]">
            <Database className="w-5 h-5 text-[#A16207] mt-0.5 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-semibold text-[#141413]">
                  1. Base de datos en Supabase
                </h3>
                <span className="text-xs text-[#57564F]">
                  {supabaseConfigured
                    ? 'Conectado a Supabase'
                    : 'Modo catálogo local activo'}
                </span>
              </div>
              <p className="text-xs text-[#57564F] leading-relaxed">
                Ejecuta el script <code className="font-mono text-[#141413]">supabase/schema.sql</code> en el SQL Editor de tu proyecto Supabase para crear las tablas <code className="font-mono text-[#141413]">venues</code> y <code className="font-mono text-[#141413]">catalog_items</code> con los 6 locales iniciales. Después configura las variables privadas <code className="font-mono text-[#141413]">SUPABASE_URL</code> y <code className="font-mono text-[#141413]">SUPABASE_SERVICE_ROLE_KEY</code> en el entorno del servidor.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={seeding}
                  onClick={() => void handleSeed()}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-[#E6E4DD] bg-[#FAFAF8] text-[#141413] hover:border-[#141413] disabled:opacity-50 cursor-pointer"
                >
                  {seeding ? 'Verificando…' : 'Cargar datos iniciales si está vacía'}
                </button>
                {seedNotice && (
                  <span className="text-xs text-[#44443F] inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#A16207]" />
                    {seedNotice}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 pb-5 border-b border-[#E6E4DD]">
            <GitBranch className="w-5 h-5 text-[#141413] mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <h3 className="font-display font-semibold text-[#141413]">
                2. Control de versiones en GitHub
              </h3>
              <p className="text-xs text-[#57564F] leading-relaxed">
                El archivo <code className="font-mono text-[#141413]">.gitignore</code> excluye archivos <code className="font-mono text-[#141413]">.env*</code>, <code className="font-mono text-[#141413]">node_modules/</code> y <code className="font-mono text-[#141413]">dist/</code> para proteger todas tus claves privadas. Incluye <code className="font-mono text-[#141413]">.env.example</code> como plantilla segura.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Cloud className="w-5 h-5 text-[#1E40AF] mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-[#141413]">
                3. Publicación en Render
              </h3>
              <p className="text-xs text-[#57564F] leading-relaxed">
                El repositorio incluye <code className="font-mono text-[#141413]">render.yaml</code> configurado con <code className="font-mono text-[#141413]">npm install &amp;&amp; npm run build</code> y <code className="font-mono text-[#141413]">npm start</code> (<code className="font-mono text-[#141413]">node server.ts</code>). En Render Environment agrega:
              </p>
              <ul className="text-xs font-mono text-[#141413] space-y-1 bg-[#FAFAF8] border border-[#E6E4DD] rounded-lg p-3">
                <li>GEMINI_API_KEY</li>
                <li>VITE_GOOGLE_MAPS_API_KEY</li>
                <li>SUPABASE_URL</li>
                <li>SUPABASE_SERVICE_ROLE_KEY</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
