/* Code written by Samuel J. Clarke, May-June 2018, for CumulusVFX. */

$('document').ready(function() {
    if(window.location.href.indexOf("err=") != -1) window.history.pushState("", "",window.location.href.split("err=")[0]);
});
