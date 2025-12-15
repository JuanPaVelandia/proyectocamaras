const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

// -- DEBUG LOGGING --
function logDebug(msg) {
  try {
    const logPath = path.join(__dirname, 'main-debug.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
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
  if (os.platform() !== 'win32') return 'docker';
  const candidates = [
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
    'C:\\ProgramData\\DockerDesktop\\version-bin\\docker.exe',
    'docker',
  ];
  for (const c of candidates) {
    try {
      if (c === 'docker') return c;
      if (fs.existsSync(c)) return c;
    } catch { }
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
function resolveRepoDir() {
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
      repoDir,
      docker: { installed: !!dockerVer, version: dockerVer },
      compose: { installed: !!composeInfo.bin, version: composeInfo.version },
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

ipcMain.handle('health:ensureDockerInstaller', async () => { return ''; }); // Stub
ipcMain.handle('health:installDocker', async () => {
  const url = 'https://www.docker.com/products/docker-desktop/';
  await shell.openExternal(url);
  return 'Se ha abierto la página de Docker. Por favor descárgalo e instálalo.';
});
ipcMain.handle('health:setCustomerId', async (ev, id) => {
  try {
    const repoDir = resolveRepoDir();
    const yamlPath = path.join(repoDir, 'docker-compose.client.yml');
    logDebug(`Setting Customer ID (${id}) in ${yamlPath}`);

    if (!fs.existsSync(yamlPath)) {
      logDebug('YAML file not found');
      return;
    }

    let content = fs.readFileSync(yamlPath, 'utf8');

    // Legacy method: Inject directly into environment list in YAML
    // Check if CUSTOMER_ID line exists
    if (content.match(/- CUSTOMER_ID=/)) {
      content = content.replace(/- CUSTOMER_ID=.*$/, `- CUSTOMER_ID=${id}`);
    } else {
      // Find the CLOUD_API_KEY line (last known env var) and append after it
      const anchor = '- CLOUD_API_KEY=';
      const idx = content.indexOf(anchor);
      if (idx !== -1) {
        // Find end of that line
        const endOfLine = content.indexOf('\n', idx);
        if (endOfLine !== -1) {
          const prefix = content.substring(0, endOfLine + 1);
          const suffix = content.substring(endOfLine + 1);
          // Match indentation of the anchor line
          const lineStart = content.lastIndexOf('\n', idx) + 1;
          const indentation = content.substring(lineStart, idx);

          content = prefix + indentation + `- CUSTOMER_ID=${id}\n` + suffix;
        }
      }
    }

    fs.writeFileSync(yamlPath, content, 'utf8');
    logDebug('Saved docker-compose.client.yml');
  } catch (e) {
    logDebug(`setCustomerId error: ${e.message}`);
  }
});
ipcMain.handle('health:clearCustomerId', async () => { });
ipcMain.handle('health:fitWindow', async () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    // win.setContentSize(850, 600); 
  }
});

// -- APP LIFECYCLE --
function createWindow() {
  const win = new BrowserWindow({
    width: 900, height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false
  });
  win.loadFile('wizard.html');
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
