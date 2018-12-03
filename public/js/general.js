/* eslint-env browser, es6, jquery */

// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

/* Code written by Samuel J. Clarke, May-June 2018, for CumulusVFX. */


function detectBrowser() { // tasty ponyfill adapted from https://stackoverflow.com/questions/12489546/how-to-get-browsers-name-client-side
	let nAgt = navigator.userAgent;
	let browserName  = navigator.appName;
	let fullVersion  = ''+parseFloat(navigator.appVersion); 
	let majorVersion = parseInt(navigator.appVersion, 10);
	let nameOffset, verOffset, ix;

	let tbrowser = {'name': browserName, 'version': majorVersion};

	// In Opera, the true version is after "Opera" or after "Version"
	if ((verOffset = nAgt.indexOf("Opera")) != -1) {
		browserName = "Opera";
		fullVersion = nAgt.substring(verOffset + 6);
		if ((verOffset = nAgt.indexOf("Version")) != -1) 
			fullVersion = nAgt.substring(verOffset + 8);
	}
	// In MSIE, the true version is after "MSIE" in userAgent
	else if ((verOffset = nAgt.indexOf("MSIE")) != -1) {
		browserName = "Microsoft Internet Explorer";
		fullVersion = nAgt.substring(verOffset + 5);
	}
	// In Chrome, the true version is after "Chrome" 
	else if ((verOffset = nAgt.indexOf("Chrome")) != -1) {
		browserName = "Chrome";
		fullVersion = nAgt.substring(verOffset + 7);
	}
	// In Safari, the true version is after "Safari" or after "Version" 
	else if ((verOffset = nAgt.indexOf("Safari")) != -1) {
		browserName = "Safari";
		fullVersion = nAgt.substring(verOffset + 7);
		if ((verOffset = nAgt.indexOf("Version")) != -1) 
			fullVersion = nAgt.substring(verOffset + 8);
	}
	// In Firefox, the true version is after "Firefox" 
	else if ((verOffset = nAgt.indexOf("Firefox")) != -1) {
		browserName = "Firefox";
		fullVersion = nAgt.substring(verOffset + 8);
	}
	// In most other browsers, "name/version" is at the end of userAgent 
	else if ( (nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/')) ) {
		browserName = nAgt.substring(nameOffset, verOffset);
		fullVersion = nAgt.substring(verOffset + 1);
		if (browserName.toLowerCase() == browserName.toUpperCase()) {
			browserName = navigator.appName;
		}
	}
	// trim the fullVersion string at semicolon/space if present
	if ((ix=fullVersion.indexOf(";")) != -1)
		fullVersion = fullVersion.substring(0, ix);
	if ((ix=fullVersion.indexOf(" ")) != -1)
		fullVersion = fullVersion.substring(0, ix);

	majorVersion = parseInt('' + fullVersion, 10);
	if (isNaN(majorVersion)) {
		fullVersion  = ''+parseFloat(navigator.appVersion); 
		majorVersion = parseInt(navigator.appVersion, 10);
	}

	tbrowser.version = majorVersion;
	tbrowser.name = browserName;

	return tbrowser;
}

let BROWSER = detectBrowser();


let tmp;
$.fn.classList = function() { return this[0].className.split(/\s+/); }; // jquery plugin for classList
$.fn.safeVal   = function() { return (tmp=((this.attr('disabled')?' ':'')||(this.attr('hidden')?' ':'')||this.val()))==' '?'':tmp; };

function escURI(str) {
	return encodeURIComponent(String(str));
}
function escHTML(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function escQuot(str) {
	return String(str).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function escJQuot(str) {
	return String(str).replace(/'/g, '\x27').replace(/"/g, '\x22');
}
function escSQuot(str) {
	return String(str).replace(/'/g, '\\\'').replace(/"/g, '\\"');
}

// ik bad code but its a lazy track for my own purposes that will prolly get removed later
if(sXSRFToken) {
	$.get('/ajax/browsertracker', { browser: BROWSER.name, version: BROWSER.version, XSRFToken: sXSRFToken }, function (data) {
		if(data.errcode > 300 || data.errcode < 200) console.log('ERROR IN DATA TRACK: ' + data.err + ' ERRCODE: ' + data.errcode);
	});
}

const startDate = new Date().getTime();

if(!IS_NODE) { 
	setInterval(function() {
		let tDate = new Date().getTime();
		if (Math.abs(tDate - startDate) > 59 * 60 * 1000) {
			location.reload();
		}
	}, 1000 * 60 * 59); // once every hour, check if the page is too outdated, and if so, refresh the page
}

$(document).ready(function(){
	if (window.location.href.indexOf('err=') != -1) window.history.pushState('', '', window.location.href.split('err=')[0]);

	highlightCurrentPage();

	let now = new Date();
	if (now.getMonth() == 3 && now.getDate() == 1) {
		$('p, a, h1, h2, h3, h4, h5, h6, span, #text, td, option, input').each(function(){
			if ($(this).children().length < 1) {
				var xarr = $(this).text().split('');
				for (let i in xarr) xarr[i] = Math.random() < 0.5 ? xarr[i].toLowerCase() : xarr[i].toUpperCase();
				$(this).text(xarr.join(''));
			}
		});
	}
});

let pageToNaviDict = {
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

try {
	let es6testfunc = (x) => { return x + 1; };
	if(es6testfunc(14) != 15) declareSupportMissing('ES6');
} catch (Exception) {
	declareSupportMissing('ES6');
}
if(typeof(es6testfunc) !== 'undefined') {
	declareSupportMissing('let scoping');
}

function declareSupportMissing(support) {
	alert('We\'re sorry, but the timesheet system relies on ' + support + ' support to function correctly, and, your browser doesn\'t support it! Please upgrade to a more recent browser, such as firefox, or ensure that your current browser is up to date.');
}

$(window).resize(function () {
	let borders = [0, 0, innerWidth - 20, innerHeight - 20]; // x, y, w, h

	$('body').find('div[data-name="mojs-shape"]').each(function() {
		let offset = $(this).offset();
		let noffset = { top: offset.top, left: offset.left };

		if((offset.x + offset.width) > borders[2]) noffset.left = borders[2] - offset.width;
		if((offset.y + offset.height) > borders[3]) noffset.top = borders[3] - offset.height;

		$(this).offset(noffset);
	});
});

// @license-end