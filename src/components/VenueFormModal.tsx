import { useState, useEffect, type FormEvent } from 'react';
import { X, MapPin } from 'lucide-react';
import type { Venue, VenueCategory, VenueInput } from '../types/catalog';

interface VenueFormModalProps {
  isOpen: boolean;
  editingVenue: Venue | null;
  onClose: () => void;
  onSaved: (venue: Venue) => void;
}

const NEIGHBORHOOD_PRESETS = [
  { label: 'Roma Norte', lat: 19.4195, lng: -99.1621 },
  { label: 'Condesa', lat: 19.4117, lng: -99.1742 },
  { label: 'Polanco', lat: 19.4326, lng: -99.193 },
  { label: 'Coyoacán', lat: 19.3502, lng: -99.1621 },
  { label: 'Juárez', lat: 19.4266, lng: -99.159 },
  { label: 'Del Valle', lat: 19.3834, lng: -99.1683 },
];

export function VenueFormModal({
  isOpen,
  editingVenue,
  onClose,
  onSaved,
}: VenueFormModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<VenueCategory>('tienda');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [hours, setHours] = useState('Lun - Sáb · 10:00 - 19:00');
  const [latitude, setLatitude] = useState('19.4195');
  const [longitude, setLongitude] = useState('-99.1621');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingVenue) {
      setName(editingVenue.name);
      setCategory(editingVenue.category);
      setAddress(editingVenue.address);
      setNeighborhood(editingVenue.neighborhood);
      setContactPhone(editingVenue.contact_phone);
      setContactEmail(editingVenue.contact_email);
      setWebsite(editingVenue.website);
      setHours(editingVenue.hours || 'Lun - Sáb · 10:00 - 19:00');
      setLatitude(String(editingVenue.latitude));
      setLongitude(String(editingVenue.longitude));
      setDescription(editingVenue.description);
    } else {
      setName('');
      setCategory('tienda');
      setAddress('');
      setNeighborhood('');
      setContactPhone('');
      setContactEmail('');
      setWebsite('');
      setHours('Lun - Sáb · 10:00 - 19:00');
      setLatitude('19.4195');
      setLongitude('-99.1621');
      setDescription('');
    }
    setError(null);
  }, [isOpen, editingVenue]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Ingresa coordenadas numéricas válidas para latitud y longitud.');
      return;
    }

    const payload: VenueInput = {
      name: name.trim(),
      category,
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim(),
      website: website.trim(),
      hours: hours.trim(),
      latitude: lat,
      longitude: lng,
      description: description.trim(),
    };

    setSubmitting(true);
    try {
      const url = editingVenue
        ? `/api/venues/${editingVenue.id}`
        : '/api/venues';
      const method = editingVenue ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { venue?: Venue; error?: string };
      if (!res.ok || !data.venue) {
        throw new Error(data.error || 'No se pudo guardar el local.');
      }
      onSaved(data.venue);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar el registro.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="venue-modal-title"
    >
      <div className="bg-white border border-[#E6E4DD] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#E6E4DD] flex items-center justify-between">
          <h2
            id="venue-modal-title"
            className="font-display text-lg font-semibold text-[#141413]"
          >
            {editingVenue ? 'Editar local musical' : 'Registrar nuevo local'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1.5 rounded-md text-[#57564F] hover:text-[#141413] hover:bg-[#F3F2EE] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#272724] mb-1.5">
                Nombre del local *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Casa Musical Del Valle"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#272724] mb-1.5">
                Tipo de local *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VenueCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
              >
                <option value="tienda">Tienda de instrumentos</option>
                <option value="estudio">Estudio de grabación</option>
                <option value="escuela">Escuela de música</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#272724] mb-1.5">
                Dirección completa *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, número, colonia y alcaldía"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#272724] mb-1.5">
                Zona / Colonia
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ej. Del Valle"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#272724] mb-1.5">
                Teléfono de contacto *
              </label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+52 55 0000 0000"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#272724] mb-1.5">
                Correo electrónico *
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contacto@local.mx"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#272724] mb-1.5">
                Horario
              </label>
              <input
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Lun - Sáb · 10:00 - 19:00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="pt-2 border-t border-[#E6E4DD]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-[#272724] inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#A16207]" />
                Ubicación geográfica (Google Maps)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {NEIGHBORHOOD_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setLatitude(String(preset.lat));
                      setLongitude(String(preset.lng));
                      if (!neighborhood) setNeighborhood(preset.label);
                    }}
                    className="px-2 py-0.5 text-[11px] rounded border border-[#E6E4DD] bg-[#FAFAF8] text-[#44443F] hover:border-[#141413] cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#57564F] mb-1">
                  Latitud *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#57564F] mb-1">
                  Longitud *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#57564F] mb-1">
                  Sitio web
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#272724] mb-1.5">
              Descripción del local
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Especialidades, marcas destacadas, servicios o enfoque pedagógico..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E6E4DD] bg-[#FAFAF8] focus:outline-none focus:border-[#141413]"
            />
          </div>

          <div className="pt-4 border-t border-[#E6E4DD] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#44443F] hover:text-[#141413] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-[#141413] text-white hover:bg-[#2C2C2A] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting
                ? 'Guardando…'
                : editingVenue
                ? 'Guardar cambios'
                : 'Registrar local'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
