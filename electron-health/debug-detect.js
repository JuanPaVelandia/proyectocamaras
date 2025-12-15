const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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
            if (c === 'docker') {
                console.log(`Checking candidate 'docker' (command)`);
                return c;
            }
            console.log(`Checking candidate '${c}'`);
            if (fs.existsSync(c)) {
                console.log(`Found docker at: ${c}`);
                return c;
            }
        } catch (e) { console.log('Error checking candidate:', e.message); }
    }
    return 'docker';
}

function run(cmd, args = [], opts = {}) {
    return new Promise((resolve) => {
        console.log(`Running: [${cmd}] ${args.join(' ')}`);
        // SIMULATING THE PATCH
        const safeCmd = (os.platform() === 'win32' && cmd.includes(' ') && !cmd.startsWith('"')) ? '"' + cmd + '"' : cmd;
        console.log(`SafeCmd: [${safeCmd}]`);

        // NOTE: shell: true is critical here
        const p = spawn(safeCmd, args, { shell: true, env: getEnvWithPath(), ...opts });
        let out = '';
        let err = '';
        p.stdout.on('data', (d) => (out += d.toString()));
        p.stderr.on('data', (d) => (err += d.toString()));
        p.on('close', (code) => {
            console.log(`Exit Code: ${code}`);
            console.log(`Out: ${out.trim()}`);
            console.log(`Err: ${err.trim()}`);
            resolve({ code, out: out.trim(), err: err.trim() });
        });
    });
}

async function getDockerVersion() {
    const dockerBin = findDockerBin();
    console.log(`Selected Docker Bin: ${dockerBin}`);

    // Try directly
    let r = await run(dockerBin, ['--version']);
    if (r.code !== 0 && os.platform() === 'win32') {
        console.log('Direct run failed, trying fallback lookup...');
        const abs = findDockerBin(); // In original code this is just repeating the logic?
        // In original code:
        // if (r.code !== 0 && os.platform() === 'win32') {
        //  const abs = findDockerBin();
        //  r = await run(abs, ['--version']);
        // }
        // But findDockerBin already prioritizes absolute paths.
    }
    return r.code === 0 ? r.out : null;
}

(async () => {
    console.log('Starting detection test...');
    const v = await getDockerVersion();
    console.log(`Detected Version: ${v}`);

    console.log('Checking docker info...');
    const dockerBin = findDockerBin();
    const info = await run(dockerBin, ['info']);
    console.log('Attempting direct spawn launch...');
    const subprocess = spawn('C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe', [], {
        detached: true,
        stdio: 'ignore'
    });
    subprocess.unref();
    console.log('Spawned detached process.');
})();
