# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
#
# GUARDIANO — il firewall d'USCITA dell'ecosistema di Lia. L'`ambiente` condivide la rete di
# questo container (docker-compose.yml → network_mode: "service:guardiano"): così TUTTO il
# traffico di Lia passa da qui, dove le regole iptables le lasciano internet pubblico vero ma
# le SBARRANO ogni connessione nuova verso reti private / interne / metadati cloud — cioè verso
# la TUA infrastruttura. Difesa in profondità sopra l'isolamento (niente segreti, root RO, ecc.).
FROM alpine:3.20
RUN apk add --no-cache iptables ip6tables
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
