/**
 * JIO Worker Storage Type = "Worker".
 * connects to a substorage inside a worker/serviceworker.
 */
/*jslint indent: 2 */
/*global global, Blob, jIO, RSVP, navigator*/
(function (global, jIO, RSVP, Blob, navigator) {
  "use strict";

  function serializeUrlList(my_url_list, my_prefix) {
    var url_param = "";
    if (my_url_list) {
      url_param = my_url_list.reduce(function (current, next) {
        return current + my_prefix + encodeURIComponent(next) + "&";
      }, url_param);
    }
    return url_param.substring(0, url_param.length - 1);
  }

  // This wraps the message posting/response in a promise, which will resolve if
  // the response doesn't contain an error, and reject with the error if it does.
  // Alternatively, onmessage handle and controller.postMessage() could be used
  function sendMessage(message) {
    return new RSVP.Promise(function (resolve, reject) {
      var messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = function (event) {
        if (event.data.error) {
          return reject(event.data.error);
        } else {
          return resolve(event.data.data);
        }
      };

      // This sends the message data as well as transferring
      // messageChannel.port2 to the service worker. The service worker can then
      // use the transferred port to reply via postMessage(), which will in turn
      // trigger the onmessage handler on messageChannel.port1.
      // See https://html.spec.whatwg.org/multipage/workers.html
      // XXX try catch here to throw for impatient users
      return navigator.serviceWorker.controller
        .postMessage(message, [messageChannel.port2]);
    });
  }
  
  function installServiceWorker(my_context) {
    return new RSVP.Queue()
      .push(function () {
        return my_context.sw.getRegistration();
      })
      .push(function (registered_worker) {
        return new RSVP.Promise(function (resolve) {
          if (!registered_worker) {
            return resolve(my_context.sw.register(my_context.url, {
              "scope": my_context.scope
            }));   
          }
          // XXX What if this isn't mine?
          return resolve(registered_worker);
        });
      });
  }

  function waitForInstallation(registration) {
    
    return new RSVP.Promise(function (resolve, reject) {
      if (registration.installing) {
        
        // XXX this seems not supported, does not trigger, but wuold
        // allow to differentiate between errors and replacing a serviceworker
        //registration.installing.onerror = function (error) {
        //  reject(error);
        //};

        // If the current registration represents the "installing" service
        // worker, then wait until the installation step completes (during
        // which any defined resources are pre-fetched) to continue.
        registration.installing.addEventListener('statechange', function(e) {
          if (e.target.state == 'installed') {
            return resolve(registration);
          
          // if activate/install fail or this worker is replaced by another
          // https://bitsofco.de/the-service-worker-lifecycle/
          } else if (e.target.state == 'redundant') {
            return reject(e);
          }
        });
      } else {

        // Otherwise, if this isn't the "installing" service worker, then
        // installation must have beencompleted during a previous visit to this
        // page, and the any resources will already have benn pre-fetched So
        // we can proceed right away.
        return resolve(registration);
      }
    });
  }

  function claimScope(registration) {
    return new RSVP.Promise(function (resolve, reject) {
      if (registration.active && registration.active.state === 'activated') {
        return resolve();
      } else {
        return reject(new Error("Please refresh to initialize serviceworker."));
      }
    });
  }
  
  function initializeServiceWorker(my_context) {
    return new RSVP.Queue()
      .push(function () {
        // XXX PromiseEventListener(navigator.serviceWorker, "controllerchange", false, console)
        return installServiceWorker(my_context);
      })
      .push(function (registration) {
        return waitForInstallation(registration);
      })
      .push(function (installation) {
        return claimScope(installation);
      })
      .push(undefined, function (error) {
        console.log(error);
        throw error;
      });
  }
  
  function initializeWorker(spec) {
    return new RSVP.Queue()
    .push(function () {
      return new Worker(spec.url);
    })
    .push(undefined, function (error) {
      console.log(error);
      throw error;
    });
  }

  /**
   * The JIO WorkerStorage Storage extension
   *
   * @class WorkerStorage
   * @constructor
   */
  function WorkerStorage (spec) {
    var context = this;

    if (spec.scope && "serviceWorker" in navigator === false) {
      throw new jIO.util.jIOError("Serviceworker not available.", 503);
    }
    if (!spec.scope && "Worker" in global === false) {
      throw new jIO.util.jIOError("WebWorker not available.", 503);
    }
    if (!spec.sub_storage) {
      throw new jIO.util.jIOError("Worker storage requires a sub_storage.", 400);
    }
    if (!spec.url) {
      throw new jIO.util.jIOError("Worker storage requires a (service)worker url.", 400);
    }

    // pass configuration to serviceworker via url
    this.url = spec.url += "?" +
      serializeUrlList(spec.prefetch_url_list, "prefetch_url_list=") + "&" +
      serializeUrlList(spec.authorized_cache_list, "authorized_cache_list=") + "&" +
      "sub_storage=" + encodeURIComponent(JSON.stringify(spec.sub_storage));
    
    if (spec.prefetch_update) {
      this.url += "&prefetch_update=true";
    }

    // intialize serviceworker or worker
    if (spec.scope) {
      this.sw = navigator.serviceWorker;
      initializeServiceWorker(this);
    } else {
      initializeWorker(this);
    }
  }

  WorkerStorage.prototype.post = function (doc) {
    return sendMessage({"command": "post", "param": [doc]});
  };

  WorkerStorage.prototype.get = function (id) {
    return sendMessage({"command": "get", "param": [id]});
  };

  WorkerStorage.prototype.put = function (id, doc) {
    return sendMessage({"command": "put", "param": [id, doc]});
  };

  WorkerStorage.prototype.remove = function (id) {
    return sendMessage({"command": "remove", "param": [id]});
  };

  WorkerStorage.prototype.removeAttachment = function (id, name) {
    return sendMessage({"command": "removeAttachment", "param": [id, name]});
  };

  WorkerStorage.prototype.getAttachment = function (id, name, options) {

    // NOTE: alternatively inside serviceworker, one could also do get via
    // ajax request which the serviceworker would intercept using the fetch
    //listener. For a pure storage however, we don't assume fetching resources
    // from the network, so all methods will go through sendMessage
    return sendMessage({"command": "getAttachment", "param": [id, name, options]});
  };

  WorkerStorage.prototype.putAttachment = function (id, name, blob) {
    return sendMessage({"command": "putAttachment", "param": [id, name, blob]});
  };
  
  WorkerStorage.prototype.allAttachment = function (options) {
    return sendMessage({"command": "allAttachment", "param": [options]});
  };
  
  WorkerStorage.prototype.hasCapacity = function (name) {
    return ((name === "list") || (name === "query") ||
      (name === "limit") || (name === "include")
    );
  };

  WorkerStorage.prototype.allDocs = function (options) {
    return sendMessage({"command": "allDocs", "param": [options]});
  };
  
  WorkerStorage.prototype.buildQuery = function (options) {
    return sendMessage({"command": "buildQuery", "param": [options]});
  };

  jIO.addStorage('worker', WorkerStorage);

}(self, jIO, RSVP, Blob, navigator));

