echo "Please make sure you are running this from the node server directory!"

while true; do
	if [ $(pgrep -f 'flask run') >/dev/null ]; then
		:
		#echo "Node App still running. Should be fine. TIME: $(date)"
	else
		echo "Node app not found. It must've crashed. TIME: $(date)"
		node ./server.js
	fi
	sleep 3
done