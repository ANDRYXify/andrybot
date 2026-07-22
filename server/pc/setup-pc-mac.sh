#!/usr/bin/env bash
# ============================================================
#  AndryBot — preparazione del Mac (macOS)
#
#  Cosa fa:
#    1. installa FileZilla (per gestire i file sul server)
#    2. crea una chiave SSH dedicata al server Hetzner
#    3. copia la chiave sul server (chiede la password UNA volta)
#    4. aggiunge il server al Gestore siti di FileZilla
#
#  Come si esegue (Terminale):
#      bash setup-pc-mac.sh
# ============================================================
set -e

# ---- Variabili (modifica qui se serve) ----------------------
SERVER_IP='167.233.214.193'
SERVER_USER='root'
KEY_NAME='hetzner_andryxify'
SITE_NAME='Hetzner andryxify'

KEY="$HOME/.ssh/$KEY_NAME"
PUB="$KEY.pub"

# ---- Funzioni di stampa colorate ----------------------------
C_BLU='\033[1;36m'; C_VERDE='\033[1;32m'; C_GIALLO='\033[1;33m'; C_ROSSO='\033[1;31m'; C_OFF='\033[0m'
passo()  { printf "\n${C_BLU}==== %s ====${C_OFF}\n" "$1"; }
ok()     { printf "${C_VERDE}OK  %s${C_OFF}\n" "$1"; }
avviso() { printf "${C_GIALLO}!!  %s${C_OFF}\n" "$1"; }
errore() { printf "${C_ROSSO}XX  %s${C_OFF}\n" "$1"; }

# ============================================================
# 1/4 — FileZilla
# ============================================================
passo "1/4 - Installazione di FileZilla"
if [ -d "/Applications/FileZilla.app" ]; then
  ok "FileZilla è già installato."
elif command -v brew >/dev/null 2>&1; then
  brew install --cask filezilla
  ok "FileZilla installato con Homebrew."
else
  avviso "Homebrew non trovato: apro la pagina di download di FileZilla."
  open 'https://filezilla-project.org/download.php?type=client'
  read -r -p "Installa FileZilla manualmente e poi premi INVIO per continuare... " _
fi

# ============================================================
# 2/4 — Chiave SSH
# ============================================================
passo "2/4 - Chiave SSH dedicata al server"
if [ ! -f "$KEY" ]; then
  mkdir -p "$HOME/.ssh"
  chmod 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -f "$KEY" -N '' -C 'andryxify-hetzner'
  ok "Chiave creata: $KEY"
else
  ok "Chiave già esistente: $KEY (la riuso)"
fi
echo
echo "Questa è la tua chiave PUBBLICA (si può condividere senza problemi):"
cat "$PUB"

# ============================================================
# 3/4 — Copia della chiave sul server
# ============================================================
passo "3/4 - Copia della chiave sul server Hetzner"
avviso "Sto per copiare la chiave pubblica su ${SERVER_USER}@${SERVER_IP}."
avviso "Ti verrà chiesta la PASSWORD DI ROOT ricevuta via email da Hetzner"
avviso "(serve SOLO questa volta: poi si entrerà sempre con la chiave)."
if ssh-copy-id -i "$PUB" -o StrictHostKeyChecking=accept-new "${SERVER_USER}@${SERVER_IP}"; then
  ok "Chiave copiata sul server."
else
  errore "Copia non riuscita (password errata o server non raggiungibile)."
fi

echo "Verifico l'accesso con la chiave (senza password)..."
if ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
     "${SERVER_USER}@${SERVER_IP}" 'echo CHIAVE_OK' 2>/dev/null | grep -q CHIAVE_OK; then
  ok "Accesso con la chiave FUNZIONANTE."
else
  avviso "La verifica NON è riuscita: controlla connessione/password e rilancia lo script."
fi

# ============================================================
# 4/4 — Gestore siti di FileZilla
# ============================================================
passo "4/4 - Voce nel Gestore siti di FileZilla"
SM="$HOME/.config/filezilla/sitemanager.xml"
mkdir -p "$(dirname "$SM")"

if [ ! -f "$SM" ]; then
  # Il file non esiste: lo creo da zero con la sola voce del server
  cat > "$SM" <<XMLEOF
<?xml version="1.0"?>
<FileZilla3>
  <Servers>
    <Server>
      <Host>${SERVER_IP}</Host>
      <Port>22</Port>
      <Protocol>1</Protocol>
      <Type>0</Type>
      <User>${SERVER_USER}</User>
      <Logontype>5</Logontype>
      <Keyfile>${KEY}</Keyfile>
      <Name>${SITE_NAME}</Name>
    </Server>
  </Servers>
</FileZilla3>
XMLEOF
  ok "Creato $SM con la voce '$SITE_NAME'."
elif command -v python3 >/dev/null 2>&1; then
  # Il file esiste: backup e aggiunta della voce (se non c'è già)
  cp "$SM" "$SM.bak"
  ok "Backup creato: $SM.bak"
  if ESITO="$(python3 - "$SM" "$SERVER_IP" "$SERVER_USER" "$KEY" "$SITE_NAME" <<'PYEOF'
import sys
import xml.etree.ElementTree as ET

sm, ip, utente, chiave, nome = sys.argv[1:6]
tree = ET.parse(sm)
root = tree.getroot()  # <FileZilla3>
servers = root.find('Servers')
if servers is None:
    servers = ET.SubElement(root, 'Servers')

# Evita i duplicati: se esiste già un sito con lo stesso Name, non fare nulla
for s in servers.findall('Server'):
    n = s.find('Name')
    if n is not None and (n.text or '').strip() == nome:
        print('GIA_PRESENTE')
        sys.exit(0)

srv = ET.SubElement(servers, 'Server')
for tag, testo in (('Host', ip), ('Port', '22'), ('Protocol', '1'),
                   ('Type', '0'), ('User', utente), ('Logontype', '5'),
                   ('Keyfile', chiave), ('Name', nome)):
    el = ET.SubElement(srv, tag)
    el.text = testo

tree.write(sm, encoding='utf-8', xml_declaration=True)
print('AGGIUNTO')
PYEOF
)"; then
    if [ "$ESITO" = "GIA_PRESENTE" ]; then
      ok "Voce '$SITE_NAME' già presente nel Gestore siti: non tocco nulla."
    else
      ok "Voce '$SITE_NAME' aggiunta al Gestore siti."
    fi
  else
    errore "Modifica automatica di $SM non riuscita (ripristino dal backup se serve: $SM.bak)."
    avviso "Aggiungi il sito a mano in FileZilla: File → Gestore siti → Nuovo sito"
    avviso "  Protocollo: SFTP - Host: $SERVER_IP - Porta: 22"
    avviso "  Utente: $SERVER_USER - Tipo di accesso: 'File di chiavi'"
    avviso "  File di chiavi: $KEY"
  fi
else
  avviso "python3 non trovato: aggiungi il sito a mano in FileZilla:"
  avviso "  File → Gestore siti → Nuovo sito: '$SITE_NAME'"
  avviso "  Protocollo: SFTP - Host: $SERVER_IP - Porta: 22"
  avviso "  Utente: $SERVER_USER - Tipo di accesso: 'File di chiavi'"
  avviso "  File di chiavi: $KEY"
fi

# ============================================================
# Riepilogo
# ============================================================
passo "Fatto! Riepilogo"
echo "1) Per gestire i FILE sul server:"
echo "     FileZilla → File → Gestore siti → '$SITE_NAME' → Connetti"
echo
echo "2) Per il TERMINALE sul server:"
printf "     ${C_VERDE}ssh -i ~/.ssh/%s %s@%s${C_OFF}\n" "$KEY_NAME" "$SERVER_USER" "$SERVER_IP"
echo
