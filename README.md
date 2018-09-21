# timesheet-system
![Logo](https://raw.githubusercontent.com/Samuel-Clarke123/timesheet-system/master/public/res/tslogo.png)

This timesheet system was originally created for CumulusVFX. It is made to allow users to log their hours, and for administrators to monitor how much everyone is working.
Just run the local server on a server somewhere, and have people visit it in their browsers.

# Installation

To install the timesheet system, simply download the repo (either by git clone, or through github).

Then, check that you have node installed.
Once you are sure that you have node installed, install the dependencies with `npm install`.

## Setup and Config

First, create / fill in your [.env](https://github.com/motdotla/dotenv). The one that's supplied is just a template/placeholder.
```TOML
# Example .env file.
MONGO_URL_BODY="<pass>"
MONGO_URL_PREFIX="mongodb://guest:"
MONGO_URL_SUFFIX="@ds016298.mlab.com:<port>/<table>"
HTTP_PORT=8000
HTTPS_PORT=8443
HTTPS_ENABLED=true
HTTPS_PASS="password"
AUTHOR="Samuel J. Clarke"
SECRET="supersecretsecret"
DEV_RELEASE=true
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

