#!/usr/bin/env bash
# ============================================================
#  AndryBot — setup del server Hetzner (Ubuntu 24.04, CPX12)
#
#  Da eseguire come root:
#      bash setup-hetzner.sh
#
#  Lo script è RIESEGUIBILE senza danni: ogni passo controlla lo
#  stato prima di agire. Alla prima esecuzione si ferma per farti
#  compilare il file .env, poi lo rilanci e completa tutto.
# ============================================================
set -euo pipefail

# ---- Configurazione (modifica qui se serve) ----------------
REPO_URL="${REPO_URL:-https://github.com/ANDRYXify/andrybot.git}"
APP_DIR="/opt/andrybot"

passo() { echo; echo "==== $* ===="; }

# ---- a. Controlli preliminari ------------------------------
passo "Controlli preliminari"
if [ "$(id -u)" -ne 0 ]; then
  echo "ERRORE: questo script va eseguito come root." >&2
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive
echo "Sono root su $(hostname). Procedo."

# ---- b. Fuso orario, aggiornamenti, pacchetti base ---------
passo "Fuso orario Europe/Rome, aggiornamenti e pacchetti base"
timedatectl set-timezone Europe/Rome
apt-get update
apt-get upgrade -y
apt-get install -y git curl ufw fail2ban unattended-upgrades openssl nano

# ---- c. Swap da 2 GB ---------------------------------------
passo "Swap da 2 GB (margine di sicurezza per la RAM del CPX12)"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap creato e attivato."
else
  echo "Swap già presente: salto."
fi

# ---- d. Docker ---------------------------------------------
passo "Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  echo "Docker installato."
else
  echo "Docker già installato: salto."
fi

# ---- e. Firewall (ufw) -------------------------------------
passo "Firewall: in entrata solo SSH, HTTP (80) e HTTPS (443)"
ufw default deny incoming
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

# ---- f. fail2ban -------------------------------------------
passo "fail2ban (blocca chi prova password SSH a raffica)"
systemctl enable --now fail2ban

# ---- g. Codice di AndryBot ---------------------------------
passo "Codice di AndryBot in ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" pull
  echo "Repository già presente: aggiornato con git pull."
else
  git clone "${REPO_URL}" "${APP_DIR}"
  echo "Repository clonato da ${REPO_URL}."
fi
cd "${APP_DIR}"

# ---- h. Prima creazione del file .env ----------------------
passo "Configurazione (.env)"
if [ ! -f .env ]; then
  cp .env.example .env
  # Genera subito un SESSION_SECRET casuale al posto del segnaposto
  SEGRETO="$(openssl rand -hex 32)"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${SEGRETO}|" .env
  echo
  echo "############################################################"
  echo "##                                                        ##"
  echo "##   FILE .env CREATO — MANCANO LE CREDENZIALI TWITCH     ##"
  echo "##                                                        ##"
  echo "############################################################"
  echo
  echo "  (SESSION_SECRET è già stato generato automaticamente)"
  echo
  echo "  Apri /opt/andrybot/.env (nano /opt/andrybot/.env),"
  echo "  inserisci TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET,"
  echo "  salva, e rilancia questo script."
  echo
  exit 0
fi

# ---- i. .env presente ma credenziali Twitch vuote? ---------
MANCA=0
grep -qE '^TWITCH_CLIENT_ID=.+' .env || MANCA=1
grep -qE '^TWITCH_CLIENT_SECRET=.+' .env || MANCA=1
if [ "${MANCA}" -eq 1 ]; then
  echo
  echo "############################################################"
  echo "##                                                        ##"
  echo "##   CREDENZIALI TWITCH ANCORA VUOTE NEL FILE .env        ##"
  echo "##                                                        ##"
  echo "############################################################"
  echo
  echo "  Apri /opt/andrybot/.env (nano /opt/andrybot/.env),"
  echo "  inserisci TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET,"
  echo "  salva, e rilancia questo script."
  echo
  exit 0
fi
echo "File .env completo: procedo con l'avvio."

# ---- j. Avvio con docker compose ---------------------------
passo "Avvio di AndryBot (docker compose up -d --build)"
docker compose up -d --build

# ---- k. Hardening SSH (solo se c'è già una chiave) ---------
passo "Hardening SSH"
if [ -s /root/.ssh/authorized_keys ]; then
  # Imposta una direttiva in sshd_config gestendo sia la riga già
  # presente sia quella commentata; se non esiste, la aggiunge.
  imposta_sshd() {
    local chiave="$1" valore="$2" file="/etc/ssh/sshd_config"
    if grep -qE "^[#[:space:]]*${chiave}([[:space:]]|$)" "${file}"; then
      sed -i -E "s|^[#[:space:]]*${chiave}([[:space:]].*)?$|${chiave} ${valore}|" "${file}"
    else
      echo "${chiave} ${valore}" >> "${file}"
    fi
  }
  imposta_sshd PasswordAuthentication no
  imposta_sshd PermitRootLogin prohibit-password
  imposta_sshd KbdInteractiveAuthentication no
  systemctl restart ssh
  echo
  echo "  ATTENZIONE: accesso con password DISATTIVATO."
  echo "  D'ora in poi si entra SOLO con la chiave SSH."
  echo
else
  echo "Nessuna chiave in /root/.ssh/authorized_keys:"
  echo "NON disattivo l'accesso con password (resteresti chiuso fuori)."
  echo "Esegui prima lo script setup-pc dal tuo computer, poi rilancia questo."
fi

# ---- l. Riepilogo finale -----------------------------------
passo "Riepilogo finale"
docker compose ps
echo
echo "  PROMEMORIA DNS (dal pannello del tuo dominio):"
echo "    bot.andryxify.it  ->  A     167.233.214.193"
echo "    bot.andryxify.it  ->  AAAA  2a01:4f8:c014:212e::1"
echo
echo "  Dashboard: https://bot.andryxify.it"
echo "  (il certificato HTTPS arriva da solo al primo accesso,"
echo "   se il DNS punta qui)"
echo
echo "  Log:  cd /opt/andrybot && docker compose logs -f bot"
echo
