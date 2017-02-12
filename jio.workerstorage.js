/**
 * JIO Worker Storage Type = "Worker".
 * connects to a substorage inside a worker/serviceworker.
 */
/*jslint indent: 2 */
/*global global, Blob, jIO, RSVP, navigator*/
(function (global, jIO, RSVP, Blob, navigator) {
  "use strict";

  function serializeUrlList(url_list) {
    var prefix = "prefetch_url_list=",
      url_param = "";
    if (url_list) {
      url_param = url_list.reduce(function (current, next) {
        return current + prefix + encodeURIComponent(next) + "&";
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
          reject(event.data.error);
        } else {
          resolve(event.data.data);
        }
      };

      // This sends the message data as well as transferring
      // messageChannel.port2 to the service worker. The service worker can then
      // use the transferred port to reply via postMessage(), which will in turn
      // trigger the onmessage handler on messageChannel.port1.
      // See https://html.spec.whatwg.org/multipage/workers.html
      return navigator.serviceWorker.controller
        .postMessage(message, [messageChannel.port2]);
    });
  }
  
  function installServiceWorker(spec) {
    return new RSVP.Queue()
      .push(function () {
        return spec.sw.getRegistration();
      })
      .push(function (registered_worker) {
        return new RSVP.Promise(function (resolve) {
          if (!registered_worker) {
            return resolve(spec.sw.register(spec.url, {"scope": spec.scope}));   
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
            resolve(registration);
          
          // if activate/install fail or this worker is replaced by another
          // https://bitsofco.de/the-service-worker-lifecycle/
          } else if (e.target.state == 'redundant') {
            reject(e);
          }
        });
      } else {

        // Otherwise, if this isn't the "installing" service worker, then
        // installation must have beencompleted during a previous visit to this
        // page, and the any resources will already have benn pre-fetched So
        // we can proceed right away.
        resolve(registration);
      }
    });
  }

  function claimScope(registration) {
    return new RSVP.Promise(function (resolve, reject) {
      if (registration.active && registration.active.state === 'activated') {
        resolve();
      } else {
        reject(new Error("Please refresh to initialize serviceworker."));
      }
    });
  }

  /**
   * The JIO WorkerStorage Storage extension
   *
   * @class WorkerStorage
   * @constructor
   */
  function WorkerStorage (spec) {
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
    spec.url = spec.url += "?" + serializeUrlList(spec.prefetch_url_list) + "&" +
      "sub_storage=" + encodeURIComponent(JSON.stringify(spec.sub_storage));

    if (spec.scope) {
      spec.sw = navigator.serviceWorker;
      return new RSVP.Queue()
        .push(function () {
          // XXX PromiseEventListener(navigator.serviceWorker, "controllerchange", false, console)
          return installServiceWorker(spec);
        })
        .push(function (registration) {
          return waitForInstallation(registration);
        })
        .push(function (installation) {
          return claimScope(installation);
        })
        .push(undefined, function (error) {
          console.log("BAM")
          console.log(error);
          throw error;
        });
    }
    
    // Worker initialization
    if (!spec.scope) {
      return new RSVP.Queue()
        .push(function () {
          return new Worker(spec.url);
        })
        .push(function (worker) {
          // what happens here?
        });
    }
  }

  WorkerStorage.prototype.post = function () {
    return sendMessage({"command": "post", "param": arguments});
  };

  WorkerStorage.prototype.get = function () {
    return sendMessage({"command": "get", "param": arguments});
  };

  WorkerStorage.prototype.put = function () {
    return sendMessage({"command": "put", "param": arguments});
  };

  WorkerStorage.prototype.remove = function () {
    return sendMessage({"command": "remove", "param": arguments});
  };

  WorkerStorage.prototype.removeAttachment = function () {
    return sendMessage({"command": "removeAttachment", "param": arguments});
  };

  WorkerStorage.prototype.getAttachment = function () {

    // NOTE: alternatively inside serviceworker, one could also do get via
    // ajax request which the serviceworker would intercept using the fetch
    //listener. For a pure storage however, we don't assume fetching resources
    // from the network, so all methods will go through sendMessage

    return sendMessage({"command": "getAttachment", "param": arguments});
  };

  WorkerStorage.prototype.putAttachment = function () {
    return sendMessage({"command": "putAttachment", "param": arguments});
  };
  
  WorkerStorage.prototype.allAttachment = function () {
    return sendMessage({"command": "allAttachment", "param": arguments});
  };
  
  WorkerStorage.prototype.hasCapacity = function (name) {
    return (name === "list");
  };
  
  WorkerStorage.prototype.allDocs = function () {
    var context = this;
    return new RSVP.Queue()
      .push(function () {
        if (context.hasCapacity("list")) {
          return context.buildQuery(options);
        }
      })
      .push(function (result) {
        return result;
      });
  };

  WorkerStorage.prototype.buildQuery = function () {
    return sendMessage({"command": "allDocs", "param": arguments});
  };

  jIO.addStorage('worker', WorkerStorage);

}(self, jIO, RSVP, Blob, navigator));

