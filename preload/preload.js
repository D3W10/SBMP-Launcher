const { ipcRenderer } = require("electron");
const fs = require("fs");
const showdown = require("showdown");
var styleControl;

//#region FUNCTIONS

function CloseWindow() {
    ipcRenderer.send("WinClose");
}

function MinimizeWindow() {
    ipcRenderer.send("WinMinimize", document.title);
}

async function ReloadIcons() {
    for (const icon of document.getElementsByTagName("icon")) {
        let iconXML = await fetch("./assets/icons/" + icon.getAttribute("name") + ".svg");
        icon.innerHTML = await iconXML.text();
    }
}

async function ReloadModStatus() {
    document.getElementById("mainButton").removeAttribute("style");
    document.getElementById("mainButton").disabled = false;
    if (document.getElementById("mainButtonProgressControl"))
        document.getElementById("mainButtonProgressControl").remove();

    if (fs.existsSync((await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak")) {
        document.getElementById("mainButton").classList.add("installed");
        document.getElementById("mainButton").innerText = "Play";
        document.getElementById("mainMore").removeAttribute("style");
    }
    else {
        document.getElementById("mainButton").classList.remove("installed");
        document.getElementById("mainButton").innerText = "Install";
        document.getElementById("mainMore").style.visibility = "hidden";
    }
}

function OpenMain() {
    ipcRenderer.send("OpenMain");
}

function GetPackageData() {
    return JSON.parse(ipcRenderer.sendSync("GetPackageData"));
}

function GetProcessVersions() {
    return process.versions;
}

async function GetPaths(name) {
    return await ipcRenderer.sendSync("GetPaths", name);
}

async function GetSetting(name) {
    return await ipcRenderer.sendSync("GetSetting", name);
}

async function SetSetting(name, value) {
    return ipcRenderer.send("SetSetting", name, value);
}

async function GetVersionChanges() {
    return await ipcRenderer.sendSync("GetVersionChanges");
}

async function InstallSBMP() {
    document.getElementById("mainButton").style.setProperty("background-color", "var(--darkBlue)", "important");
    document.getElementById("mainButton").disabled = true;
    document.getElementById("mainButton").innerText = "Downloading...";
    styleControl = document.createElement("style");
    styleControl.id = "mainButtonProgressControl";
    document.getElementById("mainPanel").appendChild(styleControl);
    await Sleep(400);

    ipcRenderer.send("DownloadSBMP");
}

async function RunSBMP() {
    ipcRenderer.send("RunSBMP");
}

async function UninstallSBMP() {
    await ipcRenderer.sendSync("UninstallSBMP");
    ReloadModStatus();
}

async function ShowOpenDialog(filters, properties) {
    return await ipcRenderer.sendSync("ShowOpenDialog", document.title, {
        title: "Select Security Breach installation path",
        filters: filters,
        properties: properties
    });
}

async function ShowPopUp(type, title, text, yesFunc) {
    let converter = new showdown.Converter();

    document.querySelector("#" + type + " > h1").innerText = title;
    if (type != "changelogPopup")
        document.querySelector("#" + type + " > p").innerText = text;
    else
        document.querySelector("#" + type + " > div").innerHTML = converter.makeHtml(text);

    async function ClosePopUp(event) {
        if (event.currentTarget == event.target) {
            document.getElementById("popups").removeEventListener("click", ClosePopUp);
            if (type == "alertPopup")
                document.querySelector("#" + type + " > button").removeEventListener("click", ClosePopUp);
            else if (type == "askPopup") {
                let oldYesButton = document.querySelector("#" + type + " > div > button:first-child");
                let newYesButton = oldYesButton.cloneNode(true);
                oldYesButton.parentNode.replaceChild(newYesButton, oldYesButton);
                document.querySelector("#" + type + " > div > button:last-child").removeEventListener("click", ClosePopUp);
            }
            else if (type == "changelogPopup")
                document.querySelector("#" + type + " > button").removeEventListener("click", ClosePopUp);
            document.getElementById("popups").style.opacity = "0";
            document.getElementById(type).style.opacity = "0";
            document.getElementById(type).style.transform = "scale(0.5)";
            await Sleep(200);
            document.getElementById(type).removeAttribute("style");
            document.getElementById("popups").removeAttribute("style");
        }
    }

    document.getElementById("popups").style.display = "flex";
    await Sleep(50);
    document.getElementById("popups").style.opacity = "1";
    document.getElementById(type).style.display = "block";
    await Sleep(50);
    document.getElementById(type).style.opacity = "1";
    document.getElementById(type).style.transform = "scale(1)";
    document.getElementById("popups").addEventListener("click", ClosePopUp);
    if (type == "alertPopup")
        document.querySelector("#" + type + " > button").addEventListener("click", ClosePopUp);
    else if (type == "askPopup") {
        document.querySelector("#" + type + " > div > button:first-child").addEventListener("click", ClosePopUp);
        document.querySelector("#" + type + " > div > button:first-child").addEventListener("click", yesFunc);
        document.querySelector("#" + type + " > div > button:last-child").addEventListener("click", ClosePopUp);
    }
    else if (type == "changelogPopup") {
        document.querySelector("#" + type + " > button").addEventListener("click", ClosePopUp);
    }
}

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

//#endregion

//#region RENDER LISTENERS

ipcRenderer.on("DownloadToInstall", (_, status) => {
    if (!status) {
        CancelInstall("downloading");
        return;
    }
    document.getElementById("mainButton").innerText = "Installing...";
    ipcRenderer.send("InstallSBMP");
});

ipcRenderer.on("InstallProgress", (_, progress) => {
    styleControl.innerText = "#mainButton::after { width: " + progress + "%; transition: width 0.2s; }";
});

ipcRenderer.on("InstallToFinish", async (_, status) => {
    if (!status) {
        CancelInstall("installing");
        return;
    }
    await Sleep(700);
    ReloadModStatus();
});

async function CancelInstall(action) {
    if (fs.existsSync((await GetPaths("temp")) + "\\SBMP.rar"))
        fs.unlinkSync((await GetPaths("temp")) + "\\SBMP.rar");
    ShowPopUp("alertPopup", "Error", "There was an error while " + action + " the mod. Check if you have a stable internet connection and try again. If this problem persists, contact the SBMP Team!");
    return;
}

ipcRenderer.on("ShowPopUp", async (_, type, title, text, yesFunc) => {
    ShowPopUp(type, title, text, yesFunc);
});

//#endregion

exports.CloseWindow = CloseWindow;
exports.MinimizeWindow = MinimizeWindow;
exports.ReloadIcons = ReloadIcons;
exports.ReloadModStatus = ReloadModStatus;
exports.OpenMain = OpenMain;
exports.GetPackageData = GetPackageData;
exports.GetProcessVersions = GetProcessVersions;
exports.GetPaths = GetPaths;
exports.GetSetting = GetSetting;
exports.SetSetting = SetSetting;
exports.GetVersionChanges = GetVersionChanges;
exports.InstallSBMP = InstallSBMP;
exports.RunSBMP = RunSBMP;
exports.UninstallSBMP = UninstallSBMP;
exports.ShowOpenDialog = ShowOpenDialog;
exports.ShowPopUp = ShowPopUp;
exports.Sleep = Sleep;