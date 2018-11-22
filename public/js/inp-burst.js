/* eslint-env browser, es6, jquery */

// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

$(document).ready(() => {
	$('#main-submit-btn').click(() => {
		$('form#main-form').validate();
		if ($('form#main-form').valid()) {
			var srcEl = $('#main-submit-btn');
			var coords = { x: srcEl.offset().left + srcEl.width(), y: srcEl.offset().top + srcEl.height() / 2 };
			littleburst.tune(coords).generate();
			littleburst_timeline.replay();
		}
	});
});

// @license-end