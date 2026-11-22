'use strict';

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { startRoomServer } = require('./server/room-server');

let win = null;
let srv = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(boot);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (!win && srv) createWindow();
  });
  app.on('before-quit', () => {
    if (srv) {
      try { srv.close(); } catch (e) {}
      srv = null;
    }
  });
}

async function boot() {
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  try {
    srv = await startRoomServer({ port: Number(process.env.MOZHAN_PORT || 8799) });
  } catch (err) {
    dialog.showErrorBox('房间服务启动失败', '无法在局域网端口上启动房间服务：\n' + (err && err.message ? err.message : err));
    app.quit();
    return;
  }
  createWindow();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#efe6d3',
    title: '墨战 · 键影',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  win.loadURL(srv.url);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('render-process-gone', () => {
    if (win) win.reload();
  });
}
