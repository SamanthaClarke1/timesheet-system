// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

// yeah, yeah, the whole idea of using ajax came in half way through development, so my code looks like spaghetti.
// but, yknow, whatever, i could go some pasta, so who's the real winner here?
// edit: i have eaten so much spaghetti that i've developed a gluten allergy

//#region initial declarations
let projCache = {};
let shotCache = {};

let rokytProgOpts, timers, currentProg;
if(IS_NODE) {
	rokytProgOpts = { // prog to trigger on, pretty names arr, tech values arr
		"nuke": {
			"pretty": ["Normal", "Assist", "X"],
			"tech": ["N", "A", "X"]
		}
	};
	currentProg = "nuke";
	timers = [];
	var {exec, spawn} = require('child_process');
}
//#endregion initial declarations

//#region initial binds
$(document).ready(function() {
	if(!IS_NODE) {
		$("#rokyt-launcher").toggle();
		$("#rokyt-hr").toggle();
	}

	$('.proj-inpc').each(function() { projCheckerFunc(this); });

	$('.btn-delj').each(delJobEvent); // bind a delete blocker to each delete-job button

	bindSubmitJobClickEvent();

	$('.proj-inpc').each(function() {
		$(this).change(function() { projCheckerFunc(this); });
	});

	$('.sub-nav-link').each(function() {
		// bind to the days as well
		$(this).click(function() {
			$('.proj-inpc').each(function() {
				var taskel = $(this).parent().parent().find('.task-inpc');
				if ($(this).val().toLowerCase() == 'admin') {
					updateTasks(fromSrv.tasks.admin, taskel);
				} else {
					updateTasks(fromSrv.tasks.default, taskel);
				}
			});
		});
	});

	if(IS_NODE) {
		bindRokytIcoClickEvents();
		fillRokytOpts($(".rokyt-ico.active"));
		$("#rokyt-launch-btn").bind('click', rokytLaunchClickEvent);
		setInterval(updateTimerDisplay, 20*1000); // once every 20 secs, update timer display (so it looks like they actually "tick" forward).

		if (typeof(Storage) === "undefined") {
			declareSupportMissing('web storage')
		} else {
			loadTimersFromSessionStorage();
		}
	}
});
//#endregion initial binds

//#region dropdown ajax

function makeShotSelect(shotel) {
	let sel =  `<select name="shotcode" class="col-12 no-pad-right shot-inpc">
					<option value="general">general</option>
					<!-- I'll be filled up with jquery, its okay :) -->
				</select>`;

	if (!$(shotel).is("select") && fromSrv.sgHttpEnabled) {
		$(shotel).replaceWith(sel);
	}
}

function makeShotInp(shotel) {
	let inp = `<input name="shotcode" placeholder="shot code" class="col-12 no-pad-right shot-inpc" required>`;

	if(!$(shotel).is("input") && fromSrv.sgHttpEnabled) {
		$(shotel).replaceWith(inp);
	}
}

function projCheckerFunc(projel) {
	let taskel = $(projel).parent().parent().find('.task-inpc');
	let shotel = $(projel).parent().parent().find('.shot-inpc');
	let tval   = $(projel).val().toLowerCase();

	if (tval == 'admin') {
		updateTasks(fromSrv.tasks.admin, taskel);
	} else {
		updateTasks(fromSrv.tasks.default, taskel);
	}

	if(fromSrv.sgHttpEnabled == 'true' && fromSrv.sgHttpRetriever == 'client') {
		if(tval == 'admin' || tval == 'marketing') {
			makeShotInp(shotel);
		} else {
			makeShotSelect(shotel);
			//console.log("projCheckerFunc",tval)
			if(!shotCache[tval]) {
				if(!projCache[tval]) {
					getProj(shotel, tval, onProjAJAXReturn);
				} else {
					getShots(shotel, tval, onShotAJAXReturn);
				}
			} else {
				updateShots(shotCache[tval], shotel);
			}
		}
	} else if(fromSrv.sgHttpEnabled == 'true' && fromSrv.sgHttpRetriever == 'server') {
		shotCache = fromSrv.sgHttpCache;
		console.log("attempting to update",tval);
		//console.log(shotCache[tval]);
		if(shotCache[tval] && shotCache[tval].length >= 1) {
			makeShotSelect(shotel);
			//setTimeout((tval) => {console.log("updating",tval);}, 250, tval);
			updateShots(shotCache[tval], shotel);
		} else {
			makeShotInp(shotel);
		}
	}
}

function onShotAJAXReturn(shotel, projName, data) {
	if(data) {
		shotCache[projName] = data;
		console.log("onShotAjaxReturn", projName);
		console.log("SHOTEL", $(shotel).html(''));
		updateShots(data, shotel);
	} else {
		console.log("Server returned empty data.");
	}
}

function onProjAJAXReturn(shotel, projName, data) {
	if(data) {
		projCache[projName] = data[0];
		console.log("onProjAjaxReturn", projCache[projName], projName);
		getShots(shotel, projName, onShotAJAXReturn);
	} else {
		console.log("Server returned empty data.");
	}
}

function getProj(shotel, projName, callback) {
	if(!projName || !callback) return false;

	let URL=fromSrv.sgHttpServer+"?req=find&limit=1&type=Project&fields=[%22name%22,%22id%22]&filters=[[%22name%22,%22contains%22,%22"+projName+"%22]]";
	console.log("getProj - GET: ", URL);
	
	$.ajax({
		url: URL,
		success: function(data) {
			if(data.errcode >= 300 || data.errcode < 200) {
				alert("Fatal error whilst looking for project\nERRCODE: " + data.errcode + "ERR: " + data.err);
				return false;
			} else {
				return callback(shotel, projName, data.result);
			}
		}
	});
}

function getShots(shotel, projName, callback) {
	let proj = projCache[projName];

	if(!proj || !callback) return false;
	let URL=fromSrv.sgHttpServer+"?req=find&fields=[%22code%22,%22id%22]&type=Shot&filters=[[%22project%22,%22is%22,%7B%22id%22:"+proj.id+",%20%22type%22:%22"+proj.stype+"%22%7D]]";
	console.log("getShots", URL);

	$.ajax({
		url: URL,
		success: function(data) {
			if(data.errcode >= 300 || data.errcode < 200) {
				alert("Fatal error whilst looking for project shots\nERRCODE: " + data.errcode + "  ERR: " + data.err);
				return false;
			} else {
				if(data.errcode != 200) console.log("Recoverable error whilst looking for project shots\nERRCODE " + data.errcode + "  ERR: " + data.err);
				return callback(shotel, projName, data.result);
			}
		}
	});
}

function updateShots(tshots, shotel) {
	//console.log(tshots.length,"shots found when updating");
	let htmlToIns = "<option value=\"general\">general</option>";
	for(let i in tshots) {
		htmlToIns += "<option value=\""+tshots[i].code+"\">"+tshots[i].code+"</option>";
	}
	$(shotel).css("background", "red !important").css("border", "4px solid red !important");
	shotel.empty()
	shotel.append(htmlToIns);
}

function updateTasks(ttasks, taskel) {
	var html = '';
	for (var task of ttasks) {
		html += '<option value="' + task + '">' + task + '</option>';
	}
	taskel.empty();
	taskel.append(html);
}
//#endregion dropdown ajax

//#region timetable edits
function bindDeleteBlocker(el) {
	el.parent().find('.btn-delj').each(delJobEvent); // bind a delete blocker to this el
}
function delJobEvent() {
	$(this).bind('click', function(e) {
		e.preventDefault(); // dont send off the form by visiting the page
		var parentForm = $(this).parent();
		var parentTable = $(this).parent().parent().parent().parent().parent().find('.job-table'); // thatsa lotta parents
		if (parentTable.length <= 0) parentTable = $(this).parent().parent().parent().parent().parent();
		var day = parentForm.find('.delj-day').val();
		
		parentForm.children('');
		$.post('/code/deljob', parentForm.serialize(), function(data) {
				// but use my js to send it off, it's async :)
				if (data.err == '') {
					var jobrow = parentForm.parent().parent();

					var offset = jobrow.find('.btn-delj').first().offset();
					var coords = {x: offset.left + 20, y: offset.top + 20};
					smokeflow.tune(coords).generate();
					smokeflow_timeline.replay();

					jobrow.addClass('shrinkme');

					setTimeout(function(jobrow, parentTable, day) {
							jobrow.remove(); // remove the job
							updateTotalWeekBar(parentTable);
							var total = updateTotalDayBar(parentTable); // update the total
							updateDayColor(day, total);
							updateShading(parentTable); // update the colors
						}, 700, jobrow, parentTable, day);
				} else {
					alert(data.err);
				}
			},
			'json'
		);
	});
}
function bindSubmitJobClickEvent() {
	$('.btn-inpc').each(function() {
		$(this).bind('click', submitJobClickEvent);
	});
}
function submitJobCallback(parentForm) {
	return function(data) {
		if (data.errcode == 200) {
			var srv = fromSrv;
			job = data.data;
			var tid = Math.floor(Math.random() * 1000000);
			var toIns = `
				<tr class="ts-row row no-gutters col-12 job-row shrinkme" id="tid-` + tid + `">
				<td class="col-3 job-proj">` + job.proj + `</td>
				<td class="col-3 job-shot">` + job.shot + `</td>
				<td class="col-3 job-task">` + job.task + `</td>
				<td class="col-2 job-time">` + job.time + `</td>
				<td class="col-1 job-del">
					<form action="/code/deljob" method="POST">
						<input name="jobuser" class="delj-user" value="` + (srv.userIsAdmin == 'true' ? srv.tuserName : srv.userName) + `" hidden />
						<input name="jobid" class="delj-id" value="` + job.id + `" hidden />
						<input name="day" class="delj-day" value="` + job.day + `" hidden />
						<input name="date" class="delj-date" value="` + srv.tdate + `" hidden />
						<button id="deljob-` + job.id + `" class="btn-delj" type="submit" style="color: #e75045;"` + (srv.editable == 'true' ? '' : ' disabled') + `> <i class="fa fa-trash" aria-hidden="true"></i></button>
					</form>
				</td>
			</tr>`;

			parentForm.parent().children('.job-table').each(function() {
				var tbody = $(this).children('tbody').first();
				tbody.append(toIns);

				var njob = $('#tid-' + tid);
				var coords = {x: njob.offset().left + 20, y: njob.offset().top + 20};
				sparkflow.tune(coords).generate();
				sparkflow_timeline.replay();

				var coordsr = {x: coords.x + njob.width(), y: coords.y};
				sparkflowr.tune(coordsr).generate();
				sparkflowr_timeline.replay();

				setTimeout(function(njob) { njob.removeClass('shrinkme'); }, 10, njob);

				bindDeleteBlocker($('#deljob-' + job.id));
				updateTotalWeekBar(tbody);
				var total = updateTotalDayBar($(this));
				updateDayColor(job.day, total);
				updateShading(tbody);
			});
		} else if (data.err && data.errcode) {
			alert('ERRCODE ' + data.errcode + ' : ' + data.err);
			if (data.errcode == 403) location.reload();
		} else {
			alert('Empty / Malformed Data recieved. The page will now reload.');
			location.reload();
		}
	}
}
function submitJobData(jobData, parentForm) {
	$.post('/code/addjob', jobData, submitJobCallback(parentForm), 'json');
}
function submitJobClickEvent(e) {
	var parentForm = $(this).parent();

	if (parentForm.find('.shot-inpc').val() != '') {
		e.preventDefault();
		$.post('/code/addjob', parentForm.serialize(), submitJobCallback(parentForm), 'json');
	}
}
//#endregion timetable edits

//#region updaters
function updateDayColor(day, total) {
	var el = $('#' + day + '-daylink').children('a');
	var classToAdd = total == 0 ? 'red' : total >= 8 ? 'green' : 'yellow';

	var shouldBurst = true;
	if (el.hasClass('green')) shouldBurst = false;
	el.removeClass('red').removeClass('green').removeClass('yellow').addClass(classToAdd);
	if (classToAdd == 'green' && shouldBurst) {
		var coords = {x: el.offset().left + 10, y: el.offset().top + 10};
		successburst.tune(coords).generate();
		successburst_timeline.replay();
	}
}

function updateTotalWeekBar() {
	var total = 0;
	$('.job-time').each(function() {
		total += parseFloat($(this).text());
	});
	if (total >= 24) $('#subm-btn').attr('disabled');
	$('#total-week-bar').text(total + ' hours logged this week.');
}

function updateTotalDayBar(tableEl) {
	tableEl.find('.total-day-bar').each(function() {
		$(this).remove();
	});
	var total = 0;
	tableEl.find('.job-row').each(function() {
		$(this).children('.job-time').each(function() {
			total += parseFloat($(this).text());
		});
	});

	var toIns =
		`
		<tr class="ts-row row no-gutters col-12 total-day-bar">
			<td class="col-1 offset-9" style="text-align: left;">` + total + `</td>
			<td class="col-2">Total</td>
		</tr>`;
	tableEl.append(toIns);

	return total;
}

function updateShading(tableEl) {
	var cc = 0;
	tableEl.find('.job-row').each(function() {
		if (cc % 2 != 0) {
			$(this).removeClass('even');
		} else {
			$(this).addClass('even');
		}
		cc++;
	});
}
//#endregion updaters

//#region helpers
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
function formatMilliToHourMin(milli) {
	let m = Math.floor(milli / (60*1000));
	let h = Math.floor(m / 60);
	m %= 60;
	return (h+'').padStart(1,0)+':'+(m+'').padStart(2,0);
}
function translateToName(cache, type, sgName) { // translation returns false on failure, and name on success.
	sgName = sgName.toLowerCase().split(" ").join("");
	let trans = cache[type];
	return trans[sgName] || false;
}
//#endregion

//#region rokyt
if(IS_NODE) {
	function rokytLaunchClickEvent(e) {
		let jobForm = $("#rokyt-launcher").parent().find(".submitJobForm");
		e.preventDefault();
		let timer = createTimer(
			jobForm.find(".proj-inpc").val(),	// proj
			jobForm.find(".shot-inpc").val(),	// shot
			jobForm.find(".task-inpc").val(),	// task
			jobForm.find(".jobusr-inpc").val(),	// jobusr
			jobForm.find(".day-inpc").val(),	// day
			jobForm.find(".date-inpc").val(),	// date
			currentProg,						// prog
			$(".rokyt-xtra-opts").safeVal(),	// xtraopts
			jobForm,							// parent form
		);
		addTimer(timer);
	}
	function bindRokytIcoClickEvents() {
		$(".rokyt-ico").each(function() {
			$(this).click(rokytIcoClickEvent);
		});
	}
	function rokytIcoClickEvent() {
		$(".rokyt-ico").each(function() {
			$(this).removeClass("active");
		});
		$(this).addClass("active");

		currentProg = this.className.match(/rokyt-ico-([A-z0-9]+)/)[1] || currentProg;

		fillRokytOpts(this);
	}
	function fillRokytOpts(tt) {
		let hadAMatch = false;
		for (let prog in rokytProgOpts) {
			if($(tt).hasClass("rokyt-ico-"+prog)) {
				let toAppend = "";
				hadAMatch = true;
				for(let i in rokytProgOpts[prog]["pretty"]) {
					let optPretty = rokytProgOpts[prog].pretty[i];
					let optTech = rokytProgOpts[prog].tech[i];
					toAppend += `<option value=${optTech}>${optPretty}</option>`;
				}
				$(".rokyt-xtra-opts").empty().append(toAppend);
				$(".rokyt-xtra-opts").removeAttr('disabled');
			}
		}
		if(!hadAMatch) $(".rokyt-xtra-opts").attr('disabled', '');
		return hadAMatch;
	}

	function updateTimerDisplay() {
		$(".rokyt-body-top").empty();

		let toAppend = "";
		for(let i in timers) {
			toAppend += getHTMLForTimer(timers[i], i, true);
		}

		$(".rokyt-body-top").append(toAppend);
	}

	//#region rokyt-timers

	/// To explain "timers"...
	/// example timer, [0]:
	/// {
	///    "timeSpent": 0, // int, milliseconds
	///    "timeStarted": 1540961951344, // int, unix timestamp
	///    "proj": "Lambs Of God", // string, project
	///    "id": "abcdef", // string, 6 long slug
	///    "prog": "nuke", // string, program
	///    "xtraopts": "N", // string, value from xtra-opts dropdown
	///    "task": "Roto", // string, task
	///    "shot": "scb_010" // string, shot code
	/// }
	/// example timer, [0], gets ended at 1540962051344, and becomes:
	/// {
	///    "timeSpent": 100000, // timeSpent (0) + timeEnding (1540962051344) - timeStarted (1540961951344)
	///    "timeStarted": -1 // timeStarted becomes -1, which is a sentinel key for "paused".
	///    ...
	/// }
	/// example timer, [0], gets unpaused at 1540962151344, and becomes:
	/// {
	///    "timeSpent": 100000, // unchanged
	///    "timeStarted": 1540962151344 // updates to current time
	///    ...
	/// }
	/// i would love to use some OOP for this, but my current methodology for this page has not been OOP at all. 
	/// so, im not gonna stop that now, even if i dont really like function based programming as much as i like oop
	/// so instead, im going to work on the following functions...

	function ensureTimerIsTimer(timer) { // if it can ensure timer is a timer / find its id / theres a timer with index timer,
										 // return timer, else return false. 
		if (typeof timer == 'object') {
			if(typeof timer.id == 'string' && typeof timer.timeStarted == 'number') {
				return timer;
			} return false;
		}
		else if(typeof timer == 'string') {
			return getTimer(timer);
		} else if(typeof timer == 'number') {
			if(timers[timer]) return timers[timer];
			return false;
		}
	}
	function loadTimersFromSessionStorage() {
		timers = JSON.parse((x=sessionStorage.getItem('timesheet_timers'))?x:[]);
		updateTimerDisplay();
	}
	function storeTimersToSessionStorage() {
		sessionStorage.setItem('timesheet_timers', JSON.stringify(timers));
	}
	function createTimer(proj, shot, task, jobuser, day, date, prog, xtraopts, parentForm, id=makeSlug(6, 6), timeSpent=0, 
						 timeStarted=new Date() ) { // creates a new timer and returns it.

		let timer = {
			"timeSpent": timeSpent, // int, milliseconds
			"timeStarted": timeStarted-0, // int, unix timestamp 
			// oh and timeStarted-0 is a great coercion trick: if its an int it wont do anything, and if its a date it'll coerse it to an int
			"proj": proj, // string, project
			"id": id, // string, 6 long slug
			"prog": prog, // string, program
			"xtraopts": xtraopts, // string, value from xtra-opts dropdown
			"task": task, // string, task
			"shot": shot, // string, shot code
			"jobuser": jobuser, // string, users name
			"parentForm": parentForm,
			"day": day, // string, day
			"date": date, // string, week code (eg, Current, eg, 2018-10-29)
		}

		let suffix = translateToName(fromSrv.translationCache, 'to_suffix', timer.proj);
		
		// Script with spaces in the filename:
		timer.process = spawn('"/Volumes/RS01/Resources/Engineering/Sam/timesheet-desktop/'+timer.prog+'_launch.sh"', [suffix, timer.xtraopts], { shell: true });

		timer.process.stdout.on('data', timerProcStdoutEvent(timer));
		timer.process.stderr.on('data', timerProcStderrEvent(timer));
		timer.process.on('close', timerProcCloseEvent(timer));

		return timer;
	}
	function timerProcStdoutEvent(timer) {
		return function(data) {
			console.log(`${timer.id}->stdout: ${data}`)
		}
	}
	function timerProcStderrEvent(timer) {
		return function(data) {
			console.log(`${timer.id}->stdout: ${data}`);
		}
	}
	function timerProcCloseEvent(timer) {
		return function(code) {
			pauseTimer(timer);
			console.log(`${timer.id}->close: ${code}. timeSpent: ${timer.timeSpent}`);
		}
	}
	function addTimer(timer, trusty=false) {	// adds a timer and returns it, also updates the display, 
												// also calls unpauseTimer on timer (pausing all others),
												// returns timer if succesful, false otherwise
		if(!trusty) timer = ensureTimerIsTimer(timer);
		if(!timer) return false;
		
		timers.push(timer);
		
		unpauseTimer(timer);
		updateTimerDisplay();

		return timer;
	}
	function pauseTimer(timer, trusty=false, now=new Date()) {	// if the timers not already paused, pauses it, calculates its time (see above example), updates display,
																// and returns the timer if successful, false otherwise
																// if trusty evaluates to true, it wont bother trying to collapse timer to a timer, but assume it is one.
		if(!trusty) timer = ensureTimerIsTimer(timer);
		if(!timer) return false;

		if(timer.timeStarted < 0) return false;
		timer.timeSpent += now - timer.timeStarted;
		timer.timeStarted = -1;

		updateTimerDisplay();
		return timer;
	}
	function unpauseTimer(timer, trusty=false, now=new Date()) { // unpauses a timer, pauses all others and returns it. 
																 // returns timer if successful, false otherwise.
		if(!trusty) timer = ensureTimerIsTimer(timer);
		if(!timer) return false;

		for(let ttim of timers) {
			pauseTimer(ttim, true);
		}
		timer.timeStarted = now-0;
		updateTimerDisplay();

		return timer;
	}
	function convertTimerToJobData(timer, trusty=false) {
		if(!trusty) timer = ensureTimerIsTimer(timer);
		if(!timer) return false;

		let jobData = {
			'jobuser':	 timer.jobuser,		//str
			'day':		 timer.day,			//str
			'date':		 timer.date,		//str
			'project':	 timer.proj,		//str
			'shotcode':	 timer.shot,		//str
			'task':		 timer.task,		//str
			'timespent': timer.timeSpent,	//num
		}
		return jobData;
	}
	function publishTimer(timer, trusty=false) { // publishes a timer to the timesheet bar, updates the display, returns timer and removes it if successful, false otherwise
		if(!trusty) timer = ensureTimerIsTimer(timer);
		if(!timer) return false;
		let parentForm = timer.parentForm;

		pauseTimer(timer, true);
		timer.timeSpent /= (60*60*1000);
		timer.timeSpent = Math.round(timer.timeSpent / .25) * .25;
		
		if(timer.timeSpent < .25) {
			timer.timeSpent *= (60*60*1000);
			alert("Cannot publish timer yet, let it run for at least 15 Minutes!");
			return false;
		}
		
		submitJobData(convertTimerToJobData(timer), parentForm);

		removeTimer(timer, true);

		return timer;
	}
	function removeTimer(id) { // removes a timer, updates the display, returns the timer
		let removedTimer = timers.splice(getTimerIndex(id), 1)[0];
		updateTimerDisplay();
		return removedTimer;
	}
	function getTimerIndex(id) { // like getTimer, but it returns the index instead of the timer, still returns false on failure.
		for(let i in timers) {
			if(timers[i].id == id) {
				return i-0; // coersion to int >:)
			}
		}
		return false;
	}
	function getTimer(id) { // returns a timer with the specified id
		for(let timer of timers) {
			if(timer.id == id) {
				return timer;
			}
		}
		return false;
	}
	function getHTMLForTimer(timer, isOdd, trusty=false) {
		timer = ensureTimerIsTimer(timer);
		isOdd %= 2;
		return `
		<tr class="col-12 row no-gutters rokyt-timer-bar ${(isOdd?'odd':'even')}">
			<td class="col-3">
				${timer.proj}
				<img class="img icon24" alt="${timer.prog}"
					src="/res/${timer.prog}/${timer.prog}24x24.ico" />
				${timer.xtraopts}
			</td>
			<td class="col-3">${timer.shot}</td>
			<td class="col-3">${timer.task}</td>
			<td class="col-3 row no-gutters text-center">
				<span class="col-3" onclick="${timer.timeStarted == -1 ? 'un' : ''}pauseTimer('${timer.id}')">
					${timer.timeStarted == -1 ? '<i class="fa fa-play"></i>' : formatMilliToHourMin( timer.timeSpent + (Date.now() - timer.timeStarted) )}
				</span>
				<button class="col-3 offset-1 btn btn-outline-info" type="submit" style="color: #4550e7;" onclick="publishTimer('${timer.id}')" >
					<i class="fa fa-send" aria-hidden="true"></i>
				</button>
				<button class="col-3 offset-1 btn btn-outline-danger" type="submit" style="color: #793025;" onclick="removeTimer('${timer.id}')" >
					<i class="fa fa-trash" aria-hidden="true"></i>
				</button>
			</td>
		</tr>
		`
	}
	//#endregion rokyt-timers
}

window.addEventListener('beforeunload', function() {
	if(IS_NODE) storeTimersToSessionStorage();
}, false);

//#endregion rokyt

// @license-end