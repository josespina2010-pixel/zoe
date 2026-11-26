-- Esquema SQL para Supabase (PostgreSQL) — Atempo Catálogo Musical
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.venues (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null check (category in ('tienda', 'estudio', 'escuela')),
  address text not null,
  neighborhood text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  website text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  hours text not null default 'Lun - Sáb · 10:00 - 19:00',
  description text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id text primary key default gen_random_uuid()::text,
  venue_id text not null references public.venues(id) on delete cascade,
  item_type text not null check (item_type in ('instrumento', 'clase', 'servicio')),
  name text not null,
  brand_or_level text not null default '',
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'MXN',
  price_unit text not null default 'unidad',
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_venues_category on public.venues(category);
create index if not exists idx_catalog_items_venue_id on public.catalog_items(venue_id);
create index if not exists idx_catalog_items_type on public.catalog_items(item_type);

alter table public.venues enable row level security;
alter table public.catalog_items enable row level security;

-- Políticas para acceso desde el backend con SUPABASE_SERVICE_ROLE_KEY o lectura pública
drop policy if exists "Lectura pública de locales" on public.venues;
create policy "Lectura pública de locales"
  on public.venues for select using (true);

drop policy if exists "Lectura pública de catálogo" on public.catalog_items;
create policy "Lectura pública de catálogo"
  on public.catalog_items for select using (true);

-- Datos iniciales (6 locales: tiendas, estudios y escuelas de música)
insert into public.venues (id, name, category, address, neighborhood, contact_phone, contact_email, website, latitude, longitude, hours, description, image_url)
values
  (
    'v-casa-cuerda',
    'Casa Cuerda & Laudería Roma',
    'tienda',
    'Av. Álvaro Obregón 185, Roma Norte, Cuauhtémoc, CDMX',
    'Roma Norte',
    '+52 55 4120 8810',
    'hola@casacuerda.mx',
    'https://casacuerda.mx',
    19.4176,
    -99.1624,
    'Lun - Sáb · 10:30 - 20:00',
    'Tienda especializada en guitarras acústicas, eléctricas, bajos y ajuste profesional de laudería.',
    '/src/assets/images/venue_store_guitars_1795652876572.jpg'
  ),
  (
    'v-conservatorio-condesa',
    'Academia Armonía Condesa',
    'escuela',
    'Calle Tamaulipas 114, Hipódromo Condesa, Cuauhtémoc, CDMX',
    'Condesa',
    '+52 55 5286 3340',
    'admisiones@armoniacondesa.mx',
    'https://armoniacondesa.mx',
    19.4112,
    -99.1748,
    'Lun - Vie · 09:00 - 21:00 · Sáb · 09:00 - 15:00',
    'Escuela de formación musical contemporánea y clásica con clases individuales de piano, guitarra, canto y violín.',
    '/src/assets/images/venue_music_academy_1795652877506.jpg'
  ),
  (
    'v-estudio-tape',
    'Estudio Sónika Analog & Mix',
    'estudio',
    'Calle Marsella 52, Juárez, Cuauhtémoc, CDMX',
    'Juárez',
    '+52 55 5592 7105',
    'reservas@estudiosonika.mx',
    'https://estudiosonika.mx',
    19.4258,
    -99.1582,
    'Lun - Dom · 09:00 - 23:00',
    'Estudio de grabación híbrido con consola analógica, sala viva tratada acústicamente y cabinas de ensayo.',
    '/src/assets/images/venue_recording_studio_1795652877150.jpg'
  ),
  (
    'v-teclas-polanco',
    'Showroom Clave & Pedal Polanco',
    'tienda',
    'Av. Emilio Castelar 96, Polanco III Secc, Miguel Hidalgo, CDMX',
    'Polanco',
    '+52 55 5280 9421',
    'ventas@claveypedal.mx',
    'https://claveypedal.mx',
    19.4319,
    -99.1935,
    'Lun - Sáb · 10:00 - 19:30',
    'Distribuidor autorizado de pianos acústicos, teclados de escenario, guitarras eléctricas de gama alta y monitores.',
    '/src/assets/images/hero_music_atelier_1795652877122.jpg'
  ),
  (
    'v-escuela-coyoacan',
    'Centro Musical Coyoacán',
    'escuela',
    'Av. Francisco Sosa 208, Del Carmen, Coyoacán, CDMX',
    'Coyoacán',
    '+52 55 5658 1902',
    'contacto@centromusicalcoyoacan.mx',
    'https://centromusicalcoyoacan.mx',
    19.3498,
    -99.1674,
    'Lun - Sáb · 09:30 - 20:00',
    'Conservatorio vecinal enfocado en iniciación musical infantil, piano clásico, ensamble de jazz y guitarra acústica.',
    '/src/assets/images/venue_music_academy_1795652877506.jpg'
  ),
  (
    'v-bunker-narvarte',
    'Sala Resonancia & Ensayo Narvarte',
    'estudio',
    'Calle Diagonal San Antonio 1412, Narvarte Poniente, Benito Juárez, CDMX',
    'Narvarte',
    '+52 55 5543 6088',
    'agenda@salaresonancia.mx',
    'https://salaresonancia.mx',
    19.3932,
    -99.1536,
    'Lun - Dom · 10:00 - 22:00',
    'Salas de ensayo equipadas, producción vocal, mezcla estéreo y renta de backline para bandas.',
    '/src/assets/images/venue_recording_studio_1795652877150.jpg'
  )
on conflict (id) do nothing;

insert into public.catalog_items (id, venue_id, item_type, name, brand_or_level, description, price, currency, price_unit, in_stock)
values
  ('i-1', 'v-casa-cuerda', 'instrumento', 'Guitarra Acústica Yamaha FG800', 'Yamaha · Principiante / Intermedio', 'Tapa sólida de abeto, mástil cómodo y excelente proyección sonora para iniciar.', 6890.00, 'MXN', 'unidad', true),
  ('i-2', 'v-casa-cuerda', 'instrumento', 'Guitarra Eléctrica Fender Player Stratocaster', 'Fender · Intermedio / Pro', 'Pastillas Alnico 5 SSS, puente trémolo de 2 puntos y acabado sunburst clásico.', 18400.00, 'MXN', 'unidad', true),
  ('i-3', 'v-casa-cuerda', 'instrumento', 'Ukelele Concierto Kala KA-C', 'Kala · Principiante', 'Cuerpo de caoba satinada, ideal para niños y adultos que inician en música.', 2450.00, 'MXN', 'unidad', true),
  ('i-4', 'v-casa-cuerda', 'servicio', 'Calibración y Octavación de Guitarra', 'Servicio de Laudería', 'Ajuste de alma, altura de cuerdas, hidratación de diapasón y cambio de encordado.', 650.00, 'MXN', 'servicio', true),

  ('i-5', 'v-conservatorio-condesa', 'clase', 'Clases Individuales de Piano', 'Todos los niveles', 'Lectura de partituras, técnica armónica, repertorio clásico y contemporáneo (4 sesiones/mes).', 2200.00, 'MXN', 'mes', true),
  ('i-6', 'v-conservatorio-condesa', 'clase', 'Taller de Guitarra Acústica y Eléctrica', 'Principiante e Intermedio', 'Acordes, ritmo, improvisación y montaje de repertorio en sesiones de 60 minutos.', 1850.00, 'MXN', 'mes', true),
  ('i-7', 'v-conservatorio-condesa', 'clase', 'Clases de Violín y Solfeo', 'Iniciación y Avanzado', 'Postura, afinación, arco y teoría musical aplicada.', 2350.00, 'MXN', 'mes', true),

  ('i-8', 'v-estudio-tape', 'servicio', 'Sesión de Grabación con Ingeniero', 'Sala A · Consola Analógica', 'Incluye micrófonos de condensador, preamplificadores clase A y asistencia técnica.', 950.00, 'MXN', 'hora', true),
  ('i-9', 'v-estudio-tape', 'servicio', 'Mezcla y Masterización Estéreo', 'Producción Musical', 'Procesamiento híbrido y entrega de masters para plataformas de streaming.', 3800.00, 'MXN', 'canción', true),
  ('i-10', 'v-estudio-tape', 'servicio', 'Renta de Sala de Ensayo Acústica', 'Hasta 6 músicos', 'Equipada con batería completa, amplificadores de guitarra/bajo y PA vocal.', 420.00, 'MXN', 'hora', true),

  ('i-11', 'v-teclas-polanco', 'instrumento', 'Piano Digital Roland FP-30X', 'Roland · 88 teclas contrapesadas', 'Acción PHA-4 Standard, conectividad Bluetooth y sonido SuperNATURAL Piano.', 17900.00, 'MXN', 'unidad', true),
  ('i-12', 'v-teclas-polanco', 'instrumento', 'Guitarra Electroacústica Taylor 214ce', 'Taylor · Gama Profesional', 'Tapa sólida de abeto Sitka, corte veneciano y preamplificador ES2.', 28500.00, 'MXN', 'unidad', true),
  ('i-13', 'v-teclas-polanco', 'instrumento', 'Teclado Portátil Casio CT-S300', 'Casio · Principiante', '61 teclas sensibles al tacto, ligero y recomendado para primeros estudios de piano.', 4690.00, 'MXN', 'unidad', true),
  ('i-14', 'v-teclas-polanco', 'servicio', 'Afinación de Piano Acústico a Domicilio', 'Técnico Certificado', 'Afinación estándar A440 y revisión de martinetes y pedales.', 1600.00, 'MXN', 'servicio', true),

  ('i-15', 'v-escuela-coyoacan', 'clase', 'Clases de Piano Clásico y Jazz', 'Infantil, Juvenil y Adultos', 'Método progresivo en pianos verticales acústicos con recital semestral.', 1980.00, 'MXN', 'mes', true),
  ('i-16', 'v-escuela-coyoacan', 'clase', 'Iniciación Musical y Flauta Dulce', 'Edades 5 a 9 años', 'Educación auditiva, ritmo grupal e introducción a instrumentos melódicos.', 1450.00, 'MXN', 'mes', true),
  ('i-17', 'v-escuela-coyoacan', 'clase', 'Ensamble de Percusión y Batería', 'Principiante / Intermedio', 'Coordinación, lectura rítmica y práctica en ensamble en vivo.', 1900.00, 'MXN', 'mes', true),

  ('i-18', 'v-bunker-narvarte', 'servicio', 'Ensayo por Bloque (3 horas)', 'Sala Equipada', 'Incluye batería Pearl, amplificador Marshall, amplificador Ampeg y 3 micrófonos.', 1050.00, 'MXN', 'bloque 3h', true),
  ('i-19', 'v-bunker-narvarte', 'servicio', 'Grabación de Demo en Vivo (Multitrack)', 'Hasta 16 canales', 'Captura simultánea de banda completa con mezcla rápida incluida.', 2900.00, 'MXN', 'sesión', true),
  ('i-20', 'v-bunker-narvarte', 'instrumento', 'Paquete Guitarra Eléctrica Squier Debut + Amplificador', 'Fender Squier · Principiante', 'Kit completo con cable, correa, plumillas y amplificador de práctica de 10W.', 5950.00, 'MXN', 'kit', true)
on conflict (id) do nothing;
