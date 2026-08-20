-- ============================================================================
-- Moonid ↔ Pohoda agent — bezpečnostná hranica (RPC fasáda)
-- ----------------------------------------------------------------------------
-- Agent beží na Pohoda notebooku a pripája sa do Supabase ako rola `pohoda_agent`.
-- Táto rola NEMÁ priamy prístup k tabuľkám — vie volať LEN tieto SECURITY DEFINER
-- funkcie. Samotný zápis do tabuliek robia funkcie (vlastník = admin), takže agent
-- nikdy nevidí surové dáta/PII a nemôže meniť nič mimo definovaného kontraktu.
--
-- Legacy break-glass mirror. Kanonická definícia je vo verzovanej Prisma migrácii
-- 20260820150000_security_objects a nasadzuje sa cez `prisma migrate deploy`.
-- Heslo agenta NIE je v súbore — nastav/rotuj zvlášť:  ALTER ROLE pohoda_agent PASSWORD '...';
-- ============================================================================

-- 1) rola agenta (login, bez hesla v súbore)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pohoda_agent') THEN
    CREATE ROLE pohoda_agent LOGIN;
  END IF;
END
$$;

-- žiadne tabuľkové práva; len volať funkcie nižšie
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM pohoda_agent;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM pohoda_agent;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM pohoda_agent;
GRANT USAGE ON SCHEMA public TO pohoda_agent;

-- 2) HEARTBEAT — agent dá vedieť že žije (+ verzia, stav mServeru)
CREATE OR REPLACE FUNCTION pohoda_heartbeat(p_agent_version text, p_mserver_ok boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO "SyncState"(id, "lastHeartbeatAt", "agentVersion", "updatedAt")
  VALUES ('singleton', now(), p_agent_version, now())
  ON CONFLICT (id) DO UPDATE SET "lastHeartbeatAt" = now(), "agentVersion" = p_agent_version, "updatedAt" = now();
END
$$;

-- 3) GET CURSORS — odkiaľ pokračovať v exporte (skz/ad/prices/fa)
CREATE OR REPLACE FUNCTION pohoda_get_cursors()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  INSERT INTO "SyncCursor"(id, "updatedAt") VALUES ('singleton', now()) ON CONFLICT (id) DO NOTHING;
  SELECT to_jsonb(c) INTO r FROM "SyncCursor" c WHERE id = 'singleton';
  RETURN r;
END
$$;

-- 4) INGEST STOCK — sklad z Pohody → Product.stockCache (cez most ProductLink)
--    p_items: [{"sku":"<SKz.IDS>","stock":<číslo>}, ...]
CREATE OR REPLACE FUNCTION pohoda_ingest_stock(p_items jsonb, p_cursor timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE "Product" p
     SET "stockCache" = (i.elem->>'stock')::numeric, "stockSyncedAt" = now()
    FROM jsonb_array_elements(p_items) AS i(elem)
    JOIN "ProductLink" l ON l."pohodaSku" = (i.elem->>'sku') AND l."linkStatus" = 'ACTIVE'
   WHERE p.id = l."productId" AND (i.elem->>'stock') IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO "SyncCursor"(id, "skz", "updatedAt") VALUES ('singleton', p_cursor, now())
  ON CONFLICT (id) DO UPDATE SET "skz" = p_cursor, "updatedAt" = now();

  INSERT INTO "SyncState"(id, "lastStockSyncAt", "lastInboundAt", "updatedAt")
  VALUES ('singleton', now(), now(), now())
  ON CONFLICT (id) DO UPDATE SET "lastStockSyncAt" = now(), "lastInboundAt" = now(), "updatedAt" = now();

  RETURN v_count;
END
$$;

-- 6) INGEST INVOICES — faktúry z Pohody → Invoice (match na firmu cez IČO), idempotentne.
--    p_items: [{"pohodaNumber":"2026001","ico":"12345678","issuedAt":"ISO","dueAt":"ISO",
--               "paidAt":"ISO"|null,"subtotal":num,"vat":num,"total":num,"sourceDbYear":int|null}, ...]
--    Stav sa odvodí: paidAt -> PAID, inak dueAt<now -> OVERDUE, inak PENDING.
--    Faktúry firiem, ktoré nie sú v portáli (neznáme IČO), sa preskočia.
CREATE OR REPLACE FUNCTION pohoda_ingest_invoices(p_items jsonb, p_cursor timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; it jsonb; v_company text; v_paid timestamptz; v_due timestamptz; v_status "InvoiceStatus";
BEGIN
  FOR it IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT id INTO v_company FROM "Company" WHERE ico = (it->>'ico');
    IF v_company IS NULL THEN CONTINUE; END IF;

    v_paid := NULLIF(it->>'paidAt', '')::timestamptz;
    v_due  := (it->>'dueAt')::timestamptz;
    v_status := CASE WHEN v_paid IS NOT NULL THEN 'PAID'
                     WHEN v_due < now() THEN 'OVERDUE'
                     ELSE 'PENDING' END;

    INSERT INTO "Invoice"(id, "pohodaNumber", "companyId", status, "issuedAt", "dueAt", "paidAt",
                          subtotal, vat, total, "sourceDbYear", "syncedAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, it->>'pohodaNumber', v_company, v_status,
            (it->>'issuedAt')::timestamptz, v_due, v_paid,
            (it->>'subtotal')::numeric, (it->>'vat')::numeric, (it->>'total')::numeric,
            NULLIF(it->>'sourceDbYear', '')::int, now(), now(), now())
    ON CONFLICT ("pohodaNumber") DO UPDATE SET
      status = EXCLUDED.status, "dueAt" = EXCLUDED."dueAt", "paidAt" = EXCLUDED."paidAt",
      subtotal = EXCLUDED.subtotal, vat = EXCLUDED.vat, total = EXCLUDED.total,
      "companyId" = EXCLUDED."companyId", "syncedAt" = now(), "updatedAt" = now();

    INSERT INTO "DocDedup"(id, "docType", "docNumber", "docDate", "createdAt")
    VALUES (gen_random_uuid()::text, 'FA', it->>'pohodaNumber', (it->>'issuedAt')::timestamptz, now())
    ON CONFLICT ("docType", "docNumber", "docDate") DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  INSERT INTO "SyncCursor"(id, "fa", "updatedAt") VALUES ('singleton', p_cursor, now())
  ON CONFLICT (id) DO UPDATE SET "fa" = p_cursor, "updatedAt" = now();
  INSERT INTO "SyncState"(id, "lastInboundAt", "updatedAt") VALUES ('singleton', now(), now())
  ON CONFLICT (id) DO UPDATE SET "lastInboundAt" = now(), "updatedAt" = now();

  RETURN v_count;
END
$$;

-- 5) granty: agent smie volať LEN tieto funkcie
GRANT EXECUTE ON FUNCTION pohoda_heartbeat(text, boolean) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION pohoda_get_cursors() TO pohoda_agent;
GRANT EXECUTE ON FUNCTION pohoda_ingest_stock(jsonb, timestamptz) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION pohoda_ingest_invoices(jsonb, timestamptz) TO pohoda_agent;

-- 6) bezpečnostné dotiahnutie (SECURITY_AUDIT_2026-06-29.md — M-3a):
--    CREATE FUNCTION automaticky udeľuje EXECUTE roli PUBLIC, čím anon/authenticated
--    získavajú právo volať tieto SECURITY DEFINER funkcie. Odoberáme ho — volať smie
--    LEN pohoda_agent (explicitné granty vyššie). Bez tohto by stačilo vystaviť schému
--    public cez Data API a anon by mohol injektovať faktúry/sklad.
REVOKE EXECUTE ON FUNCTION pohoda_heartbeat(text, boolean)           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION pohoda_get_cursors()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION pohoda_ingest_stock(jsonb, timestamptz)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION pohoda_ingest_invoices(jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
