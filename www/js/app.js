var app = angular.module('starter', ['ionic', 'ngCordova', 'deviceGyroscope', 'firebase']);

app.run(function ($ionicPlatform) {
  $ionicPlatform.ready(function () {
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
});

app.controller('MotionController', function ($scope, $ionicPlatform, $cordovaDeviceMotion, $deviceGyroscope, $firebaseObject, $firebaseArray, $cordovaGeolocation) {



  $scope.options = {
    frequency: 100 // Measure every 100ms
  };


  // Current measurements
  $scope.measurements = {
    x_a: null,
    y_a: null,
    z_a: null,
    x_g: null,
    y_g: null,
    z_g: null,
    timestamp: null,
    timestamp2: null,
    second: 30
  }

  // Watcher object
  $scope.watch = null;
  $scope.watch2 = null;
  $scope.watch3 = null;

  var ref = firebase.database().ref();
  var ref2 = firebase.database().ref("realtime");
  var obj = $firebaseObject(ref2);
  const beta = 0.033;
  const gravity = 9.80665;

  // Start measurements when Cordova device is ready
  $ionicPlatform.ready(function () {

    var madgwick = new AHRS({

      /*
       * The sample interval, in Hz.
       */
      sampleInterval: $scope.options.frequency,

      /*
       * Choose from the `Madgwick` or `Mahony` filter.
       */
      algorithm: 'Madgwick',

      /*
       * The filter noise value, smaller values have
       * smoother estimates, but have higher latency.
       * This only works for the `Madgwick` filter.
       */
      beta: beta
    });
    var posOptions = { timeout: 10000, enableHighAccuracy: false };
    $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
      var lat = position.coords.latitude;
      var long = position.coords.longitude;
      var altitude = position.coords.altitude;
      var accuracy = position.coords.accuracy;
      var heading = position.coords.heading;
      var velocity = position.coords.velocity;
      var altitudeAccuracy = position.coords.altitudeAccuracy;
    }, function (err) {
      // error
    });
    var x_a, y_a, z_a, timestamp, x_g, y_g, z_g, date, timestamp2, initQ, tmpQ, cnt = 0,
      sum3 = 0,
      sum6 = 0,
      judgeTime3 = 0,
      judgeTime6 = 0,
      judgeCnt3L = 0,
      judgeCnt3R = 0,
      judgeCnt6 = 0,
      speed = 0,
      acc = 0,
      errorAngle3 = errorAngle6 = false;
    var sensorQueue = [];
    var compareQueue = [];
    var rotationAng = [];
    var uturnAng = [];
    var rotationCntL = [];
    var rotationCntR = [];
    var uturnCnt = [];
    var rotationErr = [];
    var uturnErr = [];
    var accQueue = [];
    var speedQueue = [];
    var speedList = [];
    const calTime = 6000;

    //Start Watching method
    $scope.startWatching = function () {
      if (cnt == 0) {

        var MaxQueue = ($scope.measurements.second * 200) / $scope.options.frequency;
        var errorRate = 0.04 / (1000 / $scope.options.frequency);


        for (var i = 0; i < MaxQueue; i++)
          compareQueue.push(0);

        for (var i = 0; i < 10 + Math.round(MaxQueue / 6) - 2; i++)
          speedList.push(0);

        // Device motion configuration
        $scope.watch = $cordovaDeviceMotion.watchAcceleration($scope.options);
        $scope.watch2 = $deviceGyroscope.watch($scope.options);

        var watchOptions = {
          timeout: 3000,
          enableHighAccuracy: false
          // may cause errors if true
        };

        $scope.watch3 = $cordovaGeolocation.watchPosition(watchOptions);

        $scope.interval = setInterval(function () {
          $scope.watch3.then(function () { /* Not  used */ }, function (err) {
            // An error occurred.
            alert('code: ' + err.code + '\n' +
              'message: ' + err.message + '\n');
          }, function (position) {
            // Active updates of the position here
            // position.coords.[ latitude / longitude]
            var speedG = position.coords.latitude;
            speedList.push(speedG.toFixed(2));
            $scope.measurements.test = speedG;
          });
        }, 1000);
        // Device motion initilaization
        $scope.watch.then(null, function (error) {
          console.log('Error');
        }, function (result) {

          // Set current Acc data
          x_a = result.x;
          y_a = result.y;
          z_a = result.z;
          timestamp = result.timestamp;


        });



        // Device motion initilaization
        $scope.watch2.then(null, function (error) {
          console.log('Error');
        }, function (result) {

          // Set current Gyro data
          x_g = result.x;
          y_g = result.y;
          z_g = result.z;
          timestamp2 = result.timestamp;

          madgwick.update(x_g, y_g, z_g, x_a, y_a, z_a, cnt);

          if (cnt == calTime / $scope.options.frequency) {
            initQ = madgwick.conj(); //Current posture estimation
            date = Date();
          }
          if (cnt > calTime / $scope.options.frequency) {
            tmpQ = madgwick.getQuaternion();


            //gravity compensation
            x_a -= gravity * (2 * (tmpQ.x * tmpQ.z - tmpQ.w * tmpQ.y));
            y_a -= gravity * (2 * (tmpQ.w * tmpQ.x + tmpQ.y * tmpQ.z));
            z_a -= gravity * (tmpQ.w * tmpQ.w - tmpQ.x * tmpQ.x - tmpQ.y * tmpQ.y + tmpQ.z * tmpQ.z);

            accQueue.push(Math.sqrt(Math.pow(x_a, 2) + Math.pow(y_a, 2) + Math.pow(z_a, 2)));




            if (!!accQueue[Math.round(MaxQueue / 6) - 1]) {
              speedQueue.push(accQueue[Math.round(MaxQueue / 6) - 1] - accQueue[Math.round(MaxQueue / 6) - 2]);
              // acc = (speedQueue.reduce(function(a, b) {
              //   return a + b;
              // })) * (3600 / 1000);

              accQueue.shift();
            }


            if (!!speedQueue[9]) {
              let sum = (speedQueue.reduce(function (a, b) {
                return a + b;
              }) / 10) * (3600 / 1000);

              speed += sum;

              if (speed < 0)
                speed = 0;


              if (cnt % 10 == 0) {
                obj.speed = Math.round(speed);
                obj.$save().then(function (ref) {
                  ref.key() === obj.$id; // true
                }, function (error) {
                  console.log("Error:", error);
                });
              }

              // speedList.push(speed.toFixed(2));

              speedQueue.shift();
            }










            //calibration
            madgwick.set(madgwick.multiply(initQ));
            sensorQueue.push(madgwick.getEulerAnglesDegrees().yaw);

            //angle calculate
            if (!!sensorQueue[1]) {
              if ((sensorQueue[0] - sensorQueue[1]) > 300) {
                compareQueue.push((sensorQueue[0] - sensorQueue[1]) - 360 - errorRate);
              } else if ((sensorQueue[0] - sensorQueue[1]) < -300) {
                compareQueue.push((sensorQueue[0] - sensorQueue[1]) + 360 - errorRate);
              } else {
                compareQueue.push(sensorQueue[0] - sensorQueue[1] - errorRate);
              }
              sensorQueue.shift();
            }



            //error calculate
            errorAngle3 = errorAngle6 = false;
            for (var i = 0; i <= MaxQueue - Math.round(MaxQueue / 6); i++) {
              if (Math.abs(compareQueue.slice(i, i + Math.round(MaxQueue / 6)).reduce(function (a, b) {
                return a + b;
              })) > 60)
                errorAngle6 = true;
            }
            for (var i = MaxQueue / 2; i <= MaxQueue - Math.round(MaxQueue / 6); i++) {
              if (Math.abs(compareQueue.slice(i, i + Math.round(MaxQueue / 6)).reduce(function (a, b) {
                return a + b;
              })) > 60)
                errorAngle3 = true;
            }


            //angle judgement
            sum3 = compareQueue.slice(MaxQueue / 2, MaxQueue).reduce(function (a, b) {
              return a + b;
            });
            sum6 = compareQueue.slice(0, MaxQueue).reduce(function (a, b) {
              return a + b;
            });



            //rotation judge
            if (cnt - judgeTime3 > MaxQueue / 2 && !errorAngle3 && speed > 25) {

              if (sum3 < -60 && sum3 > -120) {
                judgeCnt3L++;
                judgeTime3 = cnt;

                obj.rotationL = judgeCnt3L;
                obj.$save().then(function (ref) {
                  ref.key() === obj.$id; // true
                }, function (error) {
                  console.log("Error:", error);
                });
              }

              if (sum3 > 60 && sum3 < 120) {
                judgeCnt3R++;
                judgeTime3 = cnt;

                obj.rotationR = judgeCnt3R;
                obj.$save().then(function (ref) {
                  ref.key() === obj.$id; // true
                }, function (error) {
                  console.log("Error:", error);
                });
              }

            }

            //uturn judge
            if (cnt - judgeTime6 > MaxQueue && !errorAngle6 && speed > 20) {

              if (Math.abs(sum6) > 160 && Math.abs(sum6) < 180) {
                judgeCnt6++;
                judgeTime6 = cnt;

                obj.uturn = judgeCnt6;
                obj.$save().then(function (ref) {
                  ref.key() === obj.$id; // true
                }, function (error) {
                  console.log("Error:", error);
                });
              }
            }


            rotationAng.push(sum3.toFixed(2));
            uturnAng.push(sum6.toFixed(2));
            rotationCntL.push(judgeCnt3L);
            rotationCntR.push(judgeCnt3R);
            uturnCnt.push(judgeCnt6);
            rotationErr.push(errorAngle3);
            uturnErr.push(errorAngle6);


            compareQueue.shift();

          }

          $scope.measurements.speed = speed.toFixed(2);
          // $scope.measurements.acc = acc.toFixed(2);
          $scope.measurements.cnt = cnt;
          $scope.measurements.sum = sum3.toFixed(2);
          $scope.measurements.sumU = sum6.toFixed(2);
          $scope.measurements.alertL = judgeCnt3L;
          $scope.measurements.alertR = judgeCnt3R;
          $scope.measurements.alertU = judgeCnt6;
          $scope.measurements.error3 = errorAngle3;
          $scope.measurements.error6 = errorAngle6;



          if (cnt > calTime / $scope.options.frequency)
            madgwick.set(tmpQ);

          cnt++;

        });



      }

    };

    // Stop watching method
    $scope.stopWatching = function () {
      compareQueue = [];
      sensorQueue = [];
      accQueue = [];
      speedQueue = [];
      judgeTime3 = judgeTime6 = 0;
      speed = 0;
      acc = 0;
      accQueue = [];

      $scope.watch.clearWatch();
      $scope.watch2.clearWatch();
      $scope.watch3.clearWatch();
      clearInterval($scope.interval);
      $scope.measurements.cnt = cnt = 0;
      $scope.measurements.sum = sum3 = 0;
      $scope.measurements.sumU = sum6 = 0;
      $scope.measurements.alertL = judgeCnt3L = obj.rotationL = 0;
      $scope.measurements.alertR = judgeCnt3R = obj.rotationR = 0;
      $scope.measurements.alertU = judgeCnt6 = obj.uturn = 0;
      $scope.measurements.speed = speed = obj.speed = 0;

      obj.$save().then(function (ref) {
        ref.key() === obj.$id; // true5
      }, function (error) {
        console.log("Error:", error);
      });


      let list = $firebaseArray(ref);
      let logData = {
        date,
        rotationAng,
        uturnAng,
        rotationCntL,
        rotationCntR,
        uturnCnt,
        rotationErr,
        uturnErr,
        speedList
      }
      list.$add(logData).then(function (ref) {
        var id = ref.key();
        console.log("added record with id " + id);
        list.$indexFor(id); // returns location in the array
      });


      rotationAng = [];
      uturnAng = [];
      rotationCntL = [];
      rotationCntR = [];
      uturnCnt = [];
      rotationErr = [];
      uturnErr = [];
      speedList = [];



    }


  });

  $scope.$on('$ionicView.beforeLeave', function () {
    $scope.watch.clearWatch(); // Turn off motion detection watcher
    $scope.watch2.clearWatch(); // Turn off motion detection watcher
  });

});
