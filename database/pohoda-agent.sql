-- ============================================================================
-- Moonid ↔ Pohoda agent — bezpečnostná hranica (RPC fasáda)
-- ----------------------------------------------------------------------------
-- Agent beží na Pohoda notebooku a pripája sa do Supabase ako rola `pohoda_agent`.
-- Táto rola NEMÁ priamy prístup k tabuľkám — vie volať LEN tieto SECURITY DEFINER
-- funkcie. Samotný zápis do tabuliek robia funkcie (vlastník = admin), takže agent
-- nikdy nevidí surové dáta/PII a nemôže meniť nič mimo definovaného kontraktu.
--
-- Aplikuj:  npm run pohoda:rpc      (prisma db execute --file ...)
-- DÔLEŽITÉ: spúšťať PO `prisma migrate deploy` (migrate môže zmazať granty).
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

-- 5) granty: agent smie volať LEN tieto funkcie
GRANT EXECUTE ON FUNCTION pohoda_heartbeat(text, boolean) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION pohoda_get_cursors() TO pohoda_agent;
GRANT EXECUTE ON FUNCTION pohoda_ingest_stock(jsonb, timestamptz) TO pohoda_agent;
