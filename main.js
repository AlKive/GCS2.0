const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep track of the background processes so we can kill them later
let backendProcess;
let pythonProcess;

// Helper function to find the folders whether you are testing in VS Code or running the final .exe
const getResourcePath = (folderName) => {
  return app.isPackaged 
    ? path.join(process.resourcesPath, folderName)
    : path.join(__dirname, folderName);
};

function startBackgroundServices() {
  const backendPath = getResourcePath('backend');
  const pythonPath = getResourcePath('python_helpers');

  // 1. Start the Node Backend
  // This simulates typing "npm run dev" inside the backend folder
  backendProcess = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'dev'], { 
      cwd: backendPath, 
      shell: true 
  });

  // 2. Start the Python AI Engine
  // Adjust 'ai_engine.py' if your main python file is named differently
  pythonProcess = spawn('python', ['ai_engine.py'], { 
      cwd: pythonPath, 
      shell: true 
  });

  // Optional: Log errors to the main terminal if things fail to start
  backendProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
  pythonProcess.stderr.on('data', (data) => console.error(`Python Error: ${data}`));
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "LIPAD GCS",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Keeps the video stream unblocked
    }
  });

  // CRITICAL FIX: Check if we are in production or development
  if (app.isPackaged) {
    // In the built .exe, load the physical files we compiled 
    // Change 'dist' to 'build' if you are using Create React App instead of Vite
    win.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
       .catch(err => console.error("Failed to load frontend:", err));
  } else {
    // In development, load the live server URL
    win.loadURL('http://100.112.119.23:3000/')
       .catch(err => console.error("Failed to load dev server:", err));
  }
}

app.whenReady().then(() => {
  startBackgroundServices(); // Boot the servers first
  createWindow();            // Then open the UI
});

// CRITICAL: Shut down the background servers when the window is closed
app.on('will-quit', () => {
  if (backendProcess) backendProcess.kill();
  if (pythonProcess) pythonProcess.kill();
});

app.on('window-all-closed', () => {
  // On macOS (darwin), it's common for apps to stay open until the user explicitly quits
  // But on Windows and Linux, we want to kill the process completely when the window closes
  if (process.platform !== 'darwin') {
    app.quit();
  }
});