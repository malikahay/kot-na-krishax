#!/bin/sh
# Собирает kot-na-kryshah-itch.zip: загрузите его на itch.io как HTML-игру (index.html в корне архива).
cd "$(dirname "$0")" && rm -f kot-na-kryshah-itch.zip && zip -rq kot-na-kryshah-itch.zip index.html manifest.webmanifest sw.js js vendor icons && echo "Готово: kot-na-kryshah-itch.zip"
