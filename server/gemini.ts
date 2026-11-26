import {
  GoogleGenAI,
  Type,
  type Content,
  type FunctionDeclaration,
} from '@google/genai';
import { listVenues } from './db.ts';
import type { CatalogItemType, Venue, VenueCategory } from '../src/types/catalog.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY no está configurada. Configúrala en Settings > Secrets o en las variables de entorno del servidor.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const queryCatalogDeclaration: FunctionDeclaration = {
  name: 'query_catalog',
  description:
    'Consulta en tiempo real los locales musicales (tiendas, estudios y escuelas) y sus instrumentos, clases, servicios y precios almacenados en la base de datos.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description:
          'Filtrar por tipo de local: "tienda", "estudio", "escuela" o "all".',
      },
      item_type: {
        type: Type.STRING,
        description:
          'Filtrar por tipo de elemento en el catálogo: "instrumento", "clase", "servicio" o "all".',
      },
      search_text: {
        type: Type.STRING,
        description:
          'Palabra clave para buscar en nombres, descripciones, marcas o colonias (ej. "guitarra", "piano", "grabación", "violín").',
      },
      max_price: {
        type: Type.NUMBER,
        description: 'Precio máximo en MXN para filtrar artículos o clases.',
      },
    },
  },
};

const getAllVenuesSummaryDeclaration: FunctionDeclaration = {
  name: 'get_all_venues_summary',
  description:
    'Obtiene el directorio completo de todos los locales registrados en el catálogo con sus direcciones, teléfonos, correos, coordenadas y artículos disponibles.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function runMusicAssistant(
  userMessage: string,
  history: HistoryTurn[] = []
): Promise<{
  reply: string;
  referencedVenues: Array<{
    id: string;
    name: string;
    category: VenueCategory;
    neighborhood: string;
  }>;
}> {
  const ai = getAiClient();
  const referencedMap = new Map<
    string,
    { id: string; name: string; category: VenueCategory; neighborhood: string }
  >();

  const trackVenues = (venues: Venue[]) => {
    for (const v of venues) {
      referencedMap.set(v.id, {
        id: v.id,
        name: v.name,
        category: v.category,
        neighborhood: v.neighborhood || v.address,
      });
    }
  };

  const contents: Content[] = history.slice(-8).map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const systemInstruction = `Eres Atempo Asistente, un especialista musical inteligente conectado directamente al catálogo real de tiendas de instrumentos, estudios de grabación y escuelas de música almacenado en la base de datos del sistema.

Reglas estrictas:
1. SIEMPRE consulta las herramientas disponibles (query_catalog o get_all_venues_summary) antes de responder preguntas sobre tiendas, escuelas, estudios, precios, disponibilidad, clases o instrumentos en existencia. Nunca inventes locales, precios ni teléfonos.
2. Si el usuario hace una pregunta pedagógica o general (por ejemplo: "¿Qué instrumento es recomendable para comenzar a estudiar música?"), combina tu orientación musical práctica (edad, presupuesto, facilidad de inicio como guitarra acústica, teclado/piano o ukelele) con recomendaciones concretas de instrumentos para principiantes y escuelas de iniciación que SÍ existen en el catálogo consultado.
3. Responde siempre en español claro, estructurado y conciso. Incluye los nombres exactos de los locales, sus precios en MXN, dirección o colonia y contacto cuando ayude al usuario.
4. Si no existe ningún registro que coincida tras consultar la base de datos, dilo con honestidad y sugiere alternativas cercanas del catálogo.`;

  const tools = [
    {
      functionDeclarations: [
        queryCatalogDeclaration,
        getAllVenuesSummaryDeclaration,
      ],
    },
  ];

  let response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents,
    config: {
      systemInstruction,
      tools,
    },
  });

  for (let step = 0; step < 4; step++) {
    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      break;
    }

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) {
      contents.push(modelContent);
    }

    const toolParts = [];
    for (const call of functionCalls) {
      const args = (call.args ?? {}) as Record<string, unknown>;
      let resultData: unknown;

      if (call.name === 'query_catalog') {
        const category =
          typeof args.category === 'string' &&
          ['tienda', 'estudio', 'escuela'].includes(args.category)
            ? (args.category as VenueCategory)
            : 'all';
        const itemType =
          typeof args.item_type === 'string' &&
          ['instrumento', 'clase', 'servicio'].includes(args.item_type)
            ? (args.item_type as CatalogItemType)
            : 'all';
        const searchText =
          typeof args.search_text === 'string' ? args.search_text : '';
        const maxPrice =
          typeof args.max_price === 'number' ? args.max_price : undefined;

        let venues = await listVenues({
          category,
          itemType,
          q: searchText,
        });

        if (maxPrice !== undefined) {
          venues = venues
            .map((v) => ({
              ...v,
              items: v.items.filter((i) => i.price <= maxPrice),
            }))
            .filter((v) => v.items.length > 0);
        }

        trackVenues(venues);
        resultData = {
          total_venues: venues.length,
          venues: venues.map((v) => ({
            id: v.id,
            name: v.name,
            category: v.category,
            address: v.address,
            neighborhood: v.neighborhood,
            contact_phone: v.contact_phone,
            contact_email: v.contact_email,
            hours: v.hours,
            items: v.items.map((i) => ({
              name: i.name,
              item_type: i.item_type,
              brand_or_level: i.brand_or_level,
              price: i.price,
              currency: i.currency,
              price_unit: i.price_unit,
              in_stock: i.in_stock,
              description: i.description,
            })),
          })),
        };
      } else {
        const venues = await listVenues();
        trackVenues(venues);
        resultData = {
          total_venues: venues.length,
          venues: venues.map((v) => ({
            id: v.id,
            name: v.name,
            category: v.category,
            address: v.address,
            neighborhood: v.neighborhood,
            contact_phone: v.contact_phone,
            contact_email: v.contact_email,
            hours: v.hours,
            items: v.items.map((i) => ({
              name: i.name,
              item_type: i.item_type,
              brand_or_level: i.brand_or_level,
              price: i.price,
              currency: i.currency,
              price_unit: i.price_unit,
              in_stock: i.in_stock,
            })),
          })),
        };
      }

      toolParts.push({
        functionResponse: {
          id: call.id,
          name: call.name,
          response: resultData as Record<string, unknown>,
        },
      });
    }

    contents.push({
      role: 'user',
      parts: toolParts,
    });

    response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        tools,
      },
    });
  }

  return {
    reply:
      response.text?.trim() ||
      'No pude generar una respuesta en este momento. Intenta reformular tu consulta.',
    referencedVenues: Array.from(referencedMap.values()),
  };
}
