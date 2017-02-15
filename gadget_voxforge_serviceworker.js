/*jslint indent: 2*/
/*global self, fetch, Request, Response, console, location, JSON */
(function (self, fetch, Request, Response, console, location, JSON) {
  "use strict";

  // DEBUG:
  // chrome://cache/
  // chrome://inspect/#service-workers
  // chrome://serviceworker-internals/
  
  var PREFETCH_URL_LIST = [];
  var CURRENT_CACHE_VERSION = 1;
  var CURRENT_CACHE;
  var CURRENT_CACHE_DICT = {
    "self": "self-v" + CURRENT_CACHE_VERSION,
    "prefetch": "prefetch-v" + CURRENT_CACHE_VERSION
  };
  var STORAGE = null;

  importScripts(
    "rsvp.latest.js",
    "jio.latest.js",
    "jio.parallelstorage.js",
    "jio.cachestorage.js",
    "jio.indexstorage.js"
  );

  // methods
  // XXX allow passing multiple files
  function deserializeUrlParameters(query_string) {
    return new Map(query_string.split('&').map(function(key_value_pair) {
      var splits = key_value_pair.split('=');
      var key = decodeURIComponent(splits[0]);
      var value = decodeURIComponent(splits[1]);
      if (value.indexOf(',') >= 0) {
        value = value.split(',');
      }
  
      return [key, value];
    }));
  }
  
  // custom loopEventListener
  function workerLoopEventListener(my_target, my_type, my_callback) {
    var handle_event_callback,
      callback_promise;

    function cancelResolver() {
      if ((callback_promise !== undefined) &&
        (typeof callback_promise.cancel === "function")) {
        callback_promise.cancel();
      }
    }
    function canceller() {
      cancelResolver();
    }
    function itsANonResolvableTrap(resolve, reject) {
      handle_event_callback = function (evt) {
        cancelResolver();
        callback_promise = new RSVP.Queue()
          .push(function () {
            return my_callback(evt);
          })
          .push(undefined, function (error) {
            if (!(error instanceof RSVP.CancellationError)) {
              canceller();
              reject(error);
            }
          });
      };
      // eg object.onfirstpass = function () {...
      my_target["on" + my_type] = my_callback;
    }
    return new RSVP.Promise(itsANonResolvableTrap, canceller);
  }
  
  function fetchFile(prefetch_url) {
    var request,
      url;
          
    // This constructs a new URL object using the service worker's script
    // location as the base for relative URLs.
    url = new URL(prefetch_url, location.href);

    // Append a cache-bust=TIMESTAMP URL parameter to each URL's query 
    // string. This is particularly important when precaching resources 
    // that are later used in the fetch handler as responses directly, 
    // without consulting the network (i.e. cache-first). If we were to 
    // get back a response from the HTTP browser cache for this precaching 
    // request then that stale response would be used indefinitely, or at 
    // least until the next time the service worker script changes 
    // triggering the install flow.
    url.search += (url.search ? '&' : '?') + 'cache-bust=' +  Date.now();

    // It's very important to use {mode: 'no-cors'} if there is any chance
    // that the resources being fetched are served off of a server that 
    // doesn't support CORS. See
    // (http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).
    // If the server doesn't support CORS the fetch() would fail if the 
    // default mode of 'cors' was used for the fetch() request. The drawback
    // of hardcoding {mode: 'no-cors'} is that the response from all 
    // cross-origin hosts will always be opaque
    // (https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#cross-origin-resources)
    // and it is not possible to determine whether an opaque response 
    // represents a success or failure
    // (https://github.com/whatwg/fetch/issues/14).
    request = new Request(url, {
      "mode": 'no-cors',
      "Content-Type": "text/plain"
    });

    // XXX differentiate handler based on desired content-type? 
    // (ArrayBuffer, BinaryString, DataUrl, String)
    return new RSVP.Queue()
      .push(function () {
        return fetch(request);
      })  
      .push(function(response) {
        if (response.status >= 400) {
          throw new Error('request for ' + prefetch_url +
            ' failed with status ' + response.statusText);
        }

        return response.blob();
      });
  }
  
  // runs while an existing worker runs or nothing controls the page (update here)
  function installHandler(event) {
    return event.waitUntil(
      new RSVP.Queue() 
        .push(function () {
          return STORAGE.put("prefetch");
        })
        .push(function() {
          return RSVP.all(PREFETCH_URL_LIST.map(function(prefetch_url) {
            return new RSVP.Queue()
              .push(function () {
                return STORAGE.getAttachment("prefetch", prefetch_url, {
                  "range": "bytes=0-1"
                });
              })
              .push(undefined, function (error) {
                if (error.status_code === 404) {
                  return new RSVP.Queue()
                    .push(function () {
                      return fetchFile(prefetch_url);
                    })
                    .push(function (response) {
                      return STORAGE.putAttachment("prefetch", prefetch_url, response);  
                    });
                }
                throw error;
              });
              //.push(undefined, function (error) {
              //  if (error.status_code === 404) {
              //    console.log("handle network request failing");
              //  }
              //  throw error;
              //});
            })
          );
        })
        .push(function () {
          console.log("pre-feteching complete");
          // force waiting worker to become active worker (claim)
          // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
          if (self.param_dict.hasOwnProperty('skip_waiting') !== false) {
            self.skipWaiting();
          }
        })
        .push(undefined, function(error) {
          console.error('Pre-fetching failed:', error);
          throw error;
        })
    );
  }

  // intercept network GET/POST requests, add and serve from cache
  function fetchHandler(event) {
    if (event.request.method === "GET") {
      return new RSVP.Queue()
        .push(function () {
          return event.respondWith(caches.open(CURRENT_CACHE_DICT["self"]));
        })
        .push(function (cache) {
          return cache.match(event.request);
        })
        .push(function (response) {
          // limit the files to be cached
          var cacheable_list = [],
          isCacheable = function (el) {
            return url.indexOf(el) >= 0;
          };
              
          // cached, return from cache
          if (response) {
            return response;
          }
          
          // not cached, fetch from network
          // clone call, because any operation like fetch/put... will
          // consume the request, so we need a copy of the original
          // (see https://fetch.spec.whatwg.org/#dom-request-clone)
          return new RSVP.Queue()
            .push(function () {
              return fetch(event.request.clone());
            })
            .push(function(response) {
                  
              // add resource to cache
              if (response.status < 400 && cacheable_list.some(isCacheable)) {
                  cache.put(event.request, response.clone());
              }
              return response;
            });
        })
        .push(undefined, function(error) {
  
          // This catch() will handle exceptions that arise from the match()
          // or fetch() operations. Note that a HTTP error response (e.g.
          // 404) will NOT trigger an exception. It will return a normal 
          // response object that has the appropriate error code set.
          console.log(error);
          throw error;
        });
      
  
    //  we could also handle post here and handle this through storage
    //} else {
    //  event.respondWith(fetch(event.request));
    }
  }
  
  function bounceMessage(event, method, param) {
    // event.ports[0] corresponds to the MessagePort that was transferred 
    // as part of the controlled page's call to controller.postMessage(). 
    // Therefore, event.ports[0].postMessage() will trigger the onmessage
    // handler from the controlled page. It's up to you how to structure 
    // the messages that you send back; this is just one example.
    
    return new RSVP.Queue()
      .push(function () {
        console.log(param)
        console.log(STORAGE)
        console.log(method)
        return STORAGE[method].apply(STORAGE, param);  
      })
      .push(function (result) {
        return event.ports[0].postMessage({"error": null, "data": result});
      })
      .push(undefined, function (error) {
        return event.ports[0].postMessage({"error": error});
      });
  }

  // storage communication
  function messageHandler(event) {
    console.log(event)
    var data = event.data;
    switch (data.command) {
      case 'post':
        
        // data.param should include apply-ed arguments, the sub_storage
        // has to cope with whatever is being passed.
        // Note, data.param will be an apply [array]

        return bounceMessage(event, "post", data.param);
      case 'get':
        return bounceMessage(event, "get", data.param);
      case 'put':
        return bounceMessage(event, "put", data.param);
      case 'remove':
        return bounceMessage(event, "remove", data.param);
      case 'allDocs':
        return bounceMessage(event, "allDocs", data.param);           
      case 'buildQuery':
        return bounceMessage(event, "buildQuery", data.param);
      case 'allAttachments':
        return bounceMessage(event, "allAttachments", data.param);
      case 'removeAttachment':
        return bounceMessage(event, "removeAttachment", data.param);
      case 'putAttachment':
        return bounceMessage(event, "putAttachment". data.param);
      case 'getAttachment':
        return bounceMessage(event, "getAttachment", data.param);
      default:
        throw 'Unknown command: ' + event.data.command;
    }
  }

  // runs active page, changes here (like deleting old cache) breaks page
  function activateHandler(event) {
    var expected_cache_name_list = Object.keys(CURRENT_CACHE_DICT).map(function(key) {
      return CURRENT_CACHE_DICT[key];
    });
  
    return event.waitUntil(
      new RSVP.Queue()
        .push(function () {
          return caches.keys();
        })
        .push(function (cache_name_list) {
          return RSVP.all(
            cache_name_list.map(function(cache_name) {
              var version = cache_name.split("-v")[1];
                
              // removes caches which are out of version
              if (!(version && parseInt(version, 10) === CURRENT_CACHE_VERSION)) {
                console.log('Deleting out of date cache:' + cache_name);
                return caches.delete(cache_name);
              }
                
              // removes caches which are not on the list of expected names 
              if (expected_cache_name_list.indexOf(cache_name) === -1) {
                console.log('Deleting non-listed cache:' + cache_name);
                return caches.delete(cache_name);
              }
            })
          );
      })
      .push(function () {
        console.log("'activate': Claiming clients for version");
        if (self.param_dict.hasOwnProperty('clients_claim') !== false) {
          return self.clients.claim();
        }
      })
    )

  }

  // here we go
  return new RSVP.Queue()
    .push(function () {
      
      // https://github.com/PolymerElements/platinum-sw/blob/master/service-worker.js
      self.param_dict = deserializeUrlParameters(location.search.substring(1));

      // importScripts.apply(null, self.param_dict.get("xxx"))
      
      // shelve files to load on install
      if (self.param_dict.has('prefetch_url_list')) {
        PREFETCH_URL_LIST = [self.param_dict.get('prefetch_url_list')];
      }
      return jIO.createJIO(JSON.parse(self.param_dict.get("sub_storage")));
    })
    .push(function (my_jio_storage) {
      STORAGE = my_jio_storage;
      return RSVP.all([
        //  workerLoopEventListener(self, "fetch", fetchHandler),
        workerLoopEventListener(self, "install", installHandler),
        workerLoopEventListener(self, "activate", activateHandler),
        workerLoopEventListener(self, "message", messageHandler)
      ]);
    });

}(self, fetch, Request, Response, console, location, JSON));
