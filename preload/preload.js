const { ipcRenderer } = require("electron");
const fs = require("fs");
const log = require("electron-log");
const showdown = require("showdown");
const AdmZip = require("adm-zip");
var styleControl;

console.log = log.log;
log.transports.file.fileName = "logs.log";

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

    if (fs.existsSync(await GetSetting("sbDir"))) {
        if (fs.existsSync((await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak") || fs.existsSync((await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak.disabled"))
            ipcRenderer.send("CheckForModUpdates");
        else {
            document.getElementById("mainButton").classList.remove("installed");
            document.getElementById("mainButton").innerText = "Install";
            document.getElementById("mainMore").style.visibility = "hidden";
        }
    }
    else
        SetSetting("sbDir", null);
}

function OpenMain() {
    ipcRenderer.send("OpenMain");
}

function GoldenSecret() {
    ipcRenderer.send("GoldenSecret");
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

function SetSetting(name, value) {
    return ipcRenderer.send("SetSetting", name, value);
}

async function GetVersionChanges() {
    return await ipcRenderer.sendSync("GetVersionChanges");
}

async function InstallSBMP() {
    document.getElementById("mainButton").style.setProperty("background-color", "var(--darkBlue)", "important");
    document.getElementById("mainButton").disabled = true;
    document.getElementById("mainButton").innerText = "Downloading...";
    document.querySelector("#mainPanel > div > div:last-child").style.opacity = "1";
    document.getElementById("mainMore").style.visibility = "hidden";
    styleControl = document.createElement("style");
    styleControl.id = "mainButtonProgressControl";
    document.getElementById("mainPanel").appendChild(styleControl);
    await Sleep(400);

    ipcRenderer.send("DownloadSBMP");
}

function RunSBMP() {
    ipcRenderer.send("RunSBMP", document.getElementById("mainButton").innerText == "Play" ? false : true);
}

async function DisableEnableMod() {
    if (!fs.existsSync((await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak.disabled")) {
        fs.renameSync((await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak", (await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak.disabled");
        fs.renameSync((await GetPaths("appData")) + "\\..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini", (await GetPaths("appData")) + "\\..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini.disabled");
    }
    else {
        fs.renameSync((await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak.disabled", (await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak");
        fs.renameSync((await GetPaths("appData")) + "\\..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini.disabled", (await GetPaths("appData")) + "\\..\\Local\\fnaf9\\Saved\\Config\\WindowsNoEditor\\Engine.ini");
    }
    ReloadModStatus();
}

function GetModChanges() {
    return ipcRenderer.send("GetModChanges");
}

async function UninstallSBMP() {
    await ipcRenderer.sendSync("UninstallSBMP");
    ReloadModStatus();
}

async function BackupSaves(path) {
    let backup = new AdmZip();
    backup.addLocalFolder((await GetPaths("appData")) + "\\..\\Local\\fnaf9\\Saved\\SaveGames");
    backup.writeZip(path);
}

async function RestoreSaves(path) {
    let restore = new AdmZip(path);
    restore.extractAllTo((await GetPaths("appData")) + "\\..\\Local\\fnaf9\\Saved\\SaveGames");
}

async function ShowOpenDialog(title, filters, properties) {
    return await ipcRenderer.sendSync("ShowOpenDialog", document.title, {
        title: title,
        filters: filters,
        properties: properties
    });
}

async function ShowSaveDialog(title, defaultPath, filters) {
    return await ipcRenderer.sendSync("ShowSaveDialog", document.title, {
        title: title,
        defaultPath: defaultPath,
        filters: filters
    });
}

async function ShowPopUp(type, title, text, yesFunc) {
    document.querySelector("#" + type + " > h1").innerText = title;
    if (type != "changelogPopup" && type != "bannerPopup")
        document.querySelector("#" + type + " > p").innerText = text;
    else if (type != "bannerPopup")
        document.querySelector("#" + type + " > div").innerHTML = new showdown.Converter().makeHtml(text);
    else {
        let lText = "<h3>Announcement</h3>";
        lText += "<p>A new launcher has been released as a successor of this one.</p>";
        lText += "<p>This new launcher includes new features, fixes some of the bugs in this launcher, a new log system and support to more mods that could be released in the future.<p>";
        lText += "<h3>What do I need to do to get the new SBMP updates?</h3>";
        lText += "<p>Just click on the update button below and install the new launcher, then just follow the instructions to update the mod.</p>";
        lText += "<p>After that you can just uninstall this launcher.</p>";
        lText += "<h3>What if I don't want to upgrade, will this launcher still be supported?</h3>";
        lText += "<p>No, this launcher will become unsupported and will eventually \"die\".</p>";
        lText += "<p>The expected day for this to happen is 8th May 2022 but it can happen earlier, after that day you will no longer be able to get the mod or update the launcher, <i>the launcher will also behave in a strange way...<i><p>"
        document.querySelector("#" + type + " > div").innerHTML += lText;
    }

    async function ClosePopUp(event) {
        if (event.currentTarget == event.target) {
            document.getElementById("popups").removeEventListener("click", ClosePopUp);
            if (type == "alertPopup")
                document.querySelector("#" + type + " > button").removeEventListener("click", ClosePopUp);
            else if (type == "askPopup" || type == "bannerPopup") {
                let oldYesButton = document.querySelector("#" + type + " > div > button:first-child");
                let newYesButton = oldYesButton.cloneNode(true);
                oldYesButton.parentNode.replaceChild(newYesButton, oldYesButton);
                document.querySelector("#" + type + " > div > button:last-child").removeEventListener("click", ClosePopUp);
                if (type == "bannerPopup")
                    document.querySelector("#" + type + "> div").innerHTML = "<img id=\"bannerBanner\">";
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
    else if (type == "askPopup" || type == "bannerPopup") {
        document.querySelector("#" + type + " > div > button:first-child").addEventListener("click", ClosePopUp);
        document.querySelector("#" + type + " > div > button:first-child").addEventListener("click", yesFunc);
        document.querySelector("#" + type + " > div > button:last-child").addEventListener("click", ClosePopUp);

        if (type == "bannerPopup")
            document.querySelector("#" + type + "> div > img#bannerBanner").setAttribute("src", text);
    }
    else if (type == "changelogPopup")
        document.querySelector("#" + type + " > button").addEventListener("click", ClosePopUp);
}

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

//#endregion

//#region RENDER LISTENERS

ipcRenderer.on("CheckForModUpdatesComplete", async (_, status) => {
    if (status) {
        document.getElementById("mainButton").classList.remove("installed");
        document.getElementById("mainButton").innerText = "Update";
    }
    else {
        document.getElementById("mainButton").classList.add("installed");
        if (!fs.existsSync((await GetSetting("sbDir")) + "\\fnaf9\\Content\\Paks\\fnaf9.pak.disabled"))
            document.getElementById("mainButton").innerText = "Play";
        else 
            document.getElementById("mainButton").innerText = "Play Base Game";

        ReloadIcons();
    }
    
    if (document.getElementById("mainButton").innerText == "Play Base Game") {
        document.querySelector("#contextDisable > span").innerText = "Enable Mod";
        document.querySelector("#contextDisable > icon").setAttribute("name", "play");
    }
    else {
        document.querySelector("#contextDisable > span").innerText = "Disable Mod";
        document.querySelector("#contextDisable > icon").setAttribute("name", "pause");
    }
    document.getElementById("mainMore").removeAttribute("style");
});

ipcRenderer.on("DownloadProgress", (_, progress, eta, speed) => {
    styleControl.innerText = "#mainButton::after { width: " + progress + "%; transition: width 0.2s; }";
    document.getElementById("installEta").innerText = eta;
    document.getElementById("installSpeed").innerText = Math.round((speed / 1024 / 1024) * 100) / 100;
});

ipcRenderer.on("DownloadToInstall", (_, status, version, error) => {
    if (!status) {
        console.error(error);
        CancelInstall("downloading");
        ReloadModStatus();
        return;
    }
    document.querySelector("#mainPanel > div > div:last-child").removeAttribute("style");
    document.getElementById("mainButton").innerText = "Installing...";
    ipcRenderer.send("InstallSBMP", version);
});

ipcRenderer.on("InstallProgress", (_, progress) => styleControl.innerText = "#mainButton::after { width: " + progress + "%; transition: width 0.2s; }");

ipcRenderer.on("InstallToFinish", async (_, status, error) => {
    if (!status) {
        console.error(error);
        CancelInstall("installing");
    }
    await Sleep(700);
    ReloadModStatus();
});

async function CancelInstall(action) {
    if (fs.existsSync((await GetPaths("temp")) + "\\SBMP.rar"))
        fs.unlinkSync((await GetPaths("temp")) + "\\SBMP.rar");
    document.querySelector("#mainPanel > div > div:last-child").removeAttribute("style");
    ShowPopUp("alertPopup", "Error", "There was an error while " + action + " the mod. Check if you have a stable internet connection and your antivirus is not blocking the launcher, then try again. If this problem persists, contact the SBMP Team!");
    return;
}

ipcRenderer.on("GetModChangesComplete", async (_, status, error) => {
    if (!status) {
        console.error("There was an error while getting the mod changelog: " + error);
        ShowPopUp("alertPopup", "Error", "There was an error while getting the mod changelog.");
    }
    else
        ShowPopUp("changelogPopup", "Changelog", new showdown.Converter().makeHtml(fs.readFileSync((await GetPaths("temp")) + "\\changelog.md", "utf8")));
});

ipcRenderer.on("ShowPopUp", async (_, type, title, text, yesFunc) => ShowPopUp(type, title, text, yesFunc));

//#endregion

exports.CloseWindow = CloseWindow;
exports.MinimizeWindow = MinimizeWindow;
exports.ReloadIcons = ReloadIcons;
exports.ReloadModStatus = ReloadModStatus;
exports.OpenMain = OpenMain;
exports.GoldenSecret = GoldenSecret;
exports.GetPackageData = GetPackageData;
exports.GetProcessVersions = GetProcessVersions;
exports.GetPaths = GetPaths;
exports.GetSetting = GetSetting;
exports.SetSetting = SetSetting;
exports.GetVersionChanges = GetVersionChanges;
exports.InstallSBMP = InstallSBMP;
exports.RunSBMP = RunSBMP;
exports.DisableEnableMod = DisableEnableMod;
exports.GetModChanges = GetModChanges;
exports.UninstallSBMP = UninstallSBMP;
exports.BackupSaves = BackupSaves;
exports.RestoreSaves = RestoreSaves;
exports.ShowOpenDialog = ShowOpenDialog;
exports.ShowSaveDialog = ShowSaveDialog;
exports.ShowPopUp = ShowPopUp;
exports.Sleep = Sleep;