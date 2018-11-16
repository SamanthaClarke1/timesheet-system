/* eslint-env browser, es6, jquery */

// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

const RADIUS = 28;

const littleburst = new mojs.Burst({
	left: 0,
	top: 0,
	radius: { 6: RADIUS - 7 },
	angle: 45,
	children: {
		shape: 'line',
		radius: RADIUS / 7.3,
		scale: 1,
		stroke: [ '#e6c79c', '#cddfa0', '#6fd08c', '#7b9ea8' ],
		strokeDasharray: '100%',
		strokeDashoffset: { '-100%': '100%' },
		degreeShift: 'stagger(0,rand(15, -15))',
		duration: 700,
		delay: 0,
		easing: 'quad.out',
	},
});
const littleburst_timeline = new mojs.Timeline({ speed: 1.5 });
littleburst_timeline.add(littleburst);

const delburst = new mojs.Burst({
	left: 0,
	top: 0,
	radius: { 0: RADIUS * 1.5 },
	count: 7,
	angle: { 0: 120 },
	children: {
		shape: 'polygon',
		radius: { 0: RADIUS },
		stroke: [ '#FF8A3B', '#E85810', '#FF4A26', '#E8180D', '#FF2052' ],
		degreeShift: 'stagger(0,rand(20, -20))',
		duration: 700,
		delay: 0,
		easing: 'quad.out',
	},
});
const delburst_timeline = new mojs.Timeline({ speed: 1.5 });
delburst_timeline.add(delburst);

const successburst = new mojs.Burst({
	left: 0,
	top: 0,
	radius: { 0: RADIUS * 1.5 },
	count: 'rand(6, 9)',
	angle: { 0: 90 },
	children: {
		shape: 'circle',
		radius: { 0: RADIUS },
		stroke: { '#8DFF08': '#C6E80C' },
		fill: { '#8DFF08': '#C6E80C' },
		degreeShift: 'stagger(0,rand(20, -20))',
		duration: 700,
		delay: 'rand(0, 100)',
		easing: 'quad.out',
	},
});
const successburst_timeline = new mojs.Timeline({ speed: 1.5 });
successburst_timeline.add(successburst);

const DURATION = 1000;

const smokeflow = new mojs.Burst({
	left: 0,
	top: 0,
	degree: 0,
	count: 'rand(2, 5)',
	radius: { 0: 150 },
	children: {
		fill: { '#E85810': '#FEFEFE' },
		pathScale: 'rand(0.5, 1)',
		radius: 'rand(12, 15)',
		swirlSize: 'rand(10, 15)',
		swirlFrequency: 'rand(2, 4)',
		direction: [ 1, -1 ],
		duration: `rand(${1 * DURATION}, ${2 * DURATION})`,
		delay: 'rand(0, 75)',
		easing: 'quad.out',
		isSwirl: true,
		isForce3d: true,
		opacity: { 1: 0 },
	},
});

const smokeflow_timeline = new mojs.Timeline({ speed: 1.5 });
smokeflow_timeline.add(smokeflow);

const SPARKDURATION = 800;

const sparkflow = new mojs.Burst({
	left: 0,
	top: 0,
	degree: -180,
	count: 'rand(3, 5)',
	radius: { 0: 80 },
	children: {
		fill: { '#78c0e0': '#0d3b66' },
		pathScale: 'rand(0.5, 1)',
		radius: 'rand(12, 15)',
		duration: `rand(${1 * DURATION}, ${2 * DURATION})`,
		delay: 'rand(0, 75)',
		easing: 'quad.out',
		isForce3d: true,
		opacity: { 1: 0 },
	},
});
const sparkflow_timeline = new mojs.Timeline({ speed: 1.5 });
sparkflow_timeline.add(sparkflow);

const sparkflowr = new mojs.Burst({
	left: 0,
	top: 0,
	degree: 180,
	count: 'rand(3, 5)',
	radius: { 0: 80 },
	children: {
		fill: { '#78c0e0': '#0d3b66' },
		pathScale: 'rand(0.5, 1)',
		radius: 'rand(12, 15)',
		duration: `rand(${1 * DURATION}, ${2 * DURATION})`,
		delay: 'rand(0, 75)',
		easing: 'quad.out',
		isForce3d: true,
		opacity: { 1: 0 },
	},
});
const sparkflowr_timeline = new mojs.Timeline({ speed: 1.5 });
sparkflowr_timeline.add(sparkflowr);

// @license-end