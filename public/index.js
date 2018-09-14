// yeah, yeah, the whole idea of using ajax came in half way through development, so my code looks like sphagetti.
// but, yknow, whatever, i could go some pasta, so who's the real winner here?

$(document).ready(function() {
    $(".proj-inpc").each(function() {
        var taskel = $(this).parent().parent().find(".task-inpc");
        if($(this).val().toLowerCase() == "admin") {
            updateTasks(fromSrv.tasks.admin, taskel);
        } else {
            updateTasks(fromSrv.tasks.default, taskel);
        }
    });
    
    $(".btn-delj").each(delJobEvent); // bind a delete blocker to each delete-job button
    $(".btn-inpc").each(function() {
        $(this).bind("click", function(e) {
            var parentForm = $(this).parent();

            if(parentForm.find(".shot-inpc").val() != "") {
                e.preventDefault();
                $.post('/code/addjob', parentForm.serialize(), function(data) {
                    if(data.errcode == 200) {
                        var srv = fromSrv;
                        job = data.data;
                        var toIns = `
                            <tr class="ts-row row no-gutters col-12 job-row">
                                <td class="col-3 job-proj">`+job.proj+`</td>
                                <td class="col-3 job-shot">`+job.shot+`</td>
                                <td class="col-3 job-task">`+job.task+`</td>
                                <td class="col-2 job-time">`+job.time+`</td>
                                <td class="col-1 job-del">
                                    <form action="/code/deljob" method="POST">
                                        <input name="jobuser" class="delj-user" value="`+(srv.userIsAdmin == "true" ? srv.tuserName : srv.userName)+`" hidden />
                                        <input name="jobid" class="delj-id" value="`+job.id+`" hidden />
                                        <input name="day" class="delj-day" value="`+job.day+`" hidden />
                                        <input name="date" class="delj-date" value="`+srv.tdate+`" hidden />
                                        <button id="deljob-`+job.id+`" class="btn-delj" type="submit" style="color: #e75045;"`+(srv.editable == "true" ? "" : " disabled")+`> <i class="fa fa-trash" aria-hidden="true"></i></button>
                                    </form>
                                </td>
                            </tr>
                        `;
                        parentForm.parent().children(".job-table").each(function() {
                            $(this).append(toIns);
                            bindDeleteBlocker($("#deljob-"+job.id));
                            updateTotalWeekBar($(this));
                            var total = updateTotalDayBar($(this));
                            updateDayColor(job.day, total);
                            updateShading($(this));
                        });
                    } else if(data.err && data.errcode) {
                        alert("ERRCODE " + data.errcode + " : " + data.err);
                        if(data.errcode == 403) location.reload();
                    } else {
                        alert("Empty / Malformed Data recieved. Please refresh the page.");
                        location.reload();
                    }
                }, "json");
            }
        });
    });

    $(".proj-inpc").each(function() {
        $(this).change(function() {
            var taskel = $(this).parent().parent().find(".task-inpc");
            if($(this).val().toLowerCase() == "admin") {
                updateTasks(fromSrv.tasks.admin, taskel);
            } else {
                updateTasks(fromSrv.tasks.default, taskel);
            }
        })
    });
    $(".sub-nav-link").each(function() { // bind to the days as well
        $(this).click(function() {
            $(".proj-inpc").each(function() {
                var taskel = $(this).parent().parent().find(".task-inpc");
                if($(this).val().toLowerCase() == "admin") {
                    updateTasks(fromSrv.tasks.admin, taskel);
                } else {
                    updateTasks(fromSrv.tasks.default, taskel);
                }
            });
        });
    });
});

function updateTasks(ttasks, taskel) {
    var html = "";
    for(var task of ttasks) {
        html += '<option value="'+task+'">'+task+'</option>';
    }
    taskel.empty();
    taskel.append(html);
}

function bindDeleteBlocker(el) {
    el.parent().find(".btn-delj").each(delJobEvent); // bind a delete blocker to this el
}

function delJobEvent() {
    $(this).bind("click", function(e) {
        e.preventDefault(); // dont send off the form by visiting the page
        var parentForm = $(this).parent();
        var parentTable = $(this).parent().parent().parent().parent().parent().find(".job-table"); // thatsa lotta parents
        if(parentTable.length <= 0) parentTable = $(this).parent().parent().parent().parent().parent();
        var day = parentForm.find(".delj-day").val();

        parentForm.children("")
        $.post('/code/deljob', parentForm.serialize(), function(data) { // but use my js to send it off, it's async :)
            if(data.err == "") {
                var jobrow = parentForm.parent().parent();
                jobrow.remove(); // remove the job
                updateTotalWeekBar(parentTable);
                var total = updateTotalDayBar(parentTable); // update the total
                updateDayColor(day, total);
                updateShading(parentTable); // update the colors
            } else {
                alert(data.err);
            }
        }, "json");
    });
}

function updateDayColor(day, total) {
    var el = $("#" + day + "-daylink").children("a");
    var classToAdd = (total == 0 ? "red" : (total >= 8 ? "green" : "yellow"));
    el.removeClass("red").removeClass("green").removeClass("yellow").addClass(classToAdd);
}

function updateTotalWeekBar() {
    var total = 0;
    $(".job-time").each(function() {
        total += parseFloat($(this).text());
    });
    $("#total-week-bar").text(total + " hours logged this week.");
}
function updateTotalDayBar(tableEl) {
    tableEl.find(".total-day-bar").each(function() {$(this).remove()});
    var total = 0;
    tableEl.find(".job-row").each(function() {
        $(this).children(".job-time").each(function() {
            total += parseFloat($(this).text());
        });
    });

    var toIns = `
        <tr class="ts-row row no-gutters col-12 total-day-bar">
            <td class="col-1 offset-9" style="text-align: left;">`+total+`</td>
            <td class="col-2">Total</td>
        </tr>`;
    tableEl.append(toIns);

    return total;
}
function updateShading(tableEl) {
    var cc = 0;
    tableEl.find(".job-row").each(function() {
        if(cc % 2 != 0) {
            $(this).removeClass("even");
        } else {
            $(this).addClass("even");
        }
        cc++;
    });
}