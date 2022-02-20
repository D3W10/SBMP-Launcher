const { app, BrowserWindow, dialog, globalShortcut, ipcMain, screen, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const Store = require("electron-store");
const axios = require("axios").default;
const progress = require("progress-stream");
const unrar = require("@continuata/unrar");
const regedit = require("regedit");
const { spawn } = require("child_process");
const serverURI = "https://sbmp-server.herokuapp.com";
var splash, win, golden;

regedit.setExternalVBSLocation("resources/regedit/vbs");

const appConfig = new Store({ defaults: {
    sbDir: null,
    lastRunVersion: app.getVersion(),
    settings: {
        darkMode: false,
        modBeta: false
    },
    autoUpdate: true,
    installedVersion: 0
}});

function createWindow() {
    splash = new BrowserWindow({
        title: "SBMP Launcher",
        width: 400,
        height: 300,
        frame: false,
        resizable: false,
        fullscreen: false,
        fullscreenable: false,
        maximizable: false,
        show: false,
        icon: path.join(__dirname, "assets/logo.png"),
        sandbox: true,
        webPreferences: {
            devTools: true,
            preload: path.join(__dirname, "preload/splash.js")
        }
    });
    splash.loadFile("splash.html");
    splash.once("ready-to-show", () => splash.show());

    win = new BrowserWindow({
        title: "SBMP Launcher",
        width: 900,
        height: 550,
        frame: false,
        resizable: false,
        fullscreen: false,
        fullscreenable: false,
        maximizable: false,
        show: false,
        icon: path.join(__dirname, "assets/logo.png"),
        sandbox: true,
        webPreferences: {
            devTools: true,
            preload: path.join(__dirname, "preload/home.js")
        }
    });
    win.loadFile("index.html");
}

//#region APP EVENTS

app.on("second-instance", () => {
    if (win.isMinimized())
        win.restore();
    win.focus();
});

app.whenReady().then(() => {
    createWindow();
    
    globalShortcut.register("Control+Shift+I", () => {
        return false;
    });
    
    globalShortcut.register("Control+Shift+D", () => {
        if (BrowserWindow.getFocusedWindow())
            BrowserWindow.getFocusedWindow().webContents.openDevTools();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});

//#endregion

//#region RENDER EVENTS

function GetWindowId(title) {
    for (let i = 0; i < BrowserWindow.getAllWindows().length; i++) {
        if (BrowserWindow.getAllWindows()[i].title == title)
            return i;
    }
}

ipcMain.on("WinClose", () => app.exit());

ipcMain.on("WinMinimize", (_, window) => BrowserWindow.getAllWindows()[GetWindowId(window)].minimize());

ipcMain.on("CheckForModUpdates", async () => {
    let svModInfo = await axios.get(!appConfig.get("settings.modBeta") ? serverURI + "/get/release" : serverURI + "/get/beta", {
        params: {
            info: "true"
        }
    });

    if (appConfig.get("installedVersion") != Number(svModInfo.data.version))
        win.webContents.send("CheckForModUpdatesComplete", true);
    else
        win.webContents.send("CheckForModUpdatesComplete", false);
});

ipcMain.on("OpenMain", () => {
    splash.close();
    win.show();
});

ipcMain.on("GoldenSecret", () => {
    golden = new BrowserWindow({
        title: "SBMP Launcher",
        width: screen.getPrimaryDisplay().workAreaSize.width,
        height: screen.getPrimaryDisplay().workAreaSize.height,
        frame: false,
        resizable: false,
        fullscreen: true,
        fullscreenable: true,
        maximizable: false,
        show: false,
        icon: path.join(__dirname, "assets/logo.png"),
        sandbox: true,
        webPreferences: {
            devTools: true
        }
    });
    golden.loadFile("assets/golden.html");
    golden.once("ready-to-show", () => {
        golden.show();
        setTimeout(() => golden.close(), 3000);
    });
});

ipcMain.on("GetPackageData", (event) => event.returnValue = fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));

ipcMain.on("GetPaths", (event, name) => event.returnValue = app.getPath(name));

ipcMain.on("GetSetting", (event, name) => event.returnValue = appConfig.get(name));

ipcMain.on("SetSetting", (_, name, value) => appConfig.set(name, value));

ipcMain.on("CheckForLauncherUpdates", async () => {
    try {
        let svInfo = await axios.get(serverURI + "/cfu", {
            params: {
                version: app.getVersion()
            }
        });
        splash.webContents.send("CheckForLauncherUpdatesComplete", svInfo.data.update);
    }
    catch {
        splash.webContents.send("CheckForLauncherUpdatesComplete", false);
    }
});

ipcMain.on("DownloadLauncherUpdate", async () => {
    let writer = fs.createWriteStream(app.getPath("temp") + "\\SBMP-Update.exe");
    let svFile = await axios.get(serverURI + "/download", {
        responseType: "stream"
    });

    svFile.data.pipe(writer);
    writer.on("close", () => splash.webContents.send("DownloadLauncherUpdateComplete", writer.path));
});

ipcMain.on("InstallLauncherUpdate", async (_, filePath) => {
    await shell.openPath(filePath);
    app.exit();
});

ipcMain.on("GetVersionChanges", async (event) => {
    let svChanges = await axios.get(serverURI + "/changes", {
        params: {
            version: app.getVersion()
        }
    });
    event.returnValue = svChanges.data;
});

ipcMain.on("DownloadSBMP", async () => {
    try {
        let fileStream = fs.createWriteStream(app.getPath("temp") + "\\SBMP.rar");

        let svModInfo = await axios.get(!appConfig.get("settings.modBeta") ? serverURI + "/get/release" : serverURI + "/get/beta", {
            params: {
                info: "true"
            }
        });
        let str = progress({ length: Number(svModInfo.data.size), time: 100 });

        let svMod = await axios.get(!appConfig.get("settings.modBeta") ? serverURI + "/get/release" : serverURI + "/get/beta", {
            responseType: "stream"
        });
        svMod.data.pipe(str).pipe(fileStream);

        str.on("progress", (pgss) => {
            win.webContents.send("DownloadProgress", (pgss.percentage * 45) / 100, pgss.eta, pgss.speed);
            win.setProgressBar((pgss.percentage * 45) / 10000);
        });
        fileStream.on("close", () => win.webContents.send("DownloadToInstall", true, Number(svModInfo.data.version)));
    }
    catch {
        win.webContents.send("DownloadToInstall", false);
    }
});

ipcMain.on("InstallSBMP", async (_, version) => {
    try {
        if (fs.existsSync(appConfig.get("sbDir") + "\\fnaf9\\Content\\Paks\\fnaf9.pak"))
            fs.unlinkSync(appConfig.get("sbDir") + "\\fnaf9\\Content\\Paks\\fnaf9.pak");

        unrar.on("progress", (percent) => {
            win.focus();
            win.webContents.send("InstallProgress", 45 + (percent / 2));
            win.setProgressBar((45 + (percent / 2)) / 100);
        });
        
        await unrar.uncompress({ src: app.getPath("temp") + "\\SBMP.rar", dest: appConfig.get("sbDir") + "\\fnaf9\\Content\\Paks" });

        fs.copyFileSync(path.join(__dirname, "assets\\Engine.ini"), path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini"));
        win.webContents.send("InstallProgress", 100);
        win.setProgressBar(-1);
        appConfig.set("installedVersion", version);
        win.webContents.send("InstallToFinish", true);
    }
    catch {
        win.webContents.send("InstallToFinish", false);
    }
});

ipcMain.on("RunSBMP", () => {
    regedit.list("HKLM\\SOFTWARE\\Wow6432Node\\Valve\\Steam")
    .on("data", (entry) => spawn("\"" + entry.data.values.InstallPath.value.replace(/\\/g, "/") + "/steam.exe\"", ["-gameidlaunch 747660", "-dx11"], { detached: true, shell: true, stdio: "ignore" }).unref())
    .on("error", () => {
        regedit.list("HKLM\\SOFTWARE\\Valve\\Steam")
        .on("data", (entry) => spawn("\"" + entry.data.values.InstallPath.value.replace(/\\/g, "/") + "/steam.exe\"", ["-gameidlaunch 747660", "-dx11"], { detached: true, shell: true, stdio: "ignore" }).unref())
        .on("error", () => win.webContents.send("ShowPopUp", "alertPopup", "Error", "SBMP Launcher couldn't find the path to your Steam installation, make sure you have Steam installed and try again."));
    });
});

ipcMain.on("GetModChanges", async () => {
    let fileStream = fs.createWriteStream(app.getPath("temp") + "\\changelog.md");

    let svChanges = await axios.get(serverURI + "/changesmod", {
        params: {
            beta: appConfig.get("settings.modBeta") ? "true" : "false"
        },
        responseType: "stream"
    });

    svChanges.data.on("end", () => win.webContents.send("GetModChangesComplete", true))
    svChanges.data.on("error", () => win.webContents.send("GetModChangesComplete", false))
    svChanges.data.pipe(fileStream);
});

ipcMain.on("UninstallSBMP", async (event) => {
    fs.unlinkSync(appConfig.get("sbDir") + "\\fnaf9\\Content\\Paks\\fnaf9.pak");
    fs.unlinkSync(path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini"));

    event.returnValue = "";
});

ipcMain.on("ShowOpenDialog", async (event, window, options) => {
    event.returnValue = await dialog.showOpenDialog(BrowserWindow.getAllWindows()[GetWindowId(window)], options);
});

//#endregion