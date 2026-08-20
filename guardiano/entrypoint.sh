#!/bin/sh
# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
#
# Il firewall d'uscita dell'ecosistema di Lia. L'`ambiente` condivide questa rete
# (network_mode: service:guardiano), quindi il suo traffico è il nostro OUTPUT: qui lo filtriamo.
# Regola: internet pubblico SÌ; ogni connessione NUOVA verso reti private/interne/metadati NO.
set -eu

# ranges da SBARRARE in uscita (connessioni nuove): la TUA infrastruttura e i pericoli tipici.
PRIVATI="10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 169.254.0.0/16 100.64.0.0/10 192.0.0.0/24 198.18.0.0/15"
# 169.254.0.0/16 include 169.254.169.254 (metadati cloud) — chiuso.

echo "[guardiano] installo il firewall d'uscita…"

# — le RISPOSTE al cervello e alle connessioni già aperte devono passare (l'esecutore deve
#   poter rispondere al brain, che sta su una rete privata): permetti PRIMA established/related.
iptables -F OUTPUT || true
iptables -P OUTPUT ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# — blocca le connessioni NUOVE verso i range privati/interni (così Lia non raggiunge
#   bot/Caddy/host/metadati né la rete interna): è il muro verso la tua infra.
for R in $PRIVATI; do
  iptables -A OUTPUT -d "$R" -m conntrack --ctstate NEW -j REJECT --reject-with icmp-admin-prohibited || \
  iptables -A OUTPUT -d "$R" -m conntrack --ctstate NEW -j DROP
done
# — tutto il resto (internet PUBBLICO) è libero: qui Lia vive per davvero.

# IPv6: se disponibile, chiudi in blocco l'uscita v6 (semplice e sicuro: usiamo v4).
if command -v ip6tables >/dev/null 2>&1; then
  ip6tables -F OUTPUT 2>/dev/null || true
  ip6tables -P OUTPUT ACCEPT 2>/dev/null || true
  ip6tables -A OUTPUT -o lo -j ACCEPT 2>/dev/null || true
  ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true
  ip6tables -A OUTPUT -d fc00::/7 -m conntrack --ctstate NEW -j DROP 2>/dev/null || true
  ip6tables -A OUTPUT -d fe80::/10 -m conntrack --ctstate NEW -j DROP 2>/dev/null || true
fi

echo "[guardiano] firewall pronto: internet pubblico aperto, infra interna sbarrata."
# resta vivo: l'`ambiente` usa questa rete finché il guardiano vive.
exec tail -f /dev/null
