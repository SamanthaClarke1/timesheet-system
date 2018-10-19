// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

// yeah, yeah, the whole idea of using ajax came in half way through development, so my code looks like sphagetti.
// but, yknow, whatever, i could go some pasta, so who's the real winner here?

let projCache = {};
let shotCache = {};

$(document).ready(function() {
	$('.proj-inpc').each(function() { projCheckerFunc(this); });

	$('.btn-delj').each(delJobEvent); // bind a delete blocker to each delete-job button

	$('.btn-inpc').each(function() {
		$(this).bind('click', function(e) {
			var parentForm = $(this).parent();

			if (parentForm.find('.shot-inpc').val() != '') {
				e.preventDefault();
				$.post('/code/addjob', parentForm.serialize(), function(data) {
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
				},'json');
			}
		});
	});

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
});

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

// @license-end