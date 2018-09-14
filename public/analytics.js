$(document).ready(function() {
    function fillParams() {
        $.get('/ajax/getallnames/users', function(data) {
            if(data.errcode == 200) {
                data = data.data;
                var toAppend = "";
                for(var user of data) {
                    toAppend += '<option value="'+user.name+'">'+user.displayName+'</option>';
                }
                $("#user-list").empty().append(toAppend);
            } else {
                alert("ERRCODE: " + data.errcode + " ERROR: " + data.err);
            }
        }, "json");

        if(!$("#from-date").val()) $("#fromdate").val("2018-06-01");
        if(!$("#to-date").val())   $("#todate").val("2018-07-01");
    }
    fillParams();

    $("#submit-btn").bind("click", function(e) {
        e.preventDefault(); // dont send off the form by visiting the page
        var parentForm = $("#graph-params-form");

        $.get('/ajax/getanalyticsdata', parentForm.serialize(), renderGraphDataParser, "json");
    });

    $.get('/ajax/getanalyticsdata', $("#graph-params-form").serialize(), renderGraphDataParser, "json");

    var week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    let marg = {
      top: 50,
      bot: 25,
      left: 200,
      right: 25
    };
    
    function renderGraph(data, marg) {
      if(data.length < 1) return alert("No Items Found");

      $("#tables").empty();
      $("#tables").css("height", "70vh");
      let container = d3.select("#tables").node().getBoundingClientRect();
      let w = container.width - marg.right, h = Math.min(container.height * 2 , (container.width * .75)) - marg.bot;
      
      var dpack = prepData(data);
      var nusers = dictToArr(dpack[0]), nprojs = dictToArr(dpack[1]);
      
      var minDate = data[0]['unix-date'], maxDate = data[0]['unix-date'];
      for(var ts of data) {
        minDate = Math.min(ts['unix-date'], minDate);
        maxDate = Math.max(ts['unix-date'] + daysToMilliseconds(7), maxDate);
      }
      var dayRange = (maxDate - minDate) / daysToMilliseconds(1);
      var wscl = (w - (marg.left + marg.right)) / dayRange;
      var hscl = (h - (marg.top + (marg.bot * 2))) / (nusers.length + nprojs.length + 1);
      
      console.log(minDate, maxDate, dayRange);
      
      var xScale = d3.scaleLinear()
        .domain([0, dayRange])
        .range([0, w - (marg.left + marg.right)]);
    
      var yScale = d3.scaleLinear()
        .domain([0, nusers.length + nprojs.length + 1])
        .range([h - (marg.top + marg.bot), 0]);
      
      const svg = d3.select("#tables")
        .append("svg")
        .attr("viewBox", (-marg.left)+","+(-marg.top)+","+(container.width)+","+(100000))
        .attr("width", (container.width))
        .attr("height", (100000));

      $("#tables").height(h);
      
      let svgr = svg.selectAll('svg');
      
      createTitleBar(svg, nusers, "userbar", marg, 0, 0, wscl, hscl);
      createTitleBar(svg, nprojs, "projbar", marg, 0, d3.select("#userbar-0").node().getBBox().height + (marg.bot), wscl, hscl);
      
      var nusrrow = createTable(svg, nusers, dayRange, minDate, maxDate, "user", marg, 0, 0, w, h, wscl, hscl);
      createTable(svg, nprojs, dayRange, minDate, maxDate, "proj", marg, 0, nusrrow.node().getBBox().height + (marg.bot), w, h, wscl, hscl);;
      
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
      
      console.log("creating user rows")
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
        .attr('height', (d, i) => { return hscl * (d.time / 8); })
        .attr('fill', (d, i) => { return projToColor(d.proj); })
        .attr('fill-opacity', '0.8')
        .attr('class', (d) => { return tcl+'-job '+tcl+'-job-day-' + d.date; })
        .append('title')
        .text((d) => {
          return "Project: " + d.proj + "\nHours: " + d.time + "\nTask: " + d.task;
        })
        .attr("class", "tooltip");
      
      /*usrrow.selectAll('g')
        .data((d) => { return d.jobs; })
        .enter()
        .append('text')
        .attr('x', (d, i) => { return millisecondsToDays(new Date(d.date).getTime() - minDate) * wscl; })
        .attr('y', (d, i) => { return hscl * (d.offset / 8) + (d.time / 8) * (hscl / 2); })
        .attr('fill', "#000")
        .attr('fill-opacity', '0.8')
        .attr('class', (d) => { return 'user-job-text'})
        .text((d) => {
          return d.proj
        })*/ // adds text, but looks shit.
      
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
            users[d.user] = {"id": objSize(users), "jobs": []}
        }
        for(var j of d.jobs) {
          j.date = getThisDate(new Date(d['unix-date'] + daysToMilliseconds(week.indexOf(j.day))));
          if(jobOffsets[j.date] == undefined) jobOffsets[j.date] = 0;
          j.offset = jobOffsets[j.date];
          jobOffsets[j.date] += parseFloat(j.time);
          if(projs[j.proj] == undefined) {
            projs[j.proj] = {"id": objSize(projs), "jobs": []};
          }
          users[d.user].jobs.push(j);
          projs[j.proj].jobs.push(JSON.parse(JSON.stringify(j)));
        }
        var maxOffset = 8;
        for(var key in jobOffsets) {if(jobOffsets.hasOwnProperty(key)) {
            maxOffset = Math.max(maxOffset, jobOffsets[key]);
        }}
        if(!users[d.user].offset) users[d.user].offset = maxOffset;
        else users[d.user].offset = Math.max(maxOffset, users[d.user].offset);
      }
      
      for(var i in projs){if(projs.hasOwnProperty(i)) { // resetting the offsets, because atm they have the users ones.
        var jobOffsets = {};
        for(var j in projs[i].jobs) {
          var tjob = projs[i].jobs[j];
          if(!jobOffsets[tjob.date]) jobOffsets[tjob.date] = 0;
          tjob.offset = jobOffsets[tjob.date];
          jobOffsets[tjob.date] += parseFloat(tjob.time);
        }
      }}
      
      for(var i in projs){if(projs.hasOwnProperty(i)) { // resetting the gyspacing to prep it for the tables
        var maxOffset = 0;
        for(var j in projs[i].jobs) {
          var tjob = projs[i].jobs[j];
          maxOffset = Math.max(maxOffset, parseFloat(tjob.time) + parseFloat(tjob.offset)); //that is so much easier than the users way of doing it lmao
        }
        projs[i].offset = maxOffset;
      }};

      for(var i in projs){if(projs.hasOwnProperty(i)) { // create shots
        var proj = projs[i];
        var shotTotals = {};
        for(var j in proj.jobs) {
          console.log(proj.jobs[j].shot);
        }
      }};

      users = setGySpacing(users);
      projs = setGySpacing(projs);
      console.log(projs);
      
      return [users, projs];
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
        .attr('transform', "translate("+((marg.right / 2)-marg.left + inx)+", "+(iny)+")")
        .attr('class', tclass)
        .attr('id', tclass+"-0");
      
      var usrbarrow = usrbar.selectAll('g')
        .data(dat)
        .enter()
        .append('g')
        .attr('transform', (d, i) => { return "translate(0,"+((d.gyspacing / 8) * hscl)+")"; })
        
      usrbarrow.append('rect')
        .attr('width', marg.left - marg.right)
        .attr('height', (d, i) => { return (hscl * (d.offset / 8)); })
        .attr('fill', (d, i) => { return (d.id % 2 == 0 ? "#ccc" : "#ddd"); })
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('class', tclass + '-row-rect')
      
      usrbarrow.append('text')
        //.attr('width', marg.left - marg.right)
        //.attr('height', (d, i) => { return (hscl * (d.offset / 8)); })
        .attr('x', marg.right / 2)
        .attr('y', (d, i) => { return hscl * (d.offset / 8) / 2; })
        .attr('fill', "#111")
        .attr('class', tclass + '-row-rect')
        .text((d) => { return d.name });
    }
    
    function dictToArr(arr) {
      narr = [];
      for (var type in arr) { 
        if (arr.hasOwnProperty(type)) {
          var tt = arr[type];
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

    function renderGraphDataParser(data) { // but use my js to send it off, it's async :)
        if(data.errcode == 200) {
            data = data.data;
            console.log(data);
            renderGraph(data, marg);
        } else {
            alert("ERRCODE: " + data.errcode + " ERROR: " + data.err);
        }
    }
});