app.service('pathService', function () {
  var items = [];
  var id;
  // items = 10;

  return {
    increase: function () {
      items++;
      return items;
    },
    getX: function () {
      return items;
    },
    setItems: function (item) {
      items = item;
    },
    setId: function (id_) {
      id = id_;
    },
    getId: function (id_) {
      return items[id_];
    },
    getNaId: function () {
      return id;
    },
    getItems: function () {
      return items[id];
    }
  };
});

app.controller('AppCtrl', function ($scope, $ionicModal, $ionicPopover, $timeout, $location, $ionicPopup, ngFB) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Form data for the login modal
  $scope.loginData = {};

  //--------------------------------------------
  $scope.login = function (user) {

    if (typeof (user) == 'undefined') {
      $scope.showAlert('Please fill username and password to proceed.');
      return false;
    }

    if (user.username == 'demo@gmail.com' && user.password == 'demo') {
      $location.path('/tab/measure');
    } else {
      $scope.showAlert('Invalid username or password.');
    }

  };
  //--------------------------------------------
  $scope.logout = function () { $location.path('/app/login'); };
  //--------------------------------------------
  // An alert dialog
  $scope.showAlert = function (msg) {
    var alertPopup = $ionicPopup.alert({
      title: 'Warning Message',
      template: msg
    });
  };
   //--------------------------------------------
    /*
      install reference
        cordova plugin add cordova-plugin-inappbrowser
        https://github.com/ccoenraets/OpenFB
     */

    $scope.fbLogin = function () {
      ngFB.login({
        scope: 'email,publish_actions'
      }).then(
        function (response) {
          if (response.status === 'connected') {
            console.log('Facebook login succeeded');
            location.href = "#/tab/measure";
          } else {
            alert('Facebook login failed');
          }
        });
    };

    $scope.fbLogout = function () {
      facebookConnectPlugin.logout(function () {
        location.href = "#/login"
      }, function () {

      });
    };
  //--------------------------------------------
});
app.controller('measureCtrl', function ($scope, $ionicPlatform, $ionicSideMenuDelegate, $cordovaDeviceMotion, $deviceGyroscope, $firebaseObject, $firebaseArray, $ionicLoading, $cordovaGeolocation) {

  $scope.toggleLeft = function () {
    $ionicSideMenuDelegate.toggleLeft();
  };

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
    second: 30
  }

  // Watcher object
  $scope.watch = null;
  $scope.watch2 = null;
  $scope.watch3 = null;


  const beta = 0.033;
  const gravity = 9.80665;
  const speedLimit = 90;

  var ref2 = firebase.database().ref("realtime");
  var obj = $firebaseObject(ref2);


  // var obj2 = $firebaseObject(ref);
  // obj.$remove();
  // obj2.$remove();
  // Start measurements when Cordova device is ready

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
    accG = 0,
    timeG = 0,
    angularVel = 0,
    angularVelFor5 = 0,
    angularVel_cur = 0,
    speedSum = 0,
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
  var angularList = [];
  var speedGQueue = [];
  var timeGQueue = [];
  const calTime = 6000;
  const secondCnt = (1000 / $scope.options.frequency);
  var mixBut = document.getElementById("mixBut");

  mixBut.addEventListener("click", startWatching);

  //Start Watching method
  function startWatching() {
    if (cnt == 0) {

      var inputLat;
      var long;
      var gpsSpeed = 0;
      var accuracy;
      var myLatlng;
      var pointList = [];

      $ionicLoading.show({
        template: '<ion-spinner icon="bubbles"></ion-spinner><br/>data calibarion!'
      });

      var posOptions = {
        enableHighAccuracy: true,
        timeout: 1000,
        maximumAge: 0
      };
      function geo_success(position) {

        inputLat = position.coords.latitude;
        long = position.coords.longitude;
        gpsSpeed = position.coords.speed;
        gpsSpeed *= 3.6;
        accuracy = position.coords.accuracy;
        myLatlng = new google.maps.LatLng(inputLat, long);
        pointList.push({
          lat: inputLat,
          lng: long
        });
        if (position.coords.speed) {
          speedGQueue.push(gpsSpeed);
          timeGQueue.push(position.timestamp);
        }

        $scope.measurements.time = position.timestamp;

        if (!!speedGQueue[1]) {

          accG = (speedGQueue[1] - speedGQueue[0]);

          speedGQueue.shift();
        }
        if (!!timeGQueue[1]) {

          timeG = (timeGQueue[1] - timeGQueue[0]) / 1000;

          timeGQueue.shift();
        }

        chartSpeed.series[0].points[0].update(speedGQueue[0]);

        accList.push(accG);
        speedList.push(speedGQueue[0]);
        obj.accVel = Math.round(accG);
        obj.speed = Math.round(speedGQueue[0]);

        speedSum += speedGQueue[0];

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
      }

      function geo_error() {
        console.log(err);
      }

      var geo_options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 3000
      };

      $scope.watch3 = navigator.geolocation.watchPosition(geo_success, geo_error, geo_options);


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
          $ionicLoading.hide();
        }
        if (cnt > calTime / $scope.options.frequency) {
          tmpQ = madgwick.getQuaternion();


          // //gravity compensation
          // x_a -= gravity * (2 * (tmpQ.x * tmpQ.z - tmpQ.w * tmpQ.y));
          // y_a -= gravity * (2 * (tmpQ.w * tmpQ.x + tmpQ.y * tmpQ.z));
          // z_a -= gravity * (tmpQ.w * tmpQ.w - tmpQ.x * tmpQ.x - tmpQ.y * tmpQ.y + tmpQ.z * tmpQ.z);

          // accQueue.push(Math.sqrt(Math.pow(x_a, 2) + Math.pow(y_a, 2) + Math.pow(z_a, 2)));



          // //speed calculate
          // let sum = acc / secondCnt;
          // speed += sum;
          // if (speed < 0)
          //   speed = 0;
          // speedList.push(speed.toFixed(2));


          // //send speed to the server in realtime
          // obj.speed = Math.round(speed);
          // obj.$save().then(function (ref) {
          //   ref.key() === obj.$id; // true
          // }, function (error) {
          //   console.log("Error:", error);
          // });


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


          //angularVel_cur calculate
          angularVel_cur = compareQueue[MaxQueue - 1] - compareQueue[MaxQueue - 1 - Math.round(MaxQueue * (5 / 6))];

          angularList.push(angularVel_cur.toFixed(2));

          obj.angularVel = Math.round(angularVel_cur);
          obj.$save().then(function (ref) {
            ref.key() === obj.$id; // true
          }, function (error) {
            console.log("Error:", error);
          });


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
          if (cnt - judgeTime3 > MaxQueue / 2 && !errorAngle3 && speedGQueue[0] > 30) {

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
          if (cnt - judgeTime6 > MaxQueue && !errorAngle6 && speedGQueue[0] > 25) {

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
          if (cnt - judgeTimeAcc > MaxQueue && speedGQueue[0] >= 6 && accG >= 8) {
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
          if (cnt - judgeTimeStart > secondCnt && speedGQueue[0] <= 5 && accG >= 10) {
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
          if (cnt - judgeTimeDcc > MaxQueue && speedGQueue[0] >= 6 && accG <= -14) {
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
          if (cnt - judgeTimeStop > secondCnt && speedGQueue[0] <= 5 && accG <= -14) {
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
          if (speedGQueue[0] >= 30 && Math.abs(angularVel) >= 10 && Math.abs(angularVelFor5) <= 2) {
            if (Math.abs(accG) <= 2)
              judgeCntCC++;

            if (accG >= 3)
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
          if (cnt - judgeTimeSL > secondCnt * 3 && speedGQueue[0] >= speedLimit) {
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
          if (speedGQueue[0] >= speedLimit) {

            CntLSL++;

            if (cnt - judgeTimeLSL > secondCnt * 3 && CntLSL >= secondCnt * 20) {
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

        $scope.measurements.speedG = speedGQueue[0];
        $scope.measurements.accG = accG;
        $scope.measurements.ang = angularVel_cur.toFixed(2);
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



        if (cnt > calTime / $scope.options.frequency)
          madgwick.set(tmpQ);

        cnt++;

      });



    }
    mixBut.removeEventListener("click", startWatching);
    mixBut.addEventListener("click", stopWatching);
    mixBut.value = "Stop";
    mixBut.style.backgroundColor = '#f4511e';

  };

  // Stop watching method
  function stopWatching() {
    compareQueue = [];
    sensorQueue = [];
    accQueue = [];
    speedQueue = [];
    judgeTime3 = judgeTime6 = 0;
    obj.speed = speed = 0;
    obj.acc = accG = 0;
    obj.angularVel = angularVel_cur = 0;
    var dateEnd = new Date();
    var drivingTime = (Date.parse(dateEnd) - Date.parse(date)) / 1000;

    var distance = (speedSum * (drivingTime / 3600)).toFixed(2);

    $scope.watch.clearWatch();
    $scope.watch2.clearWatch();
    navigator.geolocation.clearWatch($scope.watch3);

    $scope.measurements.cnt = cnt = 0;
    $scope.measurements.sum = sum3 = 0;
    $scope.measurements.sumU = sum6 = 0;
    $scope.measurements.speedG = speedGQueue[0] = 0;
    $scope.measurements.accG = accG = 0;
    $scope.measurements.ang = angularVel_cur = 0;
    $scope.measurements.alertL = judgeCnt3L = 0;
    $scope.measurements.alertR = judgeCnt3R = 0;
    $scope.measurements.alertU = judgeCnt6 = 0;
    $scope.measurements.alertAcc = judgeCntAcc = 0;
    $scope.measurements.alertDcc = judgeCntDcc = 0;
    $scope.measurements.alertStart = judgeCntStart = 0;
    $scope.measurements.alertStop = judgeCntStop = 0;
    $scope.measurements.alertCC = judgeCntCC = 0;
    $scope.measurements.alertCF = judgeCntCF = 0;
    $scope.measurements.alertSL = judgeCntSL = 0;
    $scope.measurements.alertLSL = judgeCntLSL = 0;
    $scope.measurements.speed = speed = 0;

    obj.$save().then(function (ref) {
      ref.key() === obj.$id; // true5
    }, function (error) {
      console.log("Error:", error);
    });



    let ref = firebase.database().ref("record");
    let list = $firebaseArray(ref);
    let logData = {
      date,
      drivingTime,
      distance,
      rotationAng,
      uturnAng,
      rotationCntL,
      rotationCntR,
      uturnCnt,
      rotationErr,
      uturnErr,
      speedList,
      accList,
      angularList,
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
    angularList = [];
    SLCnt = [];
    LSLCnt = [];
    AccCnt = [];
    StartCnt = [];
    DccCnt = [];
    StopCnt = [];
    CCCnt = [];
    CFCnt = [];


    mixBut.removeEventListener("click", stopWatching);
    mixBut.addEventListener("click", startWatching);
    mixBut.value = "Start";
    mixBut.style.backgroundColor = "#4CAF50";

  }



  $scope.$on('$ionicView.beforeLeave', function () {
  });

});
app.controller("DashCtrl", function ($scope, $ionicSideMenuDelegate, $firebaseObject) {

  $scope.toggleLeft = function () {
    $ionicSideMenuDelegate.toggleLeft();
  };

  var ref = firebase.database().ref("realtime");
  var obj = $firebaseObject(ref);


  // The speed gauge
  var chartSpeed = Highcharts.chart('speed', {

    chart: {
      type: 'gauge',
      plotBackgroundColor: null,
      plotBackgroundImage: null,
      plotBorderWidth: 0,
      plotShadow: false
    },

    title: {
      text: ''
    },

    pane: {
      startAngle: -150,
      endAngle: 150,
      background: [{
        backgroundColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, '#FFF'],
            [1, '#333']
          ]
        },
        borderWidth: 0,
        outerRadius: '109%'
      }, {
        backgroundColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, '#333'],
            [1, '#FFF']
          ]
        },
        borderWidth: 1,
        outerRadius: '107%'
      }, {
        // default background
      }, {
        backgroundColor: '#DDD',
        borderWidth: 0,
        outerRadius: '105%',
        innerRadius: '103%'
      }]
    },

    // the value axis
    yAxis: {
      min: 0,
      max: 200,

      minorTickInterval: 'auto',
      minorTickWidth: 1,
      minorTickLength: 10,
      minorTickPosition: 'inside',
      minorTickColor: '#666',

      tickPixelInterval: 30,
      tickWidth: 2,
      tickPosition: 'inside',
      tickLength: 10,
      tickColor: '#666',
      labels: {
        step: 2,
        rotation: 'auto'
      },
      title: {
        text: 'km/h'
      },
      plotBands: [{
        from: 0,
        to: 120,
        color: '#55BF3B' // green
      }, {
        from: 120,
        to: 160,
        color: '#DDDF0D' // yellow
      }, {
        from: 160,
        to: 200,
        color: '#DF5353' // red
      }]
    },

    series: [{
      name: 'Speed',
      data: [80],
      tooltip: {
        valueSuffix: ' km/h'
      }
    }]

  });



  obj.$watch(function () {

    chartSpeed.series[0].points[0].update(obj.speed);


    var accum = obj.rotationL + obj.rotationR + obj.uturn + obj.CC + obj.CF + obj.SL + obj.LSL + obj.acc + obj.dcc + obj.start + obj.stop;
    if (accum < 20) {
      $scope.color = 'green';
      $scope.text = '우수';
    } else if (accum < 40) {
      $scope.color = '#33ccff';
      $scope.text = '양호';
    } else if (accum < 60) {
      $scope.color = '#ffff00';
      $scope.text = '보통';
    } else if (accum < 80) {
      $scope.color = '#ff9900';
      $scope.text = '미달';
    } else if (accum < 100) {
      $scope.color = '#cc3300';
      $scope.text = '위험';
    } else {
      $scope.color = '#c842f4';
      $scope.text = '이상';
    }
  });





  // To make the data available in the DOM, assign it to $scope
  $scope.data = obj;





});
app.controller('graphsCtrl', function ($scope, $ionicSideMenuDelegate, $firebaseObject) {

  $scope.toggleLeft = function () {
    $ionicSideMenuDelegate.toggleLeft();
  };

  var ref = firebase.database().ref("realtime");
  var obj = $firebaseObject(ref);



  Highcharts.setOptions({
    global: {
      useUTC: false
    }
  });

  var chartGraph = Highcharts.chart('container', {
    chart: {
      type: 'spline',
      animation: Highcharts.svg, // don't animate in old IE
      marginRight: 10,
      events: {
        load: function () {

          // set up the updating of the chart each second
          // var series = this.series[0];
          // setInterval(function () {
          //     var x = (new Date()).getTime(), // current time
          //         y = Math.random();
          //     series.addPoint([x, y], true, true);
          // }, 1000);
        }
      }
    },
    title: {
      text: '속도, 가속도'
    },
    xAxis: {
      type: 'datetime',
      tickPixelInterval: 150
    },
    yAxis: {
      title: {
        text: 'km/h'
      },
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080'
      }]
    },
    tooltip: {
      formatter: function () {
        return '<b>' + this.series.name + '</b><br/>' +
          Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) + '<br/>' +
          Highcharts.numberFormat(this.y, 2);
      }
    },
    legend: {
      enabled: false
    },
    exporting: {
      enabled: false
    },
    series: [{
      name: 'Speed data',
      data: (function () {
        // generate an array of random data
        var data = [],
          time = (new Date()).getTime(),
          i;

        for (i = -30; i <= 0; i += 1) {
          data.push({
            x: time + i * 1000,
            y: 0
          });
        }
        return data;
      }())
    }, {
      name: 'Acc data',
      data: (function () {
        // generate an array of random data
        var data = [],
          time = (new Date()).getTime(),
          i;

        for (i = -30; i <= 0; i += 1) {
          data.push({
            x: time + i * 1000,
            y: 0
          });
        }
        return data;
      }())
    }]
  });
  var chartGraph2 = Highcharts.chart('container2', {
    chart: {
      type: 'spline',
      animation: Highcharts.svg, // don't animate in old IE
      marginRight: 10,
      events: {
        load: function () {
        }
      }
    },
    title: {
      text: '각속도'
    },
    xAxis: {
      type: 'datetime',
      tickPixelInterval: 150
    },
    yAxis: {
      title: {
        text: '°/sec'
      },
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080'
      }]
    },
    tooltip: {
      formatter: function () {
        return '<b>' + this.series.name + '</b><br/>' +
          Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) + '<br/>' +
          Highcharts.numberFormat(this.y, 2);
      }
    },
    legend: {
      enabled: false
    },
    exporting: {
      enabled: false
    },
    series: [{
      name: 'angular data',
      data: (function () {
        // generate an array of random data
        var data = [],
          time = (new Date()).getTime(),
          i;

        for (i = -30; i <= 0; i += 1) {
          data.push({
            x: time + i * 1000,
            y: 0
          });
        }
        return data;
      }())
    }]
  });
  var i = 0;
  obj.$watch(function () {
    const time = (new Date()).getTime();
    if (i % 10 == 0) {
      chartGraph.series[0].addPoint([time + i * 100, obj.speed], true, true);
      chartGraph.series[1].addPoint([time + i * 100, obj.accVel], true, true);
      chartGraph2.series[0].addPoint([time + i * 100, obj.angularVel], true, true);
    }
    i++;

  });

  $scope.data = obj;

});
app.controller('recordsCtrl', function ($scope, $ionicSideMenuDelegate, $firebaseArray, Records) {

  $scope.toggleLeft = function () {
    $ionicSideMenuDelegate.toggleLeft();
  };

  var ref = firebase.database().ref("record");
  var list = $firebaseArray(ref);
  var cnt = 0;
  list.$loaded()
    .then(function (x) {

      angular.forEach(x, function (x) {
        x.id = cnt;
        x.averageSpeed = x.distance / (x.drivingTime / 3600);
        x.drivingTime = Math.round(x.drivingTime / 3600) + "시간" + Math.round(x.drivingTime % 3600 / 60) + "분" + Math.round(x.drivingTime % 3600 % 60) + "초";
        x.dateRecord = x.date.slice(0, 24);
        Records.push(x);
        cnt++;
      })
      $scope.items = Records.all();
    })
    .catch(function (error) {
      console.log("Error:", error);
    });


});
app.controller('recordCtrl', function ($scope, $stateParams, Records, pathService, $cordovaGeolocation) {
  $scope.item = Records.get($stateParams.recordId);
  var recordGraph = Highcharts.chart('record', {
    chart: {
      zoomType: 'xy'
    },
    title: {
      text: ''
    },
    xAxis: {
      type: 'datetime',
      labels: {
        overflow: 'justify'
      }
    },
    yAxis: {
      title: {
        text: 'km/h'
      },
      minorGridLineWidth: 0,
      gridLineWidth: 0,
      alternateGridColor: null
    },
    plotOptions: {
      spline: {
        lineWidth: 4,
        states: {
          hover: {
            lineWidth: 5
          }
        },
        marker: {
          enabled: false
        }
      }
    },
    series: [{
      name: '속도',
      type: 'column',

      pointStart: Date.parse($scope.item.date),
      pointInterval: 1000, // one second
      tooltip: {
        valueSuffix: ' Km/h'
      },
      data: Records.get($stateParams.recordId).speedList.map(function (item) {
        return parseInt(item, 10);
      })
    }, {
      name: '가속도',
      tooltip: {
        valueSuffix: ' Km/h'
      },
      pointStart: Date.parse($scope.item.date),

      pointInterval: 1000, // one second
      data: Records.get($stateParams.recordId).accList.map(function (item) {
        return parseInt(item, 10);
      })
    }, {
      name: '각속도',
      tooltip: {
        valueSuffix: ' °/sec'
      },
      pointStart: Date.parse($scope.item.date),

      pointInterval: 1000, // one second
      data: Records.get($stateParams.recordId).angularList.map(function (item) {
        return parseInt(item, 10);
      })
    }],
    navigation: {
      menuItemStyle: {
        fontSize: '10px'
      }
    }
  });

  var labels = '1234567890';
  var markersArray = [];
  var markerClusterer;
  var items = [];
  var colors = ['red', 'blue', 'purple', 'cyan']

  // Map Options
  // Circle icon, Map option, Polyline option
  function getCircle() {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: colors[items.id],
      fillOpacity: .2,
      scale: 20,
      strokeColor: 'white',
      strokeWeight: .5
    };
  };
  var mapOption = {
    center: myLatlng,
    zoom: 10,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  // button click
  $scope.trackerInit = function () {
    removeMarkers(null);
    removePolylines();
    // drawMarker();
  };

  // Draw Map
  var lat = 35.742;
  var long = 127.421;
  var myLatlng = new google.maps.LatLng(lat, long);
  var map = new google.maps.Map(document.getElementById("map"), mapOption);
  var poly = new google.maps.Polyline();


  // Draw Map function
  function drawMarker() {
    // Set center and zoom
    map.setCenter(myLatlng);
    map.setZoom(10);

    // Draw Marker 
    // setMarkers(locations);
    setMarkers(items.location);

    // Draw Path
    var polyOption = {
      path: items.location,
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
    };
    poly = new google.maps.Polyline(polyOption);
    poly.setMap(map);
  };

  // removes the map on all markers in the array.
  function removeMarkers(map) {
    for (var i = 0; i < markersArray.length; i++) {
      markersArray[i].setMap(map);
    }
    // markerCluster.setMap(map);
  };
  // removes the map on all Polylines.
  function removePolylines() {
    poly.setMap(null);
  }

  function addInfoWindow(marker, message) {

    var infoWindow = new google.maps.InfoWindow({
      content: message
    });

    google.maps.event.addListener(marker, 'click', function () {
      infoWindow.open(map, marker);
    });

  }
  // sets the map on all markers in the array.
  function setMarkers(locations) {
    for (var i = 0; i < locations.length; i++) {
      var marker = new google.maps.Marker({
        position: locations[i],
        // label: labels[i++ % labels.length],
        map: map,
        icon: getCircle()
      })
      marker.setMap(map);
      markersArray.push(marker);

      var contentString = '<div id="content">' +
        '<h4>급가속</h4>' + '<div>2017년 6월 2일</div>'
      '</div>';
      addInfoWindow(marker, contentString);
    }

    //  markerClusterer = new MarkerClusterer(map, markersArray, {
    //   imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
    // });
  }

  $scope.$watch(function () {
    return pathService.getNaId();
  }, function (event) {
    // console.log("null");
    items = pathService.getItems();
    removePolylines();
    removeMarkers(null);
    drawMarker();
  }, true);

});
app.controller('trackerCtrl', function ($scope, $ionicSideMenuDelegate, $firebaseObject, pathService, $cordovaGeolocation) {

  $scope.toggleLeft = function () {
    $ionicSideMenuDelegate.toggleLeft();
  };

  var labels = '1234567890';
  var markersArray = [];
  var markerClusterer;
  var items = [];
  var colors = ['red', 'blue', 'purple', 'cyan']

  // Map Options
  // Circle icon, Map option, Polyline option
  function getCircle() {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: colors[items.id],
      fillOpacity: .2,
      scale: 20,
      strokeColor: 'white',
      strokeWeight: .5
    };
  };
  var mapOption = {
    center: myLatlng,
    zoom: 10,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  // button click
  $scope.trackerInit = function () {
    removeMarkers(null);
    removePolylines();
    // drawMarker();
  };

  // Draw Map
  var lat = 35.742;
  var long = 127.421;
  var myLatlng = new google.maps.LatLng(lat, long);
  var map = new google.maps.Map(document.getElementById("map"), mapOption);
  var poly = new google.maps.Polyline();


  // Draw Map function
  function drawMarker() {
    // Set center and zoom
    map.setCenter(myLatlng);
    map.setZoom(10);

    // Draw Marker 
    // setMarkers(locations);
    setMarkers(items.location);

    // Draw Path
    var polyOption = {
      path: items.location,
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
    };
    poly = new google.maps.Polyline(polyOption);
    poly.setMap(map);
  };

  // removes the map on all markers in the array.
  function removeMarkers(map) {
    for (var i = 0; i < markersArray.length; i++) {
      markersArray[i].setMap(map);
    }
    // markerCluster.setMap(map);
  };
  // removes the map on all Polylines.
  function removePolylines() {
    poly.setMap(null);
  }

  function addInfoWindow(marker, message) {

    var infoWindow = new google.maps.InfoWindow({
      content: message
    });

    google.maps.event.addListener(marker, 'click', function () {
      infoWindow.open(map, marker);
    });

  }
  // sets the map on all markers in the array.
  function setMarkers(locations) {
    for (var i = 0; i < locations.length; i++) {
      var marker = new google.maps.Marker({
        position: locations[i],
        // label: labels[i++ % labels.length],
        map: map,
        icon: getCircle()
      })
      marker.setMap(map);
      markersArray.push(marker);

      var contentString = '<div id="content">' +
        '<h4>급가속</h4>' + '<div>2017년 6월 2일</div>'
      '</div>';
      addInfoWindow(marker, contentString);
    }

    //  markerClusterer = new MarkerClusterer(map, markersArray, {
    //   imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
    // });
  }

  $scope.$watch(function () {
    return pathService.getNaId();
  }, function (event) {
    // console.log("null");
    items = pathService.getItems();
    removePolylines();
    removeMarkers(null);
    drawMarker();
  }, true);
  // google.maps.event.addDomListener(window, 'load', drawMarker());
});