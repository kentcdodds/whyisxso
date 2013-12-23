var app = require('http').createServer(function(){
  // Do nothing...
});

console.log(process.env.OPENSHIFT_NODEJS_PORT);
var io = require('socket.io').listen(app);
app.listen(process.env.OPENSHIFT_NODEJS_PORT || 3000, process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1');

var request = require('request');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

console.log(io.hasOwnProperty('sockets'), io.sockets);
console.log(io.sockets.on);

io.sockets.on('connection', function (socket) {
  socket.on('searchInput:changed', function (data) {
    var suggestions = {
      google: [],
      bing: []
    };
    var complete = {
      google: false,
      bing: false
    };

    var timeout = setTimeout(function() {
      complete.google = true;
      complete.bing = true;
      maybeEmit();
    }, 5000);


    function maybeEmit() {
      if (complete.google && complete.bing)  {
        clearTimeout(timeout);
        socket.emit('suggestions:received', suggestions);
      }
    }

    var getSuggestions = {
      google: function(search) {
        this.get('http://www.google.com/complete/search?output=toolbar&q=' + encodeURIComponent(search), 'google', function(data, next) {
          parser.parseString(data, function (err, result) {
            var suggestions = [];
            if (result.toplevel && result.toplevel.CompleteSuggestion) {
              suggestions = result.toplevel.CompleteSuggestion;
              for (var i = 0; i < suggestions.length; i++) {
                var suggestion = suggestions[i];
                if (suggestion && suggestion.suggestion &&
                  suggestion.suggestion[0] &&
                  suggestion.suggestion[0]['$'] && suggestion.suggestion[0]['$'].data) {

                  suggestions[i] = suggestion.suggestion[0]['$'].data;
                } else {
                  suggestions[i] = '';
                }
              }
            }
            next(suggestions);
          });
        });
      },
      bing: function(search) {
        this.get('http://api.bing.com/osjson.aspx?query=' + encodeURIComponent(search), 'bing', function(data, next) {
          var suggestions = [];
          data = JSON.parse(data);
          if (data[1]) {
            suggestions = data[1].slice(0, 10);
          }
          next(suggestions);
        });
      },
      getAll: function(search) {
        if (search) {
          this.google(search);
          this.bing(search);
        }
      },
      get: function(url, provider, alterData) {
        function done() {
          complete[provider] = true;
          maybeEmit();
        }

        request(url, function(err, res, body) {
          if (err) {
            done();
          }
          alterData(body, function(data) {
            suggestions[provider] = data;
            done();
          });
        });
      }
    };

    getSuggestions.getAll(data.search);

  });
});





