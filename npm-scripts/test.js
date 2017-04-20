const path = require('path');
const karma = require('karma');

const server = new karma.Server({
  configFile: path.join(__dirname, 'lib', 'karma.conf.js'),
  autoWatch: false,
  singleRun: true,
});
server.start();
