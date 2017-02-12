(function (context) {
  "use strict";

  var PROCESSOR = {};
  var LINE_BREAK = /(.*?[\r\n])/g;
  var HAS_LINE_BREAK = /\r|\n/;

  importScripts('rsvp.latest.js');
  
  PROCESSOR.prettify = function (name, dict) {
    var rows = [],
      key;
    
    for (key in dict) {
      if (dict.hasOwnProperty(key)) {
        rows.push([(name + ":" + key), dict[key]]);  
      }
    }
    return {
      "rows": rows,
      "total_rows": rows.length
    };
  };
  
  PROCESSOR.process = function (name, inbound_blob) {
    
    function compressAndIndexFile() {
      var file_reader = new FileReader(),
        chunk_size = 1024,
        offset = 0,
        boundary_dict = {},
        hang_over = "",
        pos = 0;
      
      return new RSVP.Promise(function (resolve, reject) {
        file_reader.onload = function (my_event) {
          var chunk = my_event.target.result,
            line_list = chunk.split(LINE_BREAK).filter(Boolean),
            len = line_list.length,
            i,
            iterator,
            line;

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
          //if (offset >= inbound_blob.size) {
          if (offset >= 16385) {
            resolve(PROCESSOR.prettify(name, boundary_dict));
          }
          return loopOverBlob(offset);
        };
        file_reader.onerror = function (my_event) {
          reject(my_event);
        };
        
        function loopOverBlob(my_offset) {
          return file_reader.readAsText(
            inbound_blob.slice(my_offset, my_offset += chunk_size)
          );
        }
        return loopOverBlob(offset);
      });              
    }
    return compressAndIndexFile(inbound_blob);
  };

  context.processor = PROCESSOR;

}(self));              
              
