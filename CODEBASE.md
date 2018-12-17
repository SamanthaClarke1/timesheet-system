# The Codebase

![Logo](https://raw.githubusercontent.com/Samuel-Clarke123/timesheet-system/master/public/res/tslogo.png)

This timesheet system was created for CumulusVFX. It is made to allow users to
log their hours, and for administrators to monitor how much everyone is working.
It has natural integration with shotgun in order to predict what shots people
are working on,
and aims to deliver a pleasant, and accessible user experience for accessing
and updating their timesheets.
A local server is hosted on a particular machine, people visit it in their
browsers. Standard.

**Version**: 1.9.2, **Codename**: Cold Cobalt.

This section was last updated Dec 17, 2018.

# Meta Deployment

**This information will be relevant for future maintainers of *THIS*
implementation of the timesheet-system, at CumulusVFX. This information
is also bound to change for *THIS* implementation, if people take up the
project after me.**

** I should also note, as a disclaimer, that this will only be able to
give accurate information about services *directly* related to the
timesheet system. Some services are just a bit obscure, and were never
really documented; and would be very difficult to document. They should keep
working if you don't change the `Engineering/Sam` directory at all. Otherwise,
I can come in and get them back online.

I store a few main meta directories.

* `Engineering/Sam/node-web-server-git`
* `Engineering/Sam/node-web-server-current`
* `Engineering/Sam/node-web-server-backups`
* `Engineering/Sam/timesheet-desktop`
* `Engineering/Sam/pyshot3`

`git` is for the timesheet systems most recent updates, those that are
`git commit`ed.

`current` is the current implementation of the timesheet system running solely
on `.211`.

`backups` stores backups of the timesheet system.

`timesheet-desktop` stores the code for the timesheet desktop application.
It also stores binaries for the timesheet desktop application. 
[Github](https://github.com/Samuel-Clarke123/timesheet-desktop)

`pyshot3` stores the code for the `sghttp`/`pyshot`. This will be run on the
manjaro VM. Note: The github for this is an outdated django application.
It now is just a very short flask application. Disregard the source for this,
it is unlikely you will have to change it.

## The manjaro box

For future maintainers of this deployment...

The manjaro box can easily be started by going into gnome-boxes on cirrus (`.85`
at the time of writing) and clicking on the pyshot VM.

It automatically starts everything it needs, and will restart the server if
it crashes. However, I usually leave htop open on it just to check on it
every now and then, you do you, you might not feel the need.

It also uses i3;
this was to reduce memory usage, but you can also use KDE if you have no idea
how to use i3... even though it would hurt me a little inside :(

It also hosts the pyshot3 server as noted above.

It **should** be accessible on `122.122`. If it's not... well, I guess you can
edit all the `forwardVMPorts` and `.env` config. Good luck with that...

# Files & Folders

The entrypoint to the program is `./server.js`. It holds all of the server code
and pulls together a lot of the other files I am going to mention.

`./package.json` is a standard node.js config file, along with
`./package-lock.json`.
If you don't know what these are, I'd recommend learning `nodejs`, and not
touching the codebase until you do so.

`./.env` stores the environment variables important for `./server.js`.
Standard nodeJS stuff.

`./views/*` stores all the [ejs](https://www.ejs.co/) files that will
be rendered by `./server.js`. Standard web server stuff.

`./public/*` holds all `public` files other than the views.
Inside of public, they're sorted into `css`, `js`, `lib`, and `res`.

`./css/*` is css files. `./js/*` is js files. `./lib/*` is js libraries.
`./res/*` is resources such as images.

`./opt/*` holds (at the moment, only) `selectList.json`.
`selectList.json` stores all the possible dropdown options, such as tasks,
projects, etc.

`./node_modules/*` stores all node libraries. If you didnt know this,
I'd reccomend learning `nodejs` and not touching the codebase until
you do so. **[UNTRACKED]**

`./logs/*` stores all logs from the timesheet system. **[UNTRACKED]**

`./certs/*` stores https certificates. **[UNTRACKED]**

`./.vscode/*` stores vscode options for this directory. **[UNTRACKED]**

`./.eslintrc.json` stores eslint settings, for code refactoring.

`./.prettierrc` stores prettier settings, for code refactoring.

`./portal.html` was a file that was used to replace the default page for
firefox. The idea being, if it was the default page for people, people
would feel more inclined to use the Timesheet System.


## Random bash utilities

Whilst using this program I've written a few more or less random bash scripts
that are still laying around in the codebase.
If you don't know bash, these will end in the `.sh` extension. It's a scripting
language standard to *Linux/Unix*.

`./forwardVMPorts.sh` is a notable one however.
It's a simple bash script that will forward the neccessary ports for a VM
running on `<host-ip>` to be accessed from `<host-ip>`.
Basically, I use this so that `<host-ip>` hosts a Manjaro virtual machine, that
runs an sghttp server.

But that sghttp server needs to be accessed by more than `<host-ip>`,
so I use `socat` (in the afore mentioned script), to forward from
`<client-ip>:<port>`
to `<host-ip>:<port>`, so that people can access `<client-ip>:<port>`
by going to `<host-ip>:<port>`.

`./watch.sh` will restart the server if it ever crashes.
It was really just a stupid simple script to deal with me forgetting
try catch statements during development. And it's majoritively
obsolete now.

`./linecounter.sh` counts the lines of code in the repository.
Usually piped that into linedata.

`./toplines.sh` counts the "top lines" in the repository, to see what I've
typed most. **[UNTRACKED]**

`./submitToTimesheetDesktop.sh` copied code over to the timesheet-desktop
directory, so it could be served locally.
This was a **TODO** that never actually got resolved.

# Contributing

All contributions are welcome!

**Remember not to submit your .env's and stuff like that**

**This goes doubly to the people inevitably taking this project over from me**

If you do submit `./.env`, `./opt/`, `./certs/` or anything like that,
**CHANGE THE SECRETS AND CERTS**.
If you have secrets stored in `./.env` that get leaked,
all cookies will be readable. That's terrible!
Similarly, if you leak `./certs/`, your https will be as bad as http.

If you leak anything more, try using bfg to clean up your mistakes.
