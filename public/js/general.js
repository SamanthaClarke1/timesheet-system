/* Code written by Samuel J. Clarke, May-June 2018, for CumulusVFX. */

var rKeys = [];
var easterEggString = "me me big boy"

$('document').ready(function() {
    if(window.location.href.indexOf("err=") != -1) window.history.pushState("", "",window.location.href.split("err=")[0]);

    highlightCurrentPage();

    $('body').keypress(function(e) {
        rKeys.push(e.key);
        while(rKeys.length > easterEggString.length) rKeys.shift();
        if(rKeys.join('') == easterEggString) alert(easterEggString);
    });
});

pageToNaviDict = {
    "login": "login",
    "changepassword": "account",
    "signup": "adduser",
    "planner": "planner",
    "analytics": "analytics",
    "logout": "logout",
    "help": "help",
    "usercosts": "usercosts",
    "": "home"
}

function highlightCurrentPage () {
    var href = window.location.href;
    var locArr = href.split('/');
    locArr.splice(0, 3);
    for(var loc of locArr) {
        var navi = pageToNaviDict[loc] || loc;
        $("#"+navi+"-navi").children().first().removeClass("dim");
    }
}