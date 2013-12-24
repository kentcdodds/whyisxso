(function() {
  var app = angular.module('app', ['ga', 'uxGenie']);

  // Services
  app.factory('socket', function ($rootScope) {
    var socket = io.connect('http://whyisxso-kentcdodds.rhcloud.com:8000');
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
  app.controller('MainCtrl', function($scope, $timeout, socket, $location) {
    function resetSuggestions() {
      $scope.suggestions = {
        google: [],
        bing: []
      };
    }
    resetSuggestions();

    $scope.verb = 'is';
    $scope.genieVisible = false;

    $scope.encodeURIComponent = encodeURIComponent;

    socket.on('suggestions:received', function(data) {
      $scope.suggestions = data;
    });

    var sendAnalytics = null;
    var startSearch = null;

    $scope.searchUpdated = function() {
      if ($scope.searchInput) {
        var search = 'Why ' + $scope.verb + ' ' + $scope.searchInput + ' so';
        if (startSearch) {
          $timeout.cancel(startSearch);
        }

        startSearch = $timeout(function() {
          $location.search('verb', $scope.verb);
          $location.search('noun', $scope.searchInput);
          socket.emit('searchInput:changed', {search: search});
        }, 200);

        if (sendAnalytics) {
          $timeout.cancel(sendAnalytics)
        }
        sendAnalytics = $timeout(function() {
          sendAnalytics = null;
          ga('send', 'event', 'searchInput', 'typed', search);
        }, 750, false);
      } else {
        $location.search('verb', null);
        $location.search('noun', null);
        resetSuggestions();
      }
    }
    
    $scope.$watch('verb + searchInput', $scope.searchUpdated);

    $scope.isSame = function(suggestion, provider) {
      return $scope.suggestions[provider].indexOf(suggestion) > -1;
    };

    $scope.wishMade = function(wish) {
      if (wish && wish.magicWords) {
        ga('send', 'event', 'wish', 'made', wish.magicWords);
      }
    };

    $scope.alert = {};

    function updateAlert(strong, content, type, link) {
      $scope.alert.strong = strong;
      $scope.alert.content = content;
      $scope.alert.type = type;
      $scope.alert.link = link;
      $scope.alert.visible = !!strong || !!content;
    }

    function addQuestionWish(question, strong, content, type, url) {
      genie({
        magicWords: 'Question: ' + question,
        action: function() {
          updateAlert(strong, content, type, url);
        }
      });
    }

    addQuestionWish('What is this site?', 'Why is "X" so...', 'is just a project that I made one day because I was fascinated by how much you can learn about the world\'s perspective on things by searching that phrase online and seeing what the recommendations are. I realize that most people only search that in a negative context, but it\'s still pretty interesting.', 'info');
    addQuestionWish('Can I change this from "is" to "are"?', 'Yes', 'just click on the word "is"', 'info');
    addQuestionWish('What is this magic box?', 'Genie\'s Lamp.', 'Genie is an open source library that I wrote. I can\'t build a site without it anymore', 'info', 'http://kent.doddsfamily.us/genie');
    addQuestionWish('Who are you?', 'Kent C. Dodds', 'I am a web developer. I love JavaScript, AngularJS, NodeJS, etc. I\'m a family man with one wife, and two kids.', 'info', 'http://kent.doddsfamily.us');

    $scope.$watch(function() {
      return $location.search();
    }, function(queryParams) {
      if (queryParams.verb) {
        if (queryParams.verb === 'is' || queryParams.verb === 'are') {
          $scope.verb = queryParams.verb;
        }
      }
      $scope.searchInput = queryParams.noun || $scope.searchInput;
    });
  });
})();