/* eslint-env browser, es6, jquery */

// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

let users = [];
let marg = { lbar: 150, top: 20, right: 20, bot: 20, left: 20, barspacing: 2 };

$(document).ready(function(){
	function renderD3(dset){
		for (let i = 0; i < users.length; i++) {
			if (!users[i].cost) {
				users.splice(i, 1);
				i -= 1;
			} else {
				//users[i].cost = 10+ Math.random()*30; // DEBUG: sets user costs to random numbers
			}
		}

		let minCost = 0, maxCost = 0;

		for (let i = 0; i < dset.length; i++) maxCost = Math.max(dset[i].cost ? dset[i].cost : -1, maxCost);
		let costRange = maxCost - minCost; //Math.floor(Math.random() * 60);//
		costRange = Math.ceil(costRange);
		console.log('rendering users with costRange:', costRange);

		$('#tables').empty();
		$('#tables').css('height', '70vh');
		let container = d3.select('#tables').node().getBoundingClientRect();

		let w = container.width - marg.lbar - marg.right - marg.left;
		let wscl = (w - marg.right) / costRange;
		let hscl = container.height / 20;
		let h = dset.length * hscl + marg.bot + marg.top;

		let xScale = d3.scaleLinear().domain([ 0, costRange ]).range([ 0, w - marg.right ]);

		const svg = d3
			.select('#tables')
			.append('svg')
			.attr('id', 'tables-svg')
			.attr('viewBox', -(marg.lbar + marg.left) + ',' + -marg.top + ',' + container.width + ',' + h)
			.attr('width', container.width)
			.attr('height', h);

		createTitleBar(svg, dset, 'uc-d3-users-', -marg.left, 0, wscl, hscl);
		createUserCostBars(svg, dset, 'uc-d3-costs-', 0, 0, wscl, hscl);

		const xAxis = d3.axisTop(xScale).ticks(Math.min(costRange, 16));

		svg.append('g').attr('transform', 'translate(0, 0)').attr('class', 'axisWhite').call(xAxis);
	}

	$.get('/ajax/getusercosts', { XSRFToken: sXSRFToken }, function(data) {
		if (data.errcode != 200) {
			alert(data.err);
		} else {
			users = data.data;
			renderD3(users);
		}
	});

	$('#usubm-btn').click(function(e){
		e.preventDefault();
		littleburst.tune({ x: $(this).offset().left, y: $(this).offset().top }).generate();
		littleburst_timeline.replay();
		$('#uname-inp').val($('#uname-inp').val().toLowerCase());

		let tmForm = $('#uc-mform').serialize();
		tmForm += '&XSRFToken='+sXSRFToken;
		$.post('/ajax/setusercost', tmForm, function(data) {
			if (data.errcode != 200) {
				alert(data.err);
			} else {
				for (let i = 0; i < users.length; i++) {
					if (users[i].name == data.data.name) {
						users[i].cost = data.data.cost;
						break;
					}
				}
				renderD3(users);
			}
		});
	});

	function createUserCostBars(svg, dat, tcl, inx, iny, wscl, hscl){
		let usrbar = svg.append('g').attr('transform', 'translate(' + (inx) + ', ' + (iny + marg.barspacing * 2) + ')').attr('class', escHTML(tcl));

		usrbar
			.selectAll('g')
			.data(dat)
			.enter()
			.append('rect')
			.attr('transform', (d, i) => {
				return 'translate(0, ' + (hscl * i + marg.barspacing / 2) + ')';
			})
			.attr('width', (d) => {
				return (d.cost ? d.cost : 10) * wscl;
			})
			.attr('height', hscl - marg.barspacing)
			.attr('fill', (_, i) => {
				return i % 2 == 0 ? '#ccc' : '#ddd';
			})
			.attr('onclick', (d) => {
				return '$("#uname-inp").val("' + escHTML(d.name) + '"); $("#ucosts-inp").val("' + escHTML(d.cost) + '");';
			})
			.append('title')
			.text((d) => {
				return 'User: ' + (d.name) + '\nCost: $' + Math.round(d.cost * 100) / 100 + '/h';
			})
			.attr('class', 'tooltip');

		return usrbar;
	}

	function createTitleBar(svg, dat, tcl, inx, iny, wscl, hscl){
		let usrbar = svg
			.append('g')
			.attr('transform', 'translate(' + (marg.left / 2 - marg.lbar + inx) + ', ' + (iny + marg.barspacing * 2) + ')')
			.attr('class', tcl);

		let usrbarrow = usrbar.selectAll('g').data(dat).enter().append('g').attr('transform', (d, i) => {
			return 'translate(0,' + (hscl * i + marg.barspacing / 2) + ')';
		});

		usrbarrow
			.append('rect')
			.attr('width', marg.lbar - marg.left)
			.attr('height', hscl - marg.barspacing)
			.attr('fill', (d, i) => {
				return i % 2 == 0 ? '#ccc' : '#ddd';
			})
			.attr('class', tcl + '-row-rect')
			.attr('onclick', (d) => {
				return '$("#uname-inp").val("' + escHTML(d.name) + '")';
			});

		usrbarrow
			.append('text')
			.attr('x', marg.left / 2)
			.attr('y', () => {
				return hscl / 2 + 5;
			})
			.attr('fill', '#111')
			.attr('class', tcl + '-row-rect')
			.text((d) => {
				return escHTML(d.name);
			});

		return usrbar;
	}
});

// @license-end