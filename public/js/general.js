/* Code written by Samuel J. Clarke, May-June 2018, for CumulusVFX. */

var rKeys = [];
const easterEggString = 'me me big boy';
const startDate = new Date().getTime();

setInterval(function(){
	let tDate = new Date().getTime();
	if (Math.abs(tDate - startDate) > 86400 * 100) {
		location.reload();
	}
}, 1000 * 60); // once every minute, check if the page is too outdated, and if so, refresh the page

$(document).ready(function(){
	if (window.location.href.indexOf('err=') != -1) window.history.pushState('', '', window.location.href.split('err=')[0]);

	highlightCurrentPage();

	$('body').keypress(function(e){
		rKeys.push(e.key);
		while (rKeys.length > easterEggString.length) rKeys.shift();
		if (rKeys.join('') == easterEggString) {
			alert(easterEggString);
			$('p, a, h1, h2, h3, h4, h5, h6, span, #text, td, option, input').each(function(){
				if ($(this).children().length < 1)
					$(this).text(
						$(this)
							.text()
							.split('')
							.sort((a, b) => {
								return Math.random() - 0.5;
							})
							.join('')
					);
			});
		}
	});

	now = new Date();
	if (now.getMonth() == 3 && now.getDate() == 1) {
		// if the date is 1st of Apr
		alert('please type `me me big boy` into an input field.');
		//$("p, a, h1, h2, h3, h4, h5, h6, span, #text, td, option, input").each(function() {
		//    if($(this).children().length < 1) $(this).text($(this).text().split('').sort((a, b) => { return Math.random() - 0.5; }).join(''));
		//});
		$('p, a, h1, h2, h3, h4, h5, h6, span, #text, td, option, input').each(function(){
			if ($(this).children().length < 1) {
				var xarr = $(this).text().split('');
				for (i in xarr) xarr[i] = Math.random() < 0.5 ? xarr[i].toLowerCase() : xarr[i].toUpperCase();
				$(this).text(xarr.join(''));
			}
		});
	}
});

pageToNaviDict = {
	login: 'login',
	changepassword: 'account',
	signup: 'adduser',
	planner: 'planner',
	analytics: 'analytics',
	logout: 'logout',
	help: 'help',
	usercosts: 'usercosts',
	'': 'home',
};

function highlightCurrentPage(){
	var href = window.location.href;
	var locArr = href.split('/');
	locArr.splice(0, 3);
	for (var loc of locArr) {
		loc = pageToNaviDict[loc] || loc;
		if (loc.slice(0, 1) == '?') loc = 'home';
		$('#' + loc + '-navi').children().first().removeClass('dim');
	}
}