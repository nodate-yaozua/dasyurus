#!/bin/bash

service dbus start

#service bluetooth start
bluetoothd -E &

pulseaudio --exit-idle-time=-1 &
until pactl info > /dev/null 2>&1; do
    echo "Waiting for PulseAudio start"
    sleep 1
done

# pactl load-module module-bluetooth-policy
# pactl load-module module-bluetooth-discover
pactl load-module module-alsa-sink device=${SINK_DEVICE}
pactl load-module module-alsa-source device=${SOURCE_DEVICE}

mkdir -p /run/user/0/pulse
pactl load-module module-native-protocol-unix auth-anonymous=1 socket=/run/user/0/pulse/native

if [ "$1" == "--default" ]; then
    npm run server
else
    exec "$@"
fi