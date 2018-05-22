const {app, BrowserWindow, Menu} = require('electron');
const isDevMode = require('electron-is-dev');
const path = require('path');

if (isDevMode) {
  require('electron-reload')(__dirname + '/public');
}

let mainWindow;

function createWindow() {
  const browserOptions = { width: 600, height: 600, maximizeable: false };

  mainWindow = new BrowserWindow(browserOptions);
  mainWindow.loadURL('file://' + __dirname + '/app/index.html');

  let template = [{
    label: 'File',
    submenu: [{
        label: 'Download Folder',
        accelerator: 'CmdOrCtrl+F',
        click: () => {
          mainWindow.webContents.send('promptForChangeDownloadFolder');
        }
      },
      {
        label: 'Change Bitrate',
        submenu: [
          {label: '320 (Full Quality)', click: () => {mainWindow.webContents.send('changeBitrate', 320)}},
          {label: '192 (High Quality)', click: () => {mainWindow.webContents.send('changeBitrate', 192)}},
          {label: '160 (CD Quality)', click: () => {mainWindow.webContents.send('changeBitrate', 160)}},
          {label: '130 (Radio Quality)', click: () => {mainWindow.webContents.send('changeBitrate', 130)}},
          {label: '65 (Minimal Quality)', click: () => {mainWindow.webContents.send('changeBitrate', 65)}},
        ]
      },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  }
  ];

  // If developing add dev menu option to menu bar
  if (isDevMode) {
    template.push({
      label: 'Dev Options',
      submenu: [
        {
          label: 'Open Dev Tools', click: () => {
            mainWindow.webContents.openDevTools()
          }
        }
      ]
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
