(function() {
  "use strict";
  
  var fs = require('fs')
    , path = require('path')
    , tar = require('tar')
    , zlib = require('zlib')
    , semver = require('semver')
    , exec = require('child_process').exec
    , request = require('ahr2')
    , pathSep = '/'
    , ಠ_ಠ = false
    ;

  if(process.platform === 'win32') {
    ಠ_ಠ = true;
    pathSep = '\\';
  }


  function installer(tarballLocation, packageName, newVer, selfUpdate, responder, server) {
    if(!selfUpdate) {
      request.get(tarballLocation).when(pullAndSave);
    } else {
      request.get(server + "/releases/" + newVer + "/browser.tgz").when(pullAndSave);
    }

    function pullAndSave(err, ahr, data) {
      console.log('gunzipping!');
      zlib.gunzip(data, saveTheTar);
    }

    function saveTheTar(err, tarball) {
      console.log('about to write');
      fs.open(__dirname
              + pathSep + 'downloads' + pathSep
              + packageName
              + '-'
              + newVer
              + '.tar'
            , 'w'
            , parseInt('0644', 8)
            , function(err, fd) {
        if(err) {
          console.log("Error opening file:", err);
          return;
        }
        fs.write(fd, tarball, 0, tarball.length, null, function(err, written, buffer) {
          if(err && !selfUpdate) {
            console.error(err);
            responder.end(JSON.stringify({success: false, data: err}));
            return;
          }
          console.log('File Written!!');
          untarAndInstall();
        });
      });
    }

    function untarAndInstall() {
      var packagePath
        ,  tempPath = __dirname + pathSep + 'apps' + pathSep + 'vhosts' + pathSep;
        ;
      if(!selfUpdate) {
        packagePath = tempPath + packageName + '.local.apps.spotterrf.com' + pathSep;
      } else {
        packagePath = __dirname;
        tempPath = __dirname;
      }
      if(!path.exists(packagePath)) {
        console.log('PACKAGEPATH', packagePath);
        //fs.mkdirSync(packagePath, parseInt('0755', 8));
      }
      fs.createReadStream(__dirname + pathSep + 'downloads' + pathSep + packageName + '-' + newVer + '.tar')
        .pipe(tar.Extract({path: tempPath}))
        .on("error", function(er) {
          console.error("error during extraction:", er);
          if(!selfUpdate) {
            responder.end(JSON.stringify({success: false, data: er}));
          }
        })
        .on("end", function() {
          if(selfUpdate) {
            process.exit();
          } else {
            fs.renameSync(tempPath + pathSep + 'package' + pathSep, packagePath);
            console.log(packageName + ' is installed!\nNow installing its dependencies.');
            installDeps(packageName);
          }
        })
    }

    function installDeps(packageName) {
      var child = exec("cd "  + __dirname
                              + pathSep + "apps" + pathSep + "vhosts" + pathSep
                              + packageName
                              + ".local.apps.spotterrf.com && npm install"
                    , function(error, stdout, stderr) {
        if(error) {
          console.error("Problem installing dependencies: ", error);
          return;
        }
        console.log(stdout);
        console.log(stderr);
        if(!selfUpdate) {
          responder.end(JSON.stringify({success: true, data: packageName + " installed!"}));
          console.log('request to restart is about to fire!!!');
    //      request.post('http://spotter:spotterappsrestart@' + packageName + '.local.apps.spotterrf.com:8080/github-hook');
          process.exit();
        }
      });
     
   
    }
  }

  module.exports = installer;

}());
