# timesheet-system
![Logo](https://raw.githubusercontent.com/Samuel-Clarke123/timesheet-system/master/public/res/tslogo.png)

This timesheet system was created for CumulusVFX. It is made to allow users to log their hours, and for administrators to monitor how much everyone is working.
It has natural integration with shotgun in order to predict what shots people are working on,
and aims to deliver a pleasant, and accessible user experience for accessing and updating their timesheets.
A local server is hosted on a particular machine, people visit it in their browsers. Standard.

This README contains a lot of common information on how to
***use*** the timesheet-system. For information on how to administrate,
or edit the timesheet system, please see **./CODEBASE.md**

**Version**: 1.9.2, **Codename**: Cold Cobalt.

# Installation

To install the timesheet system, simply download the repo (either by git clone, or through github).

Then, check that you have node installed.
Once you are sure that you have node installed, install the dependencies with `npm install`.

If you're wondering which version of node to run: `v8.14.0` should be fine.
I personally use / test that version, other versions are untested.
However; other versions should still work fine.
NodeJS doesn't tend to release many breaking changes.

## Setup and Config

First, create / fill in your [.env](https://github.com/motdotla/dotenv). The one that's supplied is just a template/placeholder.
```TOML
# Example .env file.
# the mongo url will be calculated as: <prefix> + <body> + <suffix>
MONGO_URL_PREFIX="mongodb://guest:"
MONGO_URL_BODY="<pass>"
MONGO_URL_SUFFIX="@ds016298.mlab.com:<port>/<table>"

# ports that are forwarded to the browser
HTTP_PORT=8000
HTTPS_PORT=8443

# these are settings for https encryption
HTTPS_ENABLED=true
HTTPS_PASS="<password>"

AUTHOR="Samuel J. Clarke"

# this is the cookie encryption secret.
# DONT LET THIS LEAK, OR COOKIES WILL BE COMPROMISED (thats not good)
SECRET="supersecretsecret"

# this specifies whether or not it's a dev release.
# if you're running multiple servers connecting to the same database
# ONLY have ONE with this set to false.
# Otherwise they will all try to update at the same time and DESTROY
# all the data that you have collected in a week.
DEV_RELEASE=false

# this specifies whether or not to use sghttp, which is my way of interfacing
# with sg over http.
SGHTTP_ENABLED=true
SGHTTP_SERVER="http://123.123.123.123:8001/"

# this specifies who updates from sghttp.
# originally it was going to be the client making requests to the sghttp server.
# however, now, its the server.
# honestly, just leave it on server, client was a stupid idea.
SGHTTP_RETRIEVER="server"

# this specifies the path to the translation file.
# see below for more information on the translation file.
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

```JSON
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
# for running the server:
node ./server.js

# or this for help:
node ./server.js --help

# this for testing:
node ./server.js --test
```

Once it starts running, you can interface with it through the command line.
`help` will give you some command line help.
It's not bash or anything, and its just a shitty little interface that I made.
So don't expect magic.
Although, you can do the vast majority of what you need to do from there.
You shouldn't ever need to manually edit config files, outside of `./.env`.

If you're having issues with the timesheet system, `--test` should diagnose a lot of common issues.

# TODO

Personal todo list for v2.0.0

- [x] Add instructions on how to better create nameTranslation
- [x] Edit already created shots (time only)?
- [x] Rokyt/Timers initial code
- [x] Finish Rokyt Launcher
- [x] More animations for Rokyt Launcher
- [x] Better support for the desktop app
- [x] Fix a bug where, occasionally, changing project doesnt update shots (just leaves it at "general")
- [x] Turn shot field into a dropdown instead of an input (using sg-http)
- [x] Cleaning up old files
- [x] Cleaning up old console.logs
- [x] Logs
- [x] Make my css !important free (ish)
- [x] Better command line options
- [x] Refactoring
- [x] New Icon
- [x] Changing the way urls were passed to the server.
- [x] Letting servers create a temporary admin (via add-user in the cmd) (i know its not all that great but i wrote myself into a corner...)
- [x] Better README :smile:
- [x] Better input validation for the front end
- [x] Actual animations for the rokyt launcher
- [ ] Custom buttons and inputs for the front end (those defaults keep annoying me)
- [x] Bug hunting & bug fixes
- [x] Better XSS Security
- [x] Actual XSRF Token generation / validation
- [x] *Some* of a security *guide* layout in the top section of the code.

#### Made by Samuel Clarke, 2018, for CumulusVFX.