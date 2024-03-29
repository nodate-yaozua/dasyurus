import fs from "fs"
import config from "./configuration"
import log4js from "log4js"
import MidiPlayer from "./midi-player"
import MidiRecorder from "./midi-recorder"
import MIDIFile from "midifile"
import MIDIEvents from "midievents"
import Timer from "./timer"
import { MidiCreationOption } from "../common-types"

const logger = log4js.getLogger()

export default class MidiRecorderPlayer {
  private midiRecorder: MidiRecorder | null = null
  private midiPlayer: MidiPlayer | null = null
  private timer: Timer | null = null
  private currentSpeed = 1
  private currentFilename: string | null = null
  private currentMidiData: MIDIFile | null = null
  private metronomeEnabled = true

  public async init() {
    this.prepareMidiDataDir()
  }

  public isRecording() { return this.midiRecorder != null }
  public isPlaying() { return this.midiRecorder == null && this.midiPlayer != null }
  public isProcessing() { return this.midiRecorder != null || this.midiPlayer != null }

  public async startRecording(appendFilename: string | null, creationOption: MidiCreationOption | null): Promise<boolean> {
    if (this.isProcessing()) return false

    if (appendFilename != null) {
      this.currentMidiData = await this.loadFile(appendFilename)
      const appendMatch = appendFilename.match(/^(.*)-append-(\d+)\.mid$/)
      let baseName: string
      let appendNum: number
      if (appendMatch) {
        baseName = appendMatch[1]
        appendNum = Number(appendMatch[2]) + 1
      } else {
        baseName = appendFilename.slice(0, appendFilename.length - 4)
        appendNum = 1
      }
      while (true) {
        this.currentFilename = `${baseName}-append-${appendNum}.mid`
        if (this.fileExists(this.currentFilename)) appendNum++
        else break
      }
    } else {
      this.currentMidiData = this.createEmptyMidiData(creationOption)
      this.currentFilename = this.getDefaultFilename()
    }
    this.savePlaceholderFile(this.currentFilename)

    this.timer = new Timer()
    this.timer.setSpeed(this.currentSpeed)
    this.midiPlayer = new MidiPlayer(this.currentMidiData, this.timer, true)
    this.midiPlayer.setMetronomeEnabled(this.metronomeEnabled)
    this.midiRecorder = new MidiRecorder(this.currentMidiData, this.timer)
    this.timer.start()
    this.midiPlayer.start()
    this.midiRecorder.start()
    return true
  }

  public async stopRecording(): Promise<string | null> {
    if (!this.isRecording()) return null
    if (this.midiRecorder == null) return null

    this.midiPlayer?.stop()
    this.midiRecorder.stop()
    this.midiRecorder.write()
    this.timer = null
    this.midiPlayer = null
    this.midiRecorder = null
    const filename = this.currentFilename!
    const midiData = this.currentMidiData!
    this.currentFilename = null
    this.currentMidiData = null
    await this.saveFile(filename, midiData)
    return filename
  }

  public async startPlaying(filename: string): Promise<boolean> {
    if (this.midiRecorder != null) return false
    if (this.midiPlayer != null) await this.stopPlaying()

    const data = await this.loadFile(filename)

    this.timer = new Timer()
    this.timer.setSpeed(this.currentSpeed)
    this.midiPlayer = new MidiPlayer(data, this.timer, true)
    this.midiPlayer.setMetronomeEnabled(this.metronomeEnabled)
    this.timer.start()
    this.midiPlayer.start()
    return true
  }

  public async stopPlaying() {
    if (this.midiPlayer == null) return false

    this.midiPlayer.stop()
    this.timer = null
    this.midiPlayer = null
    this.currentFilename = null
    this.currentMidiData = null

    return true
  }

  public async setSpeed(speed: number) {
    this.currentSpeed = speed
    if (this.timer != null) this.timer.setSpeed(speed)
    logger.info(`MIDI speed changed: ${speed}`)
    return true
  }

  public async setMetronomeEnabled(enabled: boolean) {
    this.metronomeEnabled = enabled
    if (this.midiPlayer != null) this.midiPlayer.setMetronomeEnabled(enabled)
    logger.info(`MIDI metronome ${enabled ? "enabled" : "disabled"}`)
    return true
  }

  private createEmptyMidiData(creationOption: MidiCreationOption | null) {
    if (creationOption == null) creationOption = { tempo: 60, timeSignature: [4, 4] }
    const result = new MIDIFile()
    result.header.setFormat(1)
    result.header.setTicksPerBeat(480)

    const conductorTrackEvents: any[] = []
    const timeSignatureData = [creationOption.timeSignature[0], Math.log2(creationOption.timeSignature[1]), 24, 8]
    conductorTrackEvents.push({ delta: 0, type: MIDIEvents.EVENT_META, subtype: MIDIEvents.EVENT_META_SET_TEMPO, length: 3, tempo: 60000000 / creationOption.tempo })
    conductorTrackEvents.push({ delta: 0, type: MIDIEvents.EVENT_META, subtype: MIDIEvents.EVENT_META_TIME_SIGNATURE, length: 4, data: timeSignatureData })
    conductorTrackEvents.push({ delta: 0, type: MIDIEvents.EVENT_META, subtype: MIDIEvents.EVENT_META_END_OF_TRACK, length: 0 })
    result.setTrackEvents(0, conductorTrackEvents)

    return result
  }

  private getMidiDataDir() {
    return config.dataDir + "/midi"
  }

  private prepareMidiDataDir() {
    try {
      fs.accessSync(this.getMidiDataDir(), fs.constants.R_OK | fs.constants.W_OK)
    } catch {
      fs.mkdirSync(this.getMidiDataDir())
    }
  }

  private fileExists(filename: string) {
    const inPath = this.getMidiDataDir() + "/" + filename
    return fs.existsSync(inPath)
  }

  private async loadFile(filename: string) {
    logger.info(`Reading MIDI file from: ${filename}`)
    const inPath = this.getMidiDataDir() + "/" + filename
    const file = await fs.promises.readFile(inPath)
    return new MIDIFile(file)
  }

  private async savePlaceholderFile(filename: string) {
    const outPath = this.getMidiDataDir() + "/" + filename
    await fs.promises.writeFile(outPath, new Uint8Array(0))
    logger.info(`Placeholder MIDI file written to: ${filename}`)
  }

  private async saveFile(filename: string, data: MIDIFile) {
    const outPath = this.getMidiDataDir() + "/" + filename
    await fs.promises.writeFile(outPath, new Uint8Array(data.getContent()))
    logger.info(`MIDI file written to: ${filename}`)
  }

  private getDefaultFilename() {
    const date = new Date()
    const year = date.getFullYear()
    const month = (date.getMonth() + 1)
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}-${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}${String(second).padStart(2, "0")}.mid`
  }

  public async listFiles(): Promise<string[]> {
    const files = await fs.promises.readdir("data/midi/")
    return files.filter(e => e.endsWith(".mid"))
  }

  public async renameFile(oldFilename: string, newFilename: string): Promise<boolean> {
    if (!newFilename.endsWith(".mid")) newFilename += ".mid"
    const oldPath = this.getMidiDataDir() + "/" + oldFilename
    const newPath = this.getMidiDataDir() + "/" + newFilename
    if (!fs.existsSync(oldPath) || fs.existsSync(newPath)) return false
    await fs.promises.rename(oldPath, newPath)
    logger.info(`MIDI file renamed: ${oldFilename} -> ${newFilename}`)
    return true
  }

  public async deleteFile(filename: string): Promise<boolean> {
    const path = this.getMidiDataDir() + "/" + filename
    if (!fs.existsSync(path)) return false
    fs.promises.unlink(path)
    logger.info(`MIDI file deleted: ${filename}`)
    return true
  }
}