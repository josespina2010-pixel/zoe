import { useState, type FormEvent } from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import type {
  CatalogItem,
  CatalogItemInput,
  CatalogItemType,
  Venue,
} from '../types/catalog';

interface VenueDetailDrawerProps {
  venue: Venue | null;
  onClose: () => void;
  onFocusOnMap: (venueId: string) => void;
  onCatalogMutated: () => Promise<void>;
}

const CATEGORY_LABEL: Record<Venue['category'], string> = {
  tienda: 'Tienda de Instrumentos',
  estudio: 'Estudio de Grabación / Ensayo',
  escuela: 'Escuela de Música',
};

const ITEM_TYPE_LABEL: Record<CatalogItemType, string> = {
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

export function VenueDetailDrawer({
  venue,
  onClose,
  onFocusOnMap,
  onCatalogMutated,
}: VenueDetailDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [itemType, setItemType] = useState<CatalogItemType>('instrumento');
  const [name, setName] = useState('');
  const [brandOrLevel, setBrandOrLevel] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('unidad');
  const [inStock, setInStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!venue) return null;

  function resetItemForm() {
    setItemType(venue?.category === 'escuela' ? 'clase' : venue?.category === 'estudio' ? 'servicio' : 'instrumento');
    setName('');
    setBrandOrLevel('');
    setDescription('');
    setPrice('');
    setPriceUnit(venue?.category === 'escuela' ? 'mes' : venue?.category === 'estudio' ? 'hora' : 'unidad');
    setInStock(true);
    setEditingItemId(null);
    setError(null);
  }

  function startEditItem(item: CatalogItem) {
    setEditingItemId(item.id);
    setShowAddForm(true);
    setItemType(item.item_type);
    setName(item.name);
    setBrandOrLevel(item.brand_or_level);
    setDescription(item.description);
    setPrice(String(item.price));
    setPriceUnit(item.price_unit);
    setInStock(item.in_stock);
    setError(null);
  }

  async function handleSaveItem(e: FormEvent) {
    e.preventDefault();
    if (!venue) return;
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Ingresa un precio válido mayor o igual a 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: CatalogItemInput = {
        venue_id: venue.id,
        item_type: itemType,
        name: name.trim(),
        brand_or_level: brandOrLevel.trim(),
        description: description.trim(),
        price: numericPrice,
        currency: 'MXN',
        price_unit: priceUnit.trim() || 'unidad',
        in_stock: inStock,
      };

      const url = editingItemId ? `/api/items/${editingItemId}` : '/api/items';
      const method = editingItemId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el registro.');
      }

      await onCatalogMutated();
      setShowAddForm(false);
      resetItemForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar el elemento.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el registro.');
      }
      setConfirmDeleteId(null);
      await onCatalogMutated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al eliminar el elemento.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-venue-title"
    >
      <div className="bg-white w-full max-w-xl h-full flex flex-col border-l border-[#E6E4DD] shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6E4DD] flex items-start justify-between gap-4 bg-[#FAFAF8]">
          <div className="min-w-0">
            <p className="text-xs text-[#71716A] mb-1">
              {CATEGORY_LABEL[venue.category]} · {venue.neighborhood || 'CDMX'}
            </p>
            <h2
              id="drawer-venue-title"
              className="font-display text-xl font-semibold text-[#141413] leading-snug"
            >
              {venue.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de catálogo"
            className="p-1.5 rounded-md text-[#57564F] hover:text-[#141413] hover:bg-[#E6E4DD]/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contact & Coordinates */}
          <div className="space-y-2.5 text-sm text-[#44443F] pb-5 border-b border-[#E6E4DD]">
            {venue.description && (
              <p className="text-[#272724] leading-relaxed mb-3">
                {venue.description}
              </p>
            )}
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-[#A16207] shrink-0" />
              <span>{venue.address}</span>
            </p>
            {venue.contact_phone && (
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#71716A] shrink-0" />
                <span className="tabular-nums">{venue.contact_phone}</span>
              </p>
            )}
            {venue.contact_email && (
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#71716A] shrink-0" />
                <span>{venue.contact_email}</span>
              </p>
            )}
            {venue.hours && (
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#71716A] shrink-0" />
                <span>{venue.hours}</span>
              </p>
            )}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs tabular-nums text-[#71716A]">
                Coord: {venue.latitude.toFixed(4)}, {venue.longitude.toFixed(4)}
              </span>
              <button
                type="button"
                onClick={() => {
                  onFocusOnMap(venue.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E6E4DD] bg-[#FAFAF8] text-[#141413] hover:border-[#141413] transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#A16207]" />
                <span>Ubicar en Google Maps</span>
              </button>
            </div>
          </div>

          {/* Catalog Management Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-[#141413]">
                Catálogo de instrumentos, clases y servicios
              </h3>
              <p className="text-xs text-[#71716A]">
                {venue.items.length} registros activos
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showAddForm) {
                  setShowAddForm(false);
                  resetItemForm();
                } else {
                  resetItemForm();
                  setShowAddForm(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#141413] text-white hover:bg-[#2C2C2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cerrar formulario' : 'Agregar artículo'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Add / Edit Catalog Item Form */}
          {showAddForm && (
            <form
              onSubmit={handleSaveItem}
              className="p-4 rounded-xl border border-[#E6E4DD] bg-[#FAFAF8] space-y-3.5"
            >
              <h4 className="text-xs font-semibold text-[#141413]">
                {editingItemId
                  ? 'Modificar artículo del catálogo'
                  : 'Nuevo instrumento, clase o servicio'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#44443F] mb-1">
                    Tipo *
                  </label>
                  <select
                    value={itemType}
                    onChange={(e) =>
                      setItemType(e.target.value as CatalogItemType)
                    }
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-[#E6E4DD] bg-white"
                  >
                    <option value="instrumento">Instrumento</option>
                    <option value="clase">Clase / Taller</option>
                    <option value="servicio">Servicio / Renta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#44443F] mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Clases de Piano"
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-[#E6E4DD] bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#44443F] mb-1">
                    Marca o Nivel
                  </label>
                  <input
                    type="text"
                    value={brandOrLevel}
                    onChange={(e) => setBrandOrLevel(e.target.value)}
                    placeholder="Ej. Yamaha / Principiante"
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-[#E6E4DD] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#44443F] mb-1">
                    Precio (MXN) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1800"
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-md border border-[#E6E4DD] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#44443F] mb-1">
                    Unidad de cobro
                  </label>
                  <input
                    type="text"
                    value={priceUnit}
                    onChange={(e) => setPriceUnit(e.target.value)}
                    placeholder="unidad / mes / hora"
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-[#E6E4DD] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#44443F] mb-1">
                  Descripción breve
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles técnicos, duración o requisitos"
                  className="w-full px-2.5 py-1.5 text-sm rounded-md border border-[#E6E4DD] bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-[#272724] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="rounded border-[#E6E4DD]"
                  />
                  <span>Disponible actualmente</span>
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#141413] text-white hover:bg-[#2C2C2A] disabled:opacity-50 cursor-pointer"
                >
                  {saving
                    ? 'Guardando…'
                    : editingItemId
                    ? 'Actualizar'
                    : 'Guardar artículo'}
                </button>
              </div>
            </form>
          )}

          {/* Items List */}
          {venue.items.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-[#E6E4DD] rounded-xl">
              <p className="text-sm text-[#57564F]">
                Este local aún no tiene instrumentos, clases o servicios registrados.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E6E4DD] border-t border-b border-[#E6E4DD]">
              {venue.items.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#71716A] mb-0.5">
                      {ITEM_TYPE_LABEL[item.item_type]}
                      {item.brand_or_level ? ` · ${item.brand_or_level}` : ''}
                      {!item.in_stock ? ' · Sin existencia' : ''}
                    </p>
                    <h4 className="text-sm font-semibold text-[#141413]">
                      {item.name}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-[#57564F] mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-mono text-sm font-medium tabular-nums text-[#141413]">
                      {formatPrice(item.price, item.currency)}
                      <span className="text-[11px] text-[#71716A] font-sans">
                        {' '}
                        / {item.price_unit}
                      </span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditItem(item)}
                        aria-label={`Editar ${item.name}`}
                        className="p-1.5 rounded text-[#57564F] hover:text-[#141413] hover:bg-[#F3F2EE] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {confirmDeleteId === item.id ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleDeleteItem(item.id)}
                          aria-label={`Confirmar eliminar ${item.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirmar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          aria-label={`Eliminar ${item.name}`}
                          className="p-1.5 rounded text-[#57564F] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
