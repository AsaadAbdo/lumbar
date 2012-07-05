var assert = require('assert'),
    fs = require('fs'),
    lib = require('./lib'),
    lumbar = require('../lib/lumbar'),
    watch = require('./lib/watch'),
    wrench = require('wrench');

if (!watch.canWatch()) {
  // Watch is unsupported on 0.4 and earlier, no tests for this case
  exports['nop'] = function(done) {
    done();
  };
  return;
}

function runWatchTest(srcdir, config, operations, expectedFiles, expectedDir, done) {
  var testdir = lib.testDir(this.title, 'example'),
      outdir = lib.testDir(this.title, 'test'),
      seenFiles = [];
  this.title += ' ' + outdir;

  wrench.copyDirSyncRecursive(srcdir, testdir);

  function complete(err) {
    process.removeListener('uncaughtException', complete);
    done();
  }
  process.on('uncaughtException', complete);

  var arise = lumbar.init(testdir + '/' + config, {packageConfigFile: 'config/dev.json', outdir: outdir});
  arise.on('output', function(status) {
    var statusFile = status.fileName.substring(outdir.length);
    if (!expectedFiles.some(function(fileName) { return statusFile === fileName; })) {
      arise.unwatch();
      assert.fail(undefined, status.fileName,  'watchFile:' + statusFile + ': missing from expected list');
    } else {
      seenFiles.push(statusFile);
    }
    var seen = seenFiles.length;
    setTimeout(function() {
      operations[seen] && operations[seen](testdir);
    }, 0);
    if (seenFiles.length < expectedFiles.length) {
      return;
    }

    arise.unwatch();

    seenFiles = seenFiles.sort();
    expectedFiles = expectedFiles.sort();
    assert.deepEqual(seenFiles, expectedFiles, 'watchFile: seen file list matches');

    lib.assertExpected(outdir, expectedDir, 'watchfile: ' + outdir);

    // Cleanup (Do cleanup here so the files remain for the failure case)
    wrench.rmdirSyncRecursive(testdir);
    wrench.rmdirSyncRecursive(outdir);

    complete();
  });

  var retCount = 0;
  arise.watch(undefined, function(err) {
    err = err || new Error('Callback called without fatal error');
    throw err;
  });
}

exports['watch-script'] = function(done) {
  var expectedFiles = [
          '/android/native-home.js', '/android/native-home.css', '/android/native-home@1.5x.css',
              '/iphone/native-home.js', '/iphone/native-home.css', '/iphone/native-home@2x.css',
              '/web/base.js', '/web/base.css', '/web/base@2x.css', '/web/home.js', '/web/home.css', '/web/home@2x.css',
              '/web/index.html', '/web/web-file.txt',
              '/iphone/index.html', '/iphone/iphone-file.txt',
              '/android/index.html', '/android/android-file.txt',
          '/android/native-home.js', '/android/native-home.css', '/android/native-home@1.5x.css',
              '/iphone/native-home.js', '/iphone/native-home.css', '/iphone/native-home@2x.css',
              '/web/base.js', '/web/base.css', '/web/base@2x.css', '/web/home.js', '/web/home.css', '/web/home@2x.css',
              '/web/index.html', '/web/web-file.txt',
              '/iphone/index.html', '/iphone/iphone-file.txt',
              '/android/index.html', '/android/android-file.txt',
          '/android/native-home.js', '/iphone/native-home.js',
              '/web/web-file.txt', '/iphone/iphone-file.txt', '/android/android-file.txt',
          '/android/native-home.js', '/iphone/native-home.js',
              '/web/web-file.txt', '/iphone/iphone-file.txt', '/android/android-file.txt',
          '/android/native-home.js', '/iphone/native-home.js', '/web/home.js'
        ],
      operations = {
        18: function(testdir) {
          // Modify the config file
          watch.appendSpace(testdir + '/lumbar.json');
        },
        36: function(testdir) {
          // Modify the bridge file
          watch.appendSpace(testdir + '/js/bridge.js');
        },
        41: function(testdir) {
          watch.appendRapidSpace(testdir + '/js/bridge.js', testdir + '/js/bridge-iphone.js');
        },
        46: function(testdir) {
          // Modify the home template
          watch.appendSpace(testdir + '/templates/home/home.handlebars');
        }
      };

  runWatchTest.call(this,
    'test/example', 'lumbar.json',
    operations, expectedFiles, 'test/expected/example',
    done);
};

exports['watch-style'] = function(done) {
  var expectedFiles = [
          '/iphone/native.css', '/iphone/base.css', '/iphone/home.css', '/web/base.css', '/web/home.css',
          '/iphone/native.css', '/iphone/base.css', '/iphone/home.css', '/web/base.css', '/web/home.css',
          '/iphone/native.css', '/iphone/base.css', '/web/base.css',
          '/iphone/native.css', '/iphone/base.css', '/web/base.css'
        ],
      operations = {
        5: function(testdir) {
          watch.appendSpace(testdir + '/styles.json');
        },
        10: function(testdir) {
          watch.appendSpace(testdir + '/styles/base.css');
        },
        13: function(testdir) {
          watch.appendRapidSpace(testdir + '/styles/base.css', testdir + '/styles/iphone.css');
        }
      };

  runWatchTest.call(this,
    'test/artifacts', 'styles.json',
    operations, expectedFiles, 'test/expected/styles-watch',
    done);
};

exports['watch-stylus'] = function(done) {
  var expectedFiles = [
          '/iphone/base.css', '/iphone/base@2x.css', '/web/base.css',
          '/iphone/base.css', '/iphone/base@2x.css', '/web/base.css',
          '/iphone/base.css', '/iphone/base@2x.css',
          '/iphone/base.css', '/iphone/base@2x.css', '/web/base.css'
        ],
      operations = {
        3: function(testdir) {
          watch.appendSpace(testdir + '/stylus.json');
        },
        6: function(testdir) {
          watch.append(testdir + '/styles/iphone.styl', '\nfoo\n  bar 1');
        },
        8: function(testdir) {
          watch.appendRapidSpace(testdir + '/styles/base.styl', testdir + '/styles/iphone.styl');
        }
      };

  runWatchTest.call(this,
    'test/artifacts', 'stylus.json',
    operations, expectedFiles, 'test/expected/stylus-watch',
    done);
};

exports['watch-dir'] = function(done) {
  var expectedFiles = [
          '/base.js', '/base.js'
        ],
      operations = {
        1: function(testdir) {
          watch.appendSpace(testdir + '/js/iphone.js');
        }
      };

  runWatchTest.call(this,
    'test/artifacts', 'single-directory.json',
    operations, expectedFiles, 'test/expected/watch-dir',
    done);
};

exports['watch-add'] = function(done) {
  var expectedFiles = [
          '/base.js', '/base.js'
        ],
      operations = {
        1: function(testdir) {
          fs.writeFileSync(testdir + '/js/home/home2.js', ' ');
        }
      };

  runWatchTest.call(this,
    'test/artifacts', 'single-directory.json',
    operations, expectedFiles, 'test/expected/watch-add',
    done);
};

exports['watch-remove'] = function(done) {
  var expectedFiles = [
          '/base.js', '/base.js', '/base.js' /* Extra event for directory modification */
        ],
      operations = {
        1: function(testdir) {
          fs.unlinkSync(testdir + '/js/home/home.js');
        }
      };

  runWatchTest.call(this,
    'test/artifacts', 'single-directory.json',
    operations, expectedFiles, 'test/expected/watch-remove',
    done);
};
