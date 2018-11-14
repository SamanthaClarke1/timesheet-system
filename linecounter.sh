#!/usr/bin/bash

BASEDIR="$1"

find "$BASEDIR" -not \( -name node_modules -prune -o -name lib -prune -o -name package-lock.json \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\|c\|cpp\|cs\|env\|sh\)' -exec sh -c 'printf "%*s\r%s\n" "$(tput cols)" "$(cat "$1" | wc -l)" "$1"' - {} \;

printf "\nTotal:\n"

a=$(find "$BASEDIR" -not \( -name node_modules -prune -o -name lib -prune -o -name package-lock.json \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\|c\|cpp\|cs\|env\|sh\)' -exec sh -c 'cat "$1" | wc -l' - {} \;);b="$(echo "$a" | tr " " "\n")";readarray -t c <<<"$b";d=0;for i in "${c[@]}";do d=$((i+d));done;echo "$d"

printf "\nTotal (with package-lock):\n"

a=$(find "$BASEDIR" -not \( -name node_modules -prune -o -name lib  \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\|c\|cpp\|cs\|env\|sh\)' -exec sh -c 'cat "$1" | wc -l' - {} \;);b="$(echo "$a" | tr " " "\n")";readarray -t c <<<"$b";d=0;for i in "${c[@]}";do d=$((i+d));done;echo "$d"

printf "\nTotal (with package-lock and frontend libs):\n"

a=$(find "$BASEDIR" -not \( -name node_modules \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\|c\|cpp\|cs\|env\|sh\)' -exec sh -c 'cat "$1" | wc -l' - {} \;);b="$(echo "$a" | tr " " "\n")";readarray -t c <<<"$b";d=0;for i in "${c[@]}";do d=$((i+d));done;echo "$d"

printf "\nTotal (with package-lock and node modules):\n"

a=$(find "$BASEDIR" -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\|c\|cpp\|cs\|env\|sh\)' -exec sh -c 'cat "$1" | wc -l' - {} \;);b="$(echo "$a" | tr " " "\n")";readarray -t c <<<"$b";d=0;for i in "${c[@]}";do d=$((i+d));done;echo "$d"

