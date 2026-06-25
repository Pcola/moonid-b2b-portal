using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;

namespace MoonidPohodaAgent;

/// <summary>
/// Komunikácia s Pohodou cez mServer (XML cez HTTP, lokálne na notebooku).
/// POZN.: presný formát listStock requestu/response sa doladí na REÁLNEJ vzorke z tvojho
/// mServeru — parsovanie je preto zámerne LENIENT (hľadá podľa local-name) a surovú
/// odpoveď loguje (Debug), aby sme ju vedeli naladiť. Zápis (objednávky) pribudne vo Fáze 3.
/// </summary>
public sealed class MServer(IConfiguration cfg, ILogger<MServer> log)
{
    private readonly string _baseUrl = (cfg["MServer:BaseUrl"] ?? "http://127.0.0.1:5470").TrimEnd('/');
    private readonly string _ico = cfg["MServer:Ico"] ?? "";
    private readonly string _user = cfg["MServer:User"] ?? "";
    private readonly string _pass = cfg["MServer:Password"] ?? "";
    private static readonly Encoding Win1250 = Encoding.GetEncoding("windows-1250");

    private HttpClient NewClient()
    {
        var http = new HttpClient { BaseAddress = new Uri(_baseUrl), Timeout = TimeSpan.FromSeconds(60) };
        // Auth = prihlasovací používateľ Pohody (HTTP Basic). Ak je User prázdny, mServer beží bez auth.
        if (!string.IsNullOrWhiteSpace(_user))
        {
            var basic = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_user}:{_pass}"));
            http.DefaultRequestHeaders.Add("Authorization", $"Basic {basic}");
            http.DefaultRequestHeaders.Add("STW-Authorization", $"Basic {basic}");
        }
        return http;
    }

    /// <summary>Vyžiada zoznam zásob a vráti (kód, stav). Prázdny zoznam = nič / chyba (zalogované).</summary>
    public async Task<IReadOnlyList<StockItem>> FetchStockAsync(CancellationToken ct)
    {
        // DataPack so žiadosťou o zoznam zásob (listStock). Doladí sa podľa edície/verzie.
        var request = $@"<?xml version=""1.0"" encoding=""Windows-1250""?>
<dat:dataPack version=""2.0"" id=""stock"" ico=""{_ico}"" application=""MoonidAgent"" note=""list stock""
  xmlns:dat=""http://www.stormware.cz/schema/version_2/data.xsd""
  xmlns:lStk=""http://www.stormware.cz/schema/version_2/list_stock.xsd"">
  <dat:dataPackItem id=""s1"" version=""2.0"">
    <lStk:listStockRequest version=""2.0"" stockVersion=""2.0"">
      <lStk:requestStock />
    </lStk:listStockRequest>
  </dat:dataPackItem>
</dat:dataPack>";

        string body;
        try
        {
            using var http = NewClient();
            using var content = new ByteArrayContent(Win1250.GetBytes(request));
            content.Headers.TryAddWithoutValidation("Content-Type", "text/xml; charset=Windows-1250");
            using var resp = await http.PostAsync("/xml", content, ct);
            var bytes = await resp.Content.ReadAsByteArrayAsync(ct);
            body = Win1250.GetString(bytes);
            if (!resp.IsSuccessStatusCode)
            {
                log.LogError("mServer HTTP {Code}: {Body}", (int)resp.StatusCode, Trim(body));
                return [];
            }
        }
        catch (Exception e)
        {
            log.LogError(e, "mServer nedostupný ({Url}) — Pohoda beží? mServer zapnutý?", _baseUrl);
            return [];
        }

        log.LogDebug("mServer raw response: {Body}", Trim(body, 2000));
        return Parse(body);
    }

    /// <summary>
    /// Lenient parse: nájde všetky elementy s local-name "stock"/"stockItem" a v nich
    /// kód (code/id) + stav (count). Naladí sa podľa reálnej vzorky.
    /// </summary>
    private IReadOnlyList<StockItem> Parse(string xml)
    {
        var items = new List<StockItem>();
        try
        {
            var doc = XDocument.Parse(xml);
            foreach (var el in doc.Descendants().Where(e => e.Name.LocalName is "stock"))
            {
                var code = LocalVal(el, "code") ?? LocalVal(el, "id");
                var count = LocalVal(el, "count");
                if (!string.IsNullOrWhiteSpace(code) && decimal.TryParse(count?.Replace(',', '.'),
                        System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var c))
                    items.Add(new StockItem(code!.Trim(), c));
            }
        }
        catch (Exception e)
        {
            log.LogError(e, "Nepodarilo sa rozparsovať mServer odpoveď (pošli vzorku na doladenie).");
        }
        log.LogInformation("mServer: prečítaných {N} skladových položiek", items.Count);
        return items;
    }

    // ---------- FAKTÚRY (Fáza 2) ----------

    /// <summary>Vyžiada zoznam vystavených faktúr (listInvoice). Prázdny zoznam = nič/chyba (zalogované).
    /// POZN.: presný formát listInvoice odpovede (názvy uzlov pre sumy/úhradu) sa DOLADÍ na reálnej
    /// vzorke z tvojho mServeru — parser je preto LENIENT a surovú odpoveď loguje (Debug).</summary>
    public async Task<IReadOnlyList<InvoiceItem>> FetchInvoicesAsync(CancellationToken ct)
    {
        var request = $@"<?xml version=""1.0"" encoding=""Windows-1250""?>
<dat:dataPack version=""2.0"" id=""inv"" ico=""{_ico}"" application=""MoonidAgent"" note=""list invoice""
  xmlns:dat=""http://www.stormware.cz/schema/version_2/data.xsd""
  xmlns:lst=""http://www.stormware.cz/schema/version_2/list_invoice.xsd"">
  <dat:dataPackItem id=""i1"" version=""2.0"">
    <lst:listInvoiceRequest version=""2.0"" invoiceType=""issuedInvoice"" invoiceVersion=""2.0"">
      <lst:requestInvoice />
    </lst:listInvoiceRequest>
  </dat:dataPackItem>
</dat:dataPack>";

        string body;
        try
        {
            using var http = NewClient();
            using var content = new ByteArrayContent(Win1250.GetBytes(request));
            content.Headers.TryAddWithoutValidation("Content-Type", "text/xml; charset=Windows-1250");
            using var resp = await http.PostAsync("/xml", content, ct);
            var bytes = await resp.Content.ReadAsByteArrayAsync(ct);
            body = Win1250.GetString(bytes);
            if (!resp.IsSuccessStatusCode)
            {
                log.LogError("mServer (faktúry) HTTP {Code}: {Body}", (int)resp.StatusCode, Trim(body));
                return [];
            }
        }
        catch (Exception e)
        {
            log.LogError(e, "mServer (faktúry) nedostupný ({Url})", _baseUrl);
            return [];
        }

        log.LogDebug("mServer invoice raw: {Body}", Trim(body, 3000));
        return ParseInvoices(body);
    }

    /// <summary>Lenient parse faktúr: každá faktúra = element local-name "invoice"; z nej číslo,
    /// IČO odberateľa, dátum vystavenia/splatnosti, úhrada a celková suma. Doladí sa na vzorke.</summary>
    private IReadOnlyList<InvoiceItem> ParseInvoices(string xml)
    {
        var items = new List<InvoiceItem>();
        try
        {
            var doc = XDocument.Parse(xml);
            foreach (var el in doc.Descendants().Where(e => e.Name.LocalName == "invoice"))
            {
                var number = LocalVal(el, "number") ?? LocalVal(el, "numberRequested") ?? LocalVal(el, "id");
                var ico = LocalVal(el, "ico");                 // IČO partnera (odberateľa) z partnerIdentity
                var issued = LocalVal(el, "date");
                var due = LocalVal(el, "dateDue") ?? LocalVal(el, "dateAccounting") ?? issued;
                var paid = LocalVal(el, "dateOfPayment");      // pri uhradenej faktúre (ak je v exporte)
                // celková suma — skús bežné názvy zo summary (doladí sa na reálnej vzorke):
                var total = ParseDec(LocalVal(el, "priceHighSum") ?? LocalVal(el, "round") ?? LocalVal(el, "priceNone") ?? LocalVal(el, "homeCurrency"));

                if (string.IsNullOrWhiteSpace(number) || string.IsNullOrWhiteSpace(ico) || string.IsNullOrWhiteSpace(issued))
                    continue;

                items.Add(new InvoiceItem(
                    number!.Trim(), ico!.Trim(), issued!.Trim(), (due ?? issued)!.Trim(),
                    string.IsNullOrWhiteSpace(paid) ? null : paid!.Trim(),
                    0m, 0m, total, null));   // subtotal/vat zatiaľ 0 (UI zobrazuje len total); doladíme na vzorke
            }
        }
        catch (Exception e) { log.LogError(e, "Nepodarilo sa rozparsovať faktúry (pošli vzorku na doladenie)."); }
        log.LogInformation("mServer: prečítaných {N} faktúr", items.Count);
        return items;
    }

    private static decimal ParseDec(string? s) =>
        decimal.TryParse(s?.Replace(',', '.'), System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : 0m;

    private static string? LocalVal(XElement parent, string localName) =>
        parent.Descendants().FirstOrDefault(e => e.Name.LocalName == localName)?.Value;

    private static string Trim(string s, int max = 600) => s.Length > max ? s[..max] + "…" : s;
}
