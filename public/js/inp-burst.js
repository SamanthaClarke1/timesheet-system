$(document).ready(() => {
	$('#main-submit-btn').click(() => {
		$('form#main-form').validate();
		if ($('form#main-form').valid()) {
			var srcEl = $('#main-submit-btn');
			var coords = {x: srcEl.offset().left + srcEl.width(), y: srcEl.offset().top + srcEl.height() / 2};
			littleburst.tune(coords).generate();
			littleburst_timeline.replay();
		}
	});
});
