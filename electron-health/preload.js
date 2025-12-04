const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('health', {
  getStatus: () => ipcRenderer.invoke('health:getStatus'),
  startDocker: () => ipcRenderer.invoke('health:startDocker'),
  composeUp: () => ipcRenderer.invoke('health:composeUp'),
  installDocker: () => ipcRenderer.invoke('health:installDocker'),
});
