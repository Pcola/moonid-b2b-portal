-- ============================================================
--  Moonid B2B Portál — PostgreSQL schéma + Row-Level Security
--  Referencia pre handoff. Cieľ: Supabase (Postgres) alebo AWS RDS.
--  Prisma schéma je v ../prisma/schema.prisma — toto je SQL pohľad
--  vrátane RLS politík, ktoré Prisma sama negeneruje.
-- ============================================================

-- ---------- Enumy ----------
CREATE TYPE role AS ENUM ('CUSTOMER_USER','CUSTOMER_ADMIN','STAFF','ADMIN');
CREATE TYPE order_status AS ENUM ('NOVA','PRIJATA','PRIPRAVUJE','NA_CESTE','DORUCENA','STORNO');
CREATE TYPE invoice_status AS ENUM ('DRAFT','PENDING','PAID','OVERDUE','CANCELLED');

-- ---------- Cenové úrovne ----------
CREATE TABLE price_tier (
  id           text PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  name         text NOT NULL,
  discount_pct numeric(5,2) NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- Firma (zákazník) ----------
CREATE TABLE company (
  id            text PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  ico           text UNIQUE,
  dic           text,
  ic_dph        text,
  city          text,
  address       text,
  price_tier_id text NOT NULL REFERENCES price_tier(id),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_tier ON company(price_tier_id);

-- ---------- Používateľ ----------
-- auth_id = id z auth providera (Supabase auth.users.id)
CREATE TABLE app_user (
  id          text PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     uuid UNIQUE NOT NULL,
  email       text UNIQUE NOT NULL,
  name        text,
  role        role NOT NULL DEFAULT 'CUSTOMER_USER',
  company_id  text REFERENCES company(id),
  mfa_enabled boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true,
  last_login  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_company ON app_user(company_id);
CREATE INDEX idx_user_role ON app_user(role);

-- ---------- Katalóg ----------
CREATE TABLE category (
  id         text PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  slug       text UNIQUE NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE product (
  id           text PRIMARY KEY DEFAULT gen_random_uuid(),
  sku          text UNIQUE NOT NULL,
  name         text NOT NULL,
  category_id  text NOT NULL REFERENCES category(id),
  pack_label   text,
  unit         text NOT NULL DEFAULT 'ks',
  list_price   numeric(10,2) NOT NULL,   -- MOC
  base_price   numeric(10,2) NOT NULL,   -- B2B základ pred tier zľavou
  vat_rate     numeric(4,2) NOT NULL DEFAULT 23.00,
  stock        int NOT NULL DEFAULT 0,
  low_stock_at int NOT NULL DEFAULT 10,
  active       boolean NOT NULL DEFAULT true,
  image_url    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_product_active ON product(active);

-- ---------- Objednávky ----------
CREATE TABLE "order" (
  id               text PRIMARY KEY DEFAULT gen_random_uuid(),
  number           text UNIQUE NOT NULL,
  company_id       text NOT NULL REFERENCES company(id),
  created_by_id    text NOT NULL REFERENCES app_user(id),
  status           order_status NOT NULL DEFAULT 'NOVA',
  note             text,
  delivery_name    text,
  delivery_address text,
  delivery_date    timestamptz,
  subtotal         numeric(10,2) NOT NULL DEFAULT 0,
  shipping         numeric(10,2) NOT NULL DEFAULT 0,
  vat_amount       numeric(10,2) NOT NULL DEFAULT 0,
  total            numeric(10,2) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_company ON "order"(company_id);
CREATE INDEX idx_order_status ON "order"(status);

CREATE TABLE order_item (
  id            text PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      text NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  product_id    text NOT NULL REFERENCES product(id),
  name_snapshot text NOT NULL,
  unit_price    numeric(10,2) NOT NULL,
  qty           int NOT NULL,
  line_total    numeric(10,2) NOT NULL
);
CREATE INDEX idx_item_order ON order_item(order_id);

CREATE TABLE order_status_event (
  id         text PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   text NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  status     order_status NOT NULL,
  changed_by text,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_order ON order_status_event(order_id);

-- ---------- Faktúry ----------
CREATE TABLE invoice (
  id         text PRIMARY KEY DEFAULT gen_random_uuid(),
  number     text UNIQUE NOT NULL,
  order_id   text UNIQUE NOT NULL REFERENCES "order"(id),
  company_id text NOT NULL REFERENCES company(id),
  status     invoice_status NOT NULL DEFAULT 'PENDING',
  issued_at  timestamptz NOT NULL DEFAULT now(),
  due_at     timestamptz NOT NULL,
  paid_at    timestamptz,
  subtotal   numeric(10,2) NOT NULL,
  vat_amount numeric(10,2) NOT NULL,
  total      numeric(10,2) NOT NULL,
  pdf_url    text,
  peppol_id  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_company ON invoice(company_id);
CREATE INDEX idx_invoice_status ON invoice(status);

-- ---------- Audit log ----------
CREATE TABLE audit_log (
  id         text PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text REFERENCES app_user(id),
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  meta       jsonb,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================
--  ROW-LEVEL SECURITY (kľúčové pre B2B bezpečnosť)
--  Zákazník vidí LEN dáta svojej firmy. Staff/Admin vidia všetko.
--  Predpoklad (Supabase): auth.uid() = app_user.auth_id
-- ============================================================

-- Pomocné funkcie
CREATE OR REPLACE FUNCTION current_app_user() RETURNS app_user AS $$
  SELECT * FROM app_user WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_company_id() RETURNS text AS $$
  SELECT company_id FROM app_user WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff() RETURNS boolean AS $$
  SELECT role IN ('STAFF','ADMIN') FROM app_user WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Zapnúť RLS
ALTER TABLE company            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product            ENABLE ROW LEVEL SECURITY;

-- Produkty: čítať môžu všetci prihlásení; meniť len staff
CREATE POLICY product_read ON product FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY product_write ON product FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Firma: zákazník vidí svoju; staff všetky
CREATE POLICY company_read ON company FOR SELECT
  USING (is_staff() OR id = current_company_id());
CREATE POLICY company_write ON company FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

-- Objednávky: zákazník vidí len svoje firemné; staff všetky
CREATE POLICY order_read ON "order" FOR SELECT
  USING (is_staff() OR company_id = current_company_id());
CREATE POLICY order_insert ON "order" FOR INSERT
  WITH CHECK (is_staff() OR company_id = current_company_id());
CREATE POLICY order_update ON "order" FOR UPDATE
  USING (is_staff());  -- stav objednávky mení len staff

-- Položky objednávky: cez väzbu na objednávku
CREATE POLICY order_item_read ON order_item FOR SELECT
  USING (is_staff() OR EXISTS (
    SELECT 1 FROM "order" o WHERE o.id = order_item.order_id
      AND o.company_id = current_company_id()));

-- Faktúry: zákazník len svoje; staff všetky
CREATE POLICY invoice_read ON invoice FOR SELECT
  USING (is_staff() OR company_id = current_company_id());
CREATE POLICY invoice_write ON invoice FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

-- Používatelia: vidí seba + kolegov vo firme; staff všetkých
CREATE POLICY user_read ON app_user FOR SELECT
  USING (is_staff() OR company_id = current_company_id() OR auth_id = auth.uid());

-- POZNÁMKA: audit_log a price_tier nech sú prístupné len cez server (service role),
-- nie priamo z klienta.
