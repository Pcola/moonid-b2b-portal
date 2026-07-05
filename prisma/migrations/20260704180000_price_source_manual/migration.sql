-- Zmluvné ceny: nová hodnota PriceSource.MANUAL pre staffom zadané override ceny.
-- PG12+ dovolí pridať hodnotu enumu aj v transakcii (nesmie sa v tej istej txn použiť — nepoužíva).
ALTER TYPE "PriceSource" ADD VALUE IF NOT EXISTS 'MANUAL';
