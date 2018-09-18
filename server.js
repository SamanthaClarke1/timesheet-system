/* Code written by Samuel J. Clarke, May-July 2018, for CumulusVFX. */
//begin server.js


//#region imports ## init variables, imports etc ## //

// requires
const express        = require('express');
const fs             = require('fs');
const util           = require('util');
const session        = require('express-session');
const passwordHash   = require('password-hash');
const bodyParser     = require('body-parser');
const partials       = require('express-partials');
const XLSX           = require('xlsx');
const multer         = require('multer');
const readline       = require('readline');
const passport       = require('passport'),
    LocalStrategy    = require('passport-local').Strategy;
const mongodb        = require('mongodb').MongoClient;

//#endregion imports

//#region importConfig ## configuring express ## //

// inits
const app            = express();
const upload         = multer({ inMemory: true });

// app.set/use
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: process.env.SECRET, resave: false, saveUninitialized: false }));
app.use(express.static(__dirname + '/public'));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

//#endregion importConfig

//#region pre-code

const promptr  = "\[\033[01m\033[38;2;70;242;221m\] >> \033[38;2;0;176;255m";
const srvrPRFX = "\[\033[00m\033[38;2;153;95;178m\] SRVR: ";// server title. eg ${srvrPRFX} Connected to the mongoDB server.
const intrPRFX = "\[\033[00m\033[38;2;125;163;230m\] INTR: ";// interface title

const exit = function(exitCode) {
	process.stdout.write("\033[00m\n");
	process.exit(exitCode);
}
console.log = function(str,pers=srvrPRFX) {// WOAH, LOOK AT THE SPOOKY
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(pers+str+"\n"+promptr);
}
var loaderShouldBePrinting = true;
printLoader("Server in startup ");

//#endregion pre-code

//#region ctrlBox ############ CONTROL BOX STARTS HERE ############ //

//#region ev #### EASILY EDITABLE VARS START HERE #### //

var selectList = getSelectList();

var tasks = selectList.tasks;
var projs = selectList.projs;

const RowEnum = {"id": 0, "user": 1, "start": 2, "end": 3, "proj": 4, "vacation": 5, "note": 6};
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const url = 'mongodb://guest:'+process.env.MONGO_PASS+'@ds016298.mlab.com:16298/timetable';  // Connection URL.

//#endregion ev #### EASILY EDITABLE VARS END HERE #### //

//#region dbv #### SYSTEM DEBUG VARS START HERE (BE CAREFUL) #### //

const __DEBUG_FORCE_TS_NAMING_SCHEMA__ = false; // !i!i! CAREFUL !i!i!i  -  THIS WILL FORCE ALL OF THE TIMESHEET NAMES TO THE PROPER SCHEMA
const __DEBUG_FORCEUNIX__ = false; // !i!i! CAREFUL !i!i!i  -  THIS WILL UPDATE ALL OF THE UNIX DATES TO WHATEVER THE STRING DATE IS. // i mean actually this one is not really all that dangerous but its ok
const __DEBUG_FORCE_COSTS_TO_TEN_PH__ = false; // !i!i! CAREFUL !i!i!i  -  THIS WILL FORCE ALL UNDEFINED COSTS OF EACH USER TO TEN DOLLARS PER HOUR.
const __DEBUG_UNTEAR_DATA__ = false; // !i!i CAREFUL !i!i!i  -  WILL REMOVE ALL DUPLICATES ON A CERTAIN DATE, WITH A BIAS TOWARDS MORE JOBS.
const __DEBUG_KNOCK_FROM_TO__ = false; // !i!i CAREFUL !i!i!i  -  WILL CHANGE UNIX-DATES FROM A CERTAIN DATE TO ANOTHER DATE

const __DEBUG_UNTEAR_DATA_DATE__ = 1531058400000;
const __DEBUG_KNOCK_FROM__ = 1534082400000;
const __DEBUG_KNOCK_TO__ = 1531058400000;

const __DEV_RELEASE__ = process.env.DEV_RELEASE;

//#endregion dbv #### SYSTEM DEBUG VARS END HERE (THANKS FOR BEING CAREFUL) #### //

//#region qm #### 2+2=4, 4-1=3, QUICK MAFS #### //

//console.log(hashOf("CMLS")); // default password to manually insert.

//#endregion qm #### END QUICK MAFS #### //

//#endregion ctrlBox ############ END CONTROL BOX ############ //

//#region mongoDB_connect
// Use connect method to connect to the Server
mongodb.connect(url, function mongConnect(err, db) {
	if (err) {
		console.log('Unable to connect to the mongoDB server. Error: ' + err);
	} else {
		console.log('Connected to the mongoDB server. ' + url.split(process.env.MONGO_PASS).join("{SECRET_PASSWORD}"));
		//#endregion mongoDB_connect

		//#region dbSetup

		var ttdb = db.db("timetable");

		var usersDB = ttdb.collection('users'); // this stores all of the users, and their weekly timesheet.
		var timesheetDB = ttdb.collection('timesheets'); // this stores all 'archived' timesheets. only admins can edit these timesheets. organised by date { date: *date, user: *name, jobs: *jobs[] }
		var plansDB = ttdb.collection('plans'); // this stores all of the auto-fill data. things like project defaults. its basically just a group of future 'jobs'. timesheets that "will" exist. organised by date { date: *date, user: *name, jobs: *jobs[] }
		var parsedDB = ttdb.collection('parsed'); // this stores all of the parsed spreadsheet. atm just to work with some ajax on the planner page (remembering what their last spreadsheet was).

		//#endregion

		//#region debugFuncs
		if(__DEBUG_FORCE_TS_NAMING_SCHEMA__) {
			timesheetDB.find({}).toArray(function(err, data) {
				if(err) throw err;
				for(var timesheet of data) {
					var original = JSON.parse(JSON.stringify(timesheet));
					var now = new Date(timesheet['unix-date']);
					timesheet['date'] = getThisDate(now);
					console.log("updated ts date to: "+ timesheet["date"]+ "  from: "+ original.date);

					timesheetDB.update({"user": original.user, "unix-date": original['unix-date']}, {$set: {"user": timesheet.user, "jobs": timesheet.jobs, "date": timesheet.date, "unix-date": timesheet["unix-date"]}}, function(err, data) {
						if(err) throw err; //painfulpart
						console.log("success i think");
					});
				}
				console.log("done i think");
			})
		}

		if(__DEBUG_FORCEUNIX__) {
			timesheetDB.find({}).toArray(function(err, data) {
				if(err) throw err;
				for(var timesheet of data) {
					var original = JSON.parse(JSON.stringify(timesheet));
					var now = new Date(timesheet.date);
					timesheet['unix-date'] = now.getTime();

					console.log(timesheet["unix-date"]);
					timesheetDB.update({"user": original.user, "date": original.date}, {"user": timesheet.user, "jobs": timesheet.jobs, "date": timesheet.date, "unix-date": timesheet["unix-date"]}, function(err, data) {
						if(err) throw err; //painfulpart
						console.log("success i think")
					});
				}
			})
		}

		if(__DEBUG_UNTEAR_DATA__) {
			var untrdate = __DEBUG_UNTEAR_DATA_DATE__;
			var peopleSeen = [];

			timesheetDB.find({ "unix-date": untrdate }).toArray(function(err, data) {
				if(err) throw err;
				for(var timesheet of data) {
					if(peopleSeen.indexOf(timesheet.user) != -1) {
						peopleSeen.push(timesheet.user);
					} else {
						timesheetDB.remove({"_id": timesheet['_id']}, {justOne: true}, function(err, data) {
							if(err) throw err; //painfulpart
							console.log("success i think");
						});
					}
				}
			})
		}

		if(__DEBUG_KNOCK_FROM_TO__) {
			var frmDate = __DEBUG_KNOCK_FROM__;
			var toDate = new Date(__DEBUG_KNOCK_TO__);

			timesheetDB.find({ "unix-date": frmDate }).toArray(function(err, data) {
				if(err) throw err;
				for(var timesheet of data) {
					var original = JSON.parse(JSON.stringify(timesheet));
					timesheet['date'] = getThisDate(toDate);
					timesheet['unix-date'] = toDate.getTime();

					timesheetDB.update({"user": original.user, "date": original.date}, {"user": timesheet.user, "jobs": timesheet.jobs, "date": timesheet.date, "unix-date": timesheet["unix-date"]}, function(err, data) {
						if(err) throw err; //painfulpart
						console.log("knocked "+ getThisDate(new Date(frmDate))+ "to"+ getThisDate(toDate));
					});
				}
			});
		}

		if(__DEBUG_FORCE_COSTS_TO_TEN_PH__) {
			usersDB.find({"cost": { $exists: false }}).toArray(function(err, data) {
				if(err) throw err;

				for(let user of data) {
					usersDB.update({"name": user.name}, {$set: {"cost": 10}}, function(err, data) {
						if(err) throw err;
						console.log("done i think");
					});
				}
			});
		}

		//#endregion

		//#region displayHandlers

		// http://expressjs.com/en/starter/basic-routing.html
		app.get("/", ensureAuthenticatedSilently, function slashRootGET(req, res) {
			var thisdate = "Current";

			if(req.user.isadmin) {//swjp
				usersDB.find({}).project({'name': 1, 'displayName': 1}).toArray(function(err, users) { 
					if(err) throw err;

					var tuser = req.user;
					if(req.query.tuser) {
						tuser = req.query.tuser;
					}

					usersDB.findOne({"name": (tuser.name ? tuser.name : tuser)}, function(err, dbuser) {
						if(err) throw err;

						timesheetDB.find({"user": dbuser.name}, {"_id": 0, "date": 1}).toArray(function(err, timesheets) {
							if(err) throw err;

							timesheets.sort((a, b) => { return b["unix-date"] - a["unix-date"]; })
							timesheets.unshift({"user": dbuser.name, "jobs": dbuser.timesheet.jobs, "date": thisdate});
							for(var i = 1; i <= 4; i++) {
								timesheets.unshift({"user": dbuser.name, "jobs": [], "date": getThisDate(getNextWeek(new Date(), 10, i))});
							}

							var targetdate = (req.query.tdate ? req.query.tdate : thisdate);
							
							var ttsheet = req.user.timesheet;
							for(var tsheet of timesheets) {
								if(tsheet.date == targetdate) ttsheet = tsheet;
							}

							if(targetdate != "Current" && new Date(targetdate).getTime() > getPreviousMonday().getTime()) {// the target date is in the future, plans get the scans
								plansDB.findOne({"date": targetdate, "$text": {"$search": dbuser.name, "$language": "english", "$caseSensitive": false}}, function(err, data) {
									if(err) throw err;
									if(!data) {
										console.log("unable to find plan for user " + req.user.name + " on date " + targetdate);
										ttsheet = {"date": targetdate, "user": dbuser.name, "jobs": []};
									}
									else {
										ttsheet = data;
									}
									return res.render("index.ejs", {tday: (req.query.tday ? req.query.tday : false), editable: true, targetdate: targetdate, timesheets: timesheets,
										 							users: users, tuser: dbuser, user: req.user, error: req.query.err, timesheet: ttsheet, projs: projs, tasks: tasks});
								});
							} else {
								return res.render("index.ejs", {tday: (req.query.tday ? req.query.tday : false), editable: true, targetdate: targetdate, timesheets: timesheets,
									 							users: users, tuser: dbuser, user: req.user, error: req.query.err, timesheet: ttsheet, projs: projs, tasks: tasks});
							}
						});
					})
				});
			} else {
				timesheetDB.find({"user": req.user.name}, {"_id": 0, "date": 1}).toArray(function(err, timesheets) {
					if(err) throw err;

					timesheets.sort((a, b) => { return b["unix-date"] - a["unix-date"]; });
					timesheets.unshift({"user": req.user.name, "jobs": req.user.timesheet.jobs, "date": thisdate});
					for(var i = 1; i <= 4; i++) {
						timesheets.unshift({"user": req.user.name, "jobs": [], "date": getThisDate(getNextWeek(new Date(), 10, i))});
					}

					var targetdate = (req.query.tdate ? req.query.tdate : thisdate);
					
					var ttsheet = req.user.timesheet;
					for(var tsheet of timesheets) {
						if(tsheet.date == targetdate) ttsheet = tsheet;
					}
					
					// editable logic
					var editable = true;
					var prevWeekUNIX = getNextWeek(new Date(), 10, -1).getTime();
					var targWeekUNIX = new Date(targetdate).getTime();
					if(targWeekUNIX < prevWeekUNIX) editable = false;

					if(targetdate != "Current" && new Date(targetdate).getTime() > getPreviousMonday().getTime()) {// the target date is in the future, plans get the scans
						plansDB.findOne({"date": targetdate, "$text": {"$search": req.user.name, "$language": "english", "$caseSensitive": false}}, function(err, data) {
							if(err) throw err;

							if(!data) {
								ttsheet = {"user": req.user.name, "jobs": [], "date": targetdate};
							}
							else {
								ttsheet = data;
							}
							return res.render("index.ejs", {tday: (req.query.tday ? req.query.tday : false), editable: editable, targetdate: targetdate, timesheets: timesheets, user: req.user, error: req.query.err, timesheet: ttsheet, projs: projs, tasks: tasks});
						});
					} else {
						return res.render("index.ejs", {tday: (req.query.tday ? req.query.tday : false), editable: editable, targetdate: targetdate, timesheets: timesheets, user: req.user, error: req.query.err, timesheet: ttsheet, projs: projs, tasks: tasks});
					}
				});
			}
		});

		app.get("/usercosts", ensureAuthenticated, function slashUsercostsGET(req, res) {
			res.render("usercosts.ejs", {error: false, user: req.user});
		})

		app.get("/analytics", ensureAuthenticated, function slashAnalyticsGET(req, res) {
			if(req.user.isadmin != "true") {
				return res.redirect("/?err=You%20don't%20have%20permissions%20to%20use%20the%20planner");
			}
			res.render("analytics.ejs", {error: false, user: req.user, projs: projs})
		})

		app.get("/planner", ensureAuthenticated, function slashPlannerGET(req, res) {
			if(req.user.isadmin != "true") {
				return res.redirect("/?err=You%20don't%20have%20permissions%20to%20use%20the%20planner");
			}
			return res.render("planner.ejs", {error: false, user: req.user});
		});

		app.get("/help", function (req, res) {
			res.render("help.ejs", {user: req.user, error: req.query.err});
		});

		//#endregion
		
		//#region ajaxCode

		//#region ajaxGetters

		app.get("/ajax/getusercosts", ensureAJAXAuthenticated, function slashAjaxGetusercostsGET(req, res) {
			if(req.user.isadmin != "true") return res.json({"err": "User does not have the permissions to use this function", "errcode": 403, "data": {}});
			
			usersDB.find({}).project({'name': 1, 'displayName': 1, 'cost': 1}).toArray(function(err, users) { 
				if(err) throw err;
				
				return res.json({"err": "", "errcode": 200, "users": users, "data": users});
			});
		});
		
		app.get("/ajax/getanalyticsdata", ensureAJAXAuthenticated, function slashAjaxGetanalyticsdataGET(req, res) {
			if(req.user.isadmin != "true") return res.json({"err": "User does not have the permissions to use this function", "errcode": 403, "data": {}});
			
			var fromdate = new Date(req.query.fromdate).getTime(), todate = new Date(req.query.todate).getTime();
			
			if(req.query.searchtype == "proj") delete req.query.user;
			
			var mongSearch = {"unix-date": {"$gt": fromdate, "$lt": todate}, "user": {"$in": req.query.user }};
			if(!mongSearch.user["$in"]) delete mongSearch.user;
			else if(!mongSearch.user["$in"].push) mongSearch.user = req.query.user // first way i could think of to test for an array, sorry about the ugliness
			
			timesheetDB.find(mongSearch).toArray(function(err, timesheets) {
				if(err) throw err;

				usersDB.find({}).project({'name': 1, 'displayName': 1, 'cost': 1}).toArray(function(err, users) { 
					if(err) throw err;
					
					return res.json({"err": "", "errcode": 200, "users": users, "data": timesheets});
				});
			});
		}); // /analytics?user=philippa&user=william&user=morgane&user=jee&fromdate=2018-06-07&todate=2018-06-12

		app.get("/ajax/getallnames/:type", ensureAJAXAuthenticated, function slashAjaxGetallnamesGET(req, res) {
			//req.params.type is the type.
			var ttype = req.params.type;

			if(ttype == "users") {
				usersDB.find({}).project({'name': 1, 'displayName': 1}).toArray(function(err, users) { 
					if(err) throw err;

					return res.json({"err": "", "errcode": 200, "data": users});
				});
			} else if(ttype == "projs") {
				return res.json({"err": "", "errcode": 200, "data": projs});
			} else if(ttype == "tasks") {
				return res.json({"err": "", "errcode": 200, "data": tasks});
			} else { 
				return res.json({"err": "Malformed request", "errcode": 400, "data": {}}); 
			}
		});

		app.get("/ajax/getplans", ensureAJAXAuthenticated, function slashAjaxGetplansGET(req, res) {
			if(req.user.isadmin != "true") {
				res.json({"err": "Insufficient permissions", "errcode": 403, "data": {}});
			} else {
				parsedDB.find().toArray(function(err, data) {
					if(err) throw err;
					res.json({"err": "", "errcode": 200, "data": data});
				});;
			}
		});

		//#endregion ajaxGetters

		//#region ajaxSetters

		app.post("/ajax/setusercost", ensureAJAXAuthenticated, function slashAjaxSetusercostPOST(req, res) {
			var uname = req.body.uname;
			var ucost = req.body.ucosts;

			usersDB.findOne({"name": uname}, function(err, data) {
				if(err) throw err;

				if(!data) {
					return res.json({"err": "Could not find a user.", "errcode": 400, "data": {}})
				} else {
					console.log("setting "+uname+"'s cost to $"+ucost+"ph")
					usersDB.update({"name": uname}, {$set: {"cost": ucost}});
					data.cost = ucost;
					return res.json({"err": "", "errcode": 200, "data": {"name": data.name, "cost": ucost, "displayName": data.displayName}});
				}
			})
		});

		app.post("/code/addjob", ensureAJAXAuthenticated, function slashCodeAddjobPOST(req, res) {
			if(req.body.date != "Current" && new Date(req.body.date).getTime() > getPreviousMonday().getTime()) {// the target date is in the future, plans !i!i DONT !i!i get the scans
				return res.json({"err": "Future weeks are read only.", "errcode": 403, "data": {}});
			}

			usersDB.findOne({"name": req.body.jobuser}, function(err, user) {
				console.log("adding "+user.name+"'s job on date " + req.body.date + " day " + req.body.day + " NOW: " + getThisDate());
				timesheetDB.findOne({"user": user.name, "date": req.body.date}, function(err, timesheet) {
					if(err) throw err;

					var truets = true;
					if(!timesheet) {
						timesheet = user.timesheet;
						truets = false;
					}

					var toIns = {
						"day": req.body.day,
						"shot": req.body.shotcode,
						"proj": req.body.project,
						"time": req.body.timespent,
						"task": req.body.task,
						"id": makeSlug(15, 15)
					};
					if(toIns.day.length && toIns.shot && toIns.proj && toIns.time && toIns.task) {
						if(toIns.day.length  > 11) return res.json({"err": "Day too long", "errcode": 400, "data": ""});
						if(toIns.shot.length > 35) return res.json({"err": "Shot code too long", "errcode": 400, "data": ""});
						if(toIns.proj.length > 25) return res.json({"err": "Project too long", "errcode": 400, "data": ""});
						if(toIns.task.length > 20) return res.json({"err": "Task too long", "errcode": 400, "data": ""});
						if(toIns.day.length  <  2) return res.json({"err": "Day too short", "errcode": 400, "data": ""});
						if(toIns.task.length <  1) return res.json({"err": "Task too short", "errcode": 400, "data": ""});
						if(toIns.shot.length <  1) return res.json({"err": "Shot code too short", "errcode": 400, "data": ""})

						timesheet.jobs.push(toIns);
		
						if(!truets) {
							req.user.timesheet = timesheet;
							usersDB.update({name: user.name}, {"cost": user.cost, "name": user.name,"displayName": user.displayName,"dob": user.dob,"password": user.password,"isadmin": user.isadmin,"email": user.email,"timesheet": user.timesheet}, function(err, data) {
								if(err) throw err;
								return res.json({"err": "", "errcode": 200, "data": toIns}); //painfulpart
							});
						} else {
							timesheetDB.update({"user": user.name, "date": req.body.date}, {"user": timesheet.user, "jobs": timesheet.jobs, "date": timesheet.date, "unix-date": timesheet["unix-date"]}, function(err, data) {
								if(err) throw err;
								return res.json({"err": "", "errcode": 200, "data": toIns}); //painfulpart
							});
						}
					} else {
						return res.json({"err": "Missing input fields!", "errcode": 400, "data": {}});
					}
				});
			});
		});

		app.post("/code/deljob", ensureAJAXAuthenticated, function slashCodeDeljobPOST(req, res) {
			usersDB.findOne({"name": req.body.jobuser}, function(err, user) {
				timesheetDB.findOne({"user": user.name, "date": req.body.date}, function(err, timesheet) {
					if(err) throw err;
					console.log("deleting " + req.body.jobuser + "'s job on date " + req.body.date);

					var truets = true;
					if(!timesheet) {
						timesheet = user.timesheet;
						truets = false;
					}
					
					for(var i = 0; i < timesheet.jobs.length && i != -1; i++) {
						if(timesheet.jobs[i].id == req.body.jobid) {
							if(!truets) user.timesheet.jobs.splice(i, 1);
							else timesheet.jobs.splice(i, 1);
							
							if(!truets) {
								req.user.timesheet = timesheet;
								usersDB.update({name: user.name}, {"cost": user.cost, "name": user.name,"displayName": user.displayName,"dob": user.dob,"password": user.password,"isadmin": user.isadmin,"email": user.email,"timesheet": timesheet}, function(err, data) {
									if(err) throw err;
									return res.json({"err": "", "errcode": 200,}); //painfulpart
								});
								break;
							} else {
								timesheetDB.update({"user": user.name, "date": req.body.date}, {"user": timesheet.user, "jobs": timesheet.jobs, "date": timesheet.date, "unix-date": timesheet["unix-date"]}, function(err, data) {
									if(err) throw err;
									return res.json({"err": "", "errcode": 200,}); //painfulpart
								});
								break;
							}
						} else if(i >= timesheet.jobs.length - 1) { // if its the last job, and its still not found anything, redirect them.
							return res.json({"err": "Job Not Found", "errcode": 400});
						}
					}
				});
			});
		});

		app.post("/ajax/planviaspreadsheet", upload.single('file'), ensureAJAXAuthenticated, function slashAjackPlanviaspreadsheetPOST(req, res) { // this ended up being such a large algorithm :/
			// req.file is the spreadsheet file, loaded in memory. ty multer <3
			if(req.user.isadmin != "true") {
				return res.redirect("/?err=You%20don't%20have%20permissions%20to%20use%20the%20planner");
			}

			var spreadsheet = XLSX.read(req.file.buffer);
			var sheet = spreadsheet.Sheets[spreadsheet.SheetNames[0]];

			var rows = [];
			var now = new Date();

			for (var row_name in sheet) {
				// check if the property/key is defined in the object itself, not in parent
				if (sheet.hasOwnProperty(row_name)) {
					if(row_name[0] != "!") {
						var row = CSVToArray(sheet[row_name].v);
						rows.push(row[0].splice(0, 7)); // explaining the splice: the last two variables are the date it was updated, and who it was updated by. 
														// the first we dont care about, the second we also dont care about, and its always going to be 'CumulusVFX' anyway.
					}
				}
			}
			rows.shift(); // the first element is always that weird key thing. dont need it, got my enums.

			// convert to single days, whilst also removing ones that are earlier than todays date.

			var sdjs = []; // "single day jobs" -- takes the parsed data, and, for each row, for each day in the start date to the end date, adds a job.
			for(var row of rows) {
				try {
					var dates = getDates(new Date(row[RowEnum.start]), new Date(row[RowEnum.end]));
				} catch(ex) {
					return res.end("1");
				}
				for(var date of dates) {
					var pmon = new Date(getPreviousMonday(new Date(date.getTime()), 10)).getTime();
					if(pmon >= getNextMonday(10).getTime()) { // if its not coming in this week
						if(date.getDay() != 6 && date.getDay() != 0) { // if its not saturday or sunday.
							sdjs.push({"user": row[RowEnum.user], "monday": getThisDate(new Date(pmon)), "unix-date": date.getTime(), "proj": (row[RowEnum.proj] ? row[RowEnum.proj] : "Admin"), 
										"hours": 8, "shot": (row[RowEnum.note] ? row[RowEnum.note] : "Admin"), "task": (row[RowEnum.vacation] == "x" ? "Annual Leave" : "Misc")});
						}
					} else {
						//console.log(getNextMonday(10).getTime(), " ", pmon);
					}
				}
			} sdjs.sort( (a, b) => { //sort by date, then by user.
				if(a["unix-date"] < b["unix-date"]) return -1;
				else if(a["unix-date"] > b["unix-date"]) return +1;
				else if(a["user"] < b["user"]) return -1;
				else if(a["user"] > b["user"]) return +1;
				else return 0;
			});

			if(sdjs.length <= 0) return res.end("1");

			// for intersecting days, get the other intersecting days with the same user, and divide its hours by the amount found. (this is the largest the data will ever get, promise)
			for(var i in sdjs) {
				let same_day_jobs = 0;
				let targetdate = sdjs[i]["unix-date"];
				let targetuser = sdjs[i].user;
				for(var si = i; sdjs[si]["unix-date"] == targetdate; si--) /* find the first index of this date, by walking backwards, since its been sorted, this is much more efficient */;
				for(let j = si; j < sdjs.length && sdjs[Math.max(j - 1, 0)]["unix-date"] == targetdate; j++) { // since it's already sorted, we can just walk through it.
					if(sdjs[j].user == targetuser) same_day_jobs += 1;
				}

				if(sdjs[i].hours == 8) { // should always be true, just a fail-safe to not divide twice
					sdjs[i].hours /= same_day_jobs;
				} else { // also, yes, i know its way more inefficient to do it one at a time, but this whole thing shouldnt be being called often at all, and it runs smooth enough anyway. ill leave that as a stretch goal.
					console.log("\n=========\nSomething went wrong, somethings starting with, like, " + sdjs[i].hours + " hours, this should only ever be 8   >:(\n=========\n");
				}
			} 
			sdjs.sort((a, b) => { // sort by monday, then by user.
				if(a["monday"] < b["monday"]) return -1;
				else if(a["monday"] > b["monday"]) return +1;
				else if(a["user"] < b["user"]) return -1;
				else if(a["user"] > b["user"]) return +1;
				else return 0;
			});
			//console.log("Planned sdjs snapshot (just the first 7):: \n", JSON.stringify(sdjs.slice(0, 7), null, 2));//debug

			// group them by week (the data gets to shrink here, phew.) (basically just turning them into my standard timesheet format (MSTF))
			var timesheets = []; // timesheets, generated from the plans.
			for(var i = 0; sdjs.length > 0; ) {
				var twjs = []; // this weeks jobs = an array holding all of the jobs for the week, for the user.
				var targetmonday = sdjs[i].monday;
				var targetuser = sdjs[i].user;

				var toRemove = 0;
				for(var j = i; j < sdjs.length && sdjs[j].monday == targetmonday && sdjs[j].user == targetuser; j++) {
					twjs.push({
						"task": sdjs[j].task,
						"day": days[(new Date(sdjs[j]["unix-date"]).getDay() == 0 ? 6 : new Date(sdjs[j]["unix-date"]).getDay() - 1)],
						"time": sdjs[j].hours,
						"proj": sdjs[j].proj,
						"id": makeSlug(15, 15)
					});
					toRemove += 1;
				} 
				console.log(targetmonday+ "  |  "+ getThisDate(new Date(targetmonday)));
				var thisweek = {
					"user": targetuser,
					"date": getThisDate(new Date(targetmonday)),
					"unix-date": new Date(targetmonday).getTime(),
					"jobs": twjs
				}
				timesheets.push(thisweek);

				sdjs.splice(i, toRemove);
			}
			//delete sdjs;//(technically a syntax error tho, thx strict mode.)// sdjs aren't needed anymore, (even though it should be empty at this point), and are cleared.

			//console.log("Planned timesheets snapshot (just the first 7):: \n", JSON.stringify(timesheets.slice(0, 7), null, 2));

			// clear the db, and add the new timesheets
			plansDB.remove({}).then(function() { // clear the db
				parsedDB.remove({}).then(function() { // clear the rows db
					plansDB.insert(timesheets, function(err, data) {
						if(err) throw err;
						parsedDB.insert({rows}, function(err, data) {
							if(err) throw err;
							return res.end("0");
						});
					});
				});
			});
		});

		//#endregion ajaxSetters

		//#endregion ajaxCode

		//#region auth ## AUTH SECTION ## //
		
		//#region authDisplays

		app.get("/login", function slashLoginGET(req, res) {
			res.render("login.ejs", {user: req.user, error: req.query.err});
		});

		app.get("/signup", ensureAuthenticated, function slashSignupGET(req, res) {
			if(req.user.isadmin == "true") {
				res.render("signup.ejs", {user: req.user, error: req.query.err});
			}
		});

		app.get("/changepassword", ensureAuthenticated, function slashChangepasswordGET(req, res) {
			res.render("changepassword.ejs", {user: req.user, error: req.query.err});
		});

		//#endregion authDisplays

		//#region passportLibCode
		// ## PASSPORT ## //
		// Passport session setup.
		//   To support persistent login sessions, Passport needs to be able to
		//   serialize users into and deserialize users out of the session.  Typically,
		//   this will be as simple as storing the user ID when serializing, and finding
		//   the user by ID when deserializing... but im lazy and this will work fine, 
		//   since the user load on this server is not expected to be high, and older timesheets
		//   will be stored elsewhere.
		passport.serializeUser(function(user, done) {
			console.log(user.name+" has joined.");
			done(null, user);
		});
	
		passport.deserializeUser(function(obj, done) {
			done(null, obj);
		});

		// ## LOCAL PASSPORT STRATEGY ## //

		passport.use(new LocalStrategy(function(username, password, done) {
			usersDB.findOne({ name: displayNameToUsername(username) }, function(err, user) {
				if (err) { return done(err); }
				if (!user) {
					return done(null, false, { message: 'Incorrect username.' });
				}
				if (!passwordHash.verify(password, user.password)) {
					return done(null, false, { message: 'Incorrect password.' });
				}
				return done(null, user);
			});
		}));

		//#endregion passportLibCode

		//#region authCodePages

		app.post("/auth/signup", ensureAuthenticated, function slashAuthSignup(req, res) {
			if(req.user.isadmin) {
				if(req.body.username.length > 25 || req.body.password > 25 || req.body.confirmpassword > 25) res.redirect("/signup?err=Input%20Fields%20Too%20Long.");
				else if(req.body.password != req.body.confirmpassword || req.body.password.length < 4 || req.body.username.length < 2) {
					if(req.body.username.length < 2) res.redirect("/signup?err=Username%20cant%20be%20that%20short.");
					else if(req.body.password.length < 4 || req.body.confirmpassword.length < 4) res.redirect("/signup?err=Password%20can't%20be%20that%20short.");
					else res.redirect("/signup?err=Passwords%20don't%20match.");
				} else {
					var date = new Date();
					var now = date.getTime();
					var toIns = {
						"name": displayNameToUsername(req.body.username),
						"displayName": req.body.username,
						"dob": now,
						"password": hashOf(req.body.password),
						"isadmin": req.body.isadmin,
						"email": req.body.email,
						"cost": 10,
						"timesheet": {"jobs": []}
					};
					usersDB.findOne({"name": toIns.name}, function(err, data) {
						if(err) throw err;

						if(!data) {
							usersDB.insert(toIns);
							console.log("everbody welcome " + toIns.name + "!");
							res.redirect("/?err=User%20successfully%20added.");
						} else {
							res.redirect("/signup?err=User%20already%20exists.");
						}
					});
				}
			} else {
				res.redirect("/?err=Only%20Admins%20Can%20Make%20New%20Users.")
			}
		});

		app.post("/auth/login", passport.authenticate('local', { failureRedirect: '/login?err=Login%20details%20incorrect.' }), function slashAuthLoginPOST(req, res) {
			return res.redirect("/");
		});

		app.get("/auth/logout", function slashAuthLogoutGET(req, res) {
			req.logout();
			return res.redirect('/login');
		});

		app.post("/auth/changepassword", ensureAuthenticated, function slashAuthChangepasswordPOST(req, res) {
			if(req.body.newpassword != req.body.newconfirmpassword) {
				return res.redirect("/changepassword?err=Password%20must%20be%20the%20same%20as%20the%20confirmation%20password.")
			} else if (req.body.newpassword.length < 4) {
				return res.redirect("/changepassword?err=Your%20New%20Password%20Cant%20Be%20That%20Short.");
			} else if (req.body.newpassword.length > 25) {
				return res.redirect("/changepassword?err=Your%20New%20Password%20Cant%20Be%20That%20Long.");
			}

			let passwordIsBlocked = false;
			for (let bpass of selectList.bpass) {
				if(req.body.newpassword == bpass) passwordIsBlocked = true;
			}
			if(passwordIsBlocked) {
				return res.redirect("/changepassword?err=Your%20New%20Password%20Cant%20Be%20That.");
			}

			let nums = req.body.newpassword.replace(/[^0-9]/g,"").length;
			let syms = req.body.newpassword.replace(/[a-zA-Z\d\s:]/g,"").length;
			let lowerCase = req.body.newpassword.replace(/[^a-z]/g,"").length;
			let upperCase = req.body.newpassword.replace(/[^A-Z]/g,"").length;

			if(nums < 2) return res.redirect("/changepassword?err=You%20Must%20Have%20At%20Least%20Two%20Numbers!");
			if(syms < 1) return res.redirect("/changepassword?err=You%20Must%20Have%20At%20Least%20One%20Symbol!");
			if(lowerCase < 2) return res.redirect("/changepassword?err=You%20Must%20Have%20At%20Least%20Two%20Lower%20Case%20Letters!");
			if(upperCase < 1) return res.redirect("/changepassword?err=You%20Must%20Have%20At%20Least%20One%20Upper%20Case%20Letter!");

			for(let upart in req.user.name.toLowerCase().split(' ')) {
				if(req.body.newpassword.toLowerCase().indexOf(upart) != -1) return res.redirect("/changepassword?err=Your%20Password%20Cant%20Contain%20Your%20Username!");
			}

			if(passwordHash.verify(req.body.oldpassword, req.user.password)) {
				req.user.password = hashOf(req.body.newpassword); 
				var user = req.user;
				usersDB.update({name: user.name}, {"cost": user.cost, "name": user.name,"displayName": user.displayName,"dob": user.dob,"password": user.password,"isadmin": user.isadmin,"email": user.email,"timesheet": user.timesheet}, function(err, data) { //painfulpart
					if(err) throw err;
					return res.redirect("/");
				});
			} else {
				return res.redirect("/?err=Your%20password%20is%20incorrect.");
			}
		});

		//#endregion authCodePages

		//#endregion auth

		//#region misc

		//The 404 Route (ALWAYS Keep this as the last route)
		app.get("*", function slashStarGET(req, res) {
			return res.render('404.ejs', {user: req.user, error: req.query.err});
		});
		app.post("*", function slashStarPOST(req, res) {
			return res.json({"err": "Page is not found", "errcode": 404, "data": ""});
		});

		//#endregion misc

		//#region autoSubm ## AUTO SUBMIT FUNCTION ## //

		function callMeOnMonday(effective) {
			var now = new Date();
			//if(!effective) {now.setDate(16); now.setMonth(7); now.setHours(7);} // debug, makes it run once, just to force the user timesheets into the outdated bin.
			let nextMonday = getNextMonday(7); // run at next monday, 7am.
			setTimeout(callMeOnMonday, nextMonday.getTime() - now.getTime(), true);

			if(effective && !__DEV_RELEASE__) {
				//now.setDate(16); now.setMonth(7); // debug, sets the date to upload.
				console.log("It's a monday! Moving the timesheets! " + getThisDate(now));
				var thisdate = getPreviousMonday(new Date(now.getTime() - (1000*60*60*24*2)), 0) // this is just inserting the previous weeks monday date. nothing to see here, move along.
				
				usersDB.find().toArray(function(err, users) {
					for(var tuser of users) {
						var toIns = {"user": tuser.name, "jobs": tuser.timesheet.jobs, "date": getThisDate(thisdate), "unix-date": new Date(thisdate).getTime()};
						console.log("timesheet insert called on " + tuser.name + " " + getThisDate(thisdate));
						timesheetDB.insert(toIns, function(err, data) {
							if(err) throw err;
							console.log(data.ops[0].user + " has had his timesheets inserted into the timesheet db.");
						});
					}

					function updateUsers(ind) {
						tuser = users[ind];

						console.log("attempting to find plans for " + tuser.name);
						plansDB.findOne({"date": getThisDate(thisdate), "$text": {"$search": tuser.name, "$language": "english", "$caseSensitive": false}}, function(err, data) {
							if(err) throw err;

							console.log(thisdate);
							console.log(tuser.name);

							var ts = "";
							if(!data) ts = {"jobs": []}
							else ts = data;
							console.log(data);
							var toInsu = {"cost": tuser.cost, "name": tuser.name, "displayName": tuser.displayName, "dob": tuser.dob, "password": tuser.password, "isadmin": tuser.isadmin, "email": tuser.email, "timesheet": ts};
							console.log("update called on " + tuser.name);
		
							usersDB.update({name: tuser.name}, toInsu, function(err, data) { // target behaviour: calls update, which calls this function again, with 1 higher index.
								if(err) throw err; // painfulpart
								console.log(tuser.name + " updated.");
								if(++ind < users.length) updateUsers(ind); // if its not looping outside of the max users, update the next user.
							});
							console.log("exiting updateUsers");
						});				
					}
					updateUsers(0);
				});
			}
		}
		callMeOnMonday(false); //SET TO TRUE TO RUN ONCE, INCASE THE SERVER GETS RESTARTED OR WHATEVS.

		//#endregion autoSubm
	
		//#region post-load-code
		setTimeout(function () {
			loaderShouldBePrinting = false;
			console.log("Finished Loading.");
		}, 1500 + Math.random() * 2000); //yes, im making the load time longer on purpose, but i have a spinny thing to compensate.
		//#endregion post-load-code
	}
});

//#region serverFinalSetup ## server initialization ## //

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));


const http = require('http');
const https = require('https');

http.createServer(app).listen(process.env.HTTP_PORT, function() {console.log("Http is online on port " + process.env.HTTP_PORT);});

if(process.env.HTTPS_ENABLED) {
	var sslOptions = {
		'passphrase': process.env.HTTPS_PASS,
		'key': fs.readFileSync(__dirname + '/certs/key.pem'),
		'cert': fs.readFileSync(__dirname + '/certs/cert.pem')
	};

	https.createServer(sslOptions, app).listen(process.env.HTTPS_PORT, function() {console.log("Https is online on port " + process.env.HTTPS_PORT);});
}

//#endregion serverFinalSetup

//#region createCommandLineInterface
const correctionArr = [
	[["add", "ontribut", "rm", "del", "ubtrac", "gain", "plus", "pdate", "task", "proj", "electio"], "change-selections [remove|@add] [task|@proj] [admin|@default] {selection}", "change-selections"],
	[["save", "store", "electio", "task", "proj", "onfirm"], "save-selections", "save-selections"],
	[["quit", "xit", "terminate", "leave", "end", "fin"], "exit", "exit"],
	[["big", "boy", "me me"], "memebigboy", "memebigboy"],
	[["lear", "cls", "c;ear", "wipe"], "clear", "clear"],
	[["hash", "get pass", "password"], "get-hash-of {password}", "get-hash-of"],
	[["java", "script", "math", "val", "calc"], "eval {cmd}", "eval"],
	//[["os", "sys", "calc", "run", "cmd", "ash"], "bash {cmd}"],
	[["elp", "how", "?", "man", "anua"], "help", "help"]
];

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: promptr,
	completer: function(line) {
		var hits = [];
		var tline = line.toLowerCase();
		for(var cc of correctionArr) {
			for(var signifier of cc[0]) {
				if(tline.indexOf(signifier) != -1 || cc[1].indexOf(tline) != -1) {
					hits.push(cc[2]);
					break;
				}
			}
		}
		return [hits, line];
	}
});



rl.on('line', (input) => {
	funcReq = input.split(' ')[0].toLowerCase();
	params = input.split(' ').slice(1, input.split(' ').length);
	switch(funcReq) {
		case "memebigboy":
			process.stdout.write(intrPRFX+"go away josh");
			break;
		case "exit":
			onQuitAttempt();
			break;
		case "change-selections":
			if(params[0] != "add" && params[0] != "remove") params.splice(0, 0, "add")
			if(params[1] != "task" && params[1] != "proj" && params[1] != "bpass") params.splice(1, 0, 'proj');
			if(params[2] != "admin" && params[2] != "default") params.splice(2, 0, "default");
			params[3] = params.slice(3, params.length).join(' ');
			params.splice(4, params.length - 4);

			process.stdout.write(intrPRFX+"PARAMS: "+params.toString()+"\n");

			if(params[0] == "add") {
				if(params[1] == "task") {
					tasks[params[2]].push(params[3]);
					tasks[params[2]] = tasks[params[2]].sort(function(a,b){return (a<b?-1:(a>b?1:0))});
					process.stdout.write(intrPRFX+" Success adding task '"+params[3]+"'");
				} else if (params[1] == "proj") {
					projs.push(params[3]);
					projs = projs.sort(function(a,b){return (a<b?-1:(a>b?1:0))});
					process.stdout.write(intrPRFX+" Success adding project '"+params[3]+"'");
				} else if (params[1] == "bpass") {
					selectList.bpass.push(params[3]);
				}
			} else if(params[0] == "remove") {
				if(params[1] == "task") {
					let ind = tasks[params[2]].indexOf(params[3]);
					if(ind != -1) {
						tasks[params[2]].splice(ind, 1);
						process.stdout.write(intrPRFX+" Success removing task '"+params[3]+"'");
					} else {
						process.stdout.write(intrPRFX+" Couldn't find task '"+params[3]+"'");
					}
				} else if(params[1] == "proj") {
					let ind = projs.indexOf(params[3]);
					if(ind != -1) {
						projs.splice(ind, 1);
						process.stdout.write(intrPRFX+" Success removing project '"+params[3]+"'");
					} else {
						process.stdout.write(intrPRFX+" Couldn't find project '"+params[3]+"'");
					}
				}
			}

			break;
		case "save-selections":
			writeSelectList(tasks, projs);
			break;
		case "get-hash-of":
			process.stdout.write(hashOf(params[0]));
			break;
		case "eval":
			let result;
			try {
				result = eval("try {\n"+params.join(' ')+"} catch(err) { process.stdout.write(err.toString()+ \"\\n\"); }");
				if(result) result = result.toString();
			} catch(err) {throw err;}
			if(result) process.stdout.write(result);
			break;
		case "clear":
			process.stdout.write(intrPRFX+'\033[2J\033[01;00m');
			break;
		case "help":
			process.stdout.write(intrPRFX+"possible functions: \n")
			for(let i = 0; i<correctionArr.length; i++) {
				if(correctionArr[i]) process.stdout.write("\t-- "+correctionArr[i][1]+"\n");
			}
			process.stdout.write("\nPS: I use standard arg formatting. IE: \t\n-- params are space seperated. \t\n-- args surrounded by `[]` mean they are optional \t\n-- `|` indicates an 'or' choice \t\n-- `*` is a wild card, eg, it represents 'anything' \t\n-- `@` implies it is the default choice. \t\n-- `{}` indicates a variable, eg {name} \t\n-- `#` indicates a number \t\n-- `&` specifies that if the first arg is passed, the other must be as well. \t\n-- `()` groups logic. eg. `3/(3*2)=0.5`, or `[address | (state & country)]` \t\n-- `{#..#}` indicates a number range, eg, `{0..5}` = 0 to 5 \n\nPPS: Only parameters are case-sensitive.")
			break;
		default:
			process.stdout.write(intrPRFX+`couldn't understand your input of: ${input}\n`);
			let possibilities = [];
			for(let i in correctionArr) {
				for(let signifier of correctionArr[i][0]) {
					if(input.indexOf(signifier) != -1) {
						let signified = correctionArr[i][1];
						possibilities.push(signified);
						break;
					}
				}
			}
			if(possibilities.length >= 1) {
				process.stdout.write(`however, there are ${possibilities.length} similar function(s):\n `);
			} else {
				process.stdout.write("Maybe try using `help`!\n");
			}
			for(let possibility of possibilities) {
				process.stdout.write("\t-- "+possibility);
			}
	};
	process.stdout.write(`\n${promptr}`);
});

function onQuitAttempt() {
	var loaderWasPrinting = loaderShouldBePrinting;
	loaderShouldBePrinting = false;
	rl.question("\033[00m\033[38;2;255;33;145mAre you sure you want to exit? [y(es)/n(o)] "+promptr, (answer) => {
		if (answer.match(/^y(es)?$/i)) {
			rl.question("\033[00m\033[38;2;255;33;145mDo you want to save your selections (task/proj lists)? [y(es)/n(o)] "+promptr, (answer) => {
				if (answer.match(/^y(es)?$/i)) {
					writeSelectList(tasks, projs);
				}
				rl.pause();
				exit(0);
				loaderShouldBePrinting = loaderWasPrinting;
			});
		}
		else {
			console.log('Exit canceled.', intrPRFX);
		}
		loaderShouldBePrinting = loaderWasPrinting;
	});
}

rl.on('SIGINT', onQuitAttempt);

//rl.on('pause', () => {
//	console.log(`SAMts Interface paused.`);
//});

//rl.on('resume', () => {
//	console.log(`SAMts Interface resumed`);
//});


console.log(`SAMts Interface Initiated.`)

//#endregion createCommandLineInterface

//#region helperFuncs //

//#region DATE-TIME HELPER FUNCS
// function is1917(now=new Date()) { if(now.getMonth() == 2 && now.getDate() == 8) { return now.getYear() - 17; } else { return -1; } }
function getThisDate(now=new Date()) {
	return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
}


function printLoader(msg="Loading ", iter=0){
	if(loaderShouldBePrinting) {
		iterArr = ['\\ .     [\033[0;45m-\033[0m      ]', 
				    '| ..    [\033[0;45m---\033[0m    ]', 
				    '/ ...   [\033[0;45m-----\033[0m  ]', 
				    '- ....  [\033[0;45m-------\033[0m]']
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write("\033[01;32m" + msg + iterArr[iter % iterArr.length] + "\033[00;00m");
		setTimeout(printLoader, 333, msg, iter+1)
	}
}

function getNextMonday(hours) { 
	var d = new Date();
	d = new Date(d.setDate(d.getDate() + (7-d.getDay())%7+1));
	d.setHours(hours); d.setMinutes(0); d.setSeconds(0); d.setMilliseconds(0);
	return d;
}

function getNextWeek(now=new Date(), hours=10, mult=1) {
	var nextWeek = new Date(now.getTime() + (mult * 7 * 24 * 60 * 60 * 1000));
	return getPreviousMonday(nextWeek, hours);
}

function getPreviousMonday(prevMonday=new Date(), hours=10) {
	prevMonday = new Date(prevMonday.setDate(prevMonday.getDate() - (prevMonday.getDay() + 6) % 7));
	prevMonday.setHours(hours); prevMonday.setMinutes(0); prevMonday.setSeconds(0); prevMonday.setMilliseconds(0);
	return prevMonday;
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function getDates(startDate, stopDate) {
    var dateArray = [];
    var currentDate = startDate;
    while (currentDate <= stopDate) {
        dateArray.push(new Date (currentDate));
        currentDate = currentDate.addDays(1);
    }
    return dateArray;
}

//#endregion DATE-TIME HELPER FUNCS

//#region crypto funcs
function displayNameToUsername(username) {
	return username.split(' ').join('-').toLowerCase();
}

function hashOf(input) {
	return passwordHash.generate(input);
}

function makeSlug(min, max) {
	var t = "";
	for(var i = 0; i < min + Math.floor(Math.random() * (max - min)); i++) {
		var base = 65 + (Math.random() * 25);
		if(Math.random() < 0.4) {
		base += 32;
		} else if (Math.random() < 0.3) {
		base = 48 + Math.random() * 9;
		} t += String.fromCharCode(base);
	} 
	return t;
}
//#endregion crypto funcs

//#region passport funcs
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/login?err=Unable%20to%20authenticate%20user.')
}

function ensureAJAXAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.json({"err": "User Is Not Authenticated", "errcode": 403, "data": ""});
}

function ensureAuthenticatedSilently(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/login')
}
//#endregion passport funcs

//#region data parsing

function getSelectList(){
	var content = fs.readFileSync(__dirname+"/opt/selectList.json");
	var selectList = JSON.parse(content);
	return sortSelectList(selectList);
}
function sortSelectList(selectList) {
	selectList.tasks.admin = selectList.tasks.admin.sort(function(a,b){return (a<b?-1:(a>b?1:0))});
	selectList.tasks.default = selectList.tasks.default.sort(function(a,b){return (a<b?-1:(a>b?1:0))});
	selectList.projs = selectList.projs.sort(function(a,b){return (a<b?-1:(a>b?1:0))});
	return selectList;
}
function writeSelectList(tasks, projs) {
	var selectList = JSON.stringify(sortSelectList({"tasks": tasks, "projs": projs}), null, 2);
	fs.writeFileSync(__dirname+'/opt/selectList.json', selectList);
	return selectList;
}

function samrtLog(obj, indMult=2, index=0, println=true, iskey=false, shouldComma=true) {
	for(let i = 0; i < index * indMult; i++) {
		if(!iskey) process.stdout.write(" ");
	}
	if(obj == null) {
		process.stdout.write("\033[01;32mundefined\033[00m");
	}
	else if(typeof obj == "boolean" && !obj) process.stdout.write("\033[01;32mfalse\033[00m");
	else if(typeof obj == "boolean") process.stdout.write("\033[01;32mtrue\033[00m");
	else if(typeof obj == "object") {
		if(typeof obj[Symbol.iterator] === 'function') {
			process.stdout.write("\033[01;35m[\033[00m\n")
			for(var i = 0; i < obj.length; i++) {
				samrtLog(obj[i], indMult, index + 1, true, false, (i == obj.length -1 ? false : true));
			}
			process.stdout.write("\033[01;35m]\033[00m");
		} else {
			process.stdout.write("\033[01;35m{\033[00m\n");
			var keys = Object.keys(obj);
			for(let i = 0; i < keys.length; i++) {
				samrtLog(keys[i], indMult, index+1, false, false, false);
				process.stdout.write("\033[01;35m: \033[00m");
				samrtLog(obj[keys[i]], indMult, index+1, false, true, (i == keys.length - 1 ? false : true));
				process.stdout.write("\033[01;35m\n")
			}
			for(let i = 0; i < index * indMult; i++) process.stdout.write(" ");
			process.stdout.write("\033[01;35m}\033[00m")
		}
	} else if (typeof obj == "string") {
		process.stdout.write("\033[01;35m'\033[00m" + obj.toString() + "\033[01;35m'\033[00m");
	} else if (typeof obj == "number") {
		process.stdout.write("\033[01;34m"+obj.toString()+"\033[00m");
	}

	if(index > 0) {
		if(shouldComma) {
			process.stdout.write("\033[01;35m,\033[00m");
		}
		if(println) process.stdout.write("\n");
	}
}

// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray( strData, strDelimiter ){
	// Check to see if the delimiter is defined. If not,
	// then default to comma.
	strDelimiter = (strDelimiter || ",");
	// Create a regular expression to parse the CSV values.
	var objPattern = new RegExp( (
			// Delimiters.
			"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
			// Quoted fields.
			"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
			// Standard fields.
			"([^\"\\" + strDelimiter + "\\r\\n]*))"
		), "gi");
	// Create an array to hold our data. Give the array
	// a default empty first row.
	var arrData = [[]];
	// Create an array to hold our individual pattern
	// matching groups.
	var arrMatches = null;
	// Keep looping over the regular expression matches
	// until we can no longer find a match.
	while (arrMatches = objPattern.exec( strData )){
		// Get the delimiter that was found.
		var strMatchedDelimiter = arrMatches[ 1 ];
		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if (
			strMatchedDelimiter.length &&
			strMatchedDelimiter !== strDelimiter
			){
			// Since we have reached a new row of data,
			// add an empty row to our data array.
			arrData.push( [] );
		}
		var strMatchedValue;
		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		if (arrMatches[ 2 ]){
			// We found a quoted value. When we capture
			// this value, unescape any double quotes.
			strMatchedValue = arrMatches[ 2 ].replace(
				new RegExp( "\"\"", "g" ),
				"\""
				);
		} else {
			// We found a non-quoted value.
			strMatchedValue = arrMatches[ 3 ];
		}
		// Now that we have our value string, let's add
		// it to the data array.
		arrData[ arrData.length - 1 ].push( strMatchedValue );
	}

	// Return the parsed data.
	return( arrData );
}
//#endregion data parsing

//#endregion helperFuncs

//end server.js

