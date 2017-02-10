/*
 * JIO Service Worker Storage Backend.
 */

// DEBUG:
// chrome://cache/
// chrome://inspect/#service-workers
// chrome://serviceworker-internals/
// 
// bar = new Promise(function (resolve, reject) {
//   return caches.keys()
//     .then(function (result) {
//      console.log(result);
//      return caches.open(result[0])
//        .then(function(cache){
//          return cache.keys()
//            .then(function (request_list) {
//              console.log(request_list);
//              console.log("DONE");
//              resolve();
//            });
//        });
//    });
//});
//
// clear last cache
// caches.keys().then(function(key_list) {console.log(key_list);return caches.open(key_list[0]);}).then(function(cache) {return cache.keys().then(function(request_list) {console.log(request_list); return cache.delete(request_list[0]);})});
// list all caches
// caches.keys().then(function(key_list) {console.log(key_list);return caches.open(key_list[0]);}).then(function(cache) {return cache.keys().then(function(request_list) {console.log(request_list);})});


var CURRENT_CACHE_VERSION = 1;
var CURRENT_CACHE;
var CURRENT_CACHE_DICT = {
  "self": "self-v" + CURRENT_CACHE_VERSION,
  "dictionary": "dictionary-v" + CURRENT_CACHE_VERSION
};

var LINE_BREAK = /(.*?[\r\n])/g;
var HAS_LINE_BREAK = /\r|\n/;
var PREFETCH_URL_LIST = [];

// URL parameter parsing

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

// jIO API

function jio_get(my_param, my_event) {
  return new Promise(function (resolve, reject) {
    return caches.keys()
      .then(function(key_list) {
        var answer,
          len,
          i;

        CURRENT_CACHE = my_param.id + "-v" + CURRENT_CACHE_VERSION;
        for (i = 0, len = key_list.length; i < len; i += 1) {
          if (key_list[i] === CURRENT_CACHE) {
            answer = {"error": null};
          }
        }
        if (!answer) {
          answer = {"status": 404, "message": "Cache does not exist."};
        }

        // event.ports[0] corresponds to the MessagePort that was transferred 
        // as part of the controlled page's call to controller.postMessage(). 
        // Therefore, event.ports[0].postMessage() will trigger the onmessage
        // handler from the controlled page. It's up to you how to structure 
        // the messages that you send back; this is just one example.
        if (my_event) {
          resolve(my_event.ports[0].postMessage(answer));
        }
        resolve(answer);
      })
      .catch(function(error) {
        var answer = {"error": {'message': error.toString()}};
        if (my_event) {
          reject(my_event.ports[0].postMessage(answer));
        }
        throw answer;
      });
  });
}

// create new cache by opening it. this will only run once per cache/folder
function jio_put(my_param, my_event) {
  return new Promise(function (resolve, reject) {
    var answer;
    
    // I declare: self is reserved
    if (my_param.id === "self") {
      answer = {"error": {'status': 406, 'message': "Reserved cache name."}};
      if (my_event) {
        resolve(my_event.port[0].postMessage(answer));
      }
      resolve(answer);
    }

    CURRENT_CACHE = my_param.id + "-v" + CURRENT_CACHE_VERSION;
    CURRENT_CACHE_DICT[my_param.id] = CURRENT_CACHE;
    return caches.open(CURRENT_CACHE)
      .then(function() {
        answer = {"error": null, data: param.id};
        if (my_event) {
          resolve(my_event.port[0].postMessage(answer));
        }
        resolve(answer);
      })
      .catch(function(error) {
        var answer = {"error": {'message': error.toString()}};
        if (my_event) {
          reject(my_event.ports[0].postMessage(answer));
        }
        throw answer;
      });
  });
}

// remove a cache
function jio_remove(my_param, my_event) {
  return new Promise(function (resolve, reject) { 
    var answer = {"error": null};
    delete CURRENT_CACHE_DICT[my_param.id];
    return caches.delete(CURRENT_CACHE)
      .then(function() {
        if (my_event) {
          resolve(my_event.ports[0].postMessage(answer));
        }
        resolve(answer);
      })
      .catch(function(error) {
        var answer = {"error": {'message': error.toString()}};
        if (my_event) {
          reject(my_event.ports[0].postMessage(answer));
        }
        throw answer;
      });
  });
}

// return list of caches ~ folders
function jio_allDocs(my_param, my_event) {
  return new Promise(function (resolve, reject) { 
    return caches.keys().then(function(key_list) {
      var result_list = [],
        answer,
        id,
        i;

      for (i = 0; i < key_list.length; i += 1) {
        id = key_list[i].split("-v")[0];
        if (id !== "self") {
          result_list.push({"id": id, "value": {}});
        }
      }
      answer = {"error": null, data: result_list};
      if (my_event) {
        resolve(my_event.ports[0].postMessage(answer));
      }
      resolve(answer);
    })
    .catch(function(error) {
      var answer = {"error": {'message': error.toString()}};
      if (my_event) {
        reject(my_event.ports[0].postMessage(answer));
      }
      throw answer;
    });
  });
}

// return all urls stored in a cache
function jio_allAttachments(my_param, my_event) {
  return new Promise(function (resolve, reject) { 
    CURRENT_CACHE = my_param.id + "-v" + CURRENT_CACHE_VERSION;

    // returns a list of the URLs corresponding to the Request objects
    // that serve as keys for the current cache. We assume all files
    // are kept in cache, so there will be no network requests.
    return caches.open(CURRENT_CACHE)
      .then(function(cache) {
        return cache.keys()
          .then(function (request_list) {
            var result_list = request_list.map(function(request) {
              return request.url;
            }),
              attachment_dict = {},
              answer,
              i, 
              len;
              
            for (i = 0, len = result_list.length; i < len; i += 1) {
              attachment_dict[result_list[i]] = {};
            }
            answer = {"error": null, data: attachment_dict};
            if (my_event) {
              resolve(my_event.ports[0].postMessage(answer));
            }
            resolve(answer);
          });
      })
      .catch(function(error) {
        var answer = {"error": {'message': error.toString()}};
        if (my_event) {
          reject(my_event.ports[0].postMessage(answer));
        }
        throw answer;
      });
  });
}

// delete a file from a cache
function jio_removeAttachment(my_param, my_event) {
  return new Promise(function (resolve, reject) { 
    CURRENT_CACHE = my_param.id + "-v" + CURRENT_CACHE_VERSION;
    return caches.open(CURRENT_CACHE)
      .then(function(cache) {
        request = new Request(my_param.name, {mode: 'no-cors'});
        cache.delete(request)
          .then(function(success) {
            var answer = {"error": success ? null : {
              'status': 404,
              'message': 'Item not found in cache.'
            }};
            if (my_event) {
              resolve(event.ports[0].postMessage(answer));
            }
            resolve(my_event);
          });
      })
      .catch(function(error) {
        var answer = {"error": {'message': error.toString()}};
        if (my_event) {
          reject(my_event.ports[0].postMessage(answer));
        }
        throw answer;
      });
  });
}

// add a file to a cache
function jio_putAttachment(my_param, my_event) {
  return new Promise(function (resolve, reject) {
    CURRENT_CACHE = my_param.id + "-v" + CURRENT_CACHE_VERSION;
    return caches.open(CURRENT_CACHE)
      .then(function(cache) {

        // If event.data.url isn't a valid URL, new Request() will throw a 
        // TypeError which will be handled by the outer .catch().
        // Hardcode {mode: 'no-cors} since the default for new Requests 
        // constructed from strings is to require CORS, and we don't have any 
        // way of knowing whether an arbitrary URL that a user entered 
        // supports CORS.
        request = new Request(my_param.name, {mode: 'no-cors'});
        response = new Response(my_param.content);
        return cache.put(request, response);
      })
      .then(function() {
        var answer = {"error": null};
        if (my_event) {
          resolve(my_event.ports[0].postMessage(answer));
        }
        resolve(answer);
      })
      .catch(function(error) {
        var answer = {"error": {'message': error.toString()}};
        if (my_event) {
          reject(my_event.ports[0].postMessage(answer));
        }
        throw answer;
      });
  });
}

// get a file from cache
function jio_getAttachment(my_param, my_event) {
  return new Promise(function (resolve, reject) {
    CURRENT_CACHE = my_param.id + "-v" + CURRENT_CACHE_VERSION;
    return caches.open(CURRENT_CACHE)
      .then(function(cache) {
        var mime_type;
        return cache.match(my_param.name)
          .then(function(response) {
            var start,
              end,
              split;

            is_range = response.headers.get('range') || my_param.options.range;
            mime_type = response.headers.get('Content-Type');

            // range requests
            if (response.headers.get('range') || my_param.options.range) {
              split = is_range.split("bytes=")[1].split("-");
              start = split[0];
              end = split[1];

              return response.arrayBuffer()
                .then(function (array_buffer) {
                  var dataView = new DataView(array_buffer.slice(start, end));
                  return new Blob([dataView], {"type": mime_type});
                });
            
            // XXX improve - regular requests
            } else {
            
              // the response body is a ReadableByteStream which cannot be
              // passed back through postMessage apparently. This link
              // https://jakearchibald.com/2015/thats-so-fetch/ explains
              // what can be done to get a Blob to return

              // However, calling blob() does not allow to set mime-type, so
              // currently the blob is created, read, stored as new blob
              // and returned (to be read again)
              // https://github.com/whatwg/streams/blob/master/docs/ReadableByteStream.md
              return response.clone().blob();
            }
          })
          .then(function (response_as_blob) {
            return new Promise(function(resolve) {
              var blob_reader = new FileReader();
              blob_reader.onload = resolve;
              blob_reader.readAsText(response_as_blob);
            });
          })
          // XXX why am I doing this? just to add the mime-type?
          .then(function (reader_response) {
            return new Blob([reader_response.target.result], {"type": mime_type});
          })
          .then(function (converted_response) {
            if (converted_response) {
              answer = {"error": null, data: converted_response};
            } else {
              answer = {"error": {'status': 404, 'message': 'Item not found in cache.'}};
            }
            if (my_event) {
              resolve(my_event.ports[0].postMessage(answer));
            }
            resolve(answer);
          });
        })
        .catch(function(error) {
          var answer = {"error": {'message': error.toString()}};
          if (my_event) {
            reject(my_event.ports[0].postMessage(answer));
          }
          throw answer;
        });
  }); 
}

// here we go:
// https://github.com/PolymerElements/platinum-sw/blob/master/service-worker.js
self.param_dict = deserializeUrlParameters(location.search.substring(1));
console.log(self.param_dict)
if (self.param_dict.has('worker')) {
  //importScripts.apply(null, self.param_dict["worker"]);
  importScripts(self.param_dict.get("worker"))
}
console.log("yeah")
try {
  hello(123)
} catch (e) {
  console.log(e)
}
if (self.param_dict.has('prefetch_url_list')) {
  console.log("let's fetch")
  console.log(self.param_dict.get("prefetch_url_list"))
  PREFETCH_URL_LIST = [self.param_dict.get('prefetch_url_list')];
}
console.log("prefetch")


// listeners

// runs while an existing worker runs or nothing controls the page (update here)
self.addEventListener('install', function (event) {
  console.log("A FECTHIN")
  event.waitUntil(caches.open(CURRENT_CACHE_DICT.dictionary)
    .then(function(cache) {
      var cache_promise_list = PREFETCH_URL_LIST.map(function(prefetch_url) {
        
        // check if file is already on cache
        return cache.match(prefetch_url)
          .then(function(cached_file_response) {
            var request,
              url;
    
            // file is not on cache yet
            if (!cached_file_response) {
              console.log("loading ", prefetch_url, " to be cached.")
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
                request = new Request(url, {mode: 'no-cors'});
    
              // XXX differentiate handler based on desired content-type? 
              // (ArrayBuffer, BinaryString, DataUrl, String)
              return fetch(request)
                .then(function(response) {
                  if (response.status >= 400) {
                    throw new Error('request for ' + prefetch_url +
                      ' failed with status ' + response.statusText);
                  }
                
                  // ======== 
                  // XXX the whole indexing of the file should be done somewhere
                  // else. has nothing to do with fetching and caching files
                  // consider indexStorage?
                  return response.blob(); 
                });
            }
            console.log("FILE IS ALREADY CACHED")
            return cached_file_response.blob();
      })
          .then(function(blob) {

            // this should go into indexedDB!
            // not on prefetch either
            // we could check in recorder if the index exists, if not
            // still the question is how would I run this properly into
            // indexeddb, because if I want to cache stuff it should
            // be done in the right format directly.
            // this is probably what mapping storage does, so the question is
            // how to differentiate between files I want to cache as is and files
            // I would like to map+store
            // duplicate? no, prefetch files need to be indexed, everything else
            // will be cached normally in another cache. I can make as many 
            // caches as I want, so no problem.
            
            // as I can pass through the url now, I could also pass more complex
            // stuff such as ... if I setup the indexeddb like I want, for example
            // with a mapping storage and indexStorage, which maintains an index
            // in indexeddeb and mapping means we tae the field value and only
            // store the first two characters as id. then I could somehow pass
            // a param in the url telling the serviceworer to ? store the index
            // on indexeddb? how do I communicate in and out? need to think
            // about this.

            // parse file, remove whitespace, not 2-depths boundaries in index
            function compressAndIndexFile(my_blob) {
              var file_reader = new FileReader(),
                chunk_size = 1024,
                offset = 0,
                boundary_dict = {},
                hang_over = "",
                pos = 0;
              return new Promise(function (resolve, reject) {
                file_reader.onload = function (my_event) {
                  var chunk = my_event.target.result,
                    line_list = chunk.split(LINE_BREAK).filter(Boolean),
                    len = line_list.length,
                    i,
                    iterator,
                    line,
                    request,
                    response;
                  for (i = 0; i < len; i += 1) {
                    line = line_list[i];
                    if (i === 0) {
                      line = hang_over + line;
                      hang_over = "";
                    }
                    iterator = line[0] + (line[1] || "");
                    if (boundary_dict.hasOwnProperty(iterator) === false) {
                      boundary_dict[iterator] = pos;
                    }
                    if (HAS_LINE_BREAK.test(line) === false) {
                      hang_over = line;
                    } else {
                      hang_over = "";
                      pos += line.length;
                    }
                  }
                  offset += chunk_size;
                  //if (offset >= my_blob.size) {
                  if (offset >= 16385) {
                    console.log("DONE")
                    console.log(boundary_dict);
                    request = new Request("index.VoxForgeDict.txt", {mode: 'no-cors'});
                    response = new Response(JSON.stringify(boundary_dict));
                    return cache.put(request, response)
                      .then(function () {
                        return resolve(my_blob);
                      });
                  }
                  return loopOverBlob(offset);
                };
                file_reader.onerror = function (my_event) {
                  reject(my_event);
                };
                
                function loopOverBlob(my_offset) {
                  return file_reader.readAsText(
                    blob.slice(my_offset, my_offset += chunk_size)
                  );
                }
                return loopOverBlob(offset);
              });              
            }
            return compressAndIndexFile(blob);
          })
          .then(function(what) {
            console.log("DONE")
            console.log(what)
            
            // this is actually putting the item into cache!
            // I guess it is here, that I should somehow return the file
            // to a place where I can call the "front end" to actually store 
            // the file
            return cache.put(prefetch_url, new Response(what));
            // ================
            // Use the original URL without the cache-busting parameter as 
            // the key for cache.put().
            // XXX Use jIO interface here, too after moving out the methods
            // return cache.put(prefetch_url, response);
          }).catch(function(error) {
            console.error('Not caching ' + prefetch_url + ' due to ' + error);
          });
      });
      return Promise.all(cache_promise_list).then(function() {
        console.log('Pre-fetching complete.');
      });
    })
    .then(function () {

      // force waiting worker to become active worker (claim)
      // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
      if (self.param_dict.hasOwnProperty('skip_waiting') !== false) {
        self.skipWaiting();
      }
    }).catch(function(error) {
      console.error('Pre-fetching failed:', error);
    })
  );
});

// runs active page, changes here (like deleting old cache) breaks page
self.addEventListener('activate', function (event) {
  
  var expected_cache_name_list = Object.keys(CURRENT_CACHE_DICT).map(function(key) {
    return CURRENT_CACHE_DICT[key];
  });
  
  event.waitUntil(caches.keys()
    .then(function(cache_name_list) {
      return Promise.all(
        cache_name_list.map(function(cache_name) {
          version = cache_name.split("-v")[1];
          
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
    .then(function () {
      console.log("'activate': Claiming clients for version");
      if (self.param_dict.hasOwnProperty('clients_claim') !== false) {
        return self.clients.claim();
      }
    })
  );
});

// XXX I'm a server
// intercept network requests, allows to serve form cache or fetch from network
/*
self.addEventListener('fetch', function (event) {
  
  var url = event.request.url,
    cacheable_list = [],
    isCacheable = function (el) {
      return url.indexOf(el) >= 0;
    };

  if (event.request.method === "GET") {
    event.respondWith(caches.open(CURRENT_CACHE_DICT["self"])
      .then(function(cache) {
        return cache.match(event.request)
          .then(function(response) {
  
            // cached, return from cache
            if (response) {
              return response;
      
            // not cached, fetch from network
            }

            // clone call, because any operation like fetch/put... will
            // consume the request, so we need a copy of the original
            // (see https://fetch.spec.whatwg.org/#dom-request-clone)
            return fetch(event.request.clone())
              .then(function(response) {
                
                // add resource to cache
                if (response.status < 400 && cacheable_list.some(isCacheable)) {
                  cache.put(event.request, response.clone());
                }
                return response;
              });
            });
      })
      .catch(function(error) {

        // This catch() will handle exceptions that arise from the match()
        // or fetch() operations. Note that a HTTP error response (e.g.
        // 404) will NOT trigger an exception. It will return a normal 
        // response object that has the appropriate error code set.
        throw error;
      })
    );

  // we could also handle post with indexedDB here
  //} else {
  //  event.respondWith(fetch(event.request));
  }
});
*/

self.addEventListener('message', function (event) {
  var param = event.data;
  switch (param.command) {
    case 'get':
      return jio_get(param, event);
    case 'put':
      return jio_put(param, event);
    case 'remove':
      return jio_remove(param, event);
    case 'allDocs':
      return jio_allDocs(param, event);
    case 'allAttachments':
      return jio_allAttachments(param, event);
    case 'removeAttachment':
      return jio_removeAttachment(param, event);
    case 'putAttachment':
      return jio_putAttachment(param, event);
    case 'getAttachment':
      return jio_getAttachment(param, event);
    default:
      throw 'Unknown command: ' + event.data.command;
  }
});  

