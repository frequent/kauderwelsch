(function (worker_instance) {
  "use strict";

  // worker for voxForge dictionary operations

  importScripts(
    "rsvp.js"
  );

  var DICTATOR = {};

  function bumpCharacter(my_string, my_pointer) {
    return String.fromCharCode(my_string.charCodeAt(my_pointer) + 1);
  }

  function getCharacterPointers(my_input_list) {
    var output_array = [],
      len = my_input_list.length,
      input_array,
      input_value,
      single,
      double,
      follow_up,
      i;
    for (i = 0; i < len; i += 1) {
      input_array = [];
      input_value = my_input_list[i];
      single = input_value.charAt(0);
      double = input_value.charAt(1);
      follow_up = bumpCharacter(double, 0);
      input_array.push(single + double);
      input_array.push(single + follow_up);
      output_array.push(input_array);
    }
    return output_array;
  }

  // XXX Not ROBUST => put in indexeddb!
  function setPointer(my_index, my_pointer) {
    if (my_index.hasOwnProperty(my_pointer)) {
      return my_index[my_pointer];
    }
    
    // fallback to end of file
    if (my_pointer[0] === "Z" && my_pointer[1] === "Z") {
      return undefined;
    }
    
    // stay within ABC, "AZ" => "B "
    if (my_pointer[1] === "Z") {
      return setPointer(my_index, bumpCharacter(my_pointer[0] + " "));
    }
    return setPointer(my_index, my_pointer[0] + bumpCharacter(my_pointer, 1));
  }

  // ["HELLO", "BYE"] => [["HE", "HF"], ["BY", "BZ"]]
  function getBoundaryList(my_pointer_list, my_index) {
    var output_list = [],
      len = my_pointer_list.length,
      i,
      start_pointer,
      end_pointer;
    for (i = 0; i < len; i += 1) {
      start_pointer = setPointer(my_index, my_pointer_list[i][0]);
      end_pointer = setPointer(my_index, my_pointer_list[i][1]);
      output_list.push(start_pointer + "-" + end_pointer);
    }
    return output_list.join(",");
  }

  // this will eventually trigger the next step
  DICTATOR.validateWithData = function (my_callback_data) {
    console.log("NA")
    console.log(my_callback_data)
    
    /*return new RSVP.Queue()
      .push(function () {
        
      })
    */

  };
  
  // this will setup the actual method to call
  DICTATOR.getPointers = function (my_option_dict) {
    console.log("getpointers called")
    console.log(my_option_dict)
    DICTATOR.to_validate = my_option_dict.input;
    // can't pass back a promise, so we finish here.
    return my_option_dict.callback_handler("getLexicon", "validateWithData");
    
    // pass data we need and event name to call with result
    /*
    return new RSVP.Queue()
      return new RSVP.Promise(function (resolve) {
        DICTATOR.pending = new RSVP.defer();
        
        // this will eventually trigger the next step
        DICTATOR.setLexicon = function (my_callback_data) {
          return resolve(DICTATOR.pending.resolve(my_callback_data));
        };
        console.log("COME ON")
        // this is not a promise, so I can return through postMessage
        return my_option_dict.callback_handler("getLexicon", "setLexicon");
      })
      .push(function (my_data) {
        console.log("DONE")
        console.log(my_data)
      })
    */
    
      /*
    return new RSVP.Queue()
      .push(function () {
        console.log("alors")
        DICTATOR.pending = new RSVP.defer();
        console.log("that work?")
        console.log(DICTATOR)
        console.log(DICTATOR.pending)
        return my_option_dict.storage("getLexicon", DICTATOR.pending.promise);
      })
      .push(function (my_result) {
        console.log("He");
        console.log(my_result);
      })
      .push(null, function (error) {
        console.log(error);
        throw errror;
      });
    */
    // I can initialize the Dictator passing in the configuration it needs
    // for accessing the storage = database name, but then how do I use the jIO
    // storage to work with data?
    
    // I could pass out the request and say, I'm worker, need data
    // and do the transferable object thing. This way I would get out 
    // the data easily, but then how do I look up the storage from here?
    
    // these are a lot of requests...
    // I could get for every word the starting character and next one byte range
    // then I can build the boundary list, give it back, get back the file
    // range from serviceworker and look through if it's in, would be nice
    // if router could do this, but this would mean the router would have
    // to initialize the storages and the recorder doesn't do anything. Would
    // be interesting, in theory the worker has access to the caches, so I 
    // could implement the storage in the webworker, too, same good. This means
    // the webworker can handle file ops, mh. No need to work in the recorder.
    // sounds good.
    
    // so the router will also handle file ops using jIO sw and indexeddb?
    // this means I must have jIO inside the webworker? or can I just send
    // the request out to be handled by the recorder? no why?
    
    // still, the recorder request jio-bridge-methds and calls them, the bridge
    // wires to serviceworker which posts-messages, we should follow the same
    // path honestly, so the webworker can be the "backend" receiving calls
    // from recorder via jio gadget via serviceworker/indexeddb storage. so 
    // I can only implement the backend here and even if I want a file, I have to
    // request it from recorder who calls jIO who will call me again.
    // hum
    
    // defer?
    
  };




  /*
  // check dictionary whether words to be spoken are in it, throw if not
  // XXX this is a worker task, no?
  function validateAgainstDict(my_gadget, my_input_value) {
    console.log("starting with ", my_input_value)
    // this is an indexedDB task
    return new RSVP.Queue()
      .push(function () {
        return my_gadget.jio_getAttachment("dictionary", "index.VoxForgeDict.txt", {
          format: "text"
        });
      })
      .push(function (my_index) {
        var pointer_dict = JSON.parse(my_index);
        return getBoundaryList(getCharacterPointers(my_input_value.split(",")), pointer_dict)
      })
      .push(function (boundary_list) {
        console.log("setting range to ", boundary_list)
          return my_gadget.jio_getAttachment("dictionary", "VoxForgeDict.txt", {
            "range": "bytes=" + boundary_list,
            "format": "text"
          });
        })
        .push(function (my_dictionary_content) {
          console.log(my_dictionary_content);
          console.log("YEAH")
          // look through this for the text from my_invput_value, return or missing words.

        })
        .push(undefined, function (my_error_list) {
          console.log("NOPE")
          console.log(my_error_list)
          throw my_error_list
          // words could not be found, throw the words, so user can update
        });
  }
  */
  
  // error handling
  // worker_instance.close();

  worker_instance.dictator = DICTATOR;

}(self));