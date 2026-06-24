using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace MoonidPohodaAgent;

/// <summary>
/// Komunikácia s portálom (Supabase) IBA cez RPC fasádu — rola pohoda_agent
/// nemá prístup k tabuľkám, vie volať len tieto funkcie (database/pohoda-agent.sql).
/// </summary>
public sealed class Portal(IConfiguration cfg, ILogger<Portal> log)
{
    private readonly string _conn = cfg["Supabase:ConnectionString"]
        ?? throw new InvalidOperationException("Chýba Supabase:ConnectionString v appsettings.json");

    private async Task<NpgsqlConnection> OpenAsync(CancellationToken ct)
    {
        var c = new NpgsqlConnection(_conn);
        await c.OpenAsync(ct);
        return c;
    }

    public async Task HeartbeatAsync(string version, bool mserverOk, CancellationToken ct)
    {
        await using var c = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT pohoda_heartbeat(@v, @m)", c);
        cmd.Parameters.AddWithValue("v", version);
        cmd.Parameters.AddWithValue("m", mserverOk);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    /// <summary>Vráti kurzory (skz/ad/prices/fa) — odkiaľ pokračovať v exporte.</summary>
    public async Task<JsonElement> GetCursorsAsync(CancellationToken ct)
    {
        await using var c = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT pohoda_get_cursors()", c);
        var res = await cmd.ExecuteScalarAsync(ct);
        return JsonDocument.Parse(res?.ToString() ?? "{}").RootElement.Clone();
    }

    /// <summary>Pošle stav skladu do portálu. Vráti počet aktualizovaných produktov.</summary>
    public async Task<int> IngestStockAsync(IReadOnlyList<StockItem> items, DateTime cursorUtc, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(items);
        await using var c = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT pohoda_ingest_stock(@items::jsonb, @cur::timestamptz)", c);
        cmd.Parameters.AddWithValue("items", json);
        cmd.Parameters.AddWithValue("cur", cursorUtc);
        var res = await cmd.ExecuteScalarAsync(ct);
        var n = Convert.ToInt32(res ?? 0);
        log.LogInformation("ingest_stock: poslaných {Sent} položiek, aktualizovaných {Updated} produktov", items.Count, n);
        return n;
    }
}

/// <summary>Jedna skladová položka: sku = Pohoda kód (SKz.IDS), stock = aktuálny stav.</summary>
public sealed record StockItem(string sku, decimal stock);
