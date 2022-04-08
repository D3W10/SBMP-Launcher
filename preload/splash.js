const { ipcRenderer } = require("electron");
const fs = require("fs");
const log = require("electron-log");
const preload = require("./preload");

console.log = log.log;
log.transports.file.fileName = "logs.log";

window.addEventListener("load", async () => {
    document.getElementById("splashMessage").innerText = "Initializing";
    document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-1.png");
    await preload.ReloadIcons();
    
    if ((await preload.GetSetting("settings")).darkMode)
        document.body.setAttribute("theme", "dark");
    
    if (!navigator.onLine) {
        document.getElementById("splashMessage").innerText = "I will notify the main office...";
        await preload.Sleep(2000);
        document.getElementById("splashIcon").style.opacity = "0";
        document.getElementById("splashMessage").style.opacity = "0";
        await preload.Sleep(400);
        document.getElementById("splashIcon").setAttribute("name", "wifi");
        await preload.ReloadIcons();
        document.getElementById("splashMessage").innerText = "Connection error";
        document.getElementById("splashIcon").removeAttribute("style");
        document.getElementById("splashMessage").removeAttribute("style");
        await preload.Sleep(2400);
        document.getElementById("splashMessage").style.opacity = "0";
        await preload.Sleep(400);
        document.getElementById("splashMessage").innerText = "I cannot connect to the main network...";
        document.getElementById("splashMessage").removeAttribute("style");
        return;
    }

    document.getElementById("splashMessage").innerText = "Checking for Updates";
    document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-2.png");
    ipcRenderer.send("CheckForLauncherUpdates");

    ipcRenderer.on("CheckForLauncherUpdatesComplete", async (_, hasUpdate) => {
        if (hasUpdate && (await preload.GetSetting("autoUpdate"))) {
            document.getElementById("splashMessage").innerText = "Downloading Updates";
            document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-3.png");
            ipcRenderer.send("DownloadLauncherUpdate");
        }
        else {
            document.getElementById("splashMessage").innerText = "Finishing up!";
            document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-5.png");
            if (fs.existsSync((await preload.GetPaths("temp")) + "\\SBMP-Update.exe"))
                fs.unlinkSync((await preload.GetPaths("temp")) + "\\SBMP-Update.exe");
            if (fs.existsSync((await preload.GetPaths("temp")) + "\\changelog.md"))
                fs.unlinkSync((await preload.GetPaths("temp")) + "\\changelog.md");
            preload.OpenMain();
        }
    });

    ipcRenderer.on("DownloadLauncherUpdateComplete", (_, filePath) => {
        document.getElementById("splashMessage").innerText = "Installing Updates";
        document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-4.png");
        ipcRenderer.send("InstallLauncherUpdate", filePath);
    });
});