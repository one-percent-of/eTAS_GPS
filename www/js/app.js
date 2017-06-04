var app = angular.module('starter', ['ionic', 'ngCordova', 'deviceGyroscope', 'firebase']);


app.run(function ($ionicPlatform, $rootScope, $timeout) {
  $ionicPlatform.ready(function () {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });

  $rootScope.authStatus = false;
  //stateChange event
  $rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {
    $rootScope.authStatus = toState.authStatus;
    if ($rootScope.authStatus) {


    }
  });

  $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
    console.log("URL : " + toState.url);
    if (toState.url == '/dashboard') {
      console.log("match : " + toState.url);
      $timeout(function () {
        angular.element(document.querySelector('#leftMenu')).removeClass("hide");
      }, 1000);
    }
  });

});
app.config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    .state('app', {
      url: '/app',
      abstract: true,
      templateUrl: 'templates/menu.html',
      controller: 'AppCtrl'
    })

    //--------------------------------------
    .state('app.login', {
      url: '/login',
      views: {
        'menuContent': {
          templateUrl: 'templates/tab-signin.html'
        }
      },
      authStatus: false
    })
    .state('app.signup', {
      url: '/signup',
      views: {
        'menuContent': {
          templateUrl: 'templates/tab-signup.html',
        }
      },
      authStatus: false
    })
    .state('app.profiles', {
      url: '/profiles',
      views: {
        'menuContent': {
          templateUrl: 'templates/profiles.html',
          controller: 'ProfilesCtrl'
        }
      }
    })

    .state('app.profile', {
      url: '/profile/:profileId',
      views: {
        'menuContent': {
          templateUrl: 'templates/profile-detail.html',
          controller: 'ProfileCtrl'
        }
      }
    })
    //--------------------------------------
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
      },
      authStatus: true
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
    .state('tab.tracker', {
      url: '/tracker',
      views: {
        'tab-tracker': {
          templateUrl: 'templates/tab-tracker.html',
          controller: 'trackerCtrl'
        }
      }
    })




  $ionicConfigProvider.navBar.alignTitle('center');
  $ionicConfigProvider.tabs.position('bottom');


  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/login');

});

