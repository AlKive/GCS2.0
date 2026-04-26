const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Drone GCS",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Pointing directly to your VPN-hosted development server
  win.loadURL('http://100.112.119.23:3000/');

  // Opens the developer tools automatically to help monitor the live stream packets
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});