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
  const pollFiles = async () => {
    const list = await request("list-midi-files")
    const listElement = document.querySelector("#midi-recording-playing .file-list") as HTMLDivElement
    listElement.innerHTML = ""
    list.result.forEach((filename: string) => {
      const element = document.createElement("div")
      listElement.appendChild(element)

      const span = document.createElement("span")
      span.innerText = filename
      element.appendChild(span)

      const playButton = document.createElement("button")
      playButton.innerText = "Play"
      element.appendChild(playButton)
      playButton.onclick = _ => startPlaying(filename)

      const appendButton = document.createElement("button")
      appendButton.innerText = "Append"
      element.appendChild(appendButton)
      appendButton.onclick = _ => startRecording(filename)
    })
    updateState()
  }
  pollFiles()
  setInterval(pollFiles, 5000);

  let playingInProgress = false
  let recordingInProgress = false
  const updateState = () => {
    (document.querySelector("#midi-recording-start") as HTMLButtonElement).disabled = playingInProgress || recordingInProgress;
    (document.querySelector("#midi-stop") as HTMLButtonElement).disabled = !playingInProgress && !recordingInProgress;
    (document.querySelectorAll("#midi-recording-playing .file-list button") as NodeListOf<HTMLButtonElement>).forEach(e => e.disabled = recordingInProgress);
  }
  updateState()

  const startRecording = async (appendFilename: string | null) => {
    if (recordingInProgress) return
    if (playingInProgress) return

    await request("start-midi-recording", { appendFilename })
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

  (document.querySelector("#midi-recording-start") as HTMLButtonElement).onclick =  _ => startRecording(null);
  (document.querySelector("#midi-stop") as HTMLButtonElement).onclick =  _ => stop();
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
