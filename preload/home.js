const path = require("path");
const preload = require("./preload");
const { Sleep } = require("./preload");
var openPanel = null;

window.addEventListener("load", () => {
    //#region INITIALIZATION

    (async function () {
        await preload.ReloadIcons();

        if ((await preload.GetSetting("settings")).darkMode) {
            document.body.setAttribute("theme", "dark");
            document.getElementById("settingsAppearance").value = "1";
        }

        for (const panel of document.querySelectorAll("#appTab > *")) {
            if (panel.id != "mainPanel") {
                panel.style.display = "none";
                panel.style.opacity = "0";
                openPanel = "mainPanel";
            }
        }

        for (const element of document.querySelectorAll("button, a")) {
            element.addEventListener("click", async (event) => {
                if (element.getAttribute("goto") != null) {
                    let panelToSwitch = event.currentTarget.getAttribute("goto");

                    if (!event.currentTarget.hasAttribute("disabled") && openPanel != panelToSwitch) {
                        for (const selectedTab of document.getElementsByClassName("selected"))
                            selectedTab.classList.remove("selected")
                        event.currentTarget.classList.add("selected");

                        document.getElementById(openPanel).style.opacity = "0";
                        await Sleep(200);
                        document.getElementById(openPanel).style.display = "none";

                        openPanel = panelToSwitch;

                        document.getElementById(panelToSwitch).style.display = "flex";
                        await Sleep(200);
                        document.getElementById(panelToSwitch).removeAttribute("style");
                    }
                }
            });  
        }

        document.getElementById("settingsPathText").innerText = (await preload.GetSetting("sbDir") != null ? (await preload.GetSetting("sbDir")) : "");
        document.getElementById("settingsModBeta").checked = await preload.GetSetting("settings.modBeta");
        document.getElementById("settingsVersion").innerText = preload.GetPackageData().version;
    }());
    
    preload.ReloadModStatus();

    //#endregion

    //#region FRAME BAR

    document.getElementById("closeCircle").addEventListener("click", () => preload.CloseWindow());

    document.getElementById("minimizeCircle").addEventListener("click", () => preload.MinimizeWindow());

    //#endregion

    //#region MAIN PANEL

    document.getElementById("mainIcon").addEventListener("dblclick", async () => {
        document.getElementById("mainSecretAudio").play();
    });

    document.getElementById("mainButton").addEventListener("click", async () => {
        if (document.getElementById("mainButton").innerText == "Install") {
            if ((await preload.GetSetting("sbDir")) != null)
                preload.InstallSBMP();
            else
                preload.ShowPopUp("alertPopup", "Information", "The path to Security Breach is not set up. Please go to Settings, set it up and try again!");
        } else if (document.getElementById("mainButton").innerText == "Play") {
            document.getElementById("mainButton").disabled = true;
            preload.RunSBMP();
            await Sleep(3000);
            document.getElementById("mainButton").disabled = false;
        }
    });

    document.getElementById("mainMore").addEventListener("click", async () => {
        if (document.getElementById("contextMenu").style.length == 0) {
            document.getElementById("contextMenu").style.maxWidth = "200px";
            document.getElementById("contextMenu").style.maxHeight = "100px";
            document.getElementById("contextMenu").style.padding = "5px";
            await Sleep(400);
            for (let child of document.getElementById("contextMenu").children)
                child.style.display = "flex";
            await Sleep(50);
            for (let child of document.getElementById("contextMenu").children)
                child.style.opacity = "1";
            document.body.addEventListener("click", CloseContextMenu);
        }
    });

    async function CloseContextMenu() {
        for (let child of document.getElementById("contextMenu").children)
            child.style.opacity = "0";
        await Sleep(200);
        for (let child of document.getElementById("contextMenu").children)
            child.removeAttribute("style");
        document.getElementById("contextMenu").removeAttribute("style");
        document.body.removeEventListener("click", CloseContextMenu);
    }

    document.getElementById("contextUninstall").addEventListener("click", () => {
        preload.ShowPopUp("askPopup", "Uninstall", "Are you sure you want to uninstall the mod? Your game files will return to their original state.", preload.UninstallSBMP);
    });

    //#endregion

    //#region SETTINGS PANEL

    document.getElementById("settingsPathChoose").addEventListener("click", async () => {
        let fnafLocation = await preload.ShowOpenDialog([{ name: "fnaf9.exe", extensions: ["exe"] }], ["openFile"]);
        if (!fnafLocation.canceled) {
            if (fnafLocation.filePaths[0].endsWith("fnaf9.exe")) {
                preload.SetSetting("sbDir", path.dirname(fnafLocation.filePaths[0]));
                document.getElementById("settingsPathText").innerText = path.dirname(fnafLocation.filePaths[0]);
                preload.ReloadModStatus();
            }
            else
                preload.ShowPopUp("alertPopup", "Information", "You must select a file named fnaf9.exe, it might be somewhere on your Security Breach installation folder.")
        }
    });

    document.getElementById("settingsAppearance").addEventListener("change", () => {
        if (Boolean(Number(document.getElementById("settingsAppearance").value)))
            document.body.setAttribute("theme", "dark");
        else
            document.body.setAttribute("theme", "light");
        preload.SetSetting("settings.darkMode", Boolean(Number(document.getElementById("settingsAppearance").value)));
    });

    document.getElementById("settingsModBeta").addEventListener("change", () => {
        preload.SetSetting("settings.modBeta", document.getElementById("settingsModBeta").checked);
    });
    
    //#endregion
});