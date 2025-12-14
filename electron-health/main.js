const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec, spawn } = require('child_process');

function getEnvWithPath() {
  const env = { ...process.env };
  if (os.platform() === 'win32') {
    const extraWin = [
      'C\\\:\\\Windows\\\System32',
      'C\\\:\\\Windows',
      'C\\\:\\\Program Files\\\Docker\\\Docker',
      'C\\\:\\\Program Files\\\Docker\\\Docker\\\resources\\\bin',
      'C\\\:\\\ProgramData\\\DockerDesktop\\\version-bin',
    ].join(path.delimiter);
    env.PATH = env.PATH ? env.PATH + path.delimiter + extraWin : extraWin;
  } else {
    const extra = ['/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(path.delimiter);
    env.PATH = env.PATH ? env.PATH + path.delimiter + extra : extra;
  }
  return env;
}

function findDockerBin() {
  if (os.platform() !== 'win32') return 'docker';
  // Prefer absolute path if available
  const candidates = [
    'C\\\:\\\Program Files\\\Docker\\\Docker\\\resources\\\bin\\\docker.exe',
    'C\\\:\\\ProgramData\\\DockerDesktop\\\version-bin\\\docker.exe',
    'docker',
  ];
  for (const c of candidates) {
    try {
      if (c === 'docker') return c;
      if (fs.existsSync(c.replace(/\\\\/g, '\\'))) return c.replace(/\\\\/g, '\\');
    } catch {}
  }
  return 'docker';
}

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { shell: true, env: getEnvWithPath(), ...opts });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => resolve({ code, out: out.trim(), err: err.trim() }));
  });
}

async function detectComposeCmd() {
  // Try docker-compose v1
  let r = await run('docker-compose', ['--version']);
  if (r.code === 0) return { bin: 'docker-compose', args: [] , version: r.out };
  // Try docker compose v2
  const dockerBin = findDockerBin();
  r = await run(dockerBin, ['compose', 'version']);
  if (r.code === 0) return { bin: 'docker', args: ['compose'], version: r.out };
  return { bin: null, args: [], version: null };
}

async function getDockerVersion() {
  const dockerBin = findDockerBin();
  let r = await run(dockerBin, ['--version']);
  if (r.code !== 0 && os.platform() === 'win32') {
    // Try absolute paths directly if PATH resolution failed
    const abs = findDockerBin();
    r = await run(abs, ['--version']);
  }
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
    try {
      if (await isDockerDaemonReady()) return true;
    } catch {}
    await sleep(2000);
  }
  return false;
}

async function startDockerAndWait(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  await startDocker();
  let remaining = Math.max(0, deadline - Date.now());
  const firstWait = Math.min(30000, remaining);
  if (await waitForDockerReady(firstWait)) return true;

  remaining = Math.max(0, deadline - Date.now());
  // If Docker still not detected on Windows, retry using alternate launcher
  if (os.platform() === 'win32') {
    await startDocker({ preferAltWinLauncher: true });
  }
  return waitForDockerReady(Math.max(0, deadline - Date.now()));
}

async function getContainerState(name) {
  // Cross-platform: parse full JSON to avoid quoting issues with -f
  const r = await run('docker', ['inspect', name]);
  if (r.code !== 0) return 'not found';
  try {
    const arr = JSON.parse(r.out);
    if (!Array.isArray(arr) || !arr.length) return 'not found';
    const st = arr[0]?.State || {};
    const status = st.Status || '';
    const health = st.Health?.Status || '';
    return `${status}|${health}`;
  } catch (e) {
    return r.out || 'unknown';
  }
}

async function getStatus() {
  const dockerVersion = await getDockerVersion();
  const compose = await detectComposeCmd();
  const repoDir = resolveRepoDir();
  const wanted = ['frigate', 'frigate_listener', 'frigate_proxy', 'mosquitto'];
  const entries = await Promise.all(
    wanted.map(async (w) => [w, await getContainerState(w)])
  );
  const services = Object.fromEntries(entries);
  return {
    platform: os.platform(),
    repoDir,
    docker: {
      installed: !!dockerVersion,
      version: dockerVersion,
    },
    compose: {
      installed: !!compose.bin,
      bin: compose.bin,
      baseArgs: compose.args,
      version: compose.version,
    },
    services,
  };
}

async function startDocker(opts = {}) {
  const { preferAltWinLauncher = false } = opts;
  const platform = os.platform();
  if (platform === 'darwin') {
    // macOS: launch Docker Desktop
    const r = await run('/usr/bin/open', ['-a', 'Docker']);
    return r.code === 0;
  }
  if (platform === 'win32') {
    // Windows: try to start Docker Desktop
    // Primary: direct exe via cmd (was fallback before)
    if (!preferAltWinLauncher) {
      const rCmd = await run('cmd', ['/c', 'start', '""', '"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"'], { windowsHide: true });
      if (rCmd.code === 0) return true;
    }
    // Fallback: PowerShell Start-Process
    let r = await run('powershell', ['-Command', 'Start-Process "Docker Desktop"'], { windowsHide: true });
    if (r.code === 0) return true;
    // Final attempt: try the other launcher if the preferred one was skipped
    if (preferAltWinLauncher) {
      const rCmd = await run('cmd', ['/c', 'start', '""', '"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"'], { windowsHide: true });
      if (rCmd.code === 0) return true;
    }
    return false;
  }
  // Linux: best-effort
  let r = await run('systemctl', ['start', 'docker']);
  if (r.code === 0) return true;
  r = await run('sudo', ['-n', 'systemctl', 'start', 'docker']);
  return r.code === 0;
}

async function installDockerMac() {
  const platform = os.platform();
  if (platform !== 'darwin') {
    throw new Error('Instalación automática de Docker soportada solo en macOS');
  }
  const repoDir = resolveRepoDir();
  const dmgPath = path.join(repoDir, 'mac', 'Docker.dmg');
  if (!exists(dmgPath)) {
    throw new Error(`No se encontró Docker.dmg en: ${dmgPath}`);
  }
  // AppleScript con privilegios de administrador, usando archivo temporal para evitar errores de quoting
  const tmpScript = path.join(os.tmpdir(), `vidria_install_docker_${Date.now()}.applescript`);
  const asContent = `set dmgPath to "${dmgPath.replace(/"/g, '\"')}"
do shell script "/usr/bin/hdiutil attach " & quoted form of dmgPath with administrator privileges
do shell script "/Volumes/Docker/Docker.app/Contents/MacOS/install --accept-license" with administrator privileges
do shell script "/usr/bin/hdiutil detach /Volumes/Docker" with administrator privileges
`;
  fs.writeFileSync(tmpScript, asContent, 'utf8');
  const r = await run('osascript', [tmpScript], { shell: false });
  try { fs.unlinkSync(tmpScript); } catch {}
  if (r.code !== 0) throw new Error(r.err || r.out || 'Fallo instalando Docker');
  // Intentar abrir Docker inmediatamente tras instalar
  await run('/usr/bin/open', ['-a', 'Docker'], { shell: false });
  return true;
}

async function installDockerWin() {
  const repoDir = resolveRepoDir();
  const installer = path.join(repoDir, 'windows', 'Docker Desktop Installer.exe');
  if (!exists(installer)) {
    throw new Error(`No se encontró el instalador en: ${installer}`);
  }
  const tmpScript = path.join(os.tmpdir(), `vidria_install_docker_${Date.now()}.ps1`);
  const safePath = installer.replace(/`/g, '``').replace(/"/g, '""');
  const ps = `
$installer = "${safePath}"
if (-not (Test-Path $installer)) { throw "No se encontrA3 el instalador en: $installer" }
Start-Process -FilePath $installer -ArgumentList 'install --accept-license --always-run-service' -Verb RunAs -Wait
`;
  fs.writeFileSync(tmpScript, ps, 'utf8');
  const r = await run('powershell', ['-NoProfile','-ExecutionPolicy','Bypass','-File', tmpScript], { windowsHide: true, shell: false });
  try { fs.unlinkSync(tmpScript); } catch {}
  if (r.code !== 0) throw new Error(r.err || r.out || 'Fallo instalando Docker en Windows');
  // Intentar abrir Docker Desktop
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
  throw new Error('Instalación automática solo soportada en macOS y Windows');
}


function exists(p) {
  try { return require('fs').existsSync(p); } catch { return false; }
}

function resolveRepoDir() {
  if (process.env.VIDRIA_REPO_DIR && exists(path.join(process.env.VIDRIA_REPO_DIR, 'docker-compose.client.yml'))) {
    return process.env.VIDRIA_REPO_DIR;
  }
  // Assumption: if VIDRIA_REPO_DIR is not set, the app is placed at the repo root
  // so docker-compose.client.yml should live directly in __dirname
  if (exists(path.join(__dirname, 'docker-compose.client.yml'))) {
    return __dirname;
  }
  // Fallback: walk up to find it (useful in dev when running from electron-health/)
  for (let i = 1; i <= 6; i++) {
    const candidate = path.resolve(__dirname, ...Array(i).fill('..'), 'docker-compose.client.yml');
    if (exists(candidate)) return path.dirname(candidate);
  }
  // Final fallback to __dirname
  return __dirname;
}

function updateCustomerIdInCompose(newId) {
  const repoDir = resolveRepoDir();
  const composePath = path.join(repoDir, 'docker-compose.client.yml');
  if (!fs.existsSync(composePath)) {
    throw new Error(`No se encontró docker-compose.client.yml en ${repoDir}`);
  }
  const original = fs.readFileSync(composePath, 'utf8');
  const lines = original.split(/\r?\n/);

  // Find 'listener:' service block
  const svcIdx = lines.findIndex((l) => /^\s*listener\s*:\s*$/.test(l));
  if (svcIdx === -1) throw new Error('Servicio "listener" no encontrado en docker-compose.client.yml');
  const svcIndent = (lines[svcIdx].match(/^\s*/)||[''])[0].length;
  // Find end of service block: next line starting with same indent and ending with ':' (another service or 'networks:')
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
    if (m) {
      envIdx = i;
      envIndent = m[1].length;
      break;
    }
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
    const toInsert = [
      `${baseIndent}environment:`,
      `${itemIndent}- CUSTOMER_ID=${newId}`,
    ];
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
        // Insert after last env item or directly after 'environment:' if no items
        const insertPos = insertAfter === envIdx ? envIdx + 1 : insertAfter + 1;
        lines.splice(insertPos, 0, `${' '.repeat(envListIndent)}- CUSTOMER_ID=${newId}`);
      }
    }
  } else {
    // Clear CUSTOMER_ID: remove the line if present
    if (envIdx !== -1) {
      const envListIndent = envIndent + 2;
      for (let i = envIdx + 1; i < endIdx; i++) {
        const line = lines[i];
        const indent = (line.match(/^\s*/)||[''])[0].length;
        if (indent <= envIndent) break;
        if (/^\s*-\s*CUSTOMER_ID\s*=/.test(line)) {
          lines.splice(i, 1);
          break;
        }
      }
    }
  }

  const updated = lines.join('\n');
  if (updated !== original) {
    fs.writeFileSync(composePath, updated, 'utf8');
  }
  return true;
}

function setCustomerId(id) {
  if (!id || typeof id !== 'string') throw new Error('CUSTOMER_ID inválido');
  return updateCustomerIdInCompose(id);
}

function clearCustomerId() {
  return updateCustomerIdInCompose(null);
}

async function runComposeUp() {
  const compose = await detectComposeCmd();
  if (!compose.bin) {
    throw new Error('docker-compose no encontrado. Instala Docker Compose v1 o v2.');
  }
  const ready = await waitForDockerReady(120000);
  if (!ready) {
    throw new Error('Docker no estA listo. Abre Docker Desktop e intA©ntalo de nuevo.');
  }
  const repoDir = resolveRepoDir();
  const args = [...compose.args, '-f', 'docker-compose.client.yml', 'up', '-d'];
  const r = await run(compose.bin, args, { cwd: repoDir });
  if (r.code !== 0) throw new Error(r.err || 'Error al ejecutar docker-compose');
  return r.out || 'ok';
}

async function runComposeDown() {
  const compose = await detectComposeCmd();
  if (!compose.bin) {
    throw new Error('docker-compose no encontrado. Instala Docker Compose v1 o v2.');
  }
  const repoDir = resolveRepoDir();
  // Stop and remove services defined in client compose
  const args = [...compose.args, '-f', 'docker-compose.client.yml', 'down'];
  const r = await run(compose.bin, args, { cwd: repoDir });
  if (r.code !== 0) throw new Error(r.err || 'Error al ejecutar docker-compose down');
  return r.out || 'ok';
}

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  // Load new wizard UI
  const wizardPath = path.join(__dirname, 'wizard.html');
  win.loadFile(wizardPath);
  mainWindow = win;

  win.webContents.on('did-finish-load', async () => {
    try {
      const h = await win.webContents.executeJavaScript('(() => { const el = document.querySelector(".wizard"); return el ? el.offsetHeight : document.body.scrollHeight; })()');
      const [w] = win.getContentSize();
      win.setContentSize(w, Math.min(Math.max(420, Math.ceil(h)), 820));
    } catch {}
  });
}

async function ensureAutoLaunchEnabled() {
  if (process.platform === 'darwin') {
    try {
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    } catch (e) {
      // best-effort
    }
  }
}

async function autoStartServicesIfAutoLaunched() {
  if (process.platform !== 'darwin') return;
  const settings = app.getLoginItemSettings ? app.getLoginItemSettings() : {};
  const wasOpenedAtLogin = !!settings.wasOpenedAtLogin;
  if (!wasOpenedAtLogin) return;
  try {
    await startDocker();
    const ok = await waitForDockerReady(120000);
    if (!ok) return;
    await runComposeUp();
  } catch (e) {
    // ignore, UI has manual controls too
  }
}

app.whenReady().then(async () => {
  await ensureAutoLaunchEnabled();
  await autoStartServicesIfAutoLaunched();
  ipcMain.handle('health:getStatus', async () => {
    try { return await getStatus(); } catch (e) { return { error: String(e) }; }
  });
  ipcMain.handle('health:startDocker', async () => {
    try { return await startDocker(); } catch { return false; }
  });
  ipcMain.handle('health:startDockerAndWait', async () => {
    try { return await startDockerAndWait(); } catch { return false; }
  });
  ipcMain.handle('health:composeUp', async () => {
    try { return await runComposeUp(); } catch (e) { return String(e); }
  });
  ipcMain.handle('health:composeDown', async () => {
    try { return await runComposeDown(); } catch (e) { return String(e); }
  });
  ipcMain.handle('health:installDocker', async () => {
    try { return await installDocker(); } catch (e) { return String(e); }
  });
  ipcMain.handle('health:setCustomerId', async (_evt, id) => {
    try { return await setCustomerId(id); } catch (e) { return String(e); }
  });
  ipcMain.handle('health:clearCustomerId', async () => {
    try { return await clearCustomerId(); } catch (e) { return String(e); }
  });
  ipcMain.handle('health:fitWindow', async () => {
    try {
      if (!mainWindow) return false;
      const h = await mainWindow.webContents.executeJavaScript('(() => { const el = document.querySelector(".wizard"); return el ? el.offsetHeight : document.body.scrollHeight; })()');
      const [w] = mainWindow.getContentSize();
      mainWindow.setContentSize(w, Math.min(Math.max(420, Math.ceil(h)), 820));
      return true;
    } catch (e) { return String(e); }
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
