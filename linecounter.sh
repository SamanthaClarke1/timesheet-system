BASEDIR=$1

find $BASEDIR -not \( -name node_modules -prune -o -name lib -prune -o -name package-lock.json \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\)' -exec sh -c 'echo -ne "$1\t\t\t"; cat "$1" | wc -l' - {} \;

printf "\nTotal:\n"

a=$(find $BASEDIR -not \( -name node_modules -prune -o -name lib -prune -o -name package-lock.json \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\|c\|cpp\|cs\|env\|sh\)' -exec sh -c 'cat "$1" | wc -l' - {} \;);b="$(echo $a | tr " " "\n")";readarray -t c <<<"$b";d=0;for i in "${c[@]}";do d=$(($i+$d));done;echo $d
