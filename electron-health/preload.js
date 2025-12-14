const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('health', {
  getStatus: () => ipcRenderer.invoke('health:getStatus'),
  startDocker: () => ipcRenderer.invoke('health:startDocker'),
  startDockerAndWait: () => ipcRenderer.invoke('health:startDockerAndWait'),
  composeUp: () => ipcRenderer.invoke('health:composeUp'),
  composeDown: () => ipcRenderer.invoke('health:composeDown'),
  installDocker: () => ipcRenderer.invoke('health:installDocker'),
  setCustomerId: (id) => ipcRenderer.invoke('health:setCustomerId', id),
  clearCustomerId: () => ipcRenderer.invoke('health:clearCustomerId'),
  fitWindow: () => ipcRenderer.invoke('health:fitWindow'),
});
