import MIDIFile from "midifile"
import MIDIEvents from "midievents"

export default class MidiUtil {
  // https://github.com/nfroidure/midifile/blob/11fd971355e3faa6a912b8546cd0baafba2b1899/src/MIDIFile.js#L74
  // playTickプロパティを追加
  public static getEventsEx(midi: MIDIFile, type: number, subtype: number) {
    var events;
    var event;
    var playTick = 0;
    var playTime = 0;
    var filteredEvents = [];
    var format = midi.header.getFormat();
    var tickResolution = midi.header.getTickResolution();
    var i;
    var j;
    var trackParsers: { parser?: any, curEvent?: any }[];
    var smallestDelta;

    // Reading events
    // if the read is sequential
    if (1 !== format || 1 === midi.tracks.length) {
      console.log("FORMAT 0")
      for (i = 0, j = midi.tracks.length; i < j; i++) {
        // reset playtime if format is 2
        playTime = 2 === format && playTime ? playTime : 0;
        events = MIDIEvents.createParser(
          midi.tracks[i].getTrackContent(),
          0,
          false
        );
        // loooping through events
        event = events.next();
        while (event) {
          playTick += event.delta ? event.delta : 0;
          playTime += event.delta ? event.delta * tickResolution / 1000 : 0;
          if (event.type === MIDIEvents.EVENT_META) {
            // tempo change events
            if (event.subtype === MIDIEvents.EVENT_META_SET_TEMPO) {
              tickResolution = midi.header.getTickResolution(event.tempo);
            }
          }
          // push the asked events
          if (
            (!type || event.type === type) &&
            (!subtype || (event.subtype && event.subtype === subtype))
          ) {
            event.playTick = playTick;
            event.playTime = playTime;
            filteredEvents.push(event);
          }
          event = events.next();
        }
      }
      // the read is concurrent
    } else {
      console.log("FORMAT 1")
      trackParsers = [];
      smallestDelta = -1;

      // Creating parsers
      for (i = 0, j = midi.tracks.length; i < j; i++) {
        trackParsers[i] = {};
        trackParsers[i].parser = MIDIEvents.createParser(
          midi.tracks[i].getTrackContent(),
          0,
          false
        );
        trackParsers[i].curEvent = trackParsers[i].parser.next();
      }
      // Filling events
      do {
        smallestDelta = -1;
        // finding the smallest event
        for (i = 0, j = trackParsers.length; i < j; i++) {
          if (trackParsers[i].curEvent) {
            if (
              -1 === smallestDelta ||
              trackParsers[i].curEvent.delta <
                trackParsers[smallestDelta].curEvent.delta
            ) {
              smallestDelta = i;
            }
          }
        }
        if (-1 !== smallestDelta) {
          // removing the delta of previous events
          for (i = 0, j = trackParsers.length; i < j; i++) {
            if (i !== smallestDelta && trackParsers[i].curEvent) {
              trackParsers[i].curEvent.delta -=
                trackParsers[smallestDelta].curEvent.delta;
            }
          }
          // filling values
          event = trackParsers[smallestDelta].curEvent;
          playTick += event.delta ? event.delta : 0;
          playTime += event.delta ? event.delta * tickResolution / 1000 : 0;
          if (event.type === MIDIEvents.EVENT_META) {
            // tempo change events
            if (event.subtype === MIDIEvents.EVENT_META_SET_TEMPO) {
              tickResolution = midi.header.getTickResolution(event.tempo);
            }
          }
          // push midi events
          if (
            (!type || event.type === type) &&
            (!subtype || (event.subtype && event.subtype === subtype))
          ) {
            event.playTick = playTick;
            event.playTime = playTime;
            event.track = smallestDelta;
            filteredEvents.push(event);
          }
          // getting next event
          trackParsers[smallestDelta].curEvent = trackParsers[
            smallestDelta
          ].parser.next();
        }
      } while (-1 !== smallestDelta);
    }
    return filteredEvents;
  }
}