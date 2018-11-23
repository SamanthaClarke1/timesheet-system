# timesheet-system
![Logo](https://raw.githubusercontent.com/Samuel-Clarke123/timesheet-system/master/public/res/tslogo/tslogo128x128.ico)

This timesheet system was originally created for CumulusVFX. It is made to allow users to log their hours, and for administrators to monitor how much everyone is working.
Just run the local server on a server somewhere, and have people visit it in their browsers.

**Version**: 1.9.1, **Codename**: Cold Cobalt.

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

## Name Translation

This section of the code is kind of highly specialized to our deployment of nuke and general infrastructure.
However, it's pretty easy to mock it up for sghttp to get it working.
It expects three fields.
`to_sg` is translation to shotgun.
`to_suffix` is translation to the nuke launcher. (If you were making an actual deployment of this, i'd reccomend just ripping all that out, and just using a general launcher, however you normally launch nuke in bash)
`to_ts` is translation to the timesheets system.

Before things are attempted to be translated, spaces are removed and its converted to lower case.
For each reference, it must know how to translate itself to itself. Eg: "example": "Example"

Here's an example.

```
{
	"to_sg": {
		"eg": "ExampleMovie",
		"examplemovie": "ExampleMovie",
		"example": "ExampleMovie"
	},
	"to_suffix": {
		"examplemovie": "eg",
		"example": "eg",
		"eg": "eg"
	},
	"to_ts": {
		"example": "Example",
		"examplemovie": "Example",
		"eg": "Example"
	}
}
```

# Running

To run the application post installation, cd into it's directory, and run:
```bash
#for running the server:
node ./server.js

#or this for help:
node ./server.js --help
```

# TODO

Personal todo list for v2.0.0

- [x] Add instructions on how to better create nameTranslation
- [x] Edit already created shots (time only)?
- [x] Rokyt/Timers initial code
- [x] Finish Rokyt Launcher
- [x] Better support for the desktop app
- [x] Fix a bug where, occasionally, changing project doesnt update shots (just leaves it at "general")
- [x] Turn shot field into a dropdown instead of an input (using sg-http)
- [x] Cleaning up old files
- [x] Cleaning up old console.logs
- [x] Logs
- [x] Make my css !important free
- [x] Better command line options
- [x] Refactoring
- [x] New Icon
- [x] Changing the way urls were passed to the server.
- [x] Letting servers create a temporary admin (via add-user in the cmd) (i know its not all that great but i wrote myself into a corner...)
- [x] Better README :smile:
- [ ] Better input validation for the front end
- [ ] Actual animations for the rokyt launcher
- [ ] Custom buttons and inputs for the front end (those defaults keep annoying me)
- [ ] Bug hunting & bug fixes

#### Made by Samuel Clarke, 2018, for CumulusVFX.
