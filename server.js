/* eslint-env node, es6, browser */
/* eslint-disable no-console */

// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

//#region meta

/* Code written by Samuel J. Clarke, May-July 2018, for CumulusVFX. */
//begin server.js

/*
*                                                                 
*                              NNNNNN                             
*                      Ndhyoo+////////+ooyhdN                     
*                  Nhs+//////////////////////+shN                 
*               Nho//////////////////////////////ohN              
*             ms////////////////////////////////////sm            
*           ms////////////////////////////////////////sm          
*          y////////////////////////////////////////////y         
*        No//////////////////////////////////////////////oN       
*       m+////////////////////////////////////////////////+m      
*      N+//////////////////////////////////////////////////+N     
*      s////////////////////////////////////////////////////s     
*     d/ohhyyyyyyyyyyyyyyyyssshmmmhhy+///////////////////////d    
*     osmo`                   `my`  oN+//////////////////////o    
*    N+m+                     / -   .No//shmNNmdyo////////////N   
*    m+mo  -/++++/.           / h+oydy/yN         mo//////////m   
*    m+ms                     /    No/d             o/////////m   
*    N+my  `..``````````````  / sys+/o              m/////////N   
*     sms  :oooooooooooosso/  / ysydmN              d////////o    
*     mmo                     +                     NNNmy////d    
*       o  -+ooossssssssssy-  +                          h//s     
*       s                     o                          h/+N     
*       y  :++++++++++++++++` o Nmmmmmmmmmmmmmmmmmmmmmmds/+m      
*       o  -::::--:::::::--.  o o////////////////////////oN       
*       o                     o o///////////////////////y         
*       o .hdhyyyyyyyyyyss+-  + +/////////////////////sm          
*       /                     / +///////////////////sm            
*    Nmmhoooo++++///+++oss+`  / +////////////////ohN              
* d:`                 .yy.`   / +////////////+shN                 
* h`                  oNy.`  .hm+/////+ooyhdN                     
*  d/:////////////:/+osN  NmN   NNNNN                              
*                                                                 
*/

//#endregion meta

//#region optionParsing ## parses the options, and acts on *some* of them. ## //
require('dotenv').config();

const optionDefinitions = [
	{ name: 'dburl',		alias: 'u',		type: String	},
	{ name: 'help',			alias: 'h',		type: Boolean	},
	{ name: 'version',		alias: 'v', 	type: Boolean	},
	{ name: 'quickpush',	alias: 'q',		type: Boolean	}
];

const boxen				= require('boxen');
const commandLineArgs	= require('command-line-args');
const options			= commandLineArgs(optionDefinitions);
const pjson				= require('./package.json');
const pathDirname		= require('path-dirname'); // path.dirname ponyfill for lightness! ponyfill.com

const request = require('request');

if (options.help) {
	console.log(boxen(`Timesheets! - Hosts the timesheet server,
    Serves the GUI and creates a CLI for sysadmins.

Usage: node ./server.js [options]
    -u --dburl <url>    specifies the database to load (from an url)
    -h --help           displays this help message
    -v --version        displays the version number
    -q --quickpush      pushes this week into the past week
`, { backgroundColor: 'black', float: 'center', align: 'left', padding: 1, margin: 1, borderStyle: 'classic', borderColor: 'magenta' }));
} else if (options.version) {
	console.log(boxen('Timesheets!\n\nv' + pjson.version + '\n~\nCodeName: ' + pjson.codename, { backgroundColor: 'black', float: 'center', align: 'center', 
		padding: 1, margin: 1, borderStyle: 'classic', borderColor: 'magenta' }));
}

//#endregion optionParsing

//#region imports ## init variables, imports etc ## //

// requires
const express			= require('express');
const fs				= require('fs');
const session			= require('express-session');
const passwordHash		= require('password-hash');
const bodyParser		= require('body-parser');
const partials			= require('express-partials');
const XLSX				= require('xlsx');
const multer			= require('multer');
const readline			= require('readline');
const passport			= require('passport'),
	LocalStrategy		= require('passport-local').Strategy;
const mongodb			= require('mongodb').MongoClient;

//#endregion imports

//#region importConfig ## configuring express ## //

// inits
const app 				= express();
const upload 			= multer({ inMemory: true });

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

// prompter, think > or $ .. in this case, its >>
const promptr	= '[\x1b[01m\x1b[38;2;70;242;221m] >> \x1b[38;2;0;176;255m';
// server title. eg ${srvrPRFX} Connected to the mongoDB server.
const srvrPRFX	= '[\x1b[00m\x1b[38;2;153;95;178m] SRVR: ';
// interpreter title
const intrPRFX	= '[\x1b[00m\x1b[38;2;125;163;230m] INTR: ';
const url		= options.dburl || (process.env.MONGO_URL_PREFIX + process.env.MONGO_URL_BODY + process.env.MONGO_URL_SUFFIX); // Connection URL.
const SHOTUPDATEFREQ = 1000 * 60 * 10;

let SHOTCACHE = {};
let TRANSLATIONCACHE = {};

let BROWSERCONNECTIONS = {};

TRANSLATIONCACHE = getNameTranslationList();

const exit = (exitCode) => {
	process.stdout.write('\x1b[00m\n');
	process.exit(exitCode);
};

Number.prototype.npad = function(amt) { //stupid eval orders not wanting to hoist this statement >:(
	return (this+'').padStart(amt, '0');
}


let dirsplit = __dirname.split('/');
let serverRel = dirsplit[dirsplit.length-1].split('-').reverse()[0];

let logStreams = {};
logStreams.general = createLogStream('general');
logStreams.sghttp = createLogStream('sghttp');

// okay, yeah, redefining system functions probably isnt the best idea but it works damn fine, and you can still use stdout.write
console.log = function(str, pers = srvrPRFX, channel='general', group=0) {
	// group (0 = print both to logs and to terminal, 1 = print just logs, -1 = print just terminal)
	if(group < 1) {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(pers + str + '\n' + promptr);
	}
	if(group > -1) {
		let tpers = pers.split(/\[([0-9]{0,4}(;|)){0,6}m/).join(''); // remove bash color changes

		if(logStreams[channel]) {
			logStreams[channel].write('['+getFineDate()+']'+tpers+str+'\n');
		} else {
			process.stdout.write('tried to log ' + channel + ' but it couldn\'t be found!\n');
		}
	}
};

var loaderShouldBePrinting = true;
printLoader('Server in startup ');

var TKEY = '';
var TKEY_TIMEOUT = 1000 * 60 * 2;
var TKEY_IS_VALID = false;

//#endregion pre-code

//#region ctrlBox ############ CONTROL BOX STARTS HERE ############ //

//#region ev #### EASILY EDITABLE VARS START HERE #### //

var selectList	= getSelectList();
var tasks		= selectList.tasks;
var projs		= selectList.projs;

const RowEnum	= { id: 0, user: 1, start: 2, end: 3, proj: 4, vacation: 5, note: 6 };
const days		= [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday' ];

//#endregion ev #### EASILY EDITABLE VARS END HERE #### //

//#region dbv #### SYSTEM DEBUG VARS START HERE (BE CAREFUL) #### //

const __DEBUG_FORCE_TS_NAMING_SCHEMA__	= false; // !i!i! CAREFUL !i!i!  -  THIS WILL FORCE ALL OF THE TIMESHEET NAMES TO THE PROPER SCHEMA
const __DEBUG_FORCEUNIX__				= false; // !i!i! CAREFUL !i!i!  -  THIS WILL UPDATE ALL OF THE UNIX DATES TO WHATEVER THE STRING DATE IS. // i mean actually this one is not really all that dangerous but its ok
const __DEBUG_FORCE_COSTS_TO_TEN_PH__	= false; // !i!i! CAREFUL !i!i!  -  THIS WILL FORCE ALL UNDEFINED COSTS OF EACH USER TO TEN DOLLARS PER HOUR.
const __DEBUG_UNTEAR_DATA__				= false; // !i!i! CAREFUL !i!i!  -  WILL REMOVE ALL DUPLICATES ON A CERTAIN DATE, WITH A BIAS TOWARDS MORE JOBS.
const __DEBUG_KNOCK_FROM_TO__			= false; // !i!i! CAREFUL !i!i!  -  WILL CHANGE UNIX-DATES FROM A CERTAIN DATE TO ANOTHER DATE
const __DEBUG_FORCE_TIME_NUM__			= false; // !i!i! CAREFUL !i!i!  -  THIS WILL FORCE ALL TIMES IN JOBS TO A NUMBER RATHER THAN A STRING

const __DEBUG_UNTEAR_DATA_DATE__		= 1531058400000;
const __DEBUG_KNOCK_FROM__				= 1534082400000;
const __DEBUG_KNOCK_TO__				= 1531058400000;

const __DEV_RELEASE__					= (process.env.DEV_RELEASE == 'true');

//#endregion dbv #### SYSTEM DEBUG VARS END HERE (THANKS FOR BEING CAREFUL) #### //

//#region qm #### 2+2=4, 4-1=3, QUICK MAFS #### //

//console.log(hashOf("CMLS")); // default password to manually insert.

//#endregion qm #### END QUICK MAFS #### //

//#endregion ctrlBox ############ END CONTROL BOX ############ //

//#region mongoDB_connect
// Use connect method to connect to the Server

console.log('Starting server. Channel ' + serverRel + '. Version ' + pjson.version + '. Codename ' + pjson.codename);
console.log('Starting server. Channel ' + serverRel + '. Version ' + pjson.version + '. Codename ' + pjson.codename, undefined, 'sghttp', 1);

mongodb.connect(url, function mongConnect(err, db) {
	if (err) {
		console.log('Unable to connect to the mongoDB server. Error: ' + err);
	} else {
		console.log('Connected to the mongoDB server. ' + url.split(process.env.MONGO_PASS).join('{SECRET_PASSWORD}'));
		//#endregion mongoDB_connect

		//#region dbSetup

		var ttdb = db.db('timetable');

		var usersDB = ttdb.collection('users'); // this stores all of the users, and their weekly timesheet.
		var timesheetDB = ttdb.collection('timesheets'); // this stores all 'archived' timesheets. only admins can edit these timesheets. organised by date { date: *date, user: *name, jobs: *jobs[] }
		var plansDB = ttdb.collection('plans'); // this stores all of the auto-fill data. things like project defaults. its basically just a group of future 'jobs'. timesheets that "will" exist. organised by date { date: *date, user: *name, jobs: *jobs[] }
		var parsedDB = ttdb.collection('parsed'); // this stores all of the parsed spreadsheet. atm just to work with some ajax on the planner page (remembering what their last spreadsheet was).

		//#endregion

		//#region debugFuncs
		if (__DEBUG_FORCE_TS_NAMING_SCHEMA__) {
			timesheetDB.find({}).toArray((err, data) => {
				if (err) throw err;
				for (var timesheet of data) {
					var original = JSON.parse(JSON.stringify(timesheet));
					var now = new Date(timesheet['unix-date']);
					timesheet['date'] = getThisDate(now);
					console.log('updated ts date to: ' + timesheet['date'] + '  from: ' + original.date);

					timesheetDB.update(
						{ user: original.user, 'unix-date': original['unix-date'] },
						{ $set: { user: timesheet.user, jobs: timesheet.jobs, date: timesheet.date, 'unix-date': timesheet['unix-date'] } }, (err) => {
							if (err) throw err; //painfulpart (one day they'll fucking support spread functions)
							console.log('success i think');
						}
					);
				}
				console.log('done i think');
			});
		}

		if (__DEBUG_FORCEUNIX__) {
			timesheetDB.find({}).toArray((err, data) => {
				if (err) throw err;
				for (var timesheet of data) {
					var original = JSON.parse(JSON.stringify(timesheet));
					var now = new Date(timesheet.date);
					timesheet['unix-date'] = now.getTime();

					console.log(timesheet['unix-date']);
					timesheetDB.update(
						{ user: original.user, date: original.date },
						{ user: timesheet.user, jobs: timesheet.jobs, date: timesheet.date, 'unix-date': timesheet['unix-date'] }, (err) => {
							if (err) throw err; //painfulpart (come on ECMAScript2018)
							console.log('success i think');
						}
					);
				}
			});
		}

		if (__DEBUG_UNTEAR_DATA__) {
			var untrdate = __DEBUG_UNTEAR_DATA_DATE__;
			var peopleSeen = [];

			timesheetDB.find({ 'unix-date': untrdate }).toArray((err, data) => {
				if (err) throw err;
				for (var timesheet of data) {
					if (peopleSeen.indexOf(timesheet.user) != -1) {
						peopleSeen.push(timesheet.user);
					} else {
						timesheetDB.remove({ _id: timesheet['_id'] }, { justOne: true }, (err) => {
							if (err) throw err; //painfulpart (im waiting, ES2018)
							console.log('success i think');
						});
					}
				}
			});
		}

		if (__DEBUG_KNOCK_FROM_TO__) {
			var frmDate = __DEBUG_KNOCK_FROM__;
			var toDate = new Date(__DEBUG_KNOCK_TO__);

			timesheetDB.find({ 'unix-date': frmDate }).toArray((err, data) => {
				if (err) throw err;
				for (var timesheet of data) {
					var original = JSON.parse(JSON.stringify(timesheet));
					timesheet['date'] = getThisDate(toDate);
					timesheet['unix-date'] = toDate.getTime();

					timesheetDB.update(
						{ user: original.user, date: original.date },
						{ user: timesheet.user, jobs: timesheet.jobs, date: timesheet.date, 'unix-date': timesheet['unix-date'] }, (err) => {
							if (err) throw err; //painfulpart (where that ...object syntax at?)
							console.log('knocked ' + getThisDate(new Date(frmDate)) + 'to' + getThisDate(toDate));
						}
					);
				}
			});
		}

		if (__DEBUG_FORCE_COSTS_TO_TEN_PH__) {
			usersDB.find({ cost: { $exists: false } }).toArray((err, data) => {
				if (err) throw err;

				for (let user of data) {
					usersDB.update({ name: user.name }, { $set: { cost: 10 } }, (err) => {
						if (err) throw err;
						console.log('done i think');
					});
				}
			});
		}

		if (__DEBUG_FORCE_TIME_NUM__) {
			timesheetDB.find({}).toArray((err, data) => {
				if (err) throw err;
				for (let timesheet of data) {
					let original = JSON.parse(JSON.stringify(timesheet));
					for (let i in timesheet.jobs) {
						let ttime = parseFloat(timesheet.jobs[i].time);
						if(!isNaN(ttime))
							timesheet.jobs[i].time = ttime;
					}

					timesheetDB.update(
						{ user: original.user, date: original.date },
						{ user: timesheet.user, jobs: timesheet.jobs, date: timesheet.date, 'unix-date': timesheet['unix-date'] }, (err) => {
							if (err) throw err; //painfulpart (come on ECMAScript2018)
							console.log('success i think (timesheet)');
						}
					);
				}
			});

			usersDB.find({}).toArray((err, data) => {
				if (err) throw err;
				for(let user of data) {
					for(let i in user.timesheet.jobs) {
						let ttime = parseFloat(user.timesheet.jobs[i].time);
						if(!isNaN(ttime))
							user.timesheet.jobs[i].time = ttime;
					}

					usersDB.update(
						{ name: user.name },
						{
							cost: user.cost,
							name: user.name,
							displayName: user.displayName,
							dob: user.dob,
							password: user.password,
							isadmin: user.isadmin,
							email: user.email,
							timesheet: user.timesheet
						}, (err) => {
							if (err) throw err; //painfulpart
							console.log('succes i think (user)');
						}
					);
				}
			});
		}

		//#endregion

		//#region displayHandlers

		// http://expressjs.com/en/starter/basic-routing.html
		app.get('/', ensureAuthenticatedSilently, function slashRootGET(req, res) {
			var thisdate = 'Current';
			var tmp_sghttpurl = process.env.SGHTTP_SERVER;

			if(process.env.SGHTTP_RETRIEVER == 'server') {
				tmp_sghttpurl = '/sghttp/';
			}

			//for(let i in SHOTCACHE) {
			//	console.log(SHOTCACHE[i].length + " " + i);
			//}

			if (req.user.isadmin) {
				usersDB.find({}).project({ name: 1, displayName: 1 }).toArray((err, users) => {
					if (err) throw err;

					var tuser = req.user;
					if (req.query.tuser) {
						tuser = req.query.tuser;
					}

					usersDB.findOne({ name: tuser.name ? tuser.name : tuser }, (err, dbuser) => {
						if (err) throw err;

						timesheetDB.find({ user: dbuser.name}, { _id: 0, date: 1 }).toArray((err, timesheets) => {
							if (err) throw err;

							timesheets.sort((a, b) => {
								return b['unix-date'] - a['unix-date'];
							});
							timesheets.unshift({ user: dbuser.name, jobs: dbuser.timesheet.jobs, date: thisdate });
							for (var i = 1; i <= 4; i++) {
								timesheets.unshift({ user: dbuser.name, jobs: [], date: getThisDate(getNextWeek(new Date(), 10, i)) });
							}

							var targetdate = req.query.tdate ? req.query.tdate : thisdate;

							var ttsheet = req.user.timesheet;
							let foundTimeSheet = false;

							for (var tsheet of timesheets) {
								if (tsheet.date == targetdate) {
									ttsheet = tsheet;
									foundTimeSheet = true;
								}
							}
							if(!foundTimeSheet) {
								ttsheet = timesheets[4]; // if we cant find their timesheet, set it to current.
								targetdate = 'Current';
							}

							if (targetdate != 'Current' && new Date(targetdate).getTime() > getPreviousMonday().getTime()) {
								// the target date is in the future, plans get the scans
								plansDB.findOne({ date: targetdate, $text: { $search: dbuser.name, $language: 'english', $caseSensitive: false } }, (err, data) => {
									if (err) throw err;
									if (!data) {
										console.log('unable to find plan for user ' + req.user.name + ' on date ' + targetdate);
										ttsheet = { date: targetdate, user: dbuser.name, jobs: [] };
									} else {
										ttsheet = data;
									}
									return res.render('index.ejs', {
										tday: req.query.tday || false,
										editable: true,
										targetdate: targetdate,
										timesheets: timesheets,
										users: users,
										tuser: dbuser,
										user: req.user,
										error: req.query.err || (foundTimeSheet ? '':'Couldn\'t find your timesheet!'),
										timesheet: ttsheet,
										projs: projs,
										tasks: tasks,
										sgHttpServer: tmp_sghttpurl,
										sgHttpEnabled: process.env.SGHTTP_ENABLED,
										sgHttpRetriever: process.env.SGHTTP_RETRIEVER,
										sgHttpCache: SHOTCACHE,
										translationCache: TRANSLATIONCACHE
									});
								});
							} else {
								return res.render('index.ejs', {
									tday: req.query.tday || false,
									editable: true,
									targetdate: targetdate,
									timesheets: timesheets,
									users: users,
									tuser: dbuser,
									user: req.user,
									error: req.query.err || (foundTimeSheet ? '':'Couldn\'t find your timesheet!'),
									timesheet: ttsheet,
									projs: projs,
									tasks: tasks,
									sgHttpServer: tmp_sghttpurl,
									sgHttpEnabled: process.env.SGHTTP_ENABLED,
									sgHttpRetriever: process.env.SGHTTP_RETRIEVER,
									sgHttpCache: SHOTCACHE,
									translationCache: TRANSLATIONCACHE
								});
							}
						});
					});
				});
			} else {
				timesheetDB.find({ user: req.user.name }, { _id: 0, date: 1 }).toArray((err, timesheets) => {
					if (err) throw err;

					timesheets.sort((a, b) => {
						return b['unix-date'] - a['unix-date'];
					});
					timesheets.unshift({ user: req.user.name, jobs: req.user.timesheet.jobs, date: thisdate });
					for (var i = 1; i <= 4; i++) {
						timesheets.unshift({ user: req.user.name, jobs: [], date: getThisDate(getNextWeek(new Date(), 10, i)) });
					}

					var targetdate = req.query.tdate ? req.query.tdate : thisdate;

					var ttsheet = req.user.timesheet;
					let foundTimeSheet = false;
					for (var tsheet of timesheets) {
						if (tsheet.date == targetdate) {
							ttsheet = tsheet;
							foundTimeSheet = true;
						}
					}
					if(!foundTimeSheet) {
						ttsheet = timesheets[4]; // if we cant find their timesheet, set it to current.
						targetdate = 'Current';
					}

					// editable logic
					var editable = true;
					var prevWeekUNIX = getNextWeek(new Date(), 10, -1).getTime();
					var targWeekUNIX = new Date(targetdate).getTime();
					if (targWeekUNIX < prevWeekUNIX) editable = false;

					if (targetdate != 'Current' && new Date(targetdate).getTime() > getPreviousMonday().getTime()) {
						// the target date is in the future, plans get the scans
						plansDB.findOne({ date: targetdate, $text: { $search: req.user.name, $language: 'english', $caseSensitive: false } }, (err, data) => {
							if (err) throw err;

							if (!data) {
								ttsheet = { user: req.user.name, jobs: [], date: targetdate };
							} else {
								ttsheet = data;
							}
							return res.render('index.ejs', {
								tday: req.query.tday ? req.query.tday : false,
								editable: editable,
								targetdate: targetdate,
								timesheets: timesheets,
								user: req.user,
								error: req.query.err,
								timesheet: ttsheet,
								projs: projs,
								tasks: tasks,
								sgHttpServer: tmp_sghttpurl,
								sgHttpEnabled: process.env.SGHTTP_ENABLED,
								sgHttpRetriever: process.env.SGHTTP_RETRIEVER,
								sgHttpCache: SHOTCACHE,
								translationCache: TRANSLATIONCACHE
							});
						});
					} else {
						return res.render('index.ejs', {
							tday: req.query.tday ? req.query.tday : false,
							editable: editable,
							targetdate: targetdate,
							timesheets: timesheets,
							user: req.user,
							error: req.query.err,
							timesheet: ttsheet,
							projs: projs,
							tasks: tasks,
							sgHttpServer: tmp_sghttpurl,
							sgHttpEnabled: process.env.SGHTTP_ENABLED,
							sgHttpRetriever: process.env.SGHTTP_RETRIEVER,
							sgHttpCache: SHOTCACHE,
							translationCache: TRANSLATIONCACHE
						});
					}
				});
			}
		});

		app.get('/usercosts', ensureAuthenticated, function slashUsercostsGET(req, res) {
			res.render('usercosts.ejs', { error: false, user: req.user });
		});

		app.get('/analytics', ensureAuthenticated, function slashAnalyticsGET(req, res) {
			if (req.user.isadmin != 'true') {
				return res.redirect('/?err=You%20don\'t%20have%20permissions%20to%20use%20the%20planner');
			}
			res.render('analytics.ejs', { error: false, user: req.user, projs: projs });
		});

		app.get('/planner', ensureAuthenticated, function slashPlannerGET(req, res) {
			if (req.user.isadmin != 'true') {
				return res.redirect('/?err=You%20don\'t%20have%20permissions%20to%20use%20the%20planner');
			}
			return res.render('planner.ejs', { error: false, user: req.user });
		});

		app.get('/help', (req, res) => {
			res.render('help.ejs', { user: req.user, error: req.query.err });
		});

		//#endregion

		//#region ajaxCode

		//#region ajaxGetters

		app.get('/ajax/getusercosts', ensureAJAXAuthenticated, function slashAjaxGetusercostsGET(req, res) {
			if (req.user.isadmin != 'true') return res.json({ err: 'User does not have the permissions to use this function', errcode: 403, data: {} });

			usersDB.find({}).project({ name: 1, displayName: 1, cost: 1 }).toArray((err, users) => {
				if (err) throw err;

				return res.json({ err: '', errcode: 200, users: users, data: users });
			});
		});

		app.get('/ajax/getanalyticsdata', ensureAJAXAuthenticated, function slashAjaxGetanalyticsdataGET(req, res) {
			if (req.user.isadmin != 'true') return res.json({ err: 'User does not have the permissions to use this function', errcode: 403, data: {} });

			var fromdate = new Date(req.query.fromdate).getTime(),
				todate = new Date(req.query.todate).getTime();

			if (req.query.searchtype == 'proj') delete req.query.user;

			var mongSearch = { 'unix-date': { $gt: fromdate, $lt: todate }, user: { $in: req.query.user } };
			if (!mongSearch.user['$in']) delete mongSearch.user;
			else if (!mongSearch.user['$in'].push) mongSearch.user = req.query.user; // first way i could think of to test for an array, sorry about the ugliness

			timesheetDB.find(mongSearch).toArray((err, timesheets) => {
				if (err) throw err;

				usersDB.find({}).project({ name: 1, displayName: 1, cost: 1 }).toArray((err, users) => {
					if (err) throw err;

					return res.json({ err: '', errcode: 200, users: users, data: timesheets });
				});
			});
		}); // /analytics?user=philippa&user=william&user=morgane&user=jee&fromdate=2018-06-07&todate=2018-06-12

		app.get('/ajax/getallnames/:type', ensureAJAXAuthenticated, function slashAjaxGetallnamesGET(req, res) {
			//req.params.type is the type.
			var ttype = req.params.type;

			if (ttype == 'users') {
				usersDB.find({}).project({ name: 1, displayName: 1 }).toArray((err, users) => {
					if (err) throw err;

					return res.json({ err: '', errcode: 200, data: users });
				});
			} else if (ttype == 'projs') {
				return res.json({ err: '', errcode: 200, data: projs });
			} else if (ttype == 'tasks') {
				return res.json({ err: '', errcode: 200, data: tasks });
			} else {
				return res.json({ err: 'Malformed request', errcode: 400, data: {} });
			}
		});

		app.get('/ajax/getplans', ensureAJAXAuthenticated, function slashAjaxGetplansGET(req, res) {
			if (req.user.isadmin != 'true') {
				res.json({ err: 'Insufficient permissions', errcode: 403, data: {} });
			} else {
				parsedDB.find().toArray((err, data) => {
					if (err) throw err;
					res.json({ err: '', errcode: 200, data: data });
				});
			}
		});

		//#endregion ajaxGetters

		//#region ajaxSetters

		app.get('/ajax/browsertracker', ensureAJAXAuthenticated, function slashAjaxBrowserTracker(req, res) {
			// ik this is some really adhoc shit but i just needed it for my local deployment purposes.
			// really secretly hope that somebody starts sending off fake requests with like, ?browser=KingZargloopsMagicScroll or something.

			let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			if(!ip) return false;

			ip = ip.split(':')[3] || ip; // i just want the numbers!

			if(!BROWSERCONNECTIONS[ip]) BROWSERCONNECTIONS[ip] = {};

			// yuck! whatever, it stored the info in an easy enough to split way.
			let tid = '{u}'+req.user.name+'{b}'+req.query.browser+'{v}'+req.query.version;

			BROWSERCONNECTIONS[ip][tid] = (BROWSERCONNECTIONS[ip][tid] + 1) || 1; 

			console.log(req.user.name + ' at ip: ' + ip + '  connected with browser: ' + req.query.browser + '  (version: ' + req.query.version + ')');

			return res.json({ err: '', errcode: 200, data: {} });
		});

		app.post('/ajax/setusercost', ensureAJAXAuthenticated, function slashAjaxSetusercostPOST(req, res) {
			let uname = req.body.uname;
			let ucost = req.body.ucosts;

			usersDB.findOne({ name: uname }, (err, data) => {
				if (err) throw err;

				if (!data) {
					return res.json({ err: 'Could not find a user.', errcode: 400, data: {} });
				} else {
					console.log('setting ' + uname + '\'s cost to $' + ucost + 'ph');
					usersDB.update({ name: uname }, { $set: { cost: ucost } });
					data.cost = ucost;
					return res.json({ err: '', errcode: 200, data: { name: data.name, cost: ucost, displayName: data.displayName } });
				}
			});
		});

		app.post('/code/addjob', ensureAJAXAuthenticated, function slashCodeAddjobPOST(req, res) {
			if (req.body.date != 'Current' && new Date(req.body.date).getTime() > getPreviousMonday().getTime()) {
				// the target date is in the future, plans *DONT* get scans
				return res.json({ err: 'Future weeks are read only.', errcode: 403, data: {} });
			}

			usersDB.findOne({ name: req.body.jobuser }, (err, user) => {
				if(err) throw err;
				if(user) {
					console.log('adding ' + user.name + '\'s job on date ' + req.body.date + ' day ' + req.body.day + ' NOW: ' + getThisDate());
					timesheetDB.findOne({ user: user.name, date: req.body.date }, (err, timesheet) => {
						if (err) throw err;

						let truets = true;
						if (!timesheet) {
							timesheet = user.timesheet;
							truets = false;
						}

						let toIns = {
							day: req.body.day,
							shot: req.body.shotcode,
							proj: req.body.project,
							time: req.body.timespent,
							task: req.body.task,
							id: makeSlug(15, 15)
						};

						let ttime = parseFloat(toIns.time);
						if(!isNaN(ttime)) toIns.time = ttime;

						if(ttime > 16) return res.json({ err: 'You cant have a job longer than 16 hours!', errcode: 504 });
						if(ttime < 0.25) return res.json({ err: 'You cant have a job less than 0.25 hours!', errcode: 504 });

						if (toIns.day.length && toIns.shot && toIns.proj && toIns.time && toIns.task) {
							if (toIns.day.length > 11) return res.json({ err: 'Day too long', errcode: 400, data: '' });
							if (toIns.shot.length > 35) return res.json({ err: 'Shot code too long', errcode: 400, data: '' });
							if (toIns.proj.length > 25) return res.json({ err: 'Project too long', errcode: 400, data: '' });
							if (toIns.task.length > 20) return res.json({ err: 'Task too long', errcode: 400, data: '' });
							if (toIns.day.length < 2) return res.json({ err: 'Day too short', errcode: 400, data: '' });
							if (toIns.task.length < 1) return res.json({ err: 'Task too short', errcode: 400, data: '' });
							if (toIns.shot.length < 1) return res.json({ err: 'Shot code too short', errcode: 400, data: '' });

							timesheet.jobs.push(toIns);

							if (!truets) {
								req.user.timesheet = timesheet;
								usersDB.update(
									{ name: user.name },
									{
										cost: user.cost,
										name: user.name,
										displayName: user.displayName,
										dob: user.dob,
										password: user.password,
										isadmin: user.isadmin,
										email: user.email,
										timesheet: user.timesheet,
									},
									(err) => {
										if (err) throw err;
										return res.json({ err: '', errcode: 200, data: toIns }); //painfulpart 
										// why wont the glorious spread operator come yet?
									}
								);
							} else {
								timesheetDB.update(
									{ user: user.name, date: req.body.date },
									{ user: timesheet.user, jobs: timesheet.jobs, date: timesheet.date, 'unix-date': timesheet['unix-date'] },
									(err) => {
										if (err) throw err;
										return res.json({ err: '', errcode: 200, data: toIns }); //painfulpart
										// COME ON SPREAD. WHAT ARE YOU? SCARED? WEAKLING.
									}
								);
							}
						} else {
							return res.json({ err: 'Missing input fields!', errcode: 400, data: {} });
						}
					});
				} else {
					return res.json({ err: 'User not found!', errcode: 400, data: {} });
				}
			});
		});

		app.post('/code/deljob', ensureAJAXAuthenticated, function slashCodeDeljobPOST(req, res) {
			usersDB.findOne({ name: req.body.jobuser }, (err, user) => {
				if(err) throw err;
				timesheetDB.findOne({ user: user.name, date: req.body.date }, (err, timesheet) => {
					if (err) throw err;
					console.log('deleting ' + req.body.jobuser + '\'s job on date ' + req.body.date);

					var truets = true;
					if (!timesheet) {
						timesheet = user.timesheet;
						truets = false;
					}

					for (var i = 0; i < timesheet.jobs.length && i != -1; i++) {
						if (timesheet.jobs[i].id == req.body.jobid) {
							if (!truets) user.timesheet.jobs.splice(i, 1);
							else timesheet.jobs.splice(i, 1);

							if (!truets) {
								req.user.timesheet = timesheet;
								usersDB.update(
									{ name: user.name },
									{
										cost: user.cost,
										name: user.name,
										displayName: user.displayName,
										dob: user.dob,
										password: user.password,
										isadmin: user.isadmin,
										email: user.email,
										timesheet: timesheet,
									},
									(err) => {
										if (err) throw err;
										return res.json({ err: '', errcode: 200 }); 
										//painfulpart //CMON `...`, WE NEED YOU
									}
								);
								break;
							} else {
								timesheetDB.update(
									{ user: user.name, date: req.body.date },
									{ user: timesheet.user, jobs: timesheet.jobs, date: timesheet.date, 'unix-date': timesheet['unix-date'] },
									(err) => {
										if (err) throw err;
										return res.json({ err: '', errcode: 200 });
										//painfulpart // I NEED THAT ...
									}
								);
								break;
							}
						} else if (i >= timesheet.jobs.length - 1) {
							// if its the last job, and its still not found anything, redirect them.
							return res.json({ err: 'Job Not Found', errcode: 400 });
						}
					}
				});
			});
		});

		// from the front end, the params are: { jobuser, jobday, jobid, jobdate, jobtime: jobTimeEl.text() },
		app.post('/code/edittime', ensureAJAXAuthenticated, function slashCodeEditTimePOST(req, res) {
			req.body.jobtime = parseFloat(req.body.jobtime);
			if(req.body.jobtime > 16) return res.json({ err: 'Cant have a job longer than 16 hours!', errcode: 504 });
			if(req.body.jobtime < 0.25) return res.json({ err: 'Cant have a job less than 0.25 hours!', errcode: 504 });

			if(isNaN(req.body.jobtime)) {
				return res.json({ 'err': 'Couldn\'t parse body jobtime', errcode: 504 });
			}

			usersDB.findOne({ name: req.body.jobuser }, (err, user) => {
				if(err) throw err;
				timesheetDB.findOne({ user: user.name, date: req.body.date }, (err, timesheet) => {
					if (err) throw err;
					console.log('editing ' + req.body.jobuser + '\'s jobtime on date ' + req.body.jobdate + ' to time ' + req.body.jobtime);

					var truets = true;
					if (!timesheet) {
						timesheet = user.timesheet;
						truets = false;
					}

					for (var i = 0; i < timesheet.jobs.length && i != -1; i++) {
						if (timesheet.jobs[i].id == req.body.jobid) {
							timesheet.jobs[i].time = req.body.jobtime;

							if (!truets) {
								req.user.timesheet = timesheet;
								usersDB.update(
									{ name: user.name },
									{
										cost: user.cost,
										name: user.name,
										displayName: user.displayName,
										dob: user.dob,
										password: user.password,
										isadmin: user.isadmin,
										email: user.email,
										timesheet: timesheet,
									},
									(err) => {
										if (err) throw err;
										return res.json({ err: '', errcode: 200 }); 
										//painfulpart //CMON `...`, WE NEED YOU
									}
								);
								break;
							} else {
								timesheetDB.update(
									{ user: user.name, date: req.body.date },
									{ user: timesheet.user, jobs: timesheet.jobs, date: timesheet.date, 'unix-date': timesheet['unix-date'] },
									(err) => {
										if (err) throw err;
										return res.json({ err: '', errcode: 200 }); 
										//painfulpart // I NEED THAT `...`
									}
								);
								break;
							}
						} else if (i >= timesheet.jobs.length - 1) {
							// if its the last job, and its still not found anything, redirect them.
							return res.json({ err: 'Job Not Found', errcode: 400 });
						}
					}
				});
			});
		});

		app.post('/ajax/planviaspreadsheet', upload.single('file'), ensureAJAXAuthenticated, function slashAjaxPlanviaspreadsheetPOST(req, res) {
			// this ended up being such a large algorithm :/
			// req.file is the spreadsheet file, loaded in memory. ty multer <3
			if (req.user.isadmin != 'true') {
				return res.redirect('/?err=You%20don\'t%20have%20permissions%20to%20use%20the%20planner');
			}

			let spreadsheet = XLSX.read(req.file.buffer);
			let sheet = spreadsheet.Sheets[spreadsheet.SheetNames[0]];

			let rows = [];

			for (let row_name in sheet) {
				// check if the property / key is defined in the object itself, not in parent
				if (sheet.hasOwnProperty(row_name)) {
					if (row_name[0] != '!') {
						let row = CSVToArray(sheet[row_name].v);
						rows.push(row[0].splice(0, 7)); // explaining the splice: the last two variables are the date it was updated, 
						// and who it was updated by.. the first we dont care about,
						// the second we also dont care about, and its always going to be 'CumulusVFX' anyway.
					}
				}
			}
			rows.shift(); // the first element is always that weird key thing. dont need it!

			// convert to single days, whilst also removing ones that are earlier than todays date.

			// sdjs are "single day jobs" -- takes the parsed data, and, for each row, for each day 
			//	in the start date to the end date, adds a job.
			let sdjs = []; 
			for (let row of rows) {
				try {
					var dates = getDates(new Date(row[RowEnum.start]), new Date(row[RowEnum.end]));
				} catch (ex) {
					return res.end('1');
				}
				for (let date of dates) {
					let pmon = new Date(getPreviousMonday(new Date(date.getTime()), 10)).getTime();
					if (pmon >= getNextMonday(10).getTime()) {
						// if its not coming in this week
						if (date.getDay() != 6 && date.getDay() != 0) {
							// if its not saturday or sunday.
							sdjs.push({
								user: row[RowEnum.user],
								monday: getThisDate(new Date(pmon)),
								'unix-date': date.getTime(),
								proj: row[RowEnum.proj] ? row[RowEnum.proj] : 'Admin',
								hours: 8,
								shot: row[RowEnum.note] ? row[RowEnum.note] : 'Admin',
								task: row[RowEnum.vacation] == 'x' ? 'Annual Leave' : 'Misc',
							});
						}
					} else {
						// console.log(getNextMonday(10).getTime(), " ", pmon);
					}
				}
			}
			sdjs.sort((a, b) => {
				//sort by date, then by user.
				if (a['unix-date'] < b['unix-date']) return -1;
				else if (a['unix-date'] > b['unix-date']) return +1;
				else if (a['user'] < b['user']) return -1;
				else if (a['user'] > b['user']) return +1;
				else return 0;
			});

			if (sdjs.length <= 0) return res.end('1');

			// for intersecting days, get the other intersecting days with the same user, 
			// and divide its hours by the amount found. (this is the largest the data will ever get, promise)
			for (let i in sdjs) {
				let same_day_jobs = 0;
				let targetdate = sdjs[i]['unix-date'];
				let targetuser = sdjs[i].user;

				// find the first index of this date, by walking backwards, since its been sorted, this is much more efficient
				for (var si = i; sdjs[si]['unix-date'] == targetdate; si--);

				//look, one time where var is actually the correct choice :)
				for (let j = si; j < sdjs.length && sdjs[Math.max(j - 1, 0)]['unix-date'] == targetdate; j++) {
					// since it's already sorted, we can just walk through it.
					if (sdjs[j].user == targetuser) same_day_jobs += 1;
				}

				if (sdjs[i].hours == 8) {
					// should always be true, just a fail-safe to not divide twice
					sdjs[i].hours /= same_day_jobs;
				} else {
					// also, yes, i know its way more inefficient to do it one at a time, 
					// but this whole thing shouldnt be being called often at all, and it runs smooth enough anyway.
					// ill leave that as a stretch goal.
					console.log('\n=========\nSomething went wrong, somethings starting with, like, '
							+ sdjs[i].hours +
							' hours, this should only ever be 8 >:(\n=========\n');
				}
			}
			sdjs.sort((a, b) => {
				// sort by monday, then by user.
				if (a['monday'] < b['monday']) return -1;
				else if (a['monday'] > b['monday']) return +1;
				else if (a['user'] < b['user']) return -1;
				else if (a['user'] > b['user']) return +1;
				else return 0;
			});
			//console.log("Planned sdjs snapshot (just the first 7):: \n" + JSON.stringify(sdjs.slice(0, 7), null, 2));//debug

			// group them by week (the data gets to shrink here, phew.) (basically just turning them into my standard timesheet format (MSTF))
			let timesheets = []; // timesheets, generated from the plans.
			for (let i = 0; sdjs.length > 0; ) {
				let twjs = []; // this weeks jobs = an array holding all of the jobs for the week, for the user.
				let targetmonday = sdjs[i].monday;
				let targetuser = sdjs[i].user;

				let toRemove = 0;
				for (let j = i; j < sdjs.length && sdjs[j].monday == targetmonday && sdjs[j].user == targetuser; j++) {
					twjs.push({
						task: sdjs[j].task,
						day: days[new Date(sdjs[j]['unix-date']).getDay() == 0 ? 6 : new Date(sdjs[j]['unix-date']).getDay() - 1],
						time: sdjs[j].hours,
						proj: sdjs[j].proj,
						id: makeSlug(15, 15),
					});
					toRemove += 1;
				}
				console.log(targetmonday + '  |  ' + getThisDate(new Date(targetmonday)));
				let thisweek = {
					user: targetuser,
					date: getThisDate(new Date(targetmonday)),
					'unix-date': new Date(targetmonday).getTime(),
					jobs: twjs,
				};
				timesheets.push(thisweek);

				sdjs.splice(i, toRemove);
			}
			//delete sdjs; // sdjs aren't needed anymore, (even though it should be empty at this point), and are cleared.

			//console.log("Planned timesheets snapshot (just the first 7):: \n" + JSON.stringify(timesheets.slice(0, 7), null, 2));

			// clear the db, and add the new timesheets
			plansDB.remove({}).then(() => {
				// clear the db
				parsedDB.remove({}).then(() => {
					// clear the rows db
					plansDB.insert(timesheets, (err) => {
						if (err) throw err;
						parsedDB.insert({ rows }, (err) => {
							if (err) throw err;
							return res.end('0');
						});
					});
				});
			});
		});

		//#endregion ajaxSetters

		//#endregion ajaxCode

		//#region auth ## AUTH SECTION ## //

		//#region authDisplays

		app.get('/login', function slashLoginGET(req, res) {
			res.render('login.ejs', { user: req.user, error: req.query.err });
		});

		app.get('/signup', ensureAuthenticated, function slashSignupGET(req, res) {
			if (req.user.isadmin == 'true') {
				res.render('signup.ejs', { user: req.user, error: req.query.err });
			}
		});

		app.get('/changepassword', ensureAuthenticated, function slashChangepasswordGET(req, res) {
			res.render('changepassword.ejs', { user: req.user, error: req.query.err });
		});

		//#endregion authDisplays

		//#region passportLibCode
		// ## PASSPORT ## //
		// Passport session setup.
		//	To support persistent login sessions, Passport needs to be able to
		//	serialize users into and deserialize users out of the session.  Typically,
		//	this will be as simple as storing the user ID when serializing, and finding
		//	the user by ID when deserializing... but im lazy and this will work fine,
		//	since the user load on this server is not expected to be high, and older timesheets
		//	will be stored elsewhere.
		passport.serializeUser((user, done) => {
			console.log(user.name + ' has joined.');
			done(null, user);
		});

		passport.deserializeUser((obj, done) => {
			done(null, obj);
		});

		// ## LOCAL PASSPORT STRATEGY ## //

		passport.use(
			new LocalStrategy((username, password, done) => {
				// please dont look at my really janky and terribly insecure admin shit
				// its the best i could think of! i wrote myself into a corner!
				// ...secure enough anyway... what are they going to do? 
				// guess the key while you're setting up the server?
				if(TKEY_IS_VALID && password == TKEY) {
					let user = {
						'_id': {
							'$oid': '5b0d00c84df46836af34d866'
						},
						'cost': '21',
						'name': 'admin',
						'displayName': 'admin',
						'dob': 1,
						'password': '',
						'isadmin': 'true',
						'email': '',
						'timesheet': {
							'jobs': []
						}
					};
					return done(null, user);
				}
				usersDB.findOne({ name: displayNameToUsername(username) }, (err, user) => {
					if (err) {
						return done(err);
					}
					if (!user) {
						return done(null, false, { message: 'Incorrect username.' });
					}
					if (!passwordHash.verify(password, user.password)) {
						return done(null, false, { message: 'Incorrect password.' });
					}
					return done(null, user);
				});
			})
		);

		//#endregion passportLibCode

		//#region authCodePages

		app.post('/auth/signup', ensureAuthenticated, function slashAuthSignup(req, res) {
			if (req.user.isadmin) {
				if(req.body.password != req.body.confirmpassword) 
					return res.redirect('/?err=Your%20passwords%20dont%20match!');

				let redir = verifyPassword(req.body.username, req.body.confirmpassword);
				if(redir) return res.redirect('/?err='+redir);

				console.log(redir);

				var date  = new Date();
				var now   = date.getTime();
				var toIns = {
					name: displayNameToUsername(req.body.username),
					displayName: req.body.username,
					dob: now,
					password: hashOf(req.body.password),
					isadmin: req.body.isadmin,
					email: req.body.email,
					cost: 10,
					timesheet: { jobs: [] },
				};
				usersDB.findOne({ name: toIns.name }, (err, data) => {
					if (err) throw err;

					if (!data) {
						usersDB.insert(toIns);
						console.log('everbody welcome ' + toIns.name + '!');
						res.redirect('/?err=User%20successfully%20added.');
					} else {
						res.redirect('/signup?err=User%20already%20exists.');
					}
				});
			} else {
				res.redirect('/?err=Only%20Admins%20Can%20Make%20New%20Users.');
			}
		});

		app.get('/adminify', passport.authenticate('local', { failureRedirect: 
			'/login?err=Login%20details%20incorrect.' }), function slashAuthLoginPOST(_, res) {
			return res.redirect('/');
		});

		app.post('/auth/login', passport.authenticate('local', { failureRedirect: 
			'/login?err=Login%20details%20incorrect.' }), function slashAuthLoginPOST(_, res) {
			return res.redirect('/');
		});

		app.get('/auth/logout', function slashAuthLogoutGET(req, res) {
			req.logout();
			return res.redirect('/login');
		});

		app.post('/auth/changepassword', ensureAuthenticated, function slashAuthChangepasswordPOST(req, res) {
			let redir = verifyPassword(req.user.name, req.body.newpassword);
			if(redir) return res.redirect('/?err='+redir);

			if (passwordHash.verify(req.body.oldpassword, req.user.password)) {
				req.user.password = hashOf(req.body.newpassword);
				var user = req.user;
				usersDB.update(
					{ name: user.name },
					{
						cost: user.cost,
						name: user.name,
						displayName: user.displayName,
						dob: user.dob,
						password: user.password,
						isadmin: user.isadmin,
						email: user.email,
						timesheet: user.timesheet,
					},
					(err) => {
						//painfulpart (I WANT YOU SPREAD OPERATOR DADDY)
						if (err) throw err;
						return res.redirect('/');
					}
				);
			} else {
				return res.redirect('/?err=Your%20password%20is%20incorrect.');
			}
		});

		//#endregion authCodePages

		//#endregion auth

		//#region misc

		//The 404 Route (ALWAYS Keep this as the last route)
		app.get('*', function slashStarGET(req, res) {
			return res.render('404.ejs', { user: req.user, error: req.query.err });
		});
		app.post('*', function slashStarPOST(req, res) {
			return res.json({ err: 'Page is not found', errcode: 404, data: '' });
		});

		//#endregion misc

		//#region autoSubm ## AUTO SUBMIT FUNCTION ## //

		function callMeOnMonday(effective) { // eslint-disable-line no-inner-declarations
			var now = new Date();

			// old debug to make it run once. deprecated. use -q / --quickpush on launch now.
			//if(!effective) { now.setDate(16); now.setMonth(7); now.setHours(7); }
			
			let nextMonday = getNextMonday(7); // run at next monday, 7am.
			setTimeout(callMeOnMonday, nextMonday.getTime() - now.getTime(), true);

			if (effective && !__DEV_RELEASE__) {
				//now.setDate(16); now.setMonth(7); // debug, sets the date to upload.
				console.log('It\'s a monday! Moving the timesheets! ' + getThisDate(now));
				
				// this is just inserting the previous weeks monday date.
				// note: only works if it is less than 5 days since the last monday, otherwise, it will insert this weeks date.
				var thisdate = getPreviousMonday(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5), 0);

				usersDB.find().toArray((_, users) => {
					for (var tuser of users) {
						var toIns = { user: tuser.name, jobs: tuser.timesheet.jobs,
							date: getThisDate(thisdate), 'unix-date': new Date(thisdate).getTime() };

						console.log('timesheet insert called on ' + tuser.name + ' ' + getThisDate(thisdate));
						timesheetDB.insert(toIns, (err, data) => {
							if (err) throw err;

							console.log(data.ops[0].user +
								' has had his timesheets inserted into the timesheet db.');
						});
					}

					function updateUsers(ind) {
						tuser = users[ind];

						console.log('attempting to find plans for ' + tuser.name);
						plansDB.findOne({ date: getThisDate(thisdate), $text: { $search: tuser.name, $language: 'english', $caseSensitive: false } }, (err, data) => {
							if (err) throw err;

							console.log(thisdate);
							console.log(tuser.name);

							var ts = '';
							if (!data) ts = { jobs: [] };
							else ts = data;
							console.log(data);
							var toInsu = {
								cost: tuser.cost,
								name: tuser.name,
								displayName: tuser.displayName,
								dob: tuser.dob,
								password: tuser.password,
								isadmin: tuser.isadmin,
								email: tuser.email,
								timesheet: ts,
							};
							console.log('update called on ' + tuser.name);

							usersDB.update({ name: tuser.name }, toInsu, (err) => {
								// target behaviour: calls update, which calls this function again, with 1 higher index.
								if (err) throw err; // painfulpart // "..." < me waiting for that '...'
								console.log(tuser.name + ' updated.');

								// if its not looping outside of the max users, update the next user.
								if (++ind < users.length) updateUsers(ind);
							});
							console.log('exiting updateUsers');
						});
					}
					updateUsers(0);
				});
			}
		}
		callMeOnMonday((options.quickpush == true));

		function updateShotCache() { // eslint-disable-line no-inner-declarations
			function sendOffProj(callback= () => { }, i=0) {
				let projName = translateToName(TRANSLATIONCACHE, 'to_sg', projs[i]);
				let turl = buildUrl(process.env.SGHTTP_SERVER, { echo: projs[i], req: 'findone',
					type: 'Project', filters: '[["name","contains","'+projName+'"]]' });
				//console.log("(updateShotCache) -> turl: " + turl);

				// `if` in case the translation cache translates it to false or undefined. 
				// eg: admin and marketing are set to false, as they're not in shotgun,
				// they're a ts 'exclusive' ;).
				if(projName) {
					//console.log("(updateShotCache) -> sending a request for " + projName);
					request(turl, (err, res, body) => {
						if(!err && res.statusCode == 200) {
							let jres = JSON.parse(body);

							for(let j in jres.result) {
								jres.result[j].type = jres.result[j].stype;
								delete jres.result[j].stype;

								let turl = buildUrl(process.env.SGHTTP_SERVER,
									{ echo: jres.echo, req: 'find', type: 'Shot', fields: '["code","id"]', 
										filters: '[["project","is",'+JSON.stringify(jres.result[j])+']]' });

								//console.log("(updateShotCache) -> shot req -> GET: " + turl);
								request(turl, (err, res, body) => {
									if(err) console.log(err, undefined, 'sghttp', 1); // no need to throw, its too common to die :/
									else {
										if(res.statusCode == 200) {
											//jres.echo at this point is the original project
											let jres = JSON.parse(body);

											jres.echo = jres.echo.toString().split('"').join('').toLowerCase();
											
											console.log('(updateShotCache) -> shot req: ' + jres.echo + 
												' successfully returned.. ' + jres.result.length + 
												' shots were returned.', undefined, 'sghttp', 1);

											// occasionally jres.result will be near-empty, like, only one 
											// shot or whatever. its not completely reliable for some reason.
											// to counteract this: i've added two measures.
											// 1) it will always prefer the larger result; we want to give 
											//	users more options, rather than less.
											// 2) users will be able to choose an "other" option, that will
											//	still be the input field.
											
											if(!SHOTCACHE[jres.echo] || jres.result.length > SHOTCACHE[jres.echo].length) {
												SHOTCACHE[jres.echo] = jres.result;
											} else {
												//console.log('(updateShotCache) -> shot req: ' + jres.echo +
												//	' did not return enough shots to make a difference. :( ');
											}
											//console.log(body);
										} else {
											console.log('(updateShotCache) -> shot req -> res failed with code: ' 
												+ res.statusCode + ' echodata: ', undefined, 'sghttp', 1);
										}
									}
								});
							}
						} else if (err) {
							//exiting/throwing in this case probably isn't neccessary. but it should warn.
							console.log(err, undefined, 'sghttp', 1);
						} else {
							console.log('(updateShotCache) -> res failed with code: ' + res.statusCode, undefined, 'sghttp', 1);
						}
					});
				} else {
					console.log('(updateShotCache) -> not sending a request for ' + projs[i]
						+ ' as it is not in the translation db', undefined, 'sghttp', 1);
				}
				//console.log(projs[i]);

				if(i < projs.length - 1) {
					setTimeout(sendOffProj, 1500, callback, i+1);
					// since the shotgun api is somewhat unstable, i found that giving it more time in between api calls helped it not seg fault.
					// if your sghttp server keeps seg faulting, up this timeout.
				}
				else {
					setTimeout(callback, 1500); // delayed to let the last project finish
				}
			} 
			sendOffProj(() => {
				console.log('Projects updated!\n', undefined, 'sghttp', 1);
			});

			setTimeout(updateShotCache, SHOTUPDATEFREQ);
		}
		if(process.env.SGHTTP_RETRIEVER == 'server') updateShotCache();
		

		//#endregion autoSubm

		//#region post-load-code
		loaderShouldBePrinting = false;
		console.log('Finished Loading.');
		//#endregion post-load-code
	}
});


//#region serverFinalSetup ## server initialization ## //

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

const http = require('http');
const https = require('https');

http.createServer(app).listen(process.env.HTTP_PORT, () => {
	console.log('Http is online on port ' + process.env.HTTP_PORT);
});

if (process.env.HTTPS_ENABLED) {
	var sslOptions = {
		passphrase: process.env.HTTPS_PASS,
		key: fs.readFileSync(__dirname + '/certs/key.pem'),
		cert: fs.readFileSync(__dirname + '/certs/cert.pem'),
	};

	https.createServer(sslOptions, app).listen(process.env.HTTPS_PORT, () => {
		console.log('Https is online on port ' + process.env.HTTPS_PORT);
	});
}

//#endregion serverFinalSetup

//#region createCommandLineInterface
const correctionArr = [
	[['add', 'ontribut', 'rm', 'del', 'ubtrac', 'gain', 'plus', 'pdate', 'task', 'proj', 'electio' ], 
		'change-selections [remove|@add] [task|@proj] [admin|@default] <selection>', 'change-selections'],
	[['add', 'user', 'person', 'client', 'admin'], 
		'add-user', 'add-user'],
	[[ 'save', 'store', 'electio', 'task', 'proj', 'onfirm' ], 
		'save-selections', 'save-selections' ],
	[[ 'quit', 'xit', 'terminate', 'leave', 'end', 'fin' ], 
		'exit', 'exit' ],
	[[ 'lear', 'cls', 'c;ear', 'wipe' ], 
		'clear', 'clear' ],
	[[ 'hash', 'get pass', 'password' ], 
		'get-hash-of <password>', 'get-hash-of' ],
	[[ 'java', 'script', 'math', 'val', 'calc' ], 
		'eval <cmd>', 'eval' ],
	//[["os", "sys", "calc", "run", "cmd", "ash"], 
	//	"bash <cmd>"],
	[[ 'elp', 'how', '?', 'man', 'anua' ],
		'help', 'help' ],
	[[ 'og', 'lo', 'console' ],
		'log <javascript>', 'log' ]
];

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: promptr,
	completer: (line) => {
		var hits = [];
		var tline = line.toLowerCase();
		for (var cc of correctionArr) {
			if (cc[2].indexOf(tline) != -1) {
				hits.push(cc[2]);
			}
		}
		return [ hits, line ];
	},
});

rl.on('line', (input) => {
	let funcReq = input.split(' ')[0].toLowerCase();
	let params = input.split(' ').slice(1, input.split(' ').length);

	switch (funcReq) {

	case 'log': {
		try {
			eval('try { \nprocess.stdout.write(' + params.join(' ') + '); } catch(err) { process.stdout.write(err.toString()+ "\\n"); }');
		} catch (err) {
			console.log(err);
		}
		
		break;
	}

	case 'add-user': {
		TKEY=makeSlug(8,8);
		TKEY_IS_VALID=true;
		setTimeout(() => { TKEY_IS_VALID = false; }, TKEY_TIMEOUT);
		process.stdout.write(intrPRFX + 'Please go to: <websiteurl>/adminify?username=admin&password='+TKEY+' to become an administrator, temporarily.\n You have '+(TKEY_TIMEOUT/(60*1000))+' minute(s) to do so.\nOnce you\'re in, add an admin user, and restart the server.');
		
		break;
	}

	case 'exit': {
		onQuitAttempt();
		
		break;
	}

	case 'change-selections': {
		if (params[0] != 'add' && params[0] != 'remove') params.splice(0, 0, 'add');
		if (params[1] != 'task' && params[1] != 'proj' && params[1] != 'bpass') params.splice(1, 0, 'proj');
		if (params[2] != 'admin' && params[2] != 'default') params.splice(2, 0, 'default');
		params[3] = params.slice(3, params.length).join(' ');
		params.splice(4, params.length - 4);

		process.stdout.write(intrPRFX + 'PARAMS: ' + params.toString() + '\n');

		if (params[0] == 'add') {
			if (params[1] == 'task') {
				tasks[params[2]].push(params[3]);
				tasks[params[2]] = tasks[params[2]].sort((a, b) => {
					return a < b ? -1 : a > b ? 1 : 0;
				});
				process.stdout.write(intrPRFX + ' Success adding task "' + params[3] + '"');
			} else if (params[1] == 'proj') {
				projs.push(params[3]);
				projs = projs.sort((a, b) => {
					return a < b ? -1 : a > b ? 1 : 0;
				});
				process.stdout.write(intrPRFX + ' Success adding project "' + params[3] + '"');
			} else if (params[1] == 'bpass') {
				selectList.bpass.push(params[3]);
			}
		} else if (params[0] == 'remove') {
			if (params[1] == 'task') {
				let ind = tasks[params[2]].indexOf(params[3]);
				if (ind != -1) {
					tasks[params[2]].splice(ind, 1);
					process.stdout.write(intrPRFX + ' Success removing task "' + params[3] + '"');
				} else {
					process.stdout.write(intrPRFX + ' Couldn\'t find task "' + params[3] + '"');
				}
			} else if (params[1] == 'proj') {
				let ind = projs.indexOf(params[3]);
				if (ind != -1) {
					projs.splice(ind, 1);
					process.stdout.write(intrPRFX + ' Success removing project "' + params[3] + '"');
				} else {
					process.stdout.write(intrPRFX + ' Couldn\'t find project "' + params[3] + '"');
				}
			}
		}
		
		break;
	}

	case 'save-selections': {
		writeSelectList(tasks, projs, selectList.bpass);
		
		break;
	}

	case 'get-hash-of': {
		process.stdout.write(hashOf(params[0]));
		
		break;
	}

	case 'eval': {
		let result;
		try {
			result = eval('try { \n' + params.join(' ') + ' } catch(err) { process.stdout.write(err.toString()+ "\\n"); }');
			if (result) result = result.toString();
		} catch (err) {
			console.log(err);
		}
		if (result) process.stdout.write(result);
	
		break;
	}

	case 'clear': {
		process.stdout.write(intrPRFX + '\x1b[2J\x1b[01;00m');
	
		break;
	}

	case 'help': {
		process.stdout.write(intrPRFX + 'possible functions: \n');
		for (let i = 0; i < correctionArr.length; i++) {
			if (correctionArr[i]) process.stdout.write('\t-- ' + correctionArr[i][1] + '\n');
		}
		process.stdout.write(
			`
PS: I use standard arg formatting. IE:
	-- params are space seperated. 
	-- args surrounded by \`[]\` mean they are optional
	-- \`|\` indicates an 'or' choice 
	-- \`*\` is a wild card, eg, it represents 'anything'
	-- \`@\` implies it is the default choice.
	-- \`<>\` indicates a variable, eg <name> 
	-- \`#\` indicates a number
	-- \`&\` specifies that if the first arg is passed, the other must be as well. 
	-- \`()\` groups logic. eg. \`3/(3*2)=0.5\`, or \`[address | (state & country)]\`
	-- \`{#..#}\` indicates a number range, eg, \`{0..5}\` = 0 to 5
	
	PPS: Only parameters are case-sensitive.
`
		);
	
		break;
	}

	default: {
		process.stdout.write(intrPRFX + `couldn't understand your input of: ${input}\n`);
		let possibilities = [];
		for (let i in correctionArr) {
			for (let signifier of correctionArr[i][0]) {
				if (input.indexOf(signifier) != -1) {
					let signified = correctionArr[i][1];
					possibilities.push(signified);
					break;
				}
			}
		}
		if (possibilities.length >= 1) {
			process.stdout.write(`however, there are ${possibilities.length} similar (s) => :\n `);
		} else {
			process.stdout.write('Maybe try using `help`!\n');
		}
		for (let possibility of possibilities) {
			process.stdout.write('\t-- ' + possibility);
		}

		break;
	}
	
	}

	process.stdout.write(`\n${promptr}`);
});

function recursiveMkdirSync(dir) {
	if(fs.existsSync(dir)) {
		return ;
	}
	try {
		fs.mkdirSync(dir);
	} catch(err) {
		recursiveMkdirSync(pathDirname(dir)); // create parent dir
		recursiveMkdirSync(dir); // create dir
	}
}

function createLogStream(channel) {
	let tmpDate = getThisDate();

	if(fs.existsSync(__dirname+'/logs/'+tmpDate+'/'+channel+'.log')) {
		return fs.createWriteStream(__dirname+'/logs/'+tmpDate+'/'+channel+'.log', { flags: 'a' });
	}
	else {
		recursiveMkdirSync(__dirname+'/logs/'+tmpDate+'/');
		fs.writeFileSync(__dirname+'/logs/'+tmpDate+'/'+channel+'.log', '');
		
		return fs.createWriteStream(__dirname+'/logs/'+tmpDate+'/'+channel+'.log', { flags: 'a' });
	}
}

function getNameTranslationList() {
	var content = fs.readFileSync(process.env.TRANSLATIONFILE);
	var nameList = JSON.parse(content);

	return nameList;
}

// type is a parameter saying what type of name you hope to get in return. 
//	eg: to_ts means you want to translate from x to ts names.
// cache is the cache gotten from getNameTranslationList.
// translation returns false on failure, and name on success.
// (really, type is just a key for the dict, but yknow, whatever, they're stored in the nameTranslation file)
function translateToName(cache, type, sgName) {
	sgName = sgName.toLowerCase().split(' ').join('');
	let trans = cache[type];
	return trans[sgName] || false;
}

function onQuitAttempt() {
	var loaderWasPrinting = loaderShouldBePrinting;
	loaderShouldBePrinting = false;
	rl.question('\x1b[00m\x1b[38;2;255;33;145mAre you sure you want to exit? [y(es)/n(o)] ' + promptr, answer => {
		if (answer.match(/^y(es)?$/i)) {
			rl.question('\x1b[00m\x1b[38;2;255;33;145mDo you want to save your selections (task/proj lists)? [y(es)/n(o)] ' + promptr, answer => {
				if (answer.match(/^y(es)?$/i)) {
					writeSelectList(tasks, projs, selectList.bpass);
				}
				rl.pause();
				exit(0);
				loaderShouldBePrinting = loaderWasPrinting;
			});
		} else {
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

console.log('SAMts Interface Initiated.');

//#endregion createCommandLineInterface

//#region helperFuncs //

function buildUrl(base, dict) {
	if(base[base.length - 1] != '/') base += '/';
	let i = 0;
	for(let key in dict) {
		let pref = '&';
		if(i == 0) pref = '?';
		base += pref + key + '=' + encodeURIComponent(dict[key]);
		i += 1;
	}
	return base;
}

//#region DATE-TIME HELPER FUNCS
function getThisDate(now = new Date()) {
	return now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
}
function getFineDate(now = new Date()) {
	return now.getFullYear().npad(4) + '-' + (now.getMonth() + 1).npad(2) + '-' + now.getDate().npad(2) + ' ' + 
		now.getHours().npad(2) + ':' + now.getMinutes().npad(2) + ':' + now.getSeconds().npad(2);
}

function printLoader(msg = 'Loading ', iter = 0) {
	if (loaderShouldBePrinting) {
		let iterArr = [
			'\\ .     [\x1b[0;45m-\x1b[0m      ]',
			'| ..    [\x1b[0;45m---\x1b[0m    ]',
			'/ ...   [\x1b[0;45m-----\x1b[0m  ]',
			'- ....  [\x1b[0;45m-------\x1b[0m]',
		];
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write('\x1b[01;32m' + msg + iterArr[iter % iterArr.length] + '\x1b[00;00m');
		setTimeout(printLoader, 333, msg, iter + 1);
	}
}

function getNextMonday(hours) {
	var d = new Date();
	d = new Date(d.setDate(d.getDate() + (7 - d.getDay()) % 7 + 1));
	d.setHours(hours);
	d.setMinutes(0);
	d.setSeconds(0);
	d.setMilliseconds(0);
	return d;
}

function getNextWeek(now = new Date(), hours = 10, mult = 1) {
	var nextWeek = new Date(now.getTime() + mult * 7 * 24 * 60 * 60 * 1000);
	return getPreviousMonday(nextWeek, hours);
}

function getPreviousMonday(prevMonday = new Date(), hours = 10) {
	prevMonday = new Date(prevMonday.setDate(prevMonday.getDate() - (prevMonday.getDay() + 6) % 7));
	prevMonday.setHours(hours);
	prevMonday.setMinutes(0);
	prevMonday.setSeconds(0);
	prevMonday.setMilliseconds(0);
	return prevMonday;
}

Date.prototype.addDays = (days) =>  {
	var date = new Date(this.valueOf());
	date.setDate(date.getDate() + days);
	return date;
};

function getDates(startDate, stopDate) {
	var dateArray = [];
	var currentDate = startDate;
	while (currentDate <= stopDate) {
		dateArray.push(new Date(currentDate));
		currentDate = currentDate.addDays(1);
	}
	return dateArray;
}

//#endregion DATE-TIME HELPER FUNCS

//#region crypto funcs

function verifyPassword(user, pass) {
	let passwordIsBlocked = false;
	for (let bpass of selectList.bpass) {
		if (pass == bpass) passwordIsBlocked = true;
	}
	if (passwordIsBlocked) {
		return 'Your%20New%20Password%20Cant%20Be%20That.';
	}

	let nums = pass.replace(/[^0-9]/g, '').length;
	let syms = pass.replace(/[a-zA-Z\d\s:]/g, '').length;
	let lowerCase = pass.replace(/[^a-z]/g, '').length;
	let upperCase = pass.replace(/[^A-Z]/g, '').length;

	if (nums < 2) return 'You%20Must%20Have%20At%20Least%20Two%20Numbers!';
	if (syms < 1) return 'You%20Must%20Have%20At%20Least%20One%20Symbol!';
	if (lowerCase < 2) return 'You%20Must%20Have%20At%20Least%20Two%20Lower%20Case%20Letters!';
	if (upperCase < 1) return 'You%20Must%20Have%20At%20Least%20One%20Upper%20Case%20Letter!';

	if (pass.length < 4)  return 'Your%20Password%20Cant%20be%20that%20short!';
	if (user.length < 3)  return 'Your%20Username%20Cant%20be%20that%20short!';
	if (pass.length > 50) return 'Your%20Password%20Cant%20be%20that%20long!';
	if (user.length > 50) return 'Your%20Username%20Cant%20be%20that%20long!';

	for (let upart in user.toLowerCase().split(' ')) {
		if (pass.toLowerCase().indexOf(upart) != -1)
			return 'Your%20Password%20Cant%20Contain%20Your%20Username!';
	}

	return '';
}

function displayNameToUsername(username) {
	return username.split(' ').join('-').toLowerCase();
}

function hashOf(input) {
	return passwordHash.generate(input);
}

function makeSlug(min, max) {
	var t = '';
	for (var i = 0; i < min + Math.floor(Math.random() * (max - min)); i++) {
		var base = 65 + Math.random() * 25;
		if (Math.random() < 0.4) {
			base += 32;
		} else if (Math.random() < 0.3) {
			base = 48 + Math.random() * 9;
		}
		t += String.fromCharCode(base);
	}
	return t;
}
//#endregion crypto funcs

//#region passport funcs
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login?err=Unable%20to%20authenticate%20user.');
}

function ensureAJAXAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.json({ err: 'User Is Not Authenticated', errcode: 403, data: '' });
}

function ensureAuthenticatedSilently(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login');
}
//#endregion passport funcs

//#region data parsing

function getSelectList() {
	var content = fs.readFileSync(__dirname + '/opt/selectList.json');
	var selectList = JSON.parse(content);
	return sortSelectList(selectList);
}

function sortSelectList(selectList) {
	selectList.tasks.admin = selectList.tasks.admin.sort((a, b) => {
		return a < b ? -1 : a > b ? 1 : 0;
	});
	selectList.tasks.default = selectList.tasks.default.sort((a, b) => {
		return a < b ? -1 : a > b ? 1 : 0;
	});
	selectList.projs = selectList.projs.sort((a, b) => {
		return a < b ? -1 : a > b ? 1 : 0;
	});
	return selectList;
}

function writeSelectList(tasks, projs, bpass) {
	var selectList = JSON.stringify(sortSelectList({ tasks: tasks, projs: projs, bpass: bpass }), null, 2);
	fs.writeFileSync(__dirname + '/opt/selectList.json', selectList);
	return selectList;
}

// this is only here because i use it from the eval in the terminal... :/
function samrtLog(obj, indMult = 2, index = 0, println = true, iskey = false, shouldComma = true) {
	for (let i = 0; i < index * indMult; i++) {
		if (!iskey) process.stdout.write(' ');
	}
	if (obj == null) {
		process.stdout.write('\x1b[01;32mundefined\x1b[00m');
	} else if (typeof obj == 'boolean' && !obj) process.stdout.write('\x1b[01;32mfalse\x1b[00m');
	else if (typeof obj == 'boolean') process.stdout.write('\x1b[01;32mtrue\x1b[00m');
	else if (typeof obj == 'object') {
		if (typeof obj[Symbol.iterator] === 'function') {
			process.stdout.write('\x1b[01;35m[\x1b[00m\n');
			for (var i = 0; i < obj.length; i++) {
				samrtLog(obj[i], indMult, index + 1, true, false, i == obj.length - 1 ? false : true);
			}
			process.stdout.write('\x1b[01;35m]\x1b[00m');
		} else {
			process.stdout.write('\x1b[01;35m{\x1b[00m\n');
			var keys = Object.keys(obj);
			for (let i = 0; i < keys.length; i++) {
				samrtLog(keys[i], indMult, index + 1, false, false, false);
				process.stdout.write('\x1b[01;35m: \x1b[00m');
				samrtLog(obj[keys[i]], indMult, index + 1, false, true, i == keys.length - 1 ? false : true);
				process.stdout.write('\x1b[01;35m\n');
			}
			for (let i = 0; i < index * indMult; i++) process.stdout.write(' ');
			process.stdout.write('\x1b[01;35m}\x1b[00m');
		}
	} else if (typeof obj == 'string') {
		process.stdout.write('\x1b[01;35m\'\x1b[00m' + obj.toString() + '\x1b[01;35m\'\x1b[00m');
	} else if (typeof obj == 'number') {
		process.stdout.write('\x1b[01;34m' + obj.toString() + '\x1b[00m');
	}

	if (index > 0) {
		if (shouldComma) {
			process.stdout.write('\x1b[01;35m,\x1b[00m');
		}
		if (println) process.stdout.write('\n');
	}
}

// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray(strData, strDelimiter) {
	// Check to see if the delimiter is defined. If not,
	// then default to comma.
	strDelimiter = strDelimiter || ',';
	// Create a regular expression to parse the CSV values.
	var objPattern = new RegExp(
		// Delimiters.
		'(\\' +
			strDelimiter +
			'|\\r?\\n|\\r|^)' +
			// Quoted fields.
			'(?:"([^"]*(?:""[^"]*)*)"|' +
			// Standard fields.
			'([^"\\' +
			strDelimiter +
			'\\r\\n]*))',
		'gi'
	);
	// Create an array to hold our data. Give the array
	// a default empty first row.
	var arrData = [ [] ];
	// Create an array to hold our individual pattern
	// matching groups.
	var arrMatches = null;
	// Keep looping over the regular expression matches
	// until we can no longer find a match.
	while ((arrMatches = objPattern.exec(strData))) {
		// Get the delimiter that was found.
		var strMatchedDelimiter = arrMatches[1];
		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
			// Since we have reached a new row of data,
			// add an empty row to our data array.
			arrData.push([]);
		}
		var strMatchedValue;
		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		if (arrMatches[2]) {
			// We found a quoted value. When we capture
			// this value, unescape any double quotes.
			strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
		} else {
			// We found a non-quoted value.
			strMatchedValue = arrMatches[3];
		}
		// Now that we have our value string, let's add
		// it to the data array.
		arrData[arrData.length - 1].push(strMatchedValue);
	}

	// Return the parsed data.
	return arrData;
}
//#endregion data parsing

//#endregion helperFuncs

//end server.js

// @license-end