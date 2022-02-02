const { app, BrowserWindow, dialog, globalShortcut, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const Store = require("electron-store");
const axios = require("axios").default;
const { google } = require("googleapis");
const unrar = require("@continuata/unrar");
const regedit = require("regedit");
const { spawnSync } = require("child_process");
var splash, win;

regedit.setExternalVBSLocation("resources/regedit/vbs");

const appConfig = new Store({ defaults: {
    sbDir: null,
    lastRunVersion: app.getVersion(),
    settings: {
        darkMode: false,
        modBeta: false
    }
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
            nativeWindowOpen: false,
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
            nativeWindowOpen: false,
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

ipcMain.on("OpenMain", () => {
    splash.close();
    win.show();
});

ipcMain.on("GetPackageData", (event) => event.returnValue = fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));

ipcMain.on("GetPaths", (event, name) => event.returnValue = app.getPath(name));

ipcMain.on("GetSetting", (event, name) => event.returnValue = appConfig.get(name));

ipcMain.on("SetSetting", (_, name, value) => appConfig.set(name, value));

ipcMain.on("CheckForLauncherUpdates", async () => {
    try {
        let ghInfo = await axios.get("https://api.github.com/repos/D3W10/SBMP-Launcher/releases/latest", {
            headers: {
                accept: "application/vnd.github.v3+json",
                authorization: "token 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"
            }
        });
        splash.webContents.send("CheckForLauncherUpdatesComplete", ghInfo.data);
    }
    catch {
        splash.webContents.send("CheckForLauncherUpdatesComplete", null);
    }
});

ipcMain.on("DownloadLauncherUpdate", async (_, assetId) => {
    let writer = fs.createWriteStream(app.getPath("temp") + "\\SBMP-Update.exe");
    let ghFile = await axios.get("https://api.github.com/repos/D3W10/SBMP-Launcher/releases/assets/" + assetId, {
        headers: {
            accept: "application/octet-stream",
            authorization: "token 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"
        },
        responseType: "stream"
    });

    ghFile.data.pipe(writer);
    writer.on("close", () => splash.webContents.send("DownloadLauncherUpdateComplete", writer.path));
});

ipcMain.on("InstallLauncherUpdate", async (_, filePath) => {
    shell.openPath(filePath);
    app.exit();
});

ipcMain.on("DownloadSBMP", () => {
    const downloadMod = new Promise((resolve, reject) => {
        let tempFilePath = app.getPath("temp") + "\\SBMP.rar";
        let oAuth2 = new google.auth.OAuth2("936700799316-oam1ehmdrc923e518crrkqglvfhipe0s.apps.googleusercontent.com", "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", [ "urn:ietf:wg:oauth:2.0:oob", "http://localhost" ]);
        oAuth2.setCredentials({"access_token":"ya29.A0ARrdaM_OsaFrZx_W0luGL7Kaf9JaV8e7EsvAng119eDpwhs6k6l7w30a3nGJkXXi7XDtKhJbTZdjx8DQFWeCDViILC53SulR23rOQrwM-7qQcOkmjkB_WcgpAd1WYG9b1NbFiv973tNvAPs8tkBSNVgRokY3","refresh_token":"1//03G99XZxqxishCgYIARAAGAMSNwF-L9IrwXZYPbJ0L1-sOlVTinmmGBiLcWbgVYeh4JqFdB_T7yxGgqLw8qSHzAl1rkSlK6zfbu0","scope":"https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.readonly","token_type":"Bearer","expiry_date":1643304049745});

        const drive = google.drive({ version: "v3", auth: oAuth2 });
        const fileID = appConfig.get("settings.modBeta") ? "130Q7peI913XwBIBTD6fba4Js-yt4JeHJ" : "1xJlXcieg0Fyxbzm3w7uIhoS4O7a_j2K1";
        drive.files.get({ fileId: fileID, alt: "media" }, { responseType: "stream" }, (_, res) => {
            res.data
                .on("end", () => resolve())
                .on("error", () => reject())
                .pipe(fs.createWriteStream(tempFilePath));
        });
    });

    downloadMod
        .then(() => {
            win.webContents.send("InstallProgress", 45);
            win.setProgressBar(45 / 100);
            win.webContents.send("DownloadToInstall", true);
        })
        .catch(() => win.webContents.send("DownloadToInstall", false));
});

ipcMain.on("InstallSBMP", async () => {
    try {
        if (fs.existsSync(appConfig.get("sbDir") + "\\fnaf9\\Content\\Paks\\fnaf9.pak"))
            fs.unlinkSync(appConfig.get("sbDir") + "\\fnaf9\\Content\\Paks\\fnaf9.pak");

        unrar.on("progress", (percent) => {
            win.focus();
            win.webContents.send("InstallProgress", 45 + (percent / 2));
            win.setProgressBar((45 + (percent / 2)) / 100);
        });
        
        await unrar.uncompress({ src: app.getPath("temp") + "\\SBMP.rar", dest: appConfig.get("sbDir") + "\\fnaf9\\Content\\Paks" });

        if (fs.existsSync(path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini")))
            fs.renameSync(path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini"), path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini.old"));
        fs.copyFileSync(path.join(__dirname, "assets\\Engine.ini"), path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini"));
        win.webContents.send("InstallProgress", 100);
        win.setProgressBar(-1);
        win.webContents.send("InstallToFinish", true);
    }
    catch {
        win.webContents.send("InstallToFinish", false);
    }
});

ipcMain.on("RunSBMP", () => {
    try {
        regedit.list("HKLM\\SOFTWARE\\Wow6432Node\\Valve\\Steam", (_, result) => spawnSync(result[Object.keys(result)[0]].values.InstallPath.value + "\\steam.exe", ["-gameidlaunch 747660", "-dx11"]));
    }
    catch {
        try {
            regedit.list("HKLM\\SOFTWARE\\Valve\\Steam", (_, result) => spawnSync(result[Object.keys(result)[0]].values.InstallPath.value + "\\steam.exe", ["-gameidlaunch 747660", "-dx11"]));
        }
        catch {
            win.webContents.send("ShowPopUp", "alertPopup", "Error", "SBMP Launcher couldn't find the path to your Steam installation, make sure you have Steam installed and try again.");
        }
    }
});

ipcMain.on("UninstallSBMP", async (event) => {
    fs.unlinkSync(appConfig.get("sbDir") + "\\fnaf9\\Content\\Paks\\fnaf9.pak");
    fs.unlinkSync(path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini"));
    if (fs.existsSync(path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini.old")))
        fs.renameSync(path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini.old"), path.join(app.getPath("appData"), "..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini"));

    event.returnValue = "";
});

ipcMain.on("ShowOpenDialog", async (event, window, options) => {
    event.returnValue = await dialog.showOpenDialog(BrowserWindow.getAllWindows()[GetWindowId(window)], options);
});

//#endregion