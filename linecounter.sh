BASEDIR=/Volumes/RS01/Resources/Engineering/Sam/node-web-server-dev

find $BASEDIR -not \( -name node_modules -prune \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\)' -exec sh -c 'cat "$1" | wc -l' - {} \;

printf "\nTotal:\n"

a=$(find $BASEDIR -not \( -name node_modules -prune \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\|c\|cpp\|cs\|env\|sh\)' -exec sh -c 'cat "$1" | wc -l' - {} \;);b="$(echo $a | tr " " "\n")";readarray -t c <<<"$b";d=0;for i in "${c[@]}";do d=$(($i+$d));done;echo $d
