import { MidiCreationOption } from "../common-types"
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

  public async renameMidiFile(oldFilename: string, newFilename: string) {
    return await this.midiRecorderPlayer.renameFile(oldFilename, newFilename)
  }

  public async deleteMidiFile(filename: string) {
    return await this.midiRecorderPlayer.deleteFile(filename)
  }

  public async startMidiRecording(appendFilename: string | null, creationOption: MidiCreationOption | null) {
    return await this.midiRecorderPlayer.startRecording(appendFilename, creationOption)
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

  public async setMidiSpeed(speed: number) {
    return await this.midiRecorderPlayer.setSpeed(speed)
  }

  public async setMidiMetronomeEnabled(enabled: boolean) {
    return await this.midiRecorderPlayer.setMetronomeEnabled(enabled)
  }

  public async flushActions() {
    if (this.midiRecorderPlayer.isRecording()) await this.midiRecorderPlayer.stopRecording()
    if (this.midiRecorderPlayer.isPlaying()) await this.midiRecorderPlayer.stopPlaying()
    await this.midiRecorderPlayer.setSpeed(1)
    await this.midiRecorderPlayer.setMetronomeEnabled(false)
  }
}

export interface ControllerInterface {
  listConnectedBluetoothDevices(): Promise<string[]>
  listMidiFiles(): Promise<string[]>
  renameMidiFile(oldFilename: string, newFilename: string): Promise<boolean>
  deleteMidiFile(filename: string): Promise<boolean>
  startMidiRecording(appendFilename: string | null, creationOption: MidiCreationOption | null): Promise<boolean>
  stopMidiRecording(): Promise<string | null>
  startMidiPlaying(filename: string): Promise<boolean>
  stopMidiPlaying(): Promise<boolean>
  setMidiSpeed(speed: number): Promise<boolean>
  setMidiMetronomeEnabled(enabled: boolean): Promise<boolean>

  flushActions(): Promise<void>
}