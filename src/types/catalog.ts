export type VenueCategory = 'tienda' | 'estudio' | 'escuela';
export type CatalogItemType = 'instrumento' | 'clase' | 'servicio';

export interface CatalogItem {
  id: string;
  venue_id: string;
  item_type: CatalogItemType;
  name: string;
  brand_or_level: string;
  description: string;
  price: number;
  currency: string;
  price_unit: string;
  in_stock: boolean;
  created_at?: string;
}

export interface Venue {
  id: string;
  name: string;
  category: VenueCategory;
  address: string;
  neighborhood: string;
  contact_phone: string;
  contact_email: string;
  website: string;
  latitude: number;
  longitude: number;
  hours: string;
  description: string;
  image_url: string;
  created_at?: string;
  items: CatalogItem[];
}

export interface VenueInput {
  name: string;
  category: VenueCategory;
  address: string;
  neighborhood?: string;
  contact_phone: string;
  contact_email: string;
  website?: string;
  latitude: number;
  longitude: number;
  hours?: string;
  description?: string;
  image_url?: string;
}

export interface CatalogItemInput {
  venue_id: string;
  item_type: CatalogItemType;
  name: string;
  brand_or_level?: string;
  description?: string;
  price: number;
  currency?: string;
  price_unit?: string;
  in_stock?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  referencedVenues?: Array<{
    id: string;
    name: string;
    category: VenueCategory;
    neighborhood: string;
  }>;
}
