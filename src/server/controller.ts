import AudioReceiver from "./audio-receiver"
import AudioSender from "./audio-sender"
import ControllerServer from "./controller-server"
import MidiRecorderPlayer from "./midi-recorder-player"

export default class Controller implements ControllerInterface {
  private server: ControllerServer
  constructor(private audioReceiver: AudioReceiver, private audioSender: AudioSender, private midiRecorderPlayer: MidiRecorderPlayer) {
    this.server = new ControllerServer(this)
  }

  public async init() {
    await this.server.start()
  }

  // implementation

  public async listConnectedBluetoothDevices() {
    return await this.audioReceiver.listConnected()
  } 

  public async listMidiFiles() {
    return await this.midiRecorderPlayer.listFiles()
  }

  public async startMidiRecording(appendFilename: string | null) {
    return await this.midiRecorderPlayer.startRecording(appendFilename)
  }

  public async stopMidiRecording() {
    return await this.midiRecorderPlayer.stopRecording()
  }

  public async startMidiPlaying(filename: string) {
    return await this.midiRecorderPlayer.startPlaying(filename)
  }

  public async stopMidiPlaying() {
    return await this.midiRecorderPlayer.stopPlaying()
  }

  public async flushActions() {
    if (this.midiRecorderPlayer.isRecording()) await this.midiRecorderPlayer.stopRecording()
    if (this.midiRecorderPlayer.isPlaying()) await this.midiRecorderPlayer.stopPlaying()
  }
}

export interface ControllerInterface {
  listConnectedBluetoothDevices(): Promise<string[]>
  listMidiFiles(): Promise<string[]>
  startMidiRecording(appendFilename: string | null): Promise<boolean>
  stopMidiRecording(): Promise<string | null>
  startMidiPlaying(filename: string): Promise<boolean>
  stopMidiPlaying(): Promise<void>

  flushActions(): Promise<void>
}