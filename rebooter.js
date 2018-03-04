const cp = require('child_process')
const fs = require('fs');
const Event = require('events')

const script = process.argv[2];
console.log('start')
const l = new Event()
const cb = (err, stdout, stderr) => {
	console.log(stdout)
	l.emit('end')
}
const rcb = () => {
	const p = cp.fork(script)
	p.on('close', () => {
		console.log('restart')
		rcb()
	})
}
l.on('end', rcb)
rcb()

/*
try{
const cp.exec('node main.js', (err, stdout, stderr) => {
	console.log('err:', err)
	console.log('stdout:', stdout)
	console.log('stderr:', stderr)
})
}catch (e) { console.log(e)}*/
