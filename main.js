const { app, BrowserWindow, shell } = require('electron');
const path = require('path');


function createWindow() {
const win = new BrowserWindow({
width: 1100,
height: 720,
minWidth: 900,
minHeight: 600,
title: 'Cygnus Node Monitor',
webPreferences: {
preload: path.join(__dirname, 'preload.js'),
contextIsolation: true,
sandbox: true
}
});


win.loadFile('index.html');
win.webContents.setWindowOpenHandler(({ url }) => {
shell.openExternal(url);
return { action: 'deny' };
});
}


app.whenReady().then(() => {
createWindow();
app.on('activate', () => {
if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
});


app.on('window-all-closed', () => {
if (process.platform !== 'darwin') app.quit();
});