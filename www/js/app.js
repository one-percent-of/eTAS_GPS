var app = angular.module('starter', ['ionic', 'ngCordova', 'deviceGyroscope', 'firebase']);

app.run(function ($ionicPlatform, $cordovaSplashscreen) {
  $ionicPlatform.ready(function () {
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    $timeout(function () {
      $cordovaSplashscreen.hide();
    }, 2000);
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
});
app.config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

    // setup an abstract state for the tabs directive
    .state('tab', {
      url: '/tab',
      abstract: true,
      templateUrl: 'templates/tabs.html'
    })

    // Each tab has its own nav history stack:

    .state('tab.dash', {
      url: '/dash',
      views: {
        'tab-dash': {
          templateUrl: 'templates/tab-dash.html',
          controller: 'DashCtrl'
        }
      }
    })
    .state('tab.graphs', {
      url: '/graphs',
      views: {
        'tab-graphs': {
          templateUrl: 'templates/tab-graphs.html',
          controller: 'graphsCtrl'
        }
      }
    })
    .state('tab.records', {
      url: '/records',
      views: {
        'tab-records': {
          templateUrl: 'templates/tab-records.html',
          controller: 'recordsCtrl'
        }
      }
    })
    .state('tab.measure', {
      url: '/measure',
      views: {
        'tab-measure': {
          templateUrl: 'templates/tab-measure.html',
          controller: 'measureCtrl'
        }
      }
    })


  $ionicConfigProvider.navBar.alignTitle('center');
  $ionicConfigProvider.tabs.position('bottom');


  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/measure');

});

