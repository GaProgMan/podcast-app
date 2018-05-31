(function() {
  'use strict';

  const searchTermStorageKey = "searchTerm";
  const baseUrl = 'https://podcasts.search.windows.net/indexes/podcasts/docs?api-version=2017-11-11&$count=true&search=';
  const apiKey = 'C7AC76C4D8E4FE369B5608D13A98468F'; // TODO!!

  var app = {
    isLoading: true,
    visibleCards: {},
    spinner: document.querySelector('.loader'),
    container: document.querySelector('.main')
  };

<<<<<<< HEAD
=======
  app.playbackStateTracker = {
    get: function() {
      return JSON.parse(localStorage.getItem("playbackState"));
    },
    runner: function() {
      localStorage.setItem("playbackState", JSON.stringify({
        currentSrc: mainAudio.currentSrc,
        currentTime: mainAudio.currentTime
      }));
    },
    handle: null,
    start: function() {
      // Could use onTimeUpdate on the video player, but this should be
      // less of a hit on performance.
      app.playbackStateTracker.handle = setInterval(app.playbackStateTracker.runner, 5000);
    },
    stop: function() {
      if (app.playbackStateTracker.handle) {
        clearInterval(app.playbackStateTracker.handle);
      }
    }
  };

  app.resumePlayback = function() {
    if (mainAudio.paused) {
      var playbackState = app.playbackStateTracker.get();
      if(playbackState) {
        var source = document.getElementById('audioSource');
        source.src = playbackState.currentSrc;
        mainAudio.load();
        mainAudio.currentTime = playbackState.currentTime;
        mainAudio.play();
        app.playbackStateTracker.start();
      } else {
        console.log('Main audio is paused, but there is no playback state. This can happen when there is a problem loading a file.');
      }
    }
  }

  mainAudio.onPause = function() {
    app.playbackStateTracker.stop();
  };
>>>>>>> a3016b1... Now swapping http/https links in an attempt to do the best we can without a proxy or dropping https, fixes #16

  app.updateSearchCard = function(data, searchTerm) {
    var card = document;
    if(!searchTerm) {
      card.querySelector('.subtitle').textContent = 'Search for a topic';
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      card.querySelector('#search-input').style.display = 'block';
      app.isLoading = false;
      return;
    }

    var resultCount = data['@odata.count'];
    var episodes = data['value'];
    var searchDate = data['date'];
    card.querySelector('.subtitle').textContent = '"' + searchTerm + '": ' + resultCount + ' episodes';
    card.querySelector('#search-input').style.display = resultCount ? 'none' : 'block';

    var ul = document.createElement('ul');

    episodes.forEach(function(e) {
      var li = document.createElement('li');
      li.onclick = function () {
        var playUrl = e.audioUrl;

        if (location.protocol === 'https:') {
          playUrl = e.audioUrl.replace(/^http:\/\//i, 'https://');
          if(playUrl !== e.audioUrl) {
            console.log('Uh oh, the search engine returned a non https link. We cannot request that from an https site. Lets just try the https link anyway!');
            console.log('Originally requested url: ' + e.audioUrl);
          }
        }
        AudioManager.play(playUrl)
      };

      li.audioUrl = e.audioUrl;
      li.appendChild(document.createTextNode(e.episodeTitle));
      var episodeDiv = document.createElement('div');
      episodeDiv.appendChild(document.createTextNode(e.podcastTitle));
      episodeDiv.className = 'podcast-title';
      li.appendChild(episodeDiv);
      ul.appendChild(li);
    });

    card.querySelector('.episode-list').appendChild(ul);

    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  app.saveSearchState = function(searchTerm) {
    localStorage.setItem(searchTermStorageKey, searchTerm);
  };

  app.search = function(searchTerm) {
    app.saveSearchState(searchTerm);
    var url = baseUrl + searchTerm;
    if ('caches' in window) {
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function updateFromCache(json) {
            var results = json.query.results;
            app.updateSearchCard(results, searchTerm);
          });
        }
      });
    }

    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var results = JSON.parse(request.response);
          app.updateSearchCard(results, searchTerm);
        }
      } else {
        app.updateSearchCard({});
      }
    };
    request.open('GET', url, true);
    request.setRequestHeader('Content-Type', 'application\/json');
    request.setRequestHeader('api-key', apiKey)
    request.send();
  };

  if (location.search) {
      var searchTerm = location.search.split('=')[1]; // TODO robust!
      app.search(searchTerm);
  } else {
    // First load
    const searchTerm = localStorage.getItem(searchTermStorageKey);
    if (searchTerm) {
      app.search(searchTerm)
    } else {
      app.updateSearchCard({});
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }

})();