/* eslint-env browser, es6, jquery */

// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

var loadState = 0;

var rect_loaded = new mojs.Burst({
	left: 0,
	top: 0,
	radius: { 0: 60 },
	angle: 0,
	count: 'rand(5, 8)',
	children: {
		radius: 'rand(9, 15)',
		fill: '#71f2a7',
		direction: [ -1, 1 ],
		swirlSize: 'rand(10, 15)',
		swirlFrequency: 'rand(2, 4)',
		delay: 'rand(0, 30)',
		easing: 'quad.out',
		isSwirl: true,
		isForce3d: true,
		opacity: { 1: 0 },
	},
});
var rect_loader = new mojs.Shape({
	shape: 'polygon',
	points: 6,
	left: 0,
	top: 0,
	fill: 'none',
	radius: 20,
	stroke: { 'rgba(0, 255, 255, 1)': 'magenta' },
	strokeWidth: { 10: 0 },
	strokeDasharray: '100%',
	strokeDashoffset: { '-100%': '100%' },
	angle: { 0: 180 },

	duration: 2000,
	repeat: 999,
	onRepeatComplete: rect_loader_onRC,
}).then({
	fill: 'red',
	stroke: 'red',
	scale: { to: 0, easing: 'sin.in' },
});
function rect_loader_onRC(frwd, yoyo){
	if (loadState == 0) return;
	if (loadState == 1) {
		this.tune({ opacity: 0 }).generate().stop();
		rect_loaded.replay();
		return;
	}
}

// @license-end