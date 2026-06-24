using System.Text;
using MoonidPohodaAgent;

// Windows-1250 (Pohoda XML kódovanie) — treba zaregistrovať code-page provider
Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

var builder = Host.CreateApplicationBuilder(args);

// beží ako Windows služba (auto-štart, auto-restart) aj ako konzola (na ladenie)
builder.Services.AddWindowsService(o => o.ServiceName = "MoonidPohodaAgent");

builder.Services.AddSingleton<Portal>();
builder.Services.AddSingleton<MServer>();
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
