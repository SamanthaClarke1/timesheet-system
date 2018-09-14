BASEDIR=/Volumes/RS01/Resources/Engineering/Sam/node-web-server

find $BASEDIR -not \( -name node_modules -prune \) -iregex '.*\.\(js\|json\|ejs\|html\|php\|sql\|css\)' -exec sh -c 'cat "$1" | wc -l' - {} \;
