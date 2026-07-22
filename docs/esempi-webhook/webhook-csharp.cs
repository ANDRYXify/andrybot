// ---------------------------------------------------------------------------
// Modulo esterno per SocialBot — C# (.NET), ZERO dipendenze esterne
// (usa System.Net.HttpListener, incluso in .NET).
//
// COME SI AVVIA — due modi:
//
//  A) Con "dotnet script" (il più veloce, un file solo):
//        dotnet tool install -g dotnet-script    # una volta sola
//        dotnet script webhook-csharp.cs          # ascolta sulla porta 8099
//
//  B) Con un progetto minimale:
//        dotnet new console -o miobot && cd miobot
//        # sostituisci Program.cs con questo file, poi:
//        dotnet run
//
// SocialBot chiama questo servizio (azione "Chiama un webhook" di un modulo)
// con una POST JSON; noi rispondiamo { "reply": "..." } e SocialBot scrive il
// testo in chat con l'account dello streamer (solo se hai spuntato
// "usa la risposta"). Se non vuoi far dire niente, rispondi {} .
//
// Corpo che ricevi:
//   { "channel":"canale", "user":"spettatore", "display":"Spettatore",
//     "args":["ciao","mondo"], "argsRaw":"ciao mondo",
//     "evento":null, "variabili":{} }
//
// NB: mettilo dietro un URL pubblico https. SocialBot non chiama localhost.
// ---------------------------------------------------------------------------

using System;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json;

const int PORT = 8099;

using var listener = new HttpListener();
listener.Prefixes.Add($"http://0.0.0.0:{PORT}/");
listener.Start();
Console.WriteLine($"Modulo esterno C# in ascolto sulla porta {PORT}");

while (true)
{
    var ctx = listener.GetContext();
    var req = ctx.Request;
    var res = ctx.Response;

    if (req.HttpMethod != "POST")
    {
        res.StatusCode = 404;
        res.Close();
        continue;
    }

    string corpo;
    using (var lettore = new StreamReader(req.InputStream, Encoding.UTF8))
        corpo = lettore.ReadToEnd();

    string reply = CalcolaRisposta(corpo);
    byte[] outBytes = Encoding.UTF8.GetBytes(
        JsonSerializer.Serialize(new { reply }));

    res.ContentType = "application/json";
    res.ContentLength64 = outBytes.Length;
    res.OutputStream.Write(outBytes, 0, outBytes.Length);
    res.Close();
}

// Qui la TUA logica.
static string CalcolaRisposta(string corpoJson)
{
    string utente = "amico", argsRaw = "";
    bool hasPing = false;
    try
    {
        using var doc = JsonDocument.Parse(
            string.IsNullOrWhiteSpace(corpoJson) ? "{}" : corpoJson);
        var root = doc.RootElement;

        if (root.TryGetProperty("display", out var d) &&
            d.ValueKind == JsonValueKind.String && d.GetString()!.Length > 0)
            utente = d.GetString()!;
        else if (root.TryGetProperty("user", out var u) &&
                 u.ValueKind == JsonValueKind.String && u.GetString()!.Length > 0)
            utente = u.GetString()!;

        if (root.TryGetProperty("argsRaw", out var ar) &&
            ar.ValueKind == JsonValueKind.String)
            argsRaw = ar.GetString() ?? "";

        if (root.TryGetProperty("args", out var arr) &&
            arr.ValueKind == JsonValueKind.Array)
            foreach (var a in arr.EnumerateArray())
                if (a.ValueKind == JsonValueKind.String &&
                    string.Equals(a.GetString(), "ping", StringComparison.OrdinalIgnoreCase))
                    hasPing = true;
    }
    catch (JsonException) { /* corpo non JSON: usiamo i valori di default */ }

    if (hasPing) return $"🏓 Pong! Ciao {utente}.";
    if (argsRaw.Length > 0) return $"@{utente} hai detto: {argsRaw}";
    return $"Ciao {utente}! Sono il tuo modulo esterno in C# 🎯";
}
