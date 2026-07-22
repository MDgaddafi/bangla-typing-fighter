const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1150,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    // Reference our newly generated PNG icon
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Clean desktop arcade experience (hides standard Chrome menus)
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
