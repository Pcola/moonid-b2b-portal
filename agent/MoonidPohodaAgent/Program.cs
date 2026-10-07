using System.Text;
using Microsoft.Extensions.Configuration;
using MoonidPohodaAgent;
using Npgsql;

// Windows-1250 (Pohoda XML kódovanie) — treba zaregistrovať code-page provider
Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

var builder = Host.CreateApplicationBuilder(args);

// beží ako Windows služba (auto-štart, auto-restart) aj ako konzola (na ladenie)
builder.Services.AddWindowsService(o => o.ServiceName = "MoonidPohodaAgent");

// Lokálny súbor je gitignored a prepisuje iba bezpečné zástupné hodnoty z appsettings.json.
// Environment premenné a CLI znovu pridávame zaň, aby mali pri nasadení najvyššiu prioritu.
builder.Configuration
    .AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true)
    // Windows služba môže mať working directory C:\Windows\System32; preto hľadáme
    // lokálnu konfiguráciu aj priamo vedľa publikovaného executable.
    .AddJsonFile(Path.Combine(AppContext.BaseDirectory, "appsettings.local.json"), optional: true, reloadOnChange: true)
    .AddEnvironmentVariables()
    .AddCommandLine(args);

ValidateConfiguration(builder.Configuration);

builder.Services.AddSingleton<Portal>();
builder.Services.AddSingleton<MServer>();
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();

static void ValidateConfiguration(IConfiguration configuration)
{
    var connectionString = RequireConfigured(configuration, "Supabase:ConnectionString");
    NpgsqlConnectionStringBuilder database;
    try
    {
        database = new NpgsqlConnectionStringBuilder(connectionString);
    }
    catch (ArgumentException error)
    {
        throw new InvalidOperationException("Supabase:ConnectionString nemá platný PostgreSQL formát.", error);
    }

    ValidateConnectionPart("Host", database.Host);
    ValidateConnectionPart("Database", database.Database);
    ValidateConnectionPart("Username", database.Username);
    ValidateConnectionPart("Password", database.Password);

    if (database.SslMode != SslMode.VerifyFull)
        throw new InvalidOperationException("Supabase:ConnectionString musí používať SSL Mode=VerifyFull.");

    var baseUrl = RequireConfigured(configuration, "MServer:BaseUrl");
    if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri)
        || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
    {
        throw new InvalidOperationException("MServer:BaseUrl musí byť absolútna HTTP alebo HTTPS URL.");
    }

    _ = RequireConfigured(configuration, "MServer:Ico");

    var user = ValidateOptional(configuration, "MServer:User");
    var password = ValidateOptional(configuration, "MServer:Password");
    if (string.IsNullOrWhiteSpace(user) != string.IsNullOrWhiteSpace(password))
    {
        throw new InvalidOperationException(
            "MServer:User a MServer:Password musia byť buď vyplnené spolu, alebo oba prázdne.");
    }
}

static string RequireConfigured(IConfiguration configuration, string key)
{
    var value = configuration[key]?.Trim();
    if (string.IsNullOrWhiteSpace(value))
        throw new InvalidOperationException($"Chýba povinná konfigurácia {key}.");
    RejectPlaceholder(key, value);
    return value;
}

static string ValidateOptional(IConfiguration configuration, string key)
{
    var value = configuration[key]?.Trim() ?? string.Empty;
    RejectPlaceholder(key, value);
    return value;
}

static void ValidateConnectionPart(string name, string? value)
{
    if (string.IsNullOrWhiteSpace(value))
        throw new InvalidOperationException($"Supabase:ConnectionString neobsahuje {name}.");
    RejectPlaceholder($"Supabase:ConnectionString ({name})", value);
}

static void RejectPlaceholder(string key, string value)
{
    if (value.Contains('<', StringComparison.Ordinal) || value.Contains('>', StringComparison.Ordinal))
        throw new InvalidOperationException($"Konfigurácia {key} stále obsahuje zástupnú hodnotu.");
}
