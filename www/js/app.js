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

app.controller('MotionController', function ($scope, $ionicPlatform, $cordovaDeviceMotion, $deviceGyroscope, $firebaseObject, $firebaseArray, $ionicLoading, $cordovaGeolocation) {

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
    second: 8
  }

  // Watcher object
  $scope.watch = null;
  $scope.watch2 = null;


  var ref = firebase.database().ref();
  var ref2 = firebase.database().ref("realtime");
  var obj = $firebaseObject(ref2);
  const beta = 0.033;
  const gravity = 9.80665;
  const speedLimit = 25;


  // var obj2 = $firebaseObject(ref);
  // obj.$remove();
  // obj2.$remove();
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
    var x_a, y_a, z_a, x_g, y_g, z_g, date, initQ, tmpQ, cnt = 0,
      sum3 = 0,
      sum6 = 0,
      judgeTime3 = 0,
      judgeTime6 = 0,
      judgeTimeAcc = 0,
      judgeTimeDcc = 0,
      judgeTimeStart = 0,
      judgeTimeStop = 0,
      judgeTimeSL = 0,
      judgeTimeLSL = 0,
      judgeCntSL = 0,
      judgeCntLSL = 0,
      judgeCnt3L = 0,
      judgeCnt3R = 0,
      judgeCnt6 = 0,
      judgeCntAcc = 0,
      judgeCntStart = 0,
      judgeCntDcc = 0,
      judgeCntStop = 0,
      judgeCntCC = 0,
      judgeCntCF = 0,
      speed = 0,
      acc = 0,
      angularVel = 0,
      angularVelFor5 = 0,
      CntLSL = 0,
      errorAngle3 = errorAngle6 = false;
    var sensorQueue = [];
    var compareQueue = [];
    var rotationAng = [];
    var uturnAng = [];
    var rotationCntL = [];
    var rotationCntR = [];
    var uturnCnt = [];
    var SLCnt = [];
    var LSLCnt = [];
    var AccCnt = [];
    var StartCnt = [];
    var DccCnt = [];
    var StopCnt = [];
    var CCCnt = [];
    var CFCnt = [];
    var rotationErr = [];
    var uturnErr = [];
    var accQueue = [];
    var speedList = [];
    var accList = [];
    const calTime = 6000;
    const secondCnt = (1000 / $scope.options.frequency);

    //Start Watching method
    $scope.startWatching = function () {
      if (cnt == 0) {

         var inputLat;
    var long;
    var gpsSpeed = 0;
    var accuracy;
    var myLatlng;
    var pointList = [];

    $ionicLoading.show({
      template: '<ion-spinner icon="bubbles"></ion-spinner><br/>Acquiring location!'
    });

    var posOptions = {
      enableHighAccuracy: true,
      timeout: 3000,
      maximumAge: 0
    };
    $scope.interval = setInterval(function() {
      $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position) {
        inputLat = position.coords.latitude;
        long = position.coords.longitude;
        gpsSpeed = position.coords.speed;
        gpsSpeed *= 3.6;
        //accuracy = position.coords.accuracy;
        myLatlng = new google.maps.LatLng(inputLat, long);
        pointList.push({
          lat: inputLat,
          lng: long
        });

        $scope.measurements.speedG = gpsSpeed.toFixed(2);
        $scope.measurements.timestamp = position.timestamp;
        $ionicLoading.hide();

        var mapOptions = {
          center: myLatlng,
          zoom: 16,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        var polyOption = {
          path: pointList,
          geodesic: true,
          strokeColor: 'red',
          strokeOpacity: 1.0,
          strokeWeight: 3.0,
          icons: [{ //방향을 알기 위한 화살표 표시
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
            },
            offset: '100%',
            repeat: '150px'
          }]
        }

        var map = new google.maps.Map(document.getElementById("pathmap"), mapOptions);
        var poly = new google.maps.Polyline(polyOption);
        poly.setMap(map);
        $scope.map = map;

      }, function(err) {
        $ionicLoading.hide();
        console.log(err);
      });
    }, 1000);


        var MaxQueue = ($scope.measurements.second * 200) / $scope.options.frequency;
        var errorRate = 0.04 / secondCnt;


        for (var i = 0; i < MaxQueue; i++)
          compareQueue.push(0);



        // Device motion configuration
        $scope.watch = $cordovaDeviceMotion.watchAcceleration($scope.options);
        $scope.watch2 = $deviceGyroscope.watch($scope.options);

        // Device motion initilaization
        $scope.watch.then(null, function (error) {
          console.log('Error');
        }, function (result) {

          // Set current Acc data
          x_a = result.x;
          y_a = result.y;
          z_a = result.z;


        });



        // Device motion initilaization
        $scope.watch2.then(null, function (error) {
          console.log('Error');
        }, function (result) {

          // Set current Gyro data
          x_g = result.x;
          y_g = result.y;
          z_g = result.z;

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



            //acc calculate
            if (!!accQueue[10]) {
              acc = (accQueue[10] - accQueue[0]) * (3600 / 1000);
              accList.push(acc.toFixed(2));
              accQueue.shift();
              obj.accVel = Math.round(acc);
              obj.$save().then(function (ref) {
                ref.key() === obj.$id; // true
              }, function (error) {
                console.log("Error:", error);
              });
            }

            //speed calculate
            let sum = acc / secondCnt;
            speed += sum;
            if (speed < 0)
              speed = 0;
            speedList.push(speed.toFixed(2));


            //send speed to the server in realtime
            obj.speed = Math.round(speed);
            obj.$save().then(function (ref) {
              ref.key() === obj.$id; // true
            }, function (error) {
              console.log("Error:", error);
            });


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


            //angularVel calculate

            angularVel = compareQueue[MaxQueue - 1 - Math.round(MaxQueue * (3 / 6))] - compareQueue[MaxQueue - 1 - Math.round(MaxQueue * (4 / 6))];

            //angularVelFor5 calculate

            angularVelFor5 = compareQueue[MaxQueue - 1] - compareQueue[Math.round(MaxQueue / 6 - 1)];



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

            //급가속
            if (cnt - judgeTimeAcc > MaxQueue && speed >= 6 && acc >= 8) {
              judgeCntAcc++;
              judgeTimeAcc = cnt;
              obj.acc = judgeCntAcc;
              obj.$save().then(function (ref) {
                ref.key() === obj.$id; // true
              }, function (error) {
                console.log("Error:", error);
              });
            }
            //급출발
            if (cnt - judgeTimeStart > secondCnt && speed <= 5 && acc >= 8) {
              judgeCntStart++;
              judgeTimeStart = cnt;
              obj.start = judgeCntStart;
              obj.$save().then(function (ref) {
                ref.key() === obj.$id; // true
              }, function (error) {
                console.log("Error:", error);
              });
            }

            //급감속
            if (cnt - judgeTimeDcc > MaxQueue && speed >= 6 && acc <= -14) {
              judgeCntDcc++;
              judgeTimeDcc = cnt;
              obj.dcc = judgeCntDcc;
              obj.$save().then(function (ref) {
                ref.key() === obj.$id; // true
              }, function (error) {
                console.log("Error:", error);
              });
            }

            //급정지
            if (cnt - judgeTimeStop > secondCnt && speed <= 5 && acc <= -14) {
              judgeCntStop++;
              judgeTimeStop = cnt;
              obj.stop = judgeCntStop;
              obj.$save().then(function (ref) {
                ref.key() === obj.$id; // true
              }, function (error) {
                console.log("Error:", error);
              });
            }

            //급진로변경 && 급앞지르기
            if (speed >= 20 && Math.abs(angularVel) >= 10 && Math.abs(angularVelFor5) <= 2) {
              if (acc <= 2)
                judgeCntCC++;

              if (acc >= 3)
                judgeCntCF++;

              obj.CC = judgeCntCC;
              obj.CF = judgeCntCF;
              obj.$save().then(function (ref) {
                ref.key() === obj.$id; // true
              }, function (error) {
                console.log("Error:", error);
              });

            }

            //과속
            if (cnt - judgeTimeSL > secondCnt * 3 && speed >= speedLimit) {
              judgeCntSL++;
              judgeTimeSL = cnt;
              obj.SL = judgeCntSL;
              obj.$save().then(function (ref) {
                ref.key() === obj.$id; // true
              }, function (error) {
                console.log("Error:", error);
              });
            }

            //장기과속
            if (speed >= speedLimit) {

              CntLSL++;

              if (cnt - judgeTimeLSL > secondCnt * 3 && CntLSL >= secondCnt*20) {
                judgeCntLSL++;
                judgeTimeLSL = cnt;
                obj.LSL = judgeCntLSL;
                obj.$save().then(function (ref) {
                  ref.key() === obj.$id; // true
                }, function (error) {
                  console.log("Error:", error);
                });
              }
            }
            else {
              CntLSL = 0;
            }


            //데이터 저장
            rotationAng.push(sum3.toFixed(2));
            uturnAng.push(sum6.toFixed(2));
            rotationCntL.push(judgeCnt3L);
            rotationCntR.push(judgeCnt3R);
            uturnCnt.push(judgeCnt6);
            SLCnt.push(judgeCntSL);
            LSLCnt.push(judgeCntLSL);
            AccCnt.push(judgeCntAcc);
            StartCnt.push(judgeCntStart);
            DccCnt.push(judgeCntDcc);
            StopCnt.push(judgeCntStop);
            CCCnt.push(judgeCntCC);
            CFCnt.push(judgeCntCF);
            rotationErr.push(errorAngle3);
            uturnErr.push(errorAngle6);


            compareQueue.shift();

          }

          //$scope.measurements.test = angularVelFor5.toFixed(2);
          $scope.measurements.acc = acc.toFixed(2);
          $scope.measurements.speed = speed.toFixed(2);
          $scope.measurements.ang = angularVel.toFixed(2);
          $scope.measurements.cnt = cnt;
          $scope.measurements.alertAcc = judgeCntAcc;
          $scope.measurements.alertStart = judgeCntStart;
          $scope.measurements.alertDcc = judgeCntDcc;
          $scope.measurements.alertStop = judgeCntStop;
          $scope.measurements.alertCC = judgeCntCC;
          $scope.measurements.alertCF = judgeCntCF;
          $scope.measurements.alertSL = judgeCntSL;
          $scope.measurements.alertLSL = judgeCntLSL;
          $scope.measurements.alertL = judgeCnt3L;
          $scope.measurements.alertR = judgeCnt3R;
          $scope.measurements.alertU = judgeCnt6;
          // $scope.measurements.sum = sum3.toFixed(2);
          // $scope.measurements.sumU = sum6.toFixed(2);
          // $scope.measurements.error3 = errorAngle3;
          // $scope.measurements.error6 = errorAngle6;



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

      $scope.watch.clearWatch();
      $scope.watch2.clearWatch();
      clearInterval($scope.interval);
      $scope.measurements.cnt = cnt = 0;
      $scope.measurements.sum = sum3 = 0;
      $scope.measurements.sumU = sum6 = 0;
      $scope.measurements.alertL = judgeCnt3L = obj.rotationL = 0;
      $scope.measurements.alertR = judgeCnt3R = obj.rotationR = 0;
      $scope.measurements.alertU = judgeCnt6 = obj.uturn = 0;
      $scope.measurements.alertAcc = judgeCntAcc = obj.acc = 0;
      $scope.measurements.alertDcc = judgeCntDcc = obj.dcc = 0;
      $scope.measurements.alertStart = judgeCntStart = obj.start = 0;
      $scope.measurements.alertStop = judgeCntStop = obj.stop = 0;
      $scope.measurements.alertCC = judgeCntCC = obj.CC = 0;
      $scope.measurements.alertCF = judgeCntCF = obj.CF = 0;
      $scope.measurements.alertSL = judgeCntSL = obj.SL = 0;
      $scope.measurements.alertLSL = judgeCntLSL = obj.LSL = 0;
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
        speedList,
        accList,
        SLCnt,
        LSLCnt,
        AccCnt,
        StartCnt,
        DccCnt,
        StopCnt,
        CCCnt,
        CFCnt
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
      accList = [];
      SLCnt = [];
      LSLCnt = [];
      AccCnt = [];
      StartCnt = [];
      DccCnt = [];
      StopCnt = [];
      CCCnt = [];
      CFCnt = [];



    }


  });

  $scope.$on('$ionicView.beforeLeave', function () {
    $scope.watch.clearWatch(); // Turn off motion detection watcher
    $scope.watch2.clearWatch(); // Turn off motion detection watcher
    clearInterval($scope.interval);
  });

});
