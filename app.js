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
  app.controller('MainCtrl', function($scope, $timeout, socket, $location, $window) {
    function resetSuggestions() {
      $scope.suggestions = {
        google: [],
        bing: []
      };
    }
    resetSuggestions();

    $scope.thumbMap = {
      'chuck norris': 0,
      puppies: 1,
      government: 2,
      facebook: 3,
      americans: 4,
      twitter: 5,
      bing: 6,
      apple: 7,
      google: 8,
      microsoft: 9,
      iphones: 10,
      ipads: 11,
      'android phones': 12,
      'androids': 12,
      'android tablets': 13,
      'google+': 14
    };

    var getOptions = function() {
      var randomThumb = $scope.thumbMap[$scope.searchInput.toLowerCase()];
      if (!randomThumb && randomThumb < 0) {
        randomThumb = Math.floor(Math.random() * 15);
      }
      return {
        url: encodeURIComponent($window.location.href),
        title: encodeURIComponent($scope.searchInput ? 'Why ' + $scope.verb + ' ' + $scope.searchInput + ' so...' : 'Why is "X" so...'),
        description: encodeURIComponent('What search engines recommend to complete this statement is very telling...'),
        hashtags: encodeURIComponent('whyisxso'),
        image: encodeURIComponent('http://kent.doddsfamily.us/whyisxso/thumbnails/thumbnail' + randomThumb + '.png')
      };
    }

    $scope.share = {
      facebook: function() {
        var options = getOptions();
        var fUrl = encodeURIComponent('p[url]') + '=' + options.url;
        var fTitle = encodeURIComponent('p[title]') + '=' + options.title;
        var fSummary = encodeURIComponent('p[summary]') + '=' + options.description ;
        var fImages = encodeURIComponent('p[images][0]') + '=' + options.image;
        var uri = 'http://www.facebook.com/sharer.php?s=100&';

        $window.open(uri + [fUrl, fTitle, fSummary, fImages].join('&'));
      },
      google: function() {
        var options = getOptions();
        var gUrl = 'url=' + options.url;
        var uri = 'http://plus.google.com/share?';
        // One day maybe they'll let us do more...

        $window.open(uri + [gUrl].join('&'));
      },
      twitter: function() {
        var options = getOptions();
        var tUrl = 'url=' + options.url;
        var tSummary = 'text=' + options.description;
        var tHashtag = 'hashtags=' + options.hashtags;
        var tVia = 'via=kentcdodds';
        var uri = 'http://twitter.com/intent/tweet?';

        $window.open(uri + [tUrl, tSummary, tHashtag, tVia].join('&'));
      }
    };

    $scope.verb = 'is';
    $scope.genieVisible = false;

    $scope.encodeURIComponent = encodeURIComponent;

    socket.on('suggestions:received', function(data) {
      $scope.suggestions = data;
    });

    var sendAnalytics = null;
    var startSearch = null;
    var firstSearchUpdate = true;

    $scope.searchUpdated = function() {
      if ($scope.searchInput) {
        var search = 'Why ' + $scope.verb + ' ' + $scope.searchInput + ' so';
        if (startSearch) {
          $timeout.cancel(startSearch);
        }

        startSearch = $timeout(function() {
          $location.search('verb', $scope.verb);
          $location.search('noun', $scope.searchInput);
          $window.document.title = search + '...';
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
        if (!firstSearchUpdate) {
          $location.search('verb', null);
          $location.search('noun', null);
          resetSuggestions();
          $window.document.title = 'Why is "X" so...';
        } else {
          firstSearchUpdate = false;
        }
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