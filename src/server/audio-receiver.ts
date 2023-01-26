import child_process from "child_process"
import config from "./configuration"

export default class AudioReceiver {
  public async init() {}

  public listConnected(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const p = child_process.spawn(config.bluetoothCtlPath, ["--", "devices", "Connected"])
      let rawResult = ""
      p.stdout.on("data", data => rawResult += data.toString())
      p.on("exit", _ => {
        resolve(rawResult.split("\n").filter(e => e != ""))
      })
      p.on("error", error => {
        reject(error)
      })
    })
  }
}