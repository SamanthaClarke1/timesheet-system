#!/bin/bash
# its shit like socat that makes me really love linux :)
( socat -vd4sL TCP-L:8001,fork TCP:192.168.122.87:8001 & )