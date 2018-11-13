# timesheet-system
![Logo](https://raw.githubusercontent.com/Samuel-Clarke123/timesheet-system/master/public/res/tslogo.png)

This timesheet system was originally created for CumulusVFX. It is made to allow users to log their hours, and for administrators to monitor how much everyone is working.
Just run the local server on a server somewhere, and have people visit it in their browsers.

**Version**: 1.8.7, **Codename**: Tenacious Timer.

# Installation

To install the timesheet system, simply download the repo (either by git clone, or through github).

Then, check that you have node installed.
Once you are sure that you have node installed, install the dependencies with `npm install`.

## Setup and Config

First, create / fill in your [.env](https://github.com/motdotla/dotenv). The one that's supplied is just a template/placeholder.
```TOML
# Example .env file.
MONGO_URL_PREFIX="mongodb://guest:"
MONGO_URL_BODY="<pass>"
MONGO_URL_SUFFIX="@ds016298.mlab.com:<port>/<table>"
HTTP_PORT=8000
HTTPS_PORT=8443
HTTPS_ENABLED=true
HTTPS_PASS="password"
AUTHOR="Samuel J. Clarke"
SECRET="supersecretsecret"
DEV_RELEASE=false

SGHTTP_ENABLED=true
SGHTTP_SERVER="http://123.123.123.123:8001/"
SGHTTP_RETRIEVER="server"
TRANSLATIONFILE="~/tsNameTranslation.json"
```
You're going to want a [Mongo Database](https://www.mongodb.com/). You can easily make one through [mLab](https://mlab.com/), or [mongoAtlas](https://www.mongodb.com/cloud/atlas/lp/general/). You could also run one [locally](https://docs.mongodb.com/manual/installation/) though, options options options.

Once you've set all that up, just add your information to the .env, and run the program.
Add an admin manually, with `add-user`, in the server cli. They will invite the other users through the gui.

# Running

To run the application post installation, cd into it's directory, and run:
```bash
#for running the server:
node ./server.js

#or this for help:
node ./server.js --help
```

# TODO

This part is just a roadmap of all the things I have left to do on the next version of the timesheet system.
(That version is 1.9.1, from 1.8.7, right now)

- [ ] Add instructions on how to better create nameTranslation
- [ ] Edit already created shots?
- [x] Rokyt/Timers initial code
- [x] Finish Rokyt Launcher
- [x] Better support for the desktop app
- [ ] Minor visual edits to index.ejs (stop the buttons just being the browser defaults)
- [ ] Fix a bug where, occasionally, changing project doesnt update shots (just leaves it at "general")
- [ ] Perhaps refactor the way sg-http code was made (including in index.js)? It's pretty ugly right now, and has some support for options that it probably *shouldnt* support
- [x] Turn shot field into a dropdown instead of an input (using sg-http)
- [x] Cleaning up old files
- [x] Cleaning up old console.logs
- [ ] Logs
- [ ] Customizable log paths (probably from the .env)
- [ ] Wrap my front end javascript in IIFEs to keep vars out of the window scope
- [x] Better command line options
- [x] Refactoring
- [x] New Icon
- [x] Changing the way urls were passed to the server.
- [x] Letting servers create a temporary admin (via add-user in the cmd) (i know its not all that great but i wrote myself into a corner...)
- [x] Better README :smile:

#### Made by Samuel Clarke, 2018, for CumulusVFX.