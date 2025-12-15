const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

// -- DEBUG LOGGING --
function logDebug(msg) {
  try {
    const dir = (typeof isPackaged === 'function' && isPackaged()) ? resolveUserDataDir() : __dirname;
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const line = `[${new Date().toISOString()}] ${msg}`;
    // Echo to terminal for immediate visibility (npm start / npm run prod)
    try { console.log(line); } catch {}
    // Also persist to file for later debugging
    const logPath = path.join(dir, 'main-debug.log');
    fs.appendFileSync(logPath, line + '\n');
  } catch (e) { }
}

// -- PLATFORM UTILS --
function getEnvWithPath() {
  const env = { ...process.env };
  if (os.platform() === 'win32') {
    const extraWin = [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
      'C:\\Windows\\System32',
      'C:\\Windows',
      'C:\\Program Files\\Docker\\Docker',
      'C:\\Program Files\\Docker\\Docker\\resources\\bin',
      'C:\\ProgramData\\DockerDesktop\\version-bin',
    ].join(path.delimiter);
    env.PATH = env.PATH ? env.PATH + path.delimiter + extraWin : extraWin;
  } else {
    const extra = ['/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(path.delimiter);
    env.PATH = env.PATH ? env.PATH + path.delimiter + extra : extra;
  }
  return env;
}

function findDockerBin() {
  if (os.platform() === 'win32') {
    const candidates = [
      'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
      'C:\\ProgramData\\DockerDesktop\\version-bin\\docker.exe',
      'docker',
    ];
    for (const c of candidates) {
      try {
        if (c === 'docker') return c;
        if (fs.existsSync(c)) return c;
      } catch {}
    }
    return 'docker';
  }
  if (os.platform() === 'darwin') {
    const candidates = [
      '/usr/local/bin/docker',
      '/opt/homebrew/bin/docker',
      '/usr/bin/docker',
      'docker',
    ];
    for (const c of candidates) {
      try {
        if (c === 'docker') return c;
        if (fs.existsSync(c)) return c;
      } catch {}
    }
    return 'docker';
  }
  return 'docker';
}

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    // FIX: Auto-quote commands with spaces on Windows
    const safeCmd = (os.platform() === 'win32' && cmd.includes(' ') && !cmd.startsWith('"')) ? '"' + cmd + '"' : cmd;

    logDebug(`RUN: ${safeCmd} ${JSON.stringify(args)}`);

    const p = spawn(safeCmd, args, { shell: true, env: getEnvWithPath(), ...opts });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => {
      logDebug(`RUN DONE: ${safeCmd} code=${code} err=${err.trim().substring(0, 200)}`);
      resolve({ code, out: out.trim(), err: err.trim() });
    });
  });
}

async function detectComposeCmd() {
  // Try docker-compose v1
  let r = await run('docker-compose', ['--version']);
  if (r.code === 0) return { bin: 'docker-compose', args: [], version: r.out };

  // Try docker compose v2
  const dockerBin = findDockerBin();
  r = await run(dockerBin, ['compose', 'version']);
  if (r.code === 0) return { bin: 'docker', args: ['compose'], version: r.out }; // Note: bin becomes 'docker', args has 'compose'

  return { bin: null, args: [], version: null };
}

async function getDockerVersion() {
  const dockerBin = findDockerBin();
  let r = await run(dockerBin, ['--version']);
  return r.code === 0 ? r.out : null;
}

async function isDockerDaemonReady() {
  const dockerBin = findDockerBin();
  const r = await run(dockerBin, ['info']);
  return r.code === 0;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForDockerReady(timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isDockerDaemonReady()) return true;
    await sleep(2000);
  }
  return false;
}

// -- MAIN LOGIC --

async function getContainerState(name) {
  const dockerBin = findDockerBin();
  // We use 'docker inspect'
  const r = await run(dockerBin, ['inspect', name]);
  if (r.code !== 0) return 'not found';
  try {
    const data = JSON.parse(r.out);
    if (!data || !data[0]) return 'not found';
    return data[0].State.Status + (data[0].State.Health ? '|' + data[0].State.Health.Status : '');
  } catch {
    return 'unknown';
  }
}

// -- IPC HANDLERS --
ipcMain.handle('health:getStatus', async () => {
  try {
    const dockerVer = await getDockerVersion();
    const composeInfo = await detectComposeCmd();
    const repoDir = resolveRepoDir();
    const depsReady = fs.existsSync(path.join(repoDir, 'docker-compose.client.yml'));
    const dockerBin = findDockerBin();

    const services = {};
    const wanted = ['frigate', 'frigate_listener', 'frigate_proxy', 'mosquitto'];
    if (dockerVer) {
      await Promise.all(wanted.map(async (w) => {
        services[w] = await getContainerState(w);
      }));
    } else {
      wanted.forEach(w => services[w] = 'unknown');
    }

    return {
      platform: os.platform(),
      packaged: isPackaged(),
      repoDir,
      docker: { installed: !!dockerVer, version: dockerVer, bin: dockerBin },
      compose: { installed: !!composeInfo.bin, version: composeInfo.version, bin: composeInfo.bin, args: composeInfo.args },
      deps: { ready: depsReady },
      services
    };
  } catch (e) {
    logDebug(`getStatus error: ${e.message}`);
    return { error: e.message };
  }
});

ipcMain.handle('health:startDocker', async () => {
  // FIX: Robust start logic
  if (os.platform() === 'win32') {
    const exe = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
    console.log('Starting Docker Desktop via spawn (detached)...');
    logDebug('Starting Docker Desktop via direct spawn...');
    if (fs.existsSync(exe)) {
      try {
        const sub = spawn(exe, [], { detached: true, stdio: 'ignore' });
        sub.unref();
        return true;
      } catch (e) { logDebug(`Spawn error: ${e.message}`); }
    }
  }
  // Fallback logic could go here but let's stick to the robust one
  return false;
});

ipcMain.handle('health:startDockerAndWait', async () => {
  // Call our internal start logic? IPC calls return promises.
  // We can call the handler logic directly if executed in main process context or just reuse logic.
  // Easier to just reimplement simple wait loop here or call startDocker logic.
  // Let's call the logic from startDocker but we can't invoke IPC handler easily.
  // Manual reuse:
  if (os.platform() === 'win32') {
    const exe = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
    if (fs.existsSync(exe)) {
      const sub = spawn(exe, [], { detached: true, stdio: 'ignore' });
      sub.unref();
    }
  } else if (os.platform() === 'darwin') {
    await run('open', ['-a', 'Docker']);
  }

  return await waitForDockerReady();
});

ipcMain.handle('health:composeUp', async () => {
  const compose = await detectComposeCmd();
  if (!compose.bin) throw new Error('Docker Compose no encontrado');

  const ready = await waitForDockerReady();
  if (!ready) throw new Error('Docker no está listo');

  const repoDir = resolveRepoDir();
  // Assuming 'docker-compose.client.yml' is what we want
  // If bin is 'docker' and args has 'compose', we combine them
  let cmd = compose.bin;
  const baseArgs = compose.args || [];
  const args = [...baseArgs, '-f', 'docker-compose.client.yml', 'up', '-d'];

  /* 
     Legacy mode: We modify docker-compose.client.yml, so 'up -d' picks changes up automatically.
     No need for force-recreate hack.
  */
  let r = await run(cmd, args, { cwd: repoDir });

  // Retry logic for conflicts
  if (r.code !== 0 && (r.err.includes('Conflict') || r.err.includes('already in use'))) {
    logDebug('Conflict detected, running down...');
    const downArgs = [...baseArgs, '-f', 'docker-compose.client.yml', 'down', '--remove-orphans'];
    await run(cmd, downArgs, { cwd: repoDir });

    logDebug('Retrying compose up after down...');
    r = await run(cmd, args, { cwd: repoDir });
  }

  if (r.code !== 0) throw new Error(r.err || 'Fallo compose up');
  return r.out;
});

ipcMain.handle('health:composeDown', async () => {
  const compose = await detectComposeCmd();
  if (!compose.bin) return;
  const repoDir = resolveRepoDir();
  let cmd = compose.bin;
  const baseArgs = compose.args || [];
  const args = [...baseArgs, '-f', 'docker-compose.client.yml', 'down'];
  await run(cmd, args, { cwd: repoDir });
});

// ---- Docker auto-download + install (macOS/Windows) ----
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch {}
    const tmp = dest + '.download';
    const ws = fs.createWriteStream(tmp);
    const onErr = (e) => {
      try { ws.close(); } catch {}
      try { fs.unlinkSync(tmp); } catch {}
      logDebug(`downloadFile error: ${e.message}`);
      reject(e);
    };
    const follow = (u) => {
      logDebug(`Downloading: ${u}`);
      const req = https.get(u, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.destroy();
          return follow(res.headers.location);
        }
        if (res.statusCode !== 200) return onErr(new Error(`HTTP ${res.statusCode}`));
        res.pipe(ws);
        ws.on('finish', () => {
          try { ws.close(() => { try { fs.renameSync(tmp, dest); resolve(dest); } catch (e) { onErr(e); } }); } catch (e) { onErr(e); }
        });
      });
      req.on('error', onErr);
    };
    follow(url);
  });
}

async function ensureDockerInstaller() {
  const platform = os.platform();
  const repoDir = resolveRepoDir();
  if (platform === 'darwin') {
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const dmgPath = path.join(repoDir, 'mac', 'Docker.dmg');
    if (exists(dmgPath)) return dmgPath;
    // Prefer main channel; fall back to stable
    const urls = arch === 'arm64'
      ? [
          'https://desktop.docker.com/mac/main/arm64/Docker.dmg',
          'https://desktop.docker.com/mac/stable/arm64/Docker.dmg',
        ]
      : [
          'https://desktop.docker.com/mac/main/amd64/Docker.dmg',
          'https://desktop.docker.com/mac/stable/amd64/Docker.dmg',
        ];
    let lastErr = null;
    for (const u of urls) {
      try { return await downloadFile(u, dmgPath); } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('No se pudo descargar Docker para macOS');
  }
  if (platform === 'win32') {
    const installer = path.join(repoDir, 'windows', 'Docker Desktop Installer.exe');
    if (exists(installer)) return installer;
    const url = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe';
    return downloadFile(url, installer);
  }
  throw new Error('Descarga automática solo soportada en macOS y Windows');
}

async function installDockerMac() {
  if (os.platform() !== 'darwin') throw new Error('Instalación automática soportada solo en macOS');
  const dmgPath = await ensureDockerInstaller();
  const tmpScript = path.join(os.tmpdir(), `vidria_install_docker_${Date.now()}.applescript`);
  const asContent = `set dmgPath to "${dmgPath.replace(/"/g, '\\"')}"\n` +
    `do shell script "/usr/bin/hdiutil attach " & quoted form of dmgPath with administrator privileges\n` +
    `do shell script "/Volumes/Docker/Docker.app/Contents/MacOS/install --accept-license" with administrator privileges\n` +
    `do shell script "/usr/bin/hdiutil detach /Volumes/Docker" with administrator privileges\n`;
  fs.writeFileSync(tmpScript, asContent, 'utf8');
  const r = await run('osascript', [tmpScript], { shell: false });
  try { fs.unlinkSync(tmpScript); } catch {}
  if (r.code !== 0) throw new Error(r.err || r.out || 'Fallo instalando Docker');
  await run('/usr/bin/open', ['-a', 'Docker'], { shell: false });
  return true;
}

async function installDockerWin() {
  const installer = await ensureDockerInstaller();
  const tmpScript = path.join(os.tmpdir(), `vidria_install_docker_${Date.now()}.ps1`);
  const safePath = installer.replace(/`/g, '``').replace(/"/g, '""');
  const ps = `\n$installer = "${safePath}"\nif (-not (Test-Path $installer)) { throw "No se encontró el instalador en: $installer" }\nStart-Process -FilePath $installer -ArgumentList 'install --accept-license --always-run-service' -Verb RunAs -Wait\n`;
  fs.writeFileSync(tmpScript, ps, 'utf8');
  const r = await run('powershell', ['-NoProfile','-ExecutionPolicy','Bypass','-File', tmpScript], { windowsHide: true, shell: false });
  try { fs.unlinkSync(tmpScript); } catch {}
  if (r.code !== 0) throw new Error(r.err || r.out || 'Fallo instalando Docker en Windows');
  // Try to open Docker Desktop
  let r2 = await run('powershell', ['-NoProfile','-ExecutionPolicy','Bypass','-Command', 'Start-Process "Docker Desktop"'], { windowsHide: true });
  if (r2.code !== 0) {
    await run('cmd', ['/c', 'start', '""', '"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"'], { windowsHide: true });
  }
  return true;
}

async function installDocker() {
  const platform = os.platform();
  if (platform === 'darwin') return installDockerMac();
  if (platform === 'win32') return installDockerWin();
  // Fallback to opening website for unsupported OS
  const url = 'https://www.docker.com/products/docker-desktop/';
  await shell.openExternal(url);
  return 'Sistema no soportado: abre la página de Docker para instalar.';
}

ipcMain.handle('health:ensureDockerInstaller', async () => {
  try { return await ensureDockerInstaller(); } catch (e) { return String(e.message || e); }
});
ipcMain.handle('health:installDocker', async () => {
  try { return await installDocker(); } catch (e) {
    // On error, open website as last resort
    try { await shell.openExternal('https://www.docker.com/products/docker-desktop/'); } catch {}
    return String(e.message || e);
  }
});
ipcMain.handle('health:log', async (_ev, msg) => { try { logDebug(`[WIZARD] ${String(msg)}`); } catch {} return true; });

// Robust CUSTOMER_ID injection into docker-compose.client.yml
function updateCustomerIdInCompose(newId) {
  const repoDir = resolveRepoDir();
  const composePath = path.join(repoDir, 'docker-compose.client.yml');
  logDebug(`updateCustomerIdInCompose: repoDir=${repoDir}, composePath=${composePath}, newId=${newId ?? '(clear)'}`);
  if (!fs.existsSync(composePath)) {
    throw new Error(`No se encontró docker-compose.client.yml en ${repoDir}`);
  }
  const original = fs.readFileSync(composePath, 'utf8');
  const lines = original.split(/\r?\n/);

  // Find 'listener:' service block
  const svcIdx = lines.findIndex((l) => /^\s*listener\s*:\s*$/.test(l));
  if (svcIdx === -1) throw new Error('Servicio "listener" no encontrado en docker-compose.client.yml');
  const svcIndent = (lines[svcIdx].match(/^\s*/)||[''])[0].length;
  // Find end of service block: next line starting with same indent and ending with ':'
  let endIdx = lines.length;
  for (let i = svcIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)([A-Za-z0-9_-]+)\s*:\s*$/);
    if (!m) continue;
    const indent = m[1].length;
    if (indent === svcIndent) { endIdx = i; break; }
  }

  // Search for environment block within [svcIdx+1, endIdx)
  let envIdx = -1;
  let envIndent = null;
  for (let i = svcIdx + 1; i < endIdx; i++) {
    const m = lines[i].match(/^(\s*)environment\s*:\s*$/);
    if (m) { envIdx = i; envIndent = m[1].length; break; }
  }

  function ensureEnvBlockInserted() {
    // Insert an environment: block before networks: (if present) or before endIdx
    let insertAt = -1;
    for (let i = svcIdx + 1; i < endIdx; i++) {
      if (/^\s*networks\s*:\s*$/.test(lines[i])) { insertAt = i; break; }
    }
    if (insertAt === -1) insertAt = endIdx;
    const baseIndent = ' '.repeat(svcIndent + 2);
    const itemIndent = ' '.repeat(svcIndent + 4);
    const toInsert = [ `${baseIndent}environment:`, `${itemIndent}- CUSTOMER_ID=${newId}` ];
    lines.splice(insertAt, 0, ...toInsert);
    return { envIdx: insertAt, envIndent: svcIndent + 2 };
  }

  if (newId && typeof newId === 'string') {
    // Set or update CUSTOMER_ID
    if (envIdx === -1) {
      const res = ensureEnvBlockInserted();
      envIdx = res.envIdx; envIndent = res.envIndent;
    } else {
      // Look for existing CUSTOMER_ID item under environment list
      const envListIndent = envIndent + 2;
      let found = false;
      let insertAfter = envIdx;
      for (let i = envIdx + 1; i < endIdx; i++) {
        const line = lines[i];
        const indent = (line.match(/^\s*/)||[''])[0].length;
        if (indent <= envIndent) break; // end of environment list
        if (/^\s*-\s*CUSTOMER_ID\s*=/.test(line)) {
          lines[i] = `${' '.repeat(envListIndent)}- CUSTOMER_ID=${newId}`;
          found = true;
          break;
        }
        insertAfter = i; // track last env item
      }
      if (!found) {
        const insertPos = insertAfter === envIdx ? envIdx + 1 : insertAfter + 1;
        lines.splice(insertPos, 0, `${' '.repeat(envListIndent)}- CUSTOMER_ID=${newId}`);
      }
    }
  } else {
    // Clear CUSTOMER_ID line if present
    if (envIdx !== -1) {
      for (let i = envIdx + 1; i < endIdx; i++) {
        const line = lines[i];
        const indent = (line.match(/^\s*/)||[''])[0].length;
        if (indent <= envIndent) break;
        if (/^\s*-\s*CUSTOMER_ID\s*=/.test(line)) { lines.splice(i, 1); break; }
      }
    }
  }

  const updated = lines.join('\n');
  if (updated !== original) {
    fs.writeFileSync(composePath, updated, 'utf8');
    logDebug(`docker-compose.client.yml actualizado con CUSTOMER_ID=${newId ?? '(clear)'} en ${composePath}`);
  } else {
    logDebug('docker-compose.client.yml sin cambios tras intentar actualizar CUSTOMER_ID');
  }
  return true;
}
ipcMain.handle('health:setCustomerId', async (_ev, id) => {
  try { return await updateCustomerIdInCompose(id); } catch (e) { logDebug(`setCustomerId error: ${e.message}`); return String(e.message || e); }
});
ipcMain.handle('health:clearCustomerId', async () => { try { return await updateCustomerIdInCompose(null); } catch (e) { logDebug(`clearCustomerId error: ${e.message}`); return String(e.message || e); } });
ipcMain.handle('health:fitWindow', async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return false;
    const h = await win.webContents.executeJavaScript('(() => { const el = document.querySelector(".wizard"); return el ? el.offsetHeight : document.body.scrollHeight; })()');
    const [w] = win.getContentSize();
    const clamped = Math.min(Math.max(420, Math.ceil(h)), 820);
    win.setContentSize(w, clamped);
    return true;
  } catch (e) {
    logDebug(`fitWindow error: ${e.message}`);
    return false;
  }
});

// ---- Dependencies download (packaged builds) ----
function resolveUserDataDir() {
  const base = path.join(app.getPath('userData'), 'Vidria');
  try { fs.mkdirSync(base, { recursive: true }); } catch {}
  return base;
}

function isPackaged() { return !!app.isPackaged || process.argv.includes('--prod') || process.env.VIDRIA_FORCE_PROD === '1'; }

function resolveRepoDir() {
  // In packaged builds, always use userData/Vidria
  if (isPackaged()) {
    return resolveUserDataDir();
  }
  if (process.env.VIDRIA_REPO_DIR && fs.existsSync(process.env.VIDRIA_REPO_DIR)) {
    return process.env.VIDRIA_REPO_DIR;
  }
  // Try to find docker-compose.client.yml up the tree
  let current = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(current, 'docker-compose.client.yml');
    if (fs.existsSync(candidate)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return __dirname;
}

async function unzipToDir(zipPath, destDir) {
  try { fs.mkdirSync(destDir, { recursive: true }); } catch {}
  if (os.platform() === 'win32') {
    // Use a temporary PowerShell script for robustness and proper quoting
    const tmp = path.join(os.tmpdir(), `vidria_unzip_${Date.now()}.ps1`);
    const zipEsc = zipPath.replace(/`/g, '``').replace(/"/g, '""');
    const destEsc = destDir.replace(/`/g, '``').replace(/"/g, '""');
    const ps = `
$ErrorActionPreference = 'Stop'
$zip = "${zipEsc}"
$dest = "${destEsc}"
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Force -Path $dest | Out-Null }
try {
  Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
} catch {
  try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $tmp = Join-Path $dest 'tmp_extract'
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmp)
    Copy-Item -Path (Join-Path $tmp '*') -Destination $dest -Recurse -Force
    Remove-Item -Recurse -Force $tmp
  } catch {
    Write-Error $_
    exit 1
  }
}
exit 0
`;
    fs.writeFileSync(tmp, ps, 'utf8');
    const r = await run('powershell', ['-NoProfile','-ExecutionPolicy','Bypass','-File', tmp], { windowsHide: true, shell: false });
    try { fs.unlinkSync(tmp); } catch {}
    if (r.code === 0) return true;
    logDebug(`unzipToDir PS error: code=${r.code} err=${r.err.substring(0,200)}`);
    return false;
  } else if (os.platform() === 'darwin') {
    // Prefer ditto on macOS
    let r = await run('/usr/bin/ditto', ['-x', '-k', zipPath, destDir], { shell: false });
    if (r.code === 0) return true;
    logDebug(`ditto unzip failed: ${r.err || r.out}`);
    // Fallback to unzip
    r = await run('/usr/bin/unzip', ['-o', zipPath, '-d', destDir], { shell: false });
    if (r.code === 0) return true;
    logDebug(`unzip fallback failed: ${r.err || r.out}`);
    return false;
  } else {
    // Linux/unix
    const r = await run('unzip', ['-o', zipPath, '-d', destDir]);
    return r.code === 0;
  }
}

function flattenSingleSubdir(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (!entries) return;
    // If compose already at root, nothing to do
    if (fs.existsSync(path.join(dir, 'docker-compose.client.yml'))) return;
    const subdirs = entries.filter((e) => e.isDirectory());
    if (subdirs.length !== 1) return;
    const sub = path.join(dir, subdirs[0].name);
    const subEntries = fs.readdirSync(sub);
    for (const name of subEntries) {
      const from = path.join(sub, name);
      const to = path.join(dir, name);
      try { fs.renameSync(from, to); } catch (e) { logDebug(`flatten move error: ${e.message}`); }
    }
    try { fs.rmdirSync(sub); } catch {}
  } catch (e) {
    logDebug(`flatten error: ${e.message}`);
  }
}

ipcMain.handle('health:downloadDependencies', async () => {
  try {
    const dest = resolveUserDataDir();
    const composeAt = path.join(dest, 'docker-compose.client.yml');
    if (fs.existsSync(composeAt)) return true; // already ready
    const zipUrl = 'https://github.com/JuanPaVelandia/proyectocamaras/archive/refs/tags/1.1.zip';
    const zipPath = path.join(dest, 'vidria-deps.zip');
    await downloadFile(zipUrl, zipPath);
    const ok = await unzipToDir(zipPath, dest);
    if (!ok) throw new Error('No se pudo extraer el ZIP');
    try { fs.unlinkSync(zipPath); } catch {}
    // If extracted into a nested folder, flatten
    flattenSingleSubdir(dest);
    // Validate
    if (!fs.existsSync(composeAt)) throw new Error('Dependencias descargadas, pero falta docker-compose.client.yml');
    return true;
  } catch (e) {
    logDebug(`downloadDependencies error: ${e.message}`);
    return String(e.message || e);
  }
});

// -- APP LIFECYCLE --
function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false,
  });
  win.loadFile('wizard.html');
  win.webContents.on('did-finish-load', async () => {
    try {
      const h = await win.webContents.executeJavaScript('(() => { const el = document.querySelector(".wizard"); return el ? el.offsetHeight : document.body.scrollHeight; })()');
      const [w] = win.getContentSize();
      const clamped = Math.min(Math.max(420, Math.ceil(h)), 820);
      win.setContentSize(w, clamped);
    } catch (e) { logDebug(`did-finish-load fit error: ${e.message}`); }
  });
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
