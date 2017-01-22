/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global self */
(function (worker_instance) {
  "use strict";

  importScripts(
    'trainer.js'
  );

  // some strings
  var LOG = 'log';
  var ERROR = 'error';
  
  // paramaters exposed to libsent/src/adin_mic_webaudio.c
  var BEGIN = function () {
    sendMessage({"type": 'begin'});
  };


  function sendMessage(my_object) {
    worker_instance.postMessage(my_object);
  }

  //console emscripten polyfill 
  function Console () {}

  Console.error = function(error) {
    sendMessage({"type": ERROR, "error": error});
  };

  Console.log = (function() {
    var dom_node;

    return function(my_worker_message) {
      sendMessage({"type": LOG, "message": my_worker_message});
    };
  }());

  worker_instance.onmessage = (function() {
    return function(e) {
      if (e.data.type === 'begin') {
        // init
      } else {
        // process
      }
    };
  }());

  worker_instance.console = Console;
  worker_instance.begin = BEGIN;

}(self));
