/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global self */
(function (worker_instance) {
  "use strict";

  importScripts(
    'gadget_recorder_worker_resampler.js',
    'gadget_recorder_worker_recorder.js',
    'gadget_recorder_worker_dictator.js'
  );

  worker_instance.onmessage = function(my_event){
    var opts = my_event.data.option_dict;
    switch(my_event.data.command){
      case 'init':
        return sendMessage("init", recorder.initialize(opts));
      case 'record':
        return sendMessage("recording", recorder.record(opts.buffer));
      case 'exportWAV':
        return sendMessage("exportWAV", recorder.exportWAV(opts.type));
      case 'exportMonoWAV':
        return sendMessage("exportMonoWAV", recorder.exportMonoWAV(opts.type));
      case 'getBuffers':
        return sendMessage("getBuffers", recorder.getBuffers());
      case 'clear':
        return sendMessage("clear", recorder.clear());
    }
  };

  // XXX promisify?
  function sendMessage(my_command, my_reply) {
    worker_instance.postMessage({
      "command":  my_command,
      "status": 200,
      "result": my_reply || []
    });
  }

  function fetchData(my_command, my_callback_command) {
    worker_instance.postMessage({
      "command": my_command,
      "status": 202,
      "callback": my_callback_command
    })  
  }
  
  // XXX error handling
  // XXX worker_instance.close();
  
}(self));