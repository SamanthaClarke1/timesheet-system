var users = "";
var viewMode = "user";
var projCache = "";

$(document).ready(function() {

  $("#search-type-val").val(viewMode);

  $(".bx-opt").click(function(e) {
    $(".bx-switch").children().each(function() {
      $(this).removeClass("active");
    })
    $(this).addClass("active");

    if($("#usr-view-btn").hasClass("active")) viewMode = "user";
    else viewMode = "proj";

    $("#search-type-val").val(viewMode);

    if(viewMode == "user") {
      fillParams(users);
      $("#flush-cache-btn").addClass("inactive");
      $("#user-list").attr("multiple", "");
    } else {
      fillParams(srvprojs);
      $("#flush-cache-btn").removeClass("inactive");
      $("#user-list").removeAttr("multiple");
    }

    if(viewMode == "proj" && !projCache.length) {
      refreshProjCache();
    }
  });

  function refreshProjCache() {
    $("#submit-btn").attr("disabled", "");

    $.get('/ajax/getanalyticsdata', $("#graph-params-form").serialize(), function(data) {
      if(data.errcode == 200) {
        projCache = data.data;
      } else {
        alert("ERRCODE: " + data.errcode + " ERR: " + data.err);
      }
    }, "json").done(function() {
      $("#submit-btn").removeAttr("disabled");
    })
  }

  $("#flush-cache-btn").click(function(e) {
    var coords = { x: e.pageX, y: e.pageY };
    littleburst.tune(coords).generate();
    littleburst_timeline.replay();
    
    if(viewMode == "proj") refreshProjCache(); 
  })

  function fillParams(users) {
    if(!$("#from-date").val()) $("#from-date").val("2018-01-01");
    if(!$("#to-date").val())   $("#to-date").val(getThisDate());

    var toAppend = "";
    for(var user of users) { // the weird type check is because im passing both a user (eg. {name: 'user', displayName: 'User', _id: '123'} ) and a proj (eg. 'proj')
      toAppend += '<option value="'+(typeof user == "object" ? user.name : user)+'">'+(typeof user == "object" ? user.displayName : user)+'</option>';
    }
    $("#user-list").empty().append(toAppend);
  }
  
  $.get('/ajax/getallnames/users', function(data) {
    if(data.errcode == 200) {
      users = data.data;
    } else {
      alert("ERRCODE: " + data.errcode + " ERROR: " + data.err);
    }
  }, "json").done(function() {
    fillParams(users);
  });

  $("#submit-btn").bind("click", function(e) {
    e.preventDefault(); // dont send off the from by redirecting the user to it
    var parentForm = $("#graph-params-form");

    if(viewMode == "user") {
      $.get('/ajax/getanalyticsdata', parentForm.serialize(), renderGraphDataParser, "json");
    } else {
      renderGraph(projCache, marg);
    }
    
    var coords = { x: e.pageX, y: e.pageY };
    littleburst.tune(coords).generate();
    littleburst_timeline.replay();
  });


  var week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  let marg = {
    top: 50,
    bot: 15,
    left: 25,
    right: 25,
    rbar: 100,
    lbar: 175,
    rxy: 0,
    endcap: 50
  };
  
  function renderGraph(data, marg) {
    if(data.length < 1) return alert("No Items Found");
    
    var dpack = prepData(data);
    if(!dpack) return alert('No Shots Found');

    $("#tables").empty();
    $("#tables").css("height", "70vh");
    let container = d3.select("#tables").node().getBoundingClientRect();
    let w = container.width - marg.right - marg.rbar - marg.lbar, h = container.height - marg.bot;

    var nusers = dictToArr(dpack[0]), nprojs = dictToArr(dpack[1]);
    
    var minDate = data[0]['unix-date'], maxDate = data[0]['unix-date'];
    for(var ts of data) {
      minDate = Math.min(ts['unix-date'], minDate);
      maxDate = Math.max(ts['unix-date'] + daysToMilliseconds(7), maxDate);
    }
    var dayRange = (maxDate - minDate) / daysToMilliseconds(1);
    var wscl = (w - (marg.left + marg.right)) / dayRange;
    var hscl = (h - (marg.top + (marg.bot * 2))) / 12;
    
    console.log("rendering graph with viewMode:",viewMode,"and range: { min:",minDate,"max:",maxDate,"total-days:",dayRange,"}");
    
    var xScale = d3.scaleLinear()
      .domain([0, dayRange])
      .range([0, w - (marg.left + marg.right)]);
  
    var yScale = d3.scaleLinear()
      .domain([0, nusers.length + nprojs.length + 1])
      .range([h - (marg.top + marg.bot), 0]);
    
    const svg = d3.select("#tables")
      .append("svg")
      .attr("id", "tables-svg")
      .attr("viewBox", ((marg.left + marg.lbar) * -1)+","+(-marg.top)+","+(container.width)+","+(15000))
      .attr("width", (container.width))
      .attr("height", (15000));

    $("#tables").height(h);
    
    let svgr = svg.selectAll('svg');
    
    var barA = "", barB = "";
    if(viewMode == "user") {
      barA = createTitleBar(svg, nusers, "userbar", marg, 0, 0, wscl, hscl);
      barB = createTitleBar(svg, nprojs, "projbar", marg, 0, d3.select("#userbar-0").node().getBBox().height + (marg.bot), wscl, hscl);
    
      createTotalBar(svg, nusers, "userbar", marg, w - marg.left - marg.right, 0, wscl, hscl);
      createTotalBar(svg, nprojs, "projbar", marg, w - marg.left - marg.right, d3.select("#userbar-0").node().getBBox().height + (marg.bot), wscl, hscl);
    
      var nusrrow = createTable(svg, nusers, dayRange, minDate, maxDate, "user", marg, 0, 0, w, h, wscl, hscl);
      createTable(svg, nprojs, dayRange, minDate, maxDate, "proj", marg, 0, nusrrow.node().getBBox().height + (marg.bot), w, h, wscl, hscl);;
    } else {
      barA = createTitleBar(svg, nprojs, "shotbar", marg, 0, 0, wscl, hscl);
      createTable(svg, nprojs, dayRange, minDate, maxDate, "shot", marg, 0, 0, w, h, wscl, hscl);
      createTotalBar(svg, nprojs, "totalbar", marg, w - marg.left - marg.right, 0, wscl, hscl);
    }

    var tH = (barB?barB.node().getBBox().height:0) + barA.node().getBBox().height + marg.bot * 3 + marg.endcap;
    svg.attr('height', tH)
       .attr("viewBox", ((marg.left+marg.lbar)*-1)+","+(-marg.top)+","+(container.width)+","+(tH));

    createAxis(svg, xScale, yScale, dayRange, minDate, maxDate);
  }
  
  function createTable(svg, data, dayRange, minDate, maxDate, tcl, marg, x, y, w, h, wscl, hscl) {
    var tableEl = svg.append('g')
      .attr('transform', 'translate('+x+', '+y+')')
      .attr('id', tcl+'-tables')
      
    var svgr = tableEl.selectAll('g');
    
    var usrrow = svgr.data(data)
      .enter()
      .append('g')
      .attr('transform', (d, i) => {return "translate(0, "+((d.gyspacing / 8) * hscl)+")"; })
      .attr('class', (d, i) => {return tcl+"-row "+tcl+"-row-g-" + i});
    
    usrrow.append('rect')
      .attr('width', w - (marg.right + marg.left))
      .attr('height', (d, i) => { return (hscl * (d.offset / 8)); })
      .attr('fill', (d, i) => { return (d.id % 2 == 0 ? "#ccc" : "#ddd"); })
      .attr('class', (d, i) => { return tcl+"-row "+tcl+"-row-r-" + i; });
        
    usrrow.selectAll('g')
      .data((d) => { return d.jobs; })
      .enter()
      .append('rect')
      .attr('x', (d, i) => { return Math.round(millisecondsToDays(new Date(d.date).getTime() - minDate)) * wscl; })
      .attr('y', (d, i) => { return hscl * (d.offset / 8); })
      .attr('width', wscl)
      .attr('height', (d, i) => { return hscl * (Math.min(d.time,(viewMode=="user"?800:8)) / 8); })
      .attr('fill', (d, i) => { return (viewMode == "user" ? projToColor(d.proj) : projToColor(d.shot)); })
      .attr('fill-opacity', '0.8')
      .attr('class', (d) => { return tcl+'-job '+tcl+'-job-day-' + d.date; })
      .append('title')
      .text((d) => {
        return "Project: " + d.proj + "\nDay: " + d.day + "\nShot: " + (d.shot ? d.shot:"general") + "\nHours: " + d.time + (viewMode == "user"?"\nTask: " + d.task:"");
      })
      .attr("class", "tooltip");
    
    if(viewMode == "proj") {
      usrrow.selectAll('g')
        .data((d) => { return d.jobs; })
        .enter()
        .append('text')
        .attr('x', (d, i) => { return millisecondsToDays(new Date(d.date).getTime() - minDate) * wscl; })
        .attr('y', (d, i) => { return hscl * (4 / 8) + 0.5 * (hscl / 2) - 16; })
        .attr('fill', "#000")
        .attr('fill-opacity', '0.8')
        .attr('class', (d) => { return 'user-job-text'})
        .text((d) => {
          return d.time;
        }) // adds text, but looks shit.
    }
    
    return tableEl;
  }
  
  function createAxis(svg, xScale, yScale, dayRange, minDate, maxDate) {
    const xAxis = d3.axisTop(xScale)
      .ticks(dayRange)
      .tickFormat((d, i) => {
        if((d % 7) == 0) {
          var d = new Date(minDate + daysToMilliseconds(d));
          return getThisDate(d)
        };
      });
  
    svg.append("g")
      .attr("transform", "translate(0,0)")
      .attr("class", "axisWhite")
      .call(xAxis);
  
    /*const yAxis = d3.axisLeft(yScale)
      .ticks(nusers.length + nprojs.length + 1);
  
    svg.append("g")
      .attr("transform", "translate(0,0)")
      .call(yAxis);*/
  }
  
  function prepData(data) {
    let users = {}, projs = {};
    for(var d of data) {
      let jobOffsets = {};
      if(users[d.user] == undefined) {
          users[d.user] = {"id": objSize(users), "jobs": [], "total": 0}
      }
      for(var j of d.jobs) {
        j.date = getThisDate(new Date(d['unix-date'] + daysToMilliseconds(week.indexOf(j.day))));
        j.shot = (j.shot?j.shot.toLowerCase():"general");
        if(!jobOffsets[j.date]) jobOffsets[j.date] = 0;
        j.offset = parseFloat(jobOffsets[j.date]);
        jobOffsets[j.date] += parseFloat(j.time);
        if(!projs[j.proj]) {
          projs[j.proj] = {"id": objSize(projs), "jobs": [], "total": 0};
        }
        users[d.user].jobs.push(j);
        users[d.user].total += Math.round(parseFloat(j.time) * 100) / 100;
        projs[j.proj].jobs.push(JSON.parse(JSON.stringify(j)));
        projs[j.proj].total += Math.round(parseFloat(j.time) * 100) / 100;
      }
      var maxOffset = 8;
      for(var key in jobOffsets) {if(jobOffsets.hasOwnProperty(key)) {
          maxOffset = Math.max(maxOffset, jobOffsets[key]);
      }}
      if(!users[d.user].offset) users[d.user].offset = maxOffset;
      else users[d.user].offset = Math.max(maxOffset, users[d.user].offset);
    }

    var tproj = "", shots = {};

    if(viewMode == "user") {
      for(var i in projs){if(projs.hasOwnProperty(i)) { // resetting the offsets, because atm they have the users ones.
        var jobOffsets = {};
        for(var j in projs[i].jobs) {
          var tjob = projs[i].jobs[j];
          if(!jobOffsets[tjob.date]) jobOffsets[tjob.date] = 0;
          tjob.offset = parseFloat(jobOffsets[tjob.date]);
          jobOffsets[tjob.date] += parseFloat(tjob.time);
        }
      }}
      
      for(var i in projs){if(projs.hasOwnProperty(i)) { // resetting the gyspacing to prep it for the tables
        var maxOffset = 8;
        for(var j in projs[i].jobs) {
          var tjob = projs[i].jobs[j];
          maxOffset = Math.max(maxOffset, parseFloat(tjob.time) + parseFloat(tjob.offset)); //that is so much easier than the users way of doing it lmao
        }
        projs[i].offset = maxOffset;
      }};
    } else {
      for(var i in projs){if(projs.hasOwnProperty(i)) {
        if(i == $("#user-list").val()) { tproj = projs[i]; break; }
      }}
      if(!tproj) return false;

      for(var i in tproj.jobs) { // collapse shots by date.
        var job = JSON.parse(JSON.stringify(tproj.jobs[i]));
        job.time = parseFloat(job.time);
        job.offset = 0;
        if(!job.shot) job.shot = "general";

        if(!shots[job.shot]) shots[job.shot] = {};
        if(!shots[job.shot][job.date]) shots[job.shot][job.date] = job;
        else shots[job.shot][job.date].time += parseFloat(job.time);
      }
      tproj.shots = shots

      var id = 0;
      for(var i in tproj.shots) {
        id ++;
        var shotsByShot = tproj.shots[i];
        tproj.shots[i] = {"jobs": dictToArr(shotsByShot), "id": id};

        var total = 0;
        for(var job of tproj.shots[i].jobs) total += job.time;
        tproj.shots[i].total = total;
      }

      for(var i in tproj.shots) {
        tproj.shots[i].offset = 8;
      }
      tproj.shots = setGySpacing(tproj.shots);
    }

    if(viewMode == "user") {
      users = setGySpacing(users);
      projs = setGySpacing(projs);
      return [users, projs];
    } else {
      return ["", tproj.shots];
    }
  }

  function setGySpacing(dict) {
    let gUserOffset = 0;
    for(var i in dict){if(dict.hasOwnProperty(i)) {
      dict[i].gyspacing = gUserOffset;
      gUserOffset += dict[i].offset;
    }}
    return dict;
  }
  
  function createTitleBar(svg, dat, tclass, marg, inx, iny, wscl, hscl) {
    var usrbar = svg.append('g')
      .attr('transform', "translate("+((marg.left / 2)-marg.lbar + inx)+", "+(iny)+")")
      .attr('class', tclass)
      .attr('id', tclass+"-0");
    
    var usrbarrow = usrbar.selectAll('g')
      .data(dat)
      .enter()
      .append('g')
      .attr('transform', (d, i) => { return "translate(0,"+((d.gyspacing / 8) * hscl)+")"; })
      
    usrbarrow.append('rect')
      .attr('width', marg.lbar - marg.left)
      .attr('height', (d, i) => { return (hscl * (d.offset / 8)); })
      .attr('fill', (d, i) => { return (d.id % 2 == 0 ? "#ccc" : "#ddd"); })
      .attr('rx', marg.rxy)
      .attr('ry', marg.rxy)
      .attr('class', tclass + '-row-rect')
    
    usrbarrow.append('text')
      //.attr('width', marg.left - marg.right)
      //.attr('height', (d, i) => { return (hscl * (d.offset / 8)); })
      .attr('x', marg.left / 2)
      .attr('y', (d, i) => { return hscl * (d.offset / 8) / 2; })
      .attr('fill', "#111")
      .attr('class', tclass + '-row-rect')
      .text((d) => { return d.name });

    return usrbar;
  }
  
  function createTotalBar(svg, dat, tclass, marg, inx, iny, wscl, hscl) {
    var tw = marg.rbar - marg.right / 2; 
  
    var usrbar = svg.append('g')
      .attr('transform', "translate("+(inx + marg.right / 2)+", "+(iny)+")")
      .attr('class', tclass)
      .attr('id', tclass+"-0");
    
    var usrbarrow = usrbar.selectAll('g')
      .data(dat)
      .enter()
      .append('g')
      .attr('transform', (d, i) => { return "translate(0,"+((d.gyspacing / 8) * hscl)+")"; })
      
    usrbarrow.append('rect')
      .attr('width', tw)
      .attr('height', (d, i) => { return (hscl * (d.offset / 8)); })
      .attr('fill', (d, i) => { return (d.id % 2 == 0 ? "#ccc" : "#ddd"); })
      .attr('rx', marg.rxy)
      .attr('ry', marg.rxy)
      .attr('class', tclass + '-row-rect')
    
    usrbarrow.append('text')
      //.attr('width', marg.left - marg.right)
      //.attr('height', (d, i) => { return (hscl * (d.offset / 8)); })
      .attr('x', marg.right / 3)
      .attr('y', (d, i) => { return hscl * (d.offset / 8) / 2; })
      .attr('fill', "#111")
      .attr('class', tclass + '-row-rect')
      .text((d) => { return Math.round(parseFloat(d.total) * 100) / 100 });
  };

  function dictToArr(arr) {
    narr = [];
    for (var type in arr) { 
      if (arr.hasOwnProperty(type)) {
        var tt = arr[type];
        if(typeof tt != "object") tt = {tt};
        tt.name = type;
        narr.push(tt)
      }
    }
    return narr;
  }
  
  function projToColor(proj) {
    var rgb = [ Math.floor(Math.pow(proj.length + proj.charCodeAt(0), 2) % 180 + 75),
                Math.floor(Math.pow(proj.length + proj.charCodeAt(1 % proj.length) + proj.length, 2) % 180 + 75),
                Math.floor(Math.pow(proj.length + proj.charCodeAt(2 % proj.length) + proj.length / 2, 2) % 180 + 75) ];
    return "rgb("+rgb[0]+","+rgb[1]+","+rgb[2]+")";
  }
  
  function daysToMilliseconds(days) {
    return days * (1000 * 60 * 60 * 24);
  }
  
  function millisecondsToDays(mils) {
    return mils / (1000 * 60 * 60 * 24);
  }
  
  function getThisDate(now=new Date()) {
      return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  }
  
  function objSize(obj) {
    var size = 0, key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) size++;
    }
    return size;
  };

  function getThisDate(now=new Date()) {
    return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  }

  function renderGraphDataParser(data) { // but use my js to send it off, it's async :)
      if(data.errcode == 200) {
          data = data.data;
          renderGraph(data, marg);
      } else {
          alert("ERRCODE: " + data.errcode + " ERROR: " + data.err);
      }
  }
});