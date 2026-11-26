import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  MapPin,
  Phone,
  Pencil,
  Trash2,
  Plus,
  Music,
  ArrowUpRight,
  Check,
  X,
} from 'lucide-react';
import { MusicMap } from './components/MusicMap';
import { MusicAssistant } from './components/MusicAssistant';
import { VenueFormModal } from './components/VenueFormModal';
import { VenueDetailDrawer } from './components/VenueDetailDrawer';
import { DeployGuideModal } from './components/DeployGuideModal';
import type {
  CatalogItemType,
  Venue,
  VenueCategory,
} from './types/catalog';

const CATEGORY_LABELS: Record<VenueCategory, string> = {
  tienda: 'Tienda',
  estudio: 'Estudio',
  escuela: 'Escuela',
};

const ITEM_TYPE_LABELS: Record<CatalogItemType, string> = {
  instrumento: 'Instrumento',
  clase: 'Clase',
  servicio: 'Servicio',
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    maximumFractionDigits: 0,
  }).format(price);
}

function VenueImage({ venue }: { venue: Venue }) {
  const [failed, setFailed] = useState(false);

  if (!venue.image_url || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#F3F2EE] to-[#E6E4DD] flex flex-col items-center justify-center p-4 text-center">
        <Music className="w-7 h-7 text-[#A16207] mb-1.5" />
        <span className="text-xs font-medium text-[#44443F] line-clamp-1">
          {venue.name}
        </span>
      </div>
    );
  }

  return (
    <img
      src={venue.image_url}
      alt={venue.name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
    />
  );
}

export default function App() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [allVenuesCount, setAllVenuesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<VenueCategory | 'all'>(
    'all'
  );
  const [itemTypeFilter, setItemTypeFilter] = useState<CatalogItemType | 'all'>(
    'all'
  );

  // Selection & Modals
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [drawerVenueId, setDrawerVenueId] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [confirmDeleteVenueId, setConfirmDeleteVenueId] = useState<string | null>(
    null
  );

  // Listen for Google Maps quota / auth failures
  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () =>
      window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Resolve Maps key if not bundled at build time
  useEffect(() => {
    if (mapsApiKey) return;
    fetch('/api/maps-config')
      .then((r) => r.json())
      .then((data: { apiKey?: string }) => {
        if (data.apiKey) setMapsApiKey(data.apiKey);
      })
      .catch(() => {
        // Ignore config fetch error; fallback list renders cleanly
      });
  }, [mapsApiKey]);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (itemTypeFilter !== 'all') params.set('itemType', itemTypeFilter);

      const res = await fetch(`/api/venues?${params.toString()}`);
      const data = (await res.json()) as {
        venues?: Venue[];
        supabaseConfigured?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar el catálogo.');
      }

      const fetched = data.venues ?? [];
      setVenues(fetched);
      setSupabaseConfigured(Boolean(data.supabaseConfigured));

      if (
        !searchQuery.trim() &&
        categoryFilter === 'all' &&
        itemTypeFilter === 'all'
      ) {
        setAllVenuesCount(fetched.length);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con el servidor.'
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, itemTypeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchVenues();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchVenues]);

  const drawerVenue = useMemo(
    () => venues.find((v) => v.id === drawerVenueId) ?? null,
    [venues, drawerVenueId]
  );

  const stats = useMemo(() => {
    let instruments = 0;
    let classes = 0;
    let services = 0;
    for (const v of venues) {
      for (const item of v.items) {
        if (item.item_type === 'instrumento') instruments++;
        else if (item.item_type === 'clase') classes++;
        else services++;
      }
    }
    return {
      venues: Math.max(venues.length, allVenuesCount),
      instruments,
      classes,
      services,
    };
  }, [venues, allVenuesCount]);

  function handleFocusVenueOnMap(venueId: string) {
    setSelectedVenueId(venueId);
    const mapSection = document.getElementById('mapa');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function handleDeleteVenue(id: string) {
    try {
      const res = await fetch(`/api/venues/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el local.');
      }
      if (selectedVenueId === id) setSelectedVenueId(null);
      if (drawerVenueId === id) setDrawerVenueId(null);
      setConfirmDeleteVenueId(null);
      await fetchVenues();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al eliminar el local.'
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141413] flex flex-col">
      {/* Demo Key Quota Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="border-b border-[#E6E4DD] bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#"
            className="font-display text-xl font-bold tracking-tight text-[#141413] whitespace-nowrap shrink-0"
          >
            Atempo
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57564F]">
            <a
              href="#mapa"
              className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Mapa interactivo
            </a>
            <a
              href="#asistente"
              className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Asistente IA
            </a>
            <a
              href="#catalogo"
              className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Catálogo
            </a>
            <button
              type="button"
              onClick={() => setDeployModalOpen(true)}
              className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Supabase y Render
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingVenue(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#141413] text-white hover:bg-[#2C2C2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo local</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split-Screen Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center py-2">
              <p className="text-xs font-medium text-[#A16207] mb-3">
                Directorio musical · Catálogo en vivo
              </p>
              <h1
                className="font-display font-semibold tracking-tight text-[#141413] leading-[1.08] mb-4"
                style={{
                  fontSize: 'clamp(2.1rem, 3.8vw, 3.25rem)',
                  textWrap: 'balance',
                }}
              >
                Tiendas, estudios y escuelas de música en un solo mapa.
              </h1>
              <p className="text-base text-[#57564F] leading-relaxed max-w-xl mb-7">
                Consulta instrumentos, clases y servicios con precios reales, ubica cada sede en Google Maps y pregunta a nuestro asistente inteligente conectado directamente a la base de datos.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#catalogo"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[#141413] text-white hover:bg-[#2C2C2A] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explorar catálogo</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
                <a
                  href="#mapa"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[#E6E4DD] bg-white text-[#141413] hover:border-[#141413] transition-colors whitespace-nowrap shrink-0"
                >
                  <MapPin className="w-4 h-4 text-[#A16207]" />
                  <span>Ver mapa y asistente</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="w-full h-full min-h-[260px] lg:min-h-[340px] rounded-xl overflow-hidden border border-[#E6E4DD] bg-[#F3F2EE]">
                <img
                  src="/src/assets/images/hero_music_atelier_1795652877122.jpg"
                  alt="Showroom de guitarras acústicas y piano de cola"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-Column Full-Width KPI Strip */}
          <div className="mt-8 pt-6 border-t border-b border-[#E6E4DD] py-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-[#71716A] mb-1">Locales registrados</p>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#141413]">
                {stats.venues}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#71716A] mb-1">Instrumentos en venta</p>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#141413]">
                {stats.instruments}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#71716A] mb-1">Clases y talleres</p>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#141413]">
                {stats.classes}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#71716A] mb-1">Servicios de estudio y laudería</p>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#141413]">
                {stats.services}
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Google Maps + Gemini AI Assistant Section */}
        <section
          id="mapa"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#141413]">
                Mapa interactivo y asistente inteligente
              </h2>
              <p className="text-sm text-[#57564F] mt-1">
                Selecciona cualquier marcador para ver detalles del local o consulta al asistente sobre instrumentos, clases y precios reales.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <MusicMap
                apiKey={mapsApiKey}
                venues={venues}
                selectedVenueId={selectedVenueId}
                onSelectVenue={setSelectedVenueId}
                onOpenVenueCatalog={(venue) => setDrawerVenueId(venue.id)}
              />
            </div>

            <div id="asistente" className="lg:col-span-5">
              <MusicAssistant onFocusVenue={handleFocusVenueOnMap} />
            </div>
          </div>
        </section>

        {/* Catalog + Search + Filters + CRUD Grid */}
        <section
          id="catalogo"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-[#E6E4DD]"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#141413]">
                Catálogo de locales, instrumentos y servicios
              </h2>
              <p className="text-sm text-[#57564F] mt-1">
                Busca por instrumento o servicio, administra altas, bajas y modificaciones, o edita los precios de cada sede.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingVenue(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[#E6E4DD] bg-white text-[#141413] hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Alta de nuevo local</span>
            </button>
          </div>

          {/* Search & Segmented Filters */}
          <div className="flex flex-col lg:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#71716A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar guitarra, piano, grabación, violín, Roma Norte…"
                aria-label="Buscar en catálogo"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-[#E6E4DD] bg-white text-[#141413] placeholder:text-[#8E8D85] focus:outline-none focus:border-[#141413]"
              />
            </div>

            {/* Category filter tabs */}
            <div
              className="flex items-center gap-1 p-1 bg-[#F3F2EE] rounded-lg overflow-x-auto"
              role="group"
              aria-label="Filtrar por tipo de local"
            >
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'tienda', label: 'Tiendas' },
                  { id: 'estudio', label: 'Estudios' },
                  { id: 'escuela', label: 'Escuelas' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    categoryFilter === tab.id
                      ? 'bg-white text-[#141413] shadow-sm'
                      : 'text-[#57564F] hover:text-[#141413]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Item type filter tabs */}
            <div
              className="flex items-center gap-1 p-1 bg-[#F3F2EE] rounded-lg overflow-x-auto"
              role="group"
              aria-label="Filtrar por tipo de instrumento o servicio"
            >
              {(
                [
                  { id: 'all', label: 'Toda oferta' },
                  { id: 'instrumento', label: 'Instrumentos' },
                  { id: 'clase', label: 'Clases' },
                  { id: 'servicio', label: 'Servicios' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setItemTypeFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    itemTypeFilter === tab.id
                      ? 'bg-white text-[#141413] shadow-sm'
                      : 'text-[#57564F] hover:text-[#141413]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-96 rounded-xl border border-[#E6E4DD] bg-white animate-pulse"
                />
              ))}
            </div>
          ) : venues.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-[#E6E4DD] bg-white">
              <p className="font-display text-base font-semibold text-[#141413] mb-1">
                Sin coincidencias en el catálogo
              </p>
              <p className="text-sm text-[#57564F] mb-4">
                Prueba limpiando los filtros o registra un nuevo local con sus instrumentos y servicios.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setItemTypeFilter('all');
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] text-[#141413] hover:border-[#141413] cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <article
                  key={venue.id}
                  className={`group rounded-xl border bg-white overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    selectedVenueId === venue.id
                      ? 'border-[#A16207]'
                      : 'border-[#E6E4DD]'
                  }`}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[#F3F2EE]">
                    <VenueImage venue={venue} />
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Clean unboxed metadata (zero-pill rule) */}
                    <div className="flex items-center gap-2 text-xs text-[#71716A] mb-1.5">
                      <span>{CATEGORY_LABELS[venue.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {venue.neighborhood || 'CDMX'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums shrink-0">
                        {venue.items.length} registros
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-semibold text-[#141413] leading-snug mb-1.5">
                      {venue.name}
                    </h3>

                    <p className="text-xs text-[#57564F] line-clamp-2 mb-3">
                      {venue.address}
                    </p>

                    {venue.contact_phone && (
                      <p className="text-xs text-[#44443F] flex items-center gap-1.5 mb-3">
                        <Phone className="w-3.5 h-3.5 text-[#71716A] shrink-0" />
                        <span className="tabular-nums">
                          {venue.contact_phone}
                        </span>
                      </p>
                    )}

                    {/* Preview items with tabular prices */}
                    <div className="border-t border-[#E6E4DD] pt-3 mt-auto space-y-2">
                      {venue.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-baseline justify-between gap-2 text-xs"
                        >
                          <span className="text-[#272724] truncate">
                            <span className="text-[#71716A]">
                              {ITEM_TYPE_LABELS[item.item_type]} ·{' '}
                            </span>
                            {item.name}
                          </span>
                          <span className="font-mono tabular-nums font-medium text-[#141413] shrink-0">
                            {formatPrice(item.price, item.currency)}
                          </span>
                        </div>
                      ))}
                      {venue.items.length === 0 && (
                        <p className="text-xs text-[#71716A]">
                          Sin artículos registrados aún.
                        </p>
                      )}
                    </div>

                    {/* Card actions */}
                    <div className="pt-4 mt-4 border-t border-[#E6E4DD] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawerVenueId(venue.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#141413] text-white hover:bg-[#2C2C2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Ver catálogo
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFocusVenueOnMap(venue.id)}
                          aria-label={`Ubicar ${venue.name} en el mapa`}
                          title="Ubicar en el mapa"
                          className="p-1.5 rounded-md text-[#57564F] hover:text-[#A16207] hover:bg-[#F3F2EE] transition-colors cursor-pointer"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVenue(venue);
                            setFormModalOpen(true);
                          }}
                          aria-label={`Editar ${venue.name}`}
                          title="Editar local"
                          className="p-1.5 rounded-md text-[#57564F] hover:text-[#141413] hover:bg-[#F3F2EE] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {confirmDeleteVenueId === venue.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleDeleteVenue(venue.id)}
                              aria-label={`Confirmar eliminar ${venue.name}`}
                              className="p-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteVenueId(null)}
                              aria-label="Cancelar eliminación"
                              className="p-1.5 rounded-md text-[#57564F] hover:bg-[#F3F2EE] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteVenueId(venue.id)}
                            aria-label={`Eliminar ${venue.name}`}
                            title="Eliminar local"
                            className="p-1.5 rounded-md text-[#57564F] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-[#E6E4DD] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71716A]">
          <p>Atempo — Directorio de tiendas, estudios y escuelas de música</p>
          <div className="flex items-center gap-6">
            <a href="#mapa" className="hover:text-[#141413] transition-colors">
              Mapa interactivo
            </a>
            <a
              href="#asistente"
              className="hover:text-[#141413] transition-colors"
            >
              Asistente IA
            </a>
            <button
              type="button"
              onClick={() => setDeployModalOpen(true)}
              className="hover:text-[#141413] transition-colors cursor-pointer"
            >
              Configuración Supabase y Render
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <VenueFormModal
        isOpen={formModalOpen}
        editingVenue={editingVenue}
        onClose={() => {
          setFormModalOpen(false);
          setEditingVenue(null);
        }}
        onSaved={(saved) => {
          void fetchVenues();
          setSelectedVenueId(saved.id);
        }}
      />

      <VenueDetailDrawer
        venue={drawerVenue}
        onClose={() => setDrawerVenueId(null)}
        onFocusOnMap={handleFocusVenueOnMap}
        onCatalogMutated={fetchVenues}
      />

      <DeployGuideModal
        isOpen={deployModalOpen}
        supabaseConfigured={supabaseConfigured}
        onClose={() => setDeployModalOpen(false)}
        onSeeded={fetchVenues}
      />
    </div>
  );
}
