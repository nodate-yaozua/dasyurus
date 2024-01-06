FROM debian:bookworm AS base
RUN apt update && \
    apt upgrade -y && \
    apt install -y alsa-utils pulseaudio pulseaudio-module-bluetooth bluez nodejs npm

COPY . /app/
WORKDIR /app/
RUN npm i && \
    npm run build

ENTRYPOINT ["/app/.docker/entrypoint.sh"]
CMD ["--default"]