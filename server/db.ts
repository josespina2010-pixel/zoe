import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { SEED_VENUES } from './seedData.ts';
import type {
  CatalogItem,
  CatalogItemInput,
  CatalogItemType,
  Venue,
  VenueCategory,
  VenueInput,
} from '../src/types/catalog.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'catalog-store.json');

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

function defaultImageForCategory(category: VenueCategory): string {
  if (category === 'tienda') {
    return '/src/assets/images/venue_store_guitars_1795652876572.jpg';
  }
  if (category === 'estudio') {
    return '/src/assets/images/venue_recording_studio_1795652877150.jpg';
  }
  return '/src/assets/images/venue_music_academy_1795652877506.jpg';
}

function readLocalStore(): Venue[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(SEED_VENUES, null, 2), 'utf8');
      return structuredClone(SEED_VENUES);
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Venue[];
    return Array.isArray(parsed) ? parsed : structuredClone(SEED_VENUES);
  } catch (err) {
    console.error('Error reading local catalog store:', err);
    return structuredClone(SEED_VENUES);
  }
}

function writeLocalStore(venues: Venue[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(venues, null, 2), 'utf8');
}

export interface ListFilter {
  q?: string;
  category?: VenueCategory | 'all';
  itemType?: CatalogItemType | 'all';
}

function filterVenuesInMemory(venues: Venue[], filter: ListFilter = {}): Venue[] {
  const q = filter.q?.trim().toLowerCase() ?? '';
  const category = filter.category && filter.category !== 'all' ? filter.category : null;
  const itemType = filter.itemType && filter.itemType !== 'all' ? filter.itemType : null;

  return venues
    .filter((venue) => {
      if (category && venue.category !== category) {
        return false;
      }
      if (itemType && !venue.items.some((item) => item.item_type === itemType)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const venueMatch =
        venue.name.toLowerCase().includes(q) ||
        venue.address.toLowerCase().includes(q) ||
        venue.neighborhood.toLowerCase().includes(q) ||
        venue.description.toLowerCase().includes(q);
      const itemMatch = venue.items.some(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.brand_or_level.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
      return venueMatch || itemMatch;
    })
    .map((venue) => {
      if (!itemType) return venue;
      return {
        ...venue,
        items: venue.items.filter((item) => item.item_type === itemType),
      };
    });
}

export async function listVenues(filter: ListFilter = {}): Promise<Venue[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return filterVenuesInMemory(readLocalStore(), filter);
  }

  try {
    const { data: venueRows, error: vErr } = await supabase
      .from('venues')
      .select('*')
      .order('created_at', { ascending: true });

    if (vErr) throw vErr;

    const { data: itemRows, error: iErr } = await supabase
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: true });

    if (iErr) throw iErr;

    const itemsByVenue = new Map<string, CatalogItem[]>();
    for (const row of itemRows ?? []) {
      const item: CatalogItem = {
        id: String(row.id),
        venue_id: String(row.venue_id),
        item_type: row.item_type as CatalogItemType,
        name: String(row.name),
        brand_or_level: String(row.brand_or_level ?? ''),
        description: String(row.description ?? ''),
        price: Number(row.price),
        currency: String(row.currency ?? 'MXN'),
        price_unit: String(row.price_unit ?? 'unidad'),
        in_stock: Boolean(row.in_stock ?? true),
        created_at: row.created_at ? String(row.created_at) : undefined,
      };
      const existing = itemsByVenue.get(item.venue_id) ?? [];
      existing.push(item);
      itemsByVenue.set(item.venue_id, existing);
    }

    const venues: Venue[] = (venueRows ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      category: row.category as VenueCategory,
      address: String(row.address),
      neighborhood: String(row.neighborhood ?? ''),
      contact_phone: String(row.contact_phone ?? ''),
      contact_email: String(row.contact_email ?? ''),
      website: String(row.website ?? ''),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      hours: String(row.hours ?? ''),
      description: String(row.description ?? ''),
      image_url:
        String(row.image_url ?? '').trim() ||
        defaultImageForCategory(row.category as VenueCategory),
      created_at: row.created_at ? String(row.created_at) : undefined,
      items: itemsByVenue.get(String(row.id)) ?? [],
    }));

    return filterVenuesInMemory(venues, filter);
  } catch (err) {
    console.error('Supabase listVenues failed:', err);
    throw new Error('No fue posible consultar los registros en Supabase.', {
      cause: err,
    });
  }
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const all = await listVenues();
  return all.find((v) => v.id === id) ?? null;
}

export async function createVenue(input: VenueInput): Promise<Venue> {
  const id = `v-${randomUUID().slice(0, 8)}`;
  const payload = {
    id,
    name: input.name.trim(),
    category: input.category,
    address: input.address.trim(),
    neighborhood: (input.neighborhood ?? '').trim(),
    contact_phone: input.contact_phone.trim(),
    contact_email: input.contact_email.trim(),
    website: (input.website ?? '').trim(),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    hours: (input.hours ?? 'Lun - Sáb · 10:00 - 19:00').trim(),
    description: (input.description ?? '').trim(),
    image_url:
      (input.image_url ?? '').trim() || defaultImageForCategory(input.category),
  };

  const supabase = getSupabase();
  if (!supabase) {
    const venues = readLocalStore();
    const created: Venue = { ...payload, items: [], created_at: new Date().toISOString() };
    venues.push(created);
    writeLocalStore(venues);
    return created;
  }

  try {
    const { data, error } = await supabase
      .from('venues')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return {
      ...payload,
      created_at: data?.created_at ? String(data.created_at) : undefined,
      items: [],
    };
  } catch (err) {
    console.error('Supabase createVenue failed:', err);
    throw new Error('No fue posible crear el local en Supabase.', { cause: err });
  }
}

export async function updateVenue(
  id: string,
  input: Partial<VenueInput>
): Promise<Venue | null> {
  const supabase = getSupabase();
  if (!supabase) {
    const venues = readLocalStore();
    const idx = venues.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    const current = venues[idx];
    const updated: Venue = {
      ...current,
      name: input.name !== undefined ? input.name.trim() : current.name,
      category: input.category ?? current.category,
      address: input.address !== undefined ? input.address.trim() : current.address,
      neighborhood:
        input.neighborhood !== undefined
          ? input.neighborhood.trim()
          : current.neighborhood,
      contact_phone:
        input.contact_phone !== undefined
          ? input.contact_phone.trim()
          : current.contact_phone,
      contact_email:
        input.contact_email !== undefined
          ? input.contact_email.trim()
          : current.contact_email,
      website: input.website !== undefined ? input.website.trim() : current.website,
      latitude:
        input.latitude !== undefined ? Number(input.latitude) : current.latitude,
      longitude:
        input.longitude !== undefined ? Number(input.longitude) : current.longitude,
      hours: input.hours !== undefined ? input.hours.trim() : current.hours,
      description:
        input.description !== undefined
          ? input.description.trim()
          : current.description,
      image_url:
        input.image_url !== undefined && input.image_url.trim()
          ? input.image_url.trim()
          : current.image_url,
    };
    venues[idx] = updated;
    writeLocalStore(venues);
    return updated;
  }

  try {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.category !== undefined) patch.category = input.category;
    if (input.address !== undefined) patch.address = input.address.trim();
    if (input.neighborhood !== undefined)
      patch.neighborhood = input.neighborhood.trim();
    if (input.contact_phone !== undefined)
      patch.contact_phone = input.contact_phone.trim();
    if (input.contact_email !== undefined)
      patch.contact_email = input.contact_email.trim();
    if (input.website !== undefined) patch.website = input.website.trim();
    if (input.latitude !== undefined) patch.latitude = Number(input.latitude);
    if (input.longitude !== undefined) patch.longitude = Number(input.longitude);
    if (input.hours !== undefined) patch.hours = input.hours.trim();
    if (input.description !== undefined)
      patch.description = input.description.trim();
    if (input.image_url !== undefined && input.image_url.trim())
      patch.image_url = input.image_url.trim();

    const { error } = await supabase.from('venues').update(patch).eq('id', id);
    if (error) throw error;
    return await getVenueById(id);
  } catch (err) {
    console.error('Supabase updateVenue failed:', err);
    throw new Error('No fue posible actualizar el local en Supabase.', {
      cause: err,
    });
  }
}

export async function deleteVenue(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const venues = readLocalStore();
    const filtered = venues.filter((v) => v.id !== id);
    if (filtered.length === venues.length) return false;
    writeLocalStore(filtered);
    return true;
  }

  try {
    const { error } = await supabase.from('venues').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase deleteVenue failed:', err);
    throw new Error('No fue posible eliminar el local en Supabase.', {
      cause: err,
    });
  }
}

export async function createCatalogItem(
  input: CatalogItemInput
): Promise<CatalogItem> {
  const id = `i-${randomUUID().slice(0, 8)}`;
  const payload: CatalogItem = {
    id,
    venue_id: input.venue_id,
    item_type: input.item_type,
    name: input.name.trim(),
    brand_or_level: (input.brand_or_level ?? '').trim(),
    description: (input.description ?? '').trim(),
    price: Number(input.price),
    currency: (input.currency ?? 'MXN').trim() || 'MXN',
    price_unit: (input.price_unit ?? 'unidad').trim() || 'unidad',
    in_stock: input.in_stock ?? true,
  };

  const supabase = getSupabase();
  if (!supabase) {
    const venues = readLocalStore();
    const venue = venues.find((v) => v.id === input.venue_id);
    if (!venue) {
      throw new Error('El local especificado no existe.');
    }
    const created = { ...payload, created_at: new Date().toISOString() };
    venue.items.push(created);
    writeLocalStore(venues);
    return created;
  }

  try {
    const { data, error } = await supabase
      .from('catalog_items')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return {
      ...payload,
      created_at: data?.created_at ? String(data.created_at) : undefined,
    };
  } catch (err) {
    console.error('Supabase createCatalogItem failed:', err);
    throw new Error('No fue posible agregar el elemento al catálogo.', {
      cause: err,
    });
  }
}

export async function updateCatalogItem(
  id: string,
  input: Partial<CatalogItemInput>
): Promise<CatalogItem | null> {
  const supabase = getSupabase();
  if (!supabase) {
    const venues = readLocalStore();
    for (const venue of venues) {
      const idx = venue.items.findIndex((i) => i.id === id);
      if (idx !== -1) {
        const current = venue.items[idx];
        const updated: CatalogItem = {
          ...current,
          item_type: input.item_type ?? current.item_type,
          name: input.name !== undefined ? input.name.trim() : current.name,
          brand_or_level:
            input.brand_or_level !== undefined
              ? input.brand_or_level.trim()
              : current.brand_or_level,
          description:
            input.description !== undefined
              ? input.description.trim()
              : current.description,
          price: input.price !== undefined ? Number(input.price) : current.price,
          currency:
            input.currency !== undefined ? input.currency.trim() : current.currency,
          price_unit:
            input.price_unit !== undefined
              ? input.price_unit.trim()
              : current.price_unit,
          in_stock:
            input.in_stock !== undefined ? input.in_stock : current.in_stock,
        };
        venue.items[idx] = updated;
        writeLocalStore(venues);
        return updated;
      }
    }
    return null;
  }

  try {
    const patch: Record<string, unknown> = {};
    if (input.item_type !== undefined) patch.item_type = input.item_type;
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.brand_or_level !== undefined)
      patch.brand_or_level = input.brand_or_level.trim();
    if (input.description !== undefined)
      patch.description = input.description.trim();
    if (input.price !== undefined) patch.price = Number(input.price);
    if (input.currency !== undefined) patch.currency = input.currency.trim();
    if (input.price_unit !== undefined)
      patch.price_unit = input.price_unit.trim();
    if (input.in_stock !== undefined) patch.in_stock = input.in_stock;

    const { data, error } = await supabase
      .from('catalog_items')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;
    return {
      id: String(data.id),
      venue_id: String(data.venue_id),
      item_type: data.item_type as CatalogItemType,
      name: String(data.name),
      brand_or_level: String(data.brand_or_level ?? ''),
      description: String(data.description ?? ''),
      price: Number(data.price),
      currency: String(data.currency ?? 'MXN'),
      price_unit: String(data.price_unit ?? 'unidad'),
      in_stock: Boolean(data.in_stock ?? true),
      created_at: data.created_at ? String(data.created_at) : undefined,
    };
  } catch (err) {
    console.error('Supabase updateCatalogItem failed:', err);
    throw new Error('No fue posible actualizar el artículo en Supabase.', {
      cause: err,
    });
  }
}

export async function deleteCatalogItem(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const venues = readLocalStore();
    let removed = false;
    for (const venue of venues) {
      const before = venue.items.length;
      venue.items = venue.items.filter((i) => i.id !== id);
      if (venue.items.length < before) {
        removed = true;
      }
    }
    if (removed) writeLocalStore(venues);
    return removed;
  }

  try {
    const { error } = await supabase.from('catalog_items').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase deleteCatalogItem failed:', err);
    throw new Error('No fue posible eliminar el artículo en Supabase.', {
      cause: err,
    });
  }
}

export async function seedDatabaseIfEmpty(): Promise<{ inserted: number }> {
  const supabase = getSupabase();
  if (!supabase) {
    writeLocalStore(structuredClone(SEED_VENUES));
    return { inserted: SEED_VENUES.length };
  }

  try {
    const { count, error: countErr } = await supabase
      .from('venues')
      .select('id', { count: 'exact', head: true });
    if (countErr) throw countErr;
    if ((count ?? 0) > 0) {
      return { inserted: 0 };
    }

    const venueRows = SEED_VENUES.map(({ items: _items, ...venue }) => venue);
    const { error: vErr } = await supabase.from('venues').insert(venueRows);
    if (vErr) throw vErr;

    const itemRows = SEED_VENUES.flatMap((v) => v.items);
    const { error: iErr } = await supabase.from('catalog_items').insert(itemRows);
    if (iErr) throw iErr;

    return { inserted: SEED_VENUES.length };
  } catch (err) {
    console.error('Supabase seedDatabaseIfEmpty failed:', err);
    throw new Error('No fue posible sembrar los datos iniciales en Supabase.', {
      cause: err,
    });
  }
}
