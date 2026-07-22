#!/usr/bin/env ruby
# ---------------------------------------------------------------------------
# Modulo esterno per SocialBot — Ruby, solo libreria standard (WEBrick).
#
# COME SI AVVIA:  ruby webhook-ruby.rb        (ascolta sulla porta 8099)
#   (se WEBrick non è presente:  gem install webrick )
#
# SocialBot chiama questo servizio (azione "Chiama un webhook" di un modulo)
# con una POST JSON; noi rispondiamo { "reply": "..." } e SocialBot scrive il
# testo in chat con l'account dello streamer (solo se hai spuntato
# "usa la risposta"). Se non vuoi far dire niente, rispondi {} .
#
# Corpo che ricevi:
#   { "channel":"canale", "user":"spettatore", "display":"Spettatore",
#     "args":["ciao","mondo"], "argsRaw":"ciao mondo",
#     "evento":null, "variabili":{} }
#
# NB: mettilo dietro un URL pubblico https. SocialBot non chiama localhost.
# ---------------------------------------------------------------------------

require 'webrick'
require 'json'

PORT = 8099

# Qui la TUA logica. `dati` ha channel, user, display, args, argsRaw, ...
def calcola_risposta(dati)
  utente = dati['display'] || dati['user'] || 'amico'
  args = (dati['args'] || []).map { |a| a.to_s.downcase }
  return "🏓 Pong! Ciao #{utente}." if args.include?('ping')
  return "@#{utente} hai detto: #{dati['argsRaw']}" unless args.empty?

  "Ciao #{utente}! Sono il tuo modulo esterno in Ruby 💎"
end

server = WEBrick::HTTPServer.new(Port: PORT, BindAddress: '0.0.0.0')
server.mount_proc '/' do |req, res|
  dati = begin
    JSON.parse(req.body || '{}')
  rescue JSON::ParserError
    {}
  end
  res['Content-Type'] = 'application/json'
  res.body = JSON.generate({ reply: calcola_risposta(dati) })
end

trap('INT') { server.shutdown }
puts "Modulo esterno Ruby in ascolto sulla porta #{PORT}"
server.start
