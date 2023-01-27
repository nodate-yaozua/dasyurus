const hostname = window.location.hostname

class JsonSocket extends EventTarget {
  constructor(private socket: WebSocket) {
    super()
    this.socket.onmessage = ev => {
      let parsedData: any
      try { parsedData = JSON.parse(ev.data) } catch { return }
      this.dispatchEvent(new CustomEvent("data", { detail: parsedData }))
    }
  }

  public send(data: any) {
    this.socket.send(JSON.stringify(data))
  }
}

let controllerSocket: WebSocket | null = null
let jsonSocket: JsonSocket | null = null

const request = (type: string, params?: any): Promise<any> => new Promise((resolve, reject) => {
  if (jsonSocket == null) {
    reject()
    return
  }

  const listener = (ev: Event) => {
    const data = (ev as CustomEvent).detail
    if (data.type == type) {
      jsonSocket?.removeEventListener("data", listener)
      resolve(data)
    }
  }
  jsonSocket.addEventListener("data", listener)
  jsonSocket.send({ type, params })
});

const initListening = () => {
  let audioContext: AudioContext | null = null
  let audioSocket: WebSocket | null = null
  
  const updateState = () => {
    (document.querySelector("#listening-start") as HTMLButtonElement).disabled = audioContext != null;
    (document.querySelector("#listening-stop") as HTMLButtonElement).disabled = audioContext == null;
  }
  updateState()

  const startListening = async () => {
    if (audioContext != null) return

    audioContext = new AudioContext()
    audioSocket = new WebSocket(`ws://${hostname}:8416`)
    await new Promise<void>((resolve, _) => audioSocket!.onopen = _ => resolve())

    let nextScheduledTime = 0
    audioSocket.onmessage = async (ev) => {
      if (audioContext == null) return

      const array = new Int16Array(await ev.data.arrayBuffer())
      const ch1 = new Float32Array(array.length / 2)
      const ch2 = new Float32Array(array.length / 2)
      for (let s = 0, d = 0; s < array.length; s += 2, d += 1) {
        ch1[d] = array[s] / 32768
        ch2[d] = array[s + 1] / 32768
      }
      const buffer = audioContext.createBuffer(2, ch1.length, 44100)
      buffer.getChannelData(0).set(ch1)
      buffer.getChannelData(1).set(ch2)
      const bufferSource = audioContext.createBufferSource()
      bufferSource.buffer = buffer
      bufferSource.connect(audioContext.destination)

      const currentTime = audioContext.currentTime
      if (currentTime < nextScheduledTime) {
        // schedule
        bufferSource.start(nextScheduledTime)
        nextScheduledTime += buffer.duration
      } else {
        // now
        bufferSource.start(currentTime)
        nextScheduledTime = currentTime + buffer.duration + 0.1
      }
    }

    updateState()
  } 

  const stopListening = async () => {
    if (audioContext == null) return

    audioSocket?.close()
    audioSocket = null
    await audioContext.close()
    audioContext = null

    updateState()
  } 

  (document.querySelector("#listening-start") as HTMLButtonElement).onclick =  _ => startListening();
  (document.querySelector("#listening-stop") as HTMLButtonElement).onclick =  _ => stopListening();
}

const initMidiRecordingPlaying = () => {
  let currentFiles: string[] = []
  const pollFiles = async () => {
    currentFiles = (await request("list-midi-files")).result
    const template = document.querySelector("#midi-recording-playing-file-list-table-row") as HTMLTemplateElement
    const tbodyElement = document.querySelector("#midi-file-list tbody") as HTMLTableSectionElement
    tbodyElement.innerHTML = ""
    currentFiles.forEach((filename: string) => {
      const cloned = document.importNode(template.content, true)
      const row = cloned.querySelector("tr")!
      row.onclick = ev => {
        selectFile(filename)
      }

      const cells = row.querySelectorAll("td")

      cells[0].innerText = filename

      const playButton = document.createElement("button")
      playButton.innerText = "Play"
      cells[1].appendChild(playButton)
      playButton.onclick = _ => startPlaying(filename)

      tbodyElement.appendChild(row)
    })
    updateState()
  }
  setTimeout(() => {
    pollFiles()
    setInterval(pollFiles, 5000)
  }, 0)

  let selectedFile: string | null = null
  const selectFile = (filename: string) => {
    selectedFile = filename;
    // (document.querySelector("#midi-selected-file") as HTMLSpanElement).innerText = selectedFile;
    updateState()
  }

  let playingInProgress = false
  let recordingInProgress = false
  const updateState = () => {
    const noneSelected = selectedFile == null;
    (document.querySelector("#midi-recording-start") as HTMLButtonElement).disabled = playingInProgress || recordingInProgress;
    (document.querySelector("#midi-stop") as HTMLButtonElement).disabled = !playingInProgress && !recordingInProgress;
    (document.querySelector("#midi-append-selected-file") as HTMLButtonElement).disabled = playingInProgress || recordingInProgress || noneSelected;
    (document.querySelector("#midi-rename-selected-file") as HTMLButtonElement).disabled = playingInProgress || recordingInProgress || noneSelected;
    (document.querySelector("#midi-delete-selected-file") as HTMLButtonElement).disabled = playingInProgress || recordingInProgress || noneSelected;
    (document.querySelectorAll("#midi-file-list button") as NodeListOf<HTMLButtonElement>).forEach(e => e.disabled = recordingInProgress);
    document.querySelectorAll("#midi-file-list tr").forEach((e, i) => { e.classList.remove("selected"); if (currentFiles[i] == selectedFile) e.classList.add("selected") })
  }

  const startRecording = async () => {
    if (recordingInProgress) return
    if (playingInProgress) return

    await request("start-midi-recording")
    recordingInProgress = true

    updateState()
  }

  const startPlaying = async (filename: string) => {
    if (recordingInProgress) return

    await request("start-midi-playing", { filename })
    playingInProgress = true

    updateState()
  }

  const stop = async () => {
    if (recordingInProgress) {
      await request("stop-midi-recording")
      recordingInProgress = false

      updateState()
    }
    if (playingInProgress) {
      await request("stop-midi-playing")
      playingInProgress = false

      updateState()
    }
  }

  const startAppendingSelectedFile = async () => {
    if (selectedFile == null) return
    if (recordingInProgress) return
    if (playingInProgress) return

    await request("start-midi-recording", { appendFilename: selectedFile })
    recordingInProgress = true

    updateState()
  }

  const renameSelectedFile = async () => {
    if (selectedFile == null) return
    const newName = window.prompt("New name?")
    if (newName == null || newName == "") return
    await request("rename-midi-file", { oldFilename: selectedFile, newFilename: newName })
    selectedFile = null
    pollFiles()
  }

  const deleteSelectedFile = async () => {
    if (selectedFile == null) return
    if (!window.confirm("Are you sure?")) return
    await request("delete-midi-file", { filename: selectedFile })
    selectedFile = null
    pollFiles()
  }

  let currentSpeed = 0
  const speedTable = [0.16667, 0.20, 0.25, 0.33333, 0.50, 0.75, 1.00, 1.25, 1.50, 2.00, 3.00, 4.00, 5.00, 6.00]
  const speedTextTable = ["x0.17", "x0.20", "x0.25", "x0.33", "x0.50", "x0.75", "x1.00", "x1.25", "x1.50", "x2.00", "x3.00", "x4.00", "x5.00", "x6.00"]
  const setSpeed = async (speed: number) => {
    currentSpeed = Math.min(Math.max(-6, speed), 7)
    const offsetIndex = currentSpeed + 6
    const multiplier = speedTable[offsetIndex];
    (document.querySelector("#midi-current-speed") as HTMLSpanElement).innerText = speedTextTable[offsetIndex]
    await request("set-midi-speed", { speed: multiplier })
  }

  (document.querySelector("#midi-recording-start") as HTMLButtonElement).onclick =  _ => startRecording();
  (document.querySelector("#midi-stop") as HTMLButtonElement).onclick =  _ => stop();
  (document.querySelector("#midi-speed-up") as HTMLButtonElement).onclick =  _ => setSpeed(currentSpeed + 1);
  (document.querySelector("#midi-speed-down") as HTMLButtonElement).onclick =  _ => setSpeed(currentSpeed - 1);
  (document.querySelector("#midi-speed-reset") as HTMLButtonElement).onclick =  _ => setSpeed(0);
  (document.querySelector("#midi-append-selected-file") as HTMLButtonElement).onclick =  _ => startAppendingSelectedFile();
  (document.querySelector("#midi-rename-selected-file") as HTMLButtonElement).onclick =  _ => renameSelectedFile();
  (document.querySelector("#midi-delete-selected-file") as HTMLButtonElement).onclick =  _ => deleteSelectedFile();
}

const initConnectedBluetoothDevices = () => {
  const pollStatus = async () => {
    const list = await request("list-connected-bluetooth-devices")
    const listElement = document.querySelector("#connected-bluetooth-devices .list") as HTMLDivElement
    listElement.innerHTML = ""
    list.result.forEach((e: string) => {
      const element = document.createElement("div")
      element.innerText = e
      listElement.appendChild(element)
    })
  }
  pollStatus()
  setInterval(pollStatus, 5000);
}

controllerSocket = new WebSocket(`ws://${hostname}:8415`)
controllerSocket.onopen = ev => {
  jsonSocket = new JsonSocket(controllerSocket!)
  initListening()
  initMidiRecordingPlaying()
  initConnectedBluetoothDevices()
}
