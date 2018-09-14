/* Code written by Samuel J. Clarke, May-June 2018, for CumulusVFX. */

$('document').ready(function() {
    if(window.location.href.indexOf("err=") != -1) window.history.pushState("", "",window.location.href.split("err=")[0]);

    highlightCurrentPage();
});

pageToNaviDict = {
    "login": "login",
    "changepassword": "account",
    "signup": "adduser",
    "planner": "planner",
    "analytics": "analytics",
    "logout": "logout",
    "help": "help",
    "": "home"
}

function highlightCurrentPage () {
    var href = window.location.href;
    var locArr = href.split('/');
    locArr.splice(0, 3);
    for(var loc of locArr) {
        $("#"+pageToNaviDict[loc]+"-navi").children().first().removeClass("dim");
    }
}
