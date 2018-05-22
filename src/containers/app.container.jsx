import LinkInput from "../components/LinkInput";
import Progress from "../components/Progress";

import React, { Component } from "react";

import * as path from "path";

const ffmpeg = window.require("fluent-ffmpeg");
const binaries = window.require("ffmpeg-binaries");
const sanitize = window.require("sanitize-filename");
const { ipcRenderer, remote, shell } = window.require("electron");
const ytdl = window.require("ytdl-core");
const fs = window.require("fs-extra");

class AppContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showProgressBar: false,
      progress: 0,
      bitrate: localStorage.getItem("userBitrate")
        ? parseInt(localStorage.getItem("userBitrate"))
        : 160,
      progressMessage: "",
      userDownloadsFolder: localStorage.getItem("userSelectedFolder")
        ? localStorage.getItem("userSelectedFolder")
        : remote.app.getPath("downloads")
    };

    ipcRenderer.on("changeBitrate", (event, newBitrate) => {
      this.setState({ bitrate: newBitrate });
      localStorage.setItem("userBitrate", newBitrate.toString());
    });

    // Sygnał do Electrona o zmianę folderu pobierania
    ipcRenderer.on("promptForChangeDownloadFolder", () => {
      // Zmiana folderu ponieważ potrzebujemy folderu do zapisania przy pobieraniu
      this.changeOutputFolder();
    });

    // Ta właściwość będzie używana do kontrolowania szybkości, z jaką pasek postępu jest aktualizowany, aby zapobiec opóźnieniu interfejsu użytkownika.
    this.rateLimitTriggered = false;

    this.startDownload = this.startDownload.bind(this);
    this.downloadFinished = this.downloadFinished.bind(this);
    this.changeOutputFolder = this.changeOutputFolder.bind(this);
  }

  // Zamiana linku video w plik MP4

  getVideo(urlLink, userProvidedPath, title) {
    this.setState({ progressMessage: "Downloading..." });
    return new Promise((resolve, reject) => {
      let fullPath = path.join(userProvidedPath, `tmp_${title}.mp4`);
      let videoObject = ytdl(urlLink, { filter: "audioonly" });

      videoObject.on("progress", (chunkLength, downloaded, total) => {
        // pobieranie progresu pobierania by wyświetlić procenty
        if (!this.rateLimitTriggered) {
          let newVal = Math.floor(downloaded / total * 100);
          this.setState({ progress: newVal });

          // Zapobiegnie to aktualizacji interfejsu użytkownika co kilka milisekund i tworzeniu opóźnień wizualnych.
          this.rateLimitTriggered = true;
          setTimeout(() => {
            this.rateLimitTriggered = false;
          }, 800);
        }
      });

      videoObject.pipe(fs.createWriteStream(fullPath)).on("finish", () => {
        this.setState({ progress: 100 });
        setTimeout(() => {
          resolve({
            filePath: fullPath,
            folderPath: userProvidedPath,
            fileTitle: `${title}.mp3`
          });
        }, 1000);
      });
    });
  }

  convertVideoToMp3(paths) {
    this.setState({ progressMessage: "Converting...", progress: 0 });

    return new Promise((resolve, reject) => {
      this.rateLimitTriggered = false;
      ffmpeg(paths.filePath)
        .setFfmpegPath(binaries.ffmpegPath())
        .format("mp3")
        .audioBitrate(this.state.bitrate)
        .on("progress", progress => {
          if (!this.rateLimitTriggered) {
            this.setState({ progress: Math.floor(progress.percent) });
            this.rateLimitTriggered = true;
            setTimeout(() => {
              this.rateLimitTriggered = false;
            }, 800);
          }
        })
        .output(
          fs.createWriteStream(
            path.join(paths.folderPath, sanitize(paths.fileTitle))
          )
        )
        .on("end", () => {
          this.setState({ progress: 99 });
          resolve();
        })
        .run();
    });
  }

  async startDownload(id) {
    this.setState({
      progress: 0,
      showProgressBar: true,
      progressMessage: "..."
    });

    try {
      this.setState({ progressMessage: "Fetching video info..." });
      let info = await ytdl.getInfo(id);
      let paths = await this.getVideo(
        id,
        this.state.userDownloadsFolder,
        info.title
      );

      await this.convertVideoToMp3(paths);
      fs.unlinkSync(paths.filePath);

      await (() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            this.setState({ progress: 100 });
            resolve();
          }, 900);
        });
      });
      this.downloadFinished();
    } catch (e) {
      console.error(e);
    }
  }

  downloadFinished(id) {
    let info = ytdl.getInfo(id);
    this.setState({
      progress: 100,
      progressMessage: "Conversion successful!"
    });
    shell.showItemInFolder(this.state.userDownloadsFolder + "/" + info.title);
    setTimeout(() =>
        this.setState({
          showProgressBar: false
        }),
      2000
    );
  }

  changeOutputFolder() {
    let fileSelector = remote.dialog.showOpenDialog({
      defaultPath: `${this.state.userDownloadsFolder}`,
      properties: ["openDirectory"],
      title: "Select folder"
    });
    if (fileSelector) {
      let pathToStore = fileSelector[0];
      localStorage.setItem("userSelectedFolder", pathToStore);
      this.setState({ userDownloadsFolder: pathToStore });
    }
  }

  render() {
    if (this.state.showProgressBar) {
      return (
        <Progress
          progress={this.state.progress}
          messageText={this.state.progressMessage}
        />
      );
    } else {
      return <LinkInput startDownload={this.startDownload} />;
    }
  }
}

export default AppContainer;
