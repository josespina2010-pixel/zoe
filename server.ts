import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import {
  createCatalogItem,
  createVenue,
  deleteCatalogItem,
  deleteVenue,
  getVenueById,
  isSupabaseConfigured,
  listVenues,
  seedDatabaseIfEmpty,
  updateCatalogItem,
  updateVenue,
} from './server/db.ts';
import { runMusicAssistant } from './server/gemini.ts';
import type {
  CatalogItemInput,
  CatalogItemType,
  VenueCategory,
  VenueInput,
} from './src/types/catalog.ts';

dotenv.config();

const VALID_CATEGORIES = new Set<VenueCategory>(['tienda', 'estudio', 'escuela']);
const VALID_ITEM_TYPES = new Set<CatalogItemType>([
  'instrumento',
  'clase',
  'servicio',
]);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // Public runtime config for browser Maps key (safe public browser-restricted key only)
  app.get('/api/maps-config', (_req, res) => {
    const apiKey = (
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ''
    ).trim();
    res.json({ apiKey });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      supabaseConfigured: isSupabaseConfigured(),
    });
  });

  // Venues CRUD + Search & Filter
  app.get('/api/venues', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const catRaw =
        typeof req.query.category === 'string' ? req.query.category : 'all';
      const typeRaw =
        typeof req.query.itemType === 'string' ? req.query.itemType : 'all';

      const category = VALID_CATEGORIES.has(catRaw as VenueCategory)
        ? (catRaw as VenueCategory)
        : 'all';
      const itemType = VALID_ITEM_TYPES.has(typeRaw as CatalogItemType)
        ? (typeRaw as CatalogItemType)
        : 'all';

      const venues = await listVenues({ q, category, itemType });
      res.json({
        venues,
        supabaseConfigured: isSupabaseConfigured(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al consultar locales.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/venues/:id', async (req, res) => {
    try {
      const venue = await getVenueById(req.params.id);
      if (!venue) {
        return res.status(404).json({ error: 'Local no encontrado.' });
      }
      res.json({ venue });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al obtener el local.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/venues', async (req, res) => {
    try {
      const body = req.body as Partial<VenueInput>;
      if (!body.name?.trim() || !body.address?.trim()) {
        return res
          .status(400)
          .json({ error: 'Nombre y dirección son obligatorios.' });
      }
      if (!body.category || !VALID_CATEGORIES.has(body.category)) {
        return res
          .status(400)
          .json({ error: 'Categoría inválida (tienda, estudio o escuela).' });
      }
      const lat = Number(body.latitude);
      const lng = Number(body.longitude);
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return res
          .status(400)
          .json({ error: 'Latitud y longitud válidas son obligatorias.' });
      }

      const venue = await createVenue({
        name: body.name,
        category: body.category,
        address: body.address,
        neighborhood: body.neighborhood ?? '',
        contact_phone: body.contact_phone ?? '',
        contact_email: body.contact_email ?? '',
        website: body.website ?? '',
        latitude: lat,
        longitude: lng,
        hours: body.hours,
        description: body.description,
        image_url: body.image_url,
      });

      res.status(201).json({ venue });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al registrar el local.';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/venues/:id', async (req, res) => {
    try {
      const body = req.body as Partial<VenueInput>;
      if (body.category !== undefined && !VALID_CATEGORIES.has(body.category)) {
        return res.status(400).json({ error: 'Categoría inválida.' });
      }
      if (body.latitude !== undefined) {
        const lat = Number(body.latitude);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
          return res.status(400).json({ error: 'Latitud inválida.' });
        }
      }
      if (body.longitude !== undefined) {
        const lng = Number(body.longitude);
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
          return res.status(400).json({ error: 'Longitud inválida.' });
        }
      }

      const updated = await updateVenue(req.params.id, body);
      if (!updated) {
        return res.status(404).json({ error: 'Local no encontrado.' });
      }
      res.json({ venue: updated });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al actualizar el local.';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/venues/:id', async (req, res) => {
    try {
      const deleted = await deleteVenue(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Local no encontrado.' });
      }
      res.json({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al eliminar el local.';
      res.status(500).json({ error: message });
    }
  });

  // Catalog Items CRUD
  app.post('/api/items', async (req, res) => {
    try {
      const body = req.body as Partial<CatalogItemInput>;
      if (!body.venue_id?.trim() || !body.name?.trim()) {
        return res
          .status(400)
          .json({ error: 'venue_id y nombre del artículo son obligatorios.' });
      }
      if (!body.item_type || !VALID_ITEM_TYPES.has(body.item_type)) {
        return res.status(400).json({
          error: 'Tipo inválido (instrumento, clase o servicio).',
        });
      }
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: 'El precio debe ser >= 0.' });
      }

      const item = await createCatalogItem({
        venue_id: body.venue_id,
        item_type: body.item_type,
        name: body.name,
        brand_or_level: body.brand_or_level,
        description: body.description,
        price,
        currency: body.currency,
        price_unit: body.price_unit,
        in_stock: body.in_stock,
      });

      res.status(201).json({ item });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al crear el artículo.';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/items/:id', async (req, res) => {
    try {
      const body = req.body as Partial<CatalogItemInput>;
      if (body.item_type !== undefined && !VALID_ITEM_TYPES.has(body.item_type)) {
        return res.status(400).json({ error: 'Tipo de artículo inválido.' });
      }
      if (body.price !== undefined) {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price < 0) {
          return res.status(400).json({ error: 'Precio inválido.' });
        }
      }

      const updated = await updateCatalogItem(req.params.id, body);
      if (!updated) {
        return res.status(404).json({ error: 'Artículo no encontrado.' });
      }
      res.json({ item: updated });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al actualizar el artículo.';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/items/:id', async (req, res) => {
    try {
      const deleted = await deleteCatalogItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Artículo no encontrado.' });
      }
      res.json({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al eliminar el artículo.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/seed', async (_req, res) => {
    try {
      const result = await seedDatabaseIfEmpty();
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al sembrar datos.';
      res.status(500).json({ error: message });
    }
  });

  // Gemini AI Assistant endpoint
  app.post('/api/assistant', async (req, res) => {
    try {
      const { message, history } = req.body as {
        message?: string;
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      };
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'El mensaje es obligatorio.' });
      }

      const result = await runMusicAssistant(
        message.trim(),
        Array.isArray(history) ? history : []
      );
      res.json(result);
    } catch (error) {
      console.error('Assistant API error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Error al consultar el asistente inteligente.';
      res.status(500).json({ error: message });
    }
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Atempo server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
