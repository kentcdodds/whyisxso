(function() {
  var app = angular.module('app', []);

  // Services
  app.factory('socket', function ($rootScope) {
    var socket = io.connect('http://whyisxso-kentcdodds.rhcloud.com');
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {  
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  });

  // Controller
  app.controller('MainCtrl', function($scope, socket) {
    function resetSuggestions() {
      $scope.suggestions = {
        google: [],
        bing: []
      };
    }
    resetSuggestions();

    $scope.verb = 'is';
    socket.on('suggestions:received', function(data) {
      $scope.suggestions = data;
      console.log(data);
    });
    $scope.$watch('searchInput', function(newVal) {
      if (newVal) {
        socket.emit('searchInput:changed', {search: 'Why ' + $scope.verb + ' ' + newVal + ' so'});
      } else {
        resetSuggestions();
      }
    });
  });
})();