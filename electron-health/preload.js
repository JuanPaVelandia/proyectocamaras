const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('health', {
  getStatus: () => ipcRenderer.invoke('health:getStatus'),
  startDocker: () => ipcRenderer.invoke('health:startDocker'),
  startDockerAndWait: () => ipcRenderer.invoke('health:startDockerAndWait'),
  ensureDockerInstaller: () => ipcRenderer.invoke('health:ensureDockerInstaller'),
  composeUp: () => ipcRenderer.invoke('health:composeUp'),
  composeDown: () => ipcRenderer.invoke('health:composeDown'),
  installDocker: () => ipcRenderer.invoke('health:installDocker'),
  downloadDependencies: () => ipcRenderer.invoke('health:downloadDependencies'),
  log: (msg) => ipcRenderer.invoke('health:log', msg),
  setCustomerId: (id) => ipcRenderer.invoke('health:setCustomerId', id),
  clearCustomerId: () => ipcRenderer.invoke('health:clearCustomerId'),
  fitWindow: () => ipcRenderer.invoke('health:fitWindow'),
});
