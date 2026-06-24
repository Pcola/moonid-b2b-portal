using Microsoft.Extensions.Configuration;

namespace MoonidPohodaAgent;

/// <summary>
/// Hlavná slučka agenta (Fáza 1 — inbound sklad, read-only).
/// Každé kolo: heartbeat → (get cursors) → načítaj sklad z mServeru → pošli do portálu → spi.
/// Keď notebook spí, slučka stojí spolu so strojom a po prebudení pokračuje.
/// </summary>
public sealed class Worker(Portal portal, MServer mserver, IConfiguration cfg, ILogger<Worker> log) : BackgroundService
{
    private readonly string _version = cfg["Agent:Version"] ?? "0.0.0";
    private readonly int _intervalSec = int.TryParse(cfg["Agent:StockIntervalSeconds"], out var s) ? s : 1800;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        log.LogInformation("Moonid Pohoda agent v{Version} štart — interval skladu {Sec}s", _version, _intervalSec);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var stock = await mserver.FetchStockAsync(stoppingToken);
                var mserverOk = stock.Count > 0;

                await portal.HeartbeatAsync(_version, mserverOk, stoppingToken);

                if (stock.Count > 0)
                    await portal.IngestStockAsync(stock, DateTime.UtcNow, stoppingToken);
                else
                    log.LogWarning("Žiadne skladové položky — mServer prázdny/nedostupný alebo treba doladiť parsovanie.");
            }
            catch (OperationCanceledException) { break; }
            catch (Exception e)
            {
                log.LogError(e, "Chyba v cykle agenta — skúsim znova o {Sec}s", _intervalSec);
            }

            try { await Task.Delay(TimeSpan.FromSeconds(_intervalSec), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }

        log.LogInformation("Agent končí.");
    }
}
