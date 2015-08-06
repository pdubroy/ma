// See http://www.browsersync.io/docs/options/ for more information.
require('browser-sync')({
  files: ['*'],
  server: {baseDir: '../..'},
  startPath: '/examples/tui/index.html'
});
