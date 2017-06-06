/*
    profile
 */
//app.js
.state('app.profile', {
  url: "/profile",
  views: {
    'menuContent': {
      templateUrl: "templates/profile.html",
      controller: "ProfileCtrl"
    }
  }
})


//controllers.js
1. pathService 삭제
2. 변수들 선언한 곳 밑에 선언
  * var positionList = [];
  * var errorList = [];
  * var x_a, y_a, z_a, x_g, y_g, z_g, date, lati, long, myLatlng, initQ, tmpQ, cnt = 0,
    * lati, long, myLatlng 추가
3. function startWatching() {
    if (cnt == 0) {
      var gpsSpeed = 0;
      var accuracy; 
    startWatching() 밑에 var inputLat, long, myLatlng, pointList 삭제
    