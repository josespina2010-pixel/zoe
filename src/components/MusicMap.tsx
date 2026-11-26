import { useEffect } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { Mail, MapPin, Phone, Clock, ArrowUpRight } from 'lucide-react';
import type { Venue, VenueCategory } from '../types/catalog';

interface MusicMapProps {
  apiKey: string;
  venues: Venue[];
  selectedVenueId: string | null;
  onSelectVenue: (venueId: string | null) => void;
  onOpenVenueCatalog: (venue: Venue) => void;
}

const CATEGORY_META: Record<
  VenueCategory,
  { label: string; bg: string; border: string; glyph: string }
> = {
  tienda: {
    label: 'Tienda de Instrumentos',
    bg: '#141413',
    border: '#141413',
    glyph: '#FDE68A',
  },
  estudio: {
    label: 'Estudio de Grabación / Ensayo',
    bg: '#A16207',
    border: '#78350F',
    glyph: '#FFFBEB',
  },
  escuela: {
    label: 'Escuela de Música',
    bg: '#1E40AF',
    border: '#1E3A8A',
    glyph: '#EFF6FF',
  },
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    maximumFractionDigits: 0,
  }).format(price);
}

function MapCameraSync({
  venues,
  selectedVenueId,
}: {
  venues: Venue[];
  selectedVenueId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedVenueId) return;
    const target = venues.find((v) => v.id === selectedVenueId);
    if (target) {
      map.panTo({ lat: target.latitude, lng: target.longitude });
      const currentZoom = map.getZoom() ?? 12;
      if (currentZoom < 14) {
        map.setZoom(14);
      }
    }
  }, [map, venues, selectedVenueId]);

  return null;
}

function VenueMarker({
  venue,
  isSelected,
  onSelect,
  onClose,
  onOpenCatalog,
}: {
  venue: Venue;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onOpenCatalog: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const style = CATEGORY_META[venue.category];

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: venue.latitude, lng: venue.longitude }}
        title={venue.name}
        onClick={onSelect}
        zIndex={isSelected ? 50 : 1}
      >
        <Pin
          background={style.bg}
          borderColor={style.border}
          glyphColor={style.glyph}
          scale={isSelected ? 1.2 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={onClose}
          maxWidth={320}
        >
          <div className="p-1 text-[#141413] font-sans">
            <p className="text-[11px] font-medium text-[#71716A] mb-0.5">
              {style.label} · {venue.neighborhood || 'CDMX'}
            </p>
            <h4 className="font-display text-base font-semibold leading-snug text-[#141413] mb-1.5">
              {venue.name}
            </h4>
            <p className="text-xs text-[#44443F] flex items-start gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#A16207]" />
              <span>{venue.address}</span>
            </p>
            {venue.contact_phone && (
              <p className="text-xs text-[#44443F] flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 shrink-0 text-[#71716A]" />
                <span className="tabular-nums">{venue.contact_phone}</span>
              </p>
            )}
            {venue.contact_email && (
              <p className="text-xs text-[#44443F] flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 shrink-0 text-[#71716A]" />
                <span>{venue.contact_email}</span>
              </p>
            )}
            {venue.hours && (
              <p className="text-xs text-[#71716A] flex items-center gap-1.5 mb-2.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{venue.hours}</span>
              </p>
            )}

            {venue.items.length > 0 && (
              <div className="border-t border-[#E6E4DD] pt-2 mb-2.5 space-y-1">
                {venue.items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="text-[#272724] truncate">{item.name}</span>
                    <span className="font-mono text-[11px] tabular-nums text-[#141413] shrink-0">
                      {formatPrice(item.price, item.currency)}
                    </span>
                  </div>
                ))}
                {venue.items.length > 3 && (
                  <p className="text-[11px] text-[#71716A]">
                    +{venue.items.length - 3} elementos más en catálogo
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenCatalog}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2C2C2A] transition-colors cursor-pointer"
            >
              <span>Ver catálogo completo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapStatusOverlay() {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.LOADING || status === APILoadingStatus.NOT_LOADED) {
    return (
      <div className="absolute inset-0 bg-[#F3F2EE]/80 flex items-center justify-center z-10 pointer-events-none">
        <p className="text-sm text-[#44443F]">Cargando mapa interactivo…</p>
      </div>
    );
  }

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="absolute inset-0 bg-[#F3F2EE] flex flex-col items-center justify-center p-6 text-center z-10">
        <p className="font-display text-base font-semibold text-[#141413] mb-1">
          No se pudo inicializar Google Maps
        </p>
        <p className="text-xs text-[#57564F] max-w-md">
          Verifica que la clave de Google Maps Platform esté habilitada y sin restricciones conflictivas.
        </p>
      </div>
    );
  }

  return null;
}

export function MusicMap({
  apiKey,
  venues,
  selectedVenueId,
  onSelectVenue,
  onOpenVenueCatalog,
}: MusicMapProps) {
  const defaultCenter =
    venues.length > 0
      ? { lat: venues[0].latitude, lng: venues[0].longitude }
      : { lat: 19.415, lng: -99.165 };

  if (!apiKey) {
    return (
      <div className="h-[520px] w-full rounded-xl border border-[#E6E4DD] bg-[#F3F2EE] flex flex-col items-center justify-center p-8 text-center">
        <MapPin className="w-8 h-8 text-[#A16207] mb-3" />
        <h3 className="font-display text-lg font-semibold text-[#141413] mb-1">
          Mapa de ubicaciones musicales
        </h3>
        <p className="text-sm text-[#57564F] max-w-md mb-4">
          Configura <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> para activar el mapa interactivo de Google Maps.
        </p>
        <div className="w-full max-w-md text-left divide-y divide-[#E6E4DD] border border-[#E6E4DD] rounded-lg bg-white">
          {venues.slice(0, 5).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onOpenVenueCatalog(v)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#FAFAF8] transition-colors cursor-pointer"
            >
              <span className="font-medium text-[#141413]">{v.name}</span>
              <span className="font-mono tabular-nums text-[#71716A]">
                {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[520px] w-full rounded-xl overflow-hidden border border-[#E6E4DD] bg-[#F3F2EE]">
        <APIProvider apiKey={apiKey} libraries={['marker']} language="es" region="MX">
          <MapStatusOverlay />
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={defaultCenter}
            defaultZoom={12}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            onClick={() => onSelectVenue(null)}
          >
            <MapCameraSync venues={venues} selectedVenueId={selectedVenueId} />
            {venues.map((venue) => (
              <VenueMarker
                key={venue.id}
                venue={venue}
                isSelected={selectedVenueId === venue.id}
                onSelect={() => onSelectVenue(venue.id)}
                onClose={() => onSelectVenue(null)}
                onOpenCatalog={() => onOpenVenueCatalog(venue)}
              />
            ))}
          </GoogleMap>
        </APIProvider>
      </div>

      {/* Quick location selector bar below map */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#57564F]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#141413] inline-block" />
            Tiendas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#A16207] inline-block" />
            Estudios
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1E40AF] inline-block" />
            Escuelas
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {venues.map((v) => {
            const active = selectedVenueId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVenue(v.id)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#141413] text-white border-[#141413]'
                    : 'bg-white text-[#44443F] border-[#E6E4DD] hover:border-[#141413]'
                }`}
              >
                {v.neighborhood || v.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
