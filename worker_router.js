/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global self */
(function (worker_instance) {
  "use strict";

  importScripts(
    'worker_resampler.js',
    'worker_recorder.js'
  );

  worker_instance.onmessage = function(my_event){
    var opts = my_event.data.option_dict;
    switch(my_event.data.command){
      case 'init':
        return sendMessage("init", recorder.initialize(opts));
      case 'record':
        return sendMessage("recording", reader.record(opts.buffer));
      case 'exportWAV':
        return sendMessage("exportWAV", reader.exportWAV(opts.type));
      case 'exportMonoWAV':
        return sendMessage("exportMonoWAV", reader.exportMonoWAV(opts.type));
      case 'getBuffers':
        return sendMessage("getBuffers", reader.getBuffer());
      case 'clear':
        return sendMssage("clear". reader.clear());
    }
  };
  
  
  // utility methods
  function sendMessage(my_command, my_reply) {
    worker_instance.postMessage({
      "command":  my_command,
      "status": 200,
      "result": my_reply || []
    });
  }

}(self));
