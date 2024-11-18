// Create this file in your project root as shutdown.js
process.on('SIGINT', () => {
	console.log('\nGracefully shutting down...');
	const { exec } = require('child_process');
	
	exec('killall node npm esbuild', (error) => {
	  if (error) {
		console.log('Some processes may need manual cleanup');
	  }
	  process.exit(0);
	});
  });
  
  process.stdin.resume();