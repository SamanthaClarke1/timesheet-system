$(document).ready(function() {
    $("#main-submit-btn").click(function(e) {
        $("form#main-form").validate();
        if($("form#main-form").valid()) {
            var coords = { x: e.clientX, y: e.clientY };
            littleburst.tune(coords).generate();
            littleburst_timeline.replay();
        }
    });
});