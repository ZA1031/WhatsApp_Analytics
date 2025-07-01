// import { contextBridge, ipcRenderer } from "electron";

// contextBridge.exposeInMainWorld("electronAPI", {
//   send: (channel: string, data: any) => {
//     // Whitelist channels to ensure security
//     const validChannels = ["toMain"];
//     if (validChannels.includes(channel)) {
//       ipcRenderer.send(channel, data);
//     }
//   },
//   receive: (channel: string, callback: (data: any) => void) => {
//     // Whitelist channels to ensure security
//     const validChannels = ["fromMain"];
//     if (validChannels.includes(channel)) {
//       ipcRenderer.on(channel, (event, ...args: [any]) => callback(...args));
//     }
//   },
// });