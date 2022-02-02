const { ipcRenderer } = require("electron");
const fs = require("fs");
const preload = require("./preload");

window.addEventListener("load", () => {
    (async function () {
        document.getElementById("splashMessage").innerText = "Initializing";
        document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-1.png");
        await preload.ReloadIcons();
        if ((await preload.GetSetting("settings")).darkMode)
            document.body.setAttribute("theme", "dark");
        if (!navigator.onLine) {
            document.getElementById("splashIcon").setAttribute("name", "wifi");
            document.getElementById("splashMessage").innerText = "Offline";
            await preload.ReloadIcons();
            return;
        }

        document.getElementById("splashMessage").innerText = "Checking for Updates";
        document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-2.png");
        ipcRenderer.send("CheckForLauncherUpdates");
    }());

    ipcRenderer.on("CheckForLauncherUpdatesComplete", async (_, updateInfo) => {
        if (process.env.DEBUG != 1 && updateInfo != null && updateInfo.tag_name != preload.GetPackageData().version) {
            document.getElementById("splashMessage").innerText = "Downloading Updates";
            document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-3.png");
            ipcRenderer.send("DownloadLauncherUpdate", updateInfo.assets[0].id);
        }
        else {
            document.getElementById("splashMessage").innerText = "Finishing up!";
            document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-5.png");
            if (fs.existsSync((await preload.GetPaths("temp")) + "\\SBMP.rar"))
                fs.unlinkSync((await preload.GetPaths("temp")) + "\\SBMP.rar");
            preload.OpenMain();
        }
    });

    ipcRenderer.on("DownloadLauncherUpdateComplete", async (_, filePath) => {
        document.getElementById("splashMessage").innerText = "Installing Updates";
        document.getElementById("splashBattery").setAttribute("src", "./assets/images/battery-4.png");
        ipcRenderer.send("InstallLauncherUpdate", filePath);
    });
});