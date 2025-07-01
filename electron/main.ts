import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";

// 👉 Add this BEFORE app.whenReady
if (!app.isPackaged) {
  // require('electron-reload')(__dirname, {
  //   electron: path.join(
  //     __dirname,
  //     '..',
  //     '..',
  //     'node_modules',
  //     '.bin',
  //     'electron' + (process.platform === "win32" ? ".cmd" : "")
  //   ),
  //   forceHardReset: true,
  //   hardResetMethod: 'exit'
  // });
  console.log("Running in development mode.");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist_web', 'index.html'));
  } else {
    win.loadURL('http://localhost:3000/');
    // win.webContents.openDevTools(); // Optional
  }
}

app.whenReady().then(() => {
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});
