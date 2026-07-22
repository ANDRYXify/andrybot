# ============================================================
#  SocialBot — preparazione del PC (Windows 10/11)
#
#  Cosa fa:
#    1. installa FileZilla (per gestire i file sul server)
#    2. crea una chiave SSH dedicata al server Hetzner
#    3. copia la chiave sul server (chiede la password UNA volta)
#    4. aggiunge il server al Gestore siti di FileZilla
#
#  Come si esegue (PowerShell):
#    powershell -ExecutionPolicy Bypass -File .\setup-pc-windows.ps1
#
#  Nota: il file evita di proposito le lettere accentate per essere
#  compatibile con qualsiasi codifica di Windows PowerShell.
# ============================================================

# ---- Variabili (modifica qui se serve) ----------------------
$ServerIP   = '167.233.214.193'
$ServerUser = 'root'
$KeyName    = 'hetzner_andryxify'

$ErrorActionPreference = 'Continue'

function Passo($msg)  { Write-Host ''; Write-Host "==== $msg ====" -ForegroundColor Cyan }
function Ok($msg)     { Write-Host "OK  $msg" -ForegroundColor Green }
function Avviso($msg) { Write-Host "!!  $msg" -ForegroundColor Yellow }
function Errore($msg) { Write-Host "XX  $msg" -ForegroundColor Red }

# ============================================================
# 1/4 — FileZilla
# ============================================================
Passo '1/4 - Installazione di FileZilla'
$fzExe = Join-Path $env:ProgramFiles 'FileZilla FTP Client\filezilla.exe'
$fzOk = $false
if (Test-Path $fzExe) {
    Ok 'FileZilla e'' gia'' installato.'
    $fzOk = $true
} elseif (Get-Command winget -ErrorAction SilentlyContinue) {
    foreach ($id in @('TimKosse.FileZilla.Client', 'FileZilla.FileZilla')) {
        Write-Host "Provo: winget install --id $id ..."
        winget install --id $id -e --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) {
            Ok 'FileZilla installato con winget.'
            $fzOk = $true
            break
        }
        Avviso "Installazione con id '$id' non riuscita, provo l'alternativa..."
    }
}
if (-not $fzOk) {
    Avviso 'winget non disponibile o installazione fallita: apro la pagina di download.'
    Start-Process 'https://filezilla-project.org/download.php?type=client'
    Read-Host 'Installa FileZilla manualmente e poi premi INVIO per continuare' | Out-Null
}

# ============================================================
# 2/4 — Chiave SSH
# ============================================================
Passo '2/4 - Chiave SSH dedicata al server'
$sshDir  = Join-Path $env:USERPROFILE '.ssh'
$keyPath = Join-Path $sshDir $KeyName
$pubPath = "$keyPath.pub"

if (-not (Get-Command ssh-keygen -ErrorAction SilentlyContinue)) {
    Errore 'ssh-keygen non trovato. Il "Client OpenSSH" e'' incluso in Windows 10/11 ma va attivato:'
    Write-Host '  Impostazioni -> App -> Funzionalita'' facoltative -> Aggiungi una funzionalita'''
    Write-Host '  -> cerca "Client OpenSSH" -> Installa.'
    Write-Host 'Poi rilancia questo script.'
    exit 1
}

if (-not (Test-Path $keyPath)) {
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Path $sshDir | Out-Null
    }
    # -N '""' = nessuna passphrase (la doppia virgolettatura serve a PowerShell)
    ssh-keygen -t ed25519 -f $keyPath -N '""' -C 'andryxify-hetzner'
    Ok "Chiave creata: $keyPath"
} else {
    Ok "Chiave gia' esistente: $keyPath (la riuso)"
}
Write-Host ''
Write-Host 'Questa e'' la tua chiave PUBBLICA (si puo'' condividere senza problemi):'
Get-Content $pubPath | Write-Host -ForegroundColor Gray

# ============================================================
# 3/4 — Copia della chiave sul server
# ============================================================
Passo '3/4 - Copia della chiave sul server Hetzner'
Avviso "Sto per copiare la chiave pubblica su $ServerUser@$ServerIP."
Avviso 'Ti verra'' chiesta la PASSWORD DI ROOT ricevuta via email da Hetzner'
Avviso '(serve SOLO questa volta: poi si entrera'' sempre con la chiave).'
$risposta = Read-Host 'Procedo con la copia? (s/n)'
if ($risposta -match '^[sS]') {
    Get-Content $pubPath | ssh -o StrictHostKeyChecking=accept-new "$ServerUser@$ServerIP" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
    if ($LASTEXITCODE -eq 0) {
        Ok 'Chiave copiata sul server.'
    } else {
        Errore 'Copia non riuscita (password errata o server non raggiungibile).'
    }

    Write-Host 'Verifico l''accesso con la chiave (senza password)...'
    $test = ssh -i $keyPath -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$ServerUser@$ServerIP" 'echo CHIAVE_OK' 2>$null
    if ("$test".Trim() -eq 'CHIAVE_OK') {
        Ok 'Accesso con la chiave FUNZIONANTE.'
    } else {
        Avviso 'La verifica NON e'' riuscita: controlla connessione/password e rilancia lo script.'
    }
} else {
    Avviso 'Copia saltata su tua richiesta: potrai rilanciare lo script quando vuoi.'
}

# ============================================================
# 4/4 — Gestore siti di FileZilla
# ============================================================
Passo '4/4 - Voce nel Gestore siti di FileZilla'
$siteName = 'Hetzner andryxify'
$fzDir = Join-Path $env:APPDATA 'FileZilla'
$sm    = Join-Path $fzDir 'sitemanager.xml'
if (-not (Test-Path $fzDir)) {
    New-Item -ItemType Directory -Path $fzDir | Out-Null
}

if (Test-Path $sm) {
    # Il file esiste: backup e aggiunta della voce (se non c'e' gia')
    Copy-Item $sm "$sm.bak" -Force
    Ok "Backup creato: $sm.bak"
    try {
        [xml]$doc = Get-Content $sm -Raw
        $servers = $doc.SelectSingleNode('/FileZilla3/Servers')
        if (-not $servers) {
            $servers = $doc.CreateElement('Servers')
            $doc.DocumentElement.AppendChild($servers) | Out-Null
        }
        if ($servers.SelectSingleNode("Server[Name='$siteName']")) {
            Ok "Voce '$siteName' gia' presente nel Gestore siti: non tocco nulla."
        } else {
            $srv = $doc.CreateElement('Server')
            foreach ($coppia in @(
                @('Host',     $ServerIP),
                @('Port',     '22'),
                @('Protocol', '1'),      # 1 = SFTP
                @('Type',     '0'),
                @('User',     $ServerUser),
                @('Logontype','5'),      # 5 = file di chiavi
                @('Keyfile',  $keyPath),
                @('Name',     $siteName)
            )) {
                $el = $doc.CreateElement($coppia[0])
                $el.InnerText = $coppia[1]
                $srv.AppendChild($el) | Out-Null
            }
            $servers.AppendChild($srv) | Out-Null
            $doc.Save($sm)
            Ok "Voce '$siteName' aggiunta al Gestore siti."
        }
    } catch {
        Errore "Non sono riuscito a modificare $sm : $($_.Exception.Message)"
        Avviso 'Aggiungi il sito a mano: File -> Gestore siti -> Nuovo sito,'
        Avviso "Protocollo SFTP, Host $ServerIP, Porta 22, Utente $ServerUser,"
        Avviso "Tipo di accesso 'File di chiavi', chiave: $keyPath"
    }
} else {
    # Il file non esiste: lo creo da zero con la sola voce del server
    $template = @"
<?xml version="1.0"?>
<FileZilla3>
  <Servers>
    <Server>
      <Host>$ServerIP</Host>
      <Port>22</Port>
      <Protocol>1</Protocol>
      <Type>0</Type>
      <User>$ServerUser</User>
      <Logontype>5</Logontype>
      <Keyfile>$keyPath</Keyfile>
      <Name>$siteName</Name>
    </Server>
  </Servers>
</FileZilla3>
"@
    Set-Content -Path $sm -Value $template -Encoding UTF8
    Ok "Creato $sm con la voce '$siteName'."
}
Avviso 'Nota: alla prima connessione FileZilla puo'' proporre di convertire la'
Avviso 'chiave in formato PuTTY: accetta, e'' normale.'

# ============================================================
# Riepilogo
# ============================================================
Passo 'Fatto! Riepilogo'
Write-Host '1) Per gestire i FILE sul server:'
Write-Host "     FileZilla -> File -> Gestore siti -> '$siteName' -> Connetti"
Write-Host ''
Write-Host '2) Per il TERMINALE sul server (Prompt dei comandi o PowerShell):'
Write-Host "     ssh -i %USERPROFILE%\.ssh\$KeyName $ServerUser@$ServerIP" -ForegroundColor Green
Write-Host ''
