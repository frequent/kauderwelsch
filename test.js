
(function (window, Error) {
  "use strict";
    
  var ec = [
    0,
    1,    1,    1,    1,    1,    1,    1,    1,    2,    3,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    2,    4,    1,    5,    1,    6,    1,    1,    1,
    1,    7,    1,    1,    1,    1,    1,    8,    8,    8,
    8,    8,    8,    8,    8,    8,    8,    9,    1,    1,
    1,    1,    1,   10,   11,    8,    8,    8,   12,    8,
   13,    8,   14,    8,    8,    8,    8,   15,   16,    8,
    8,   17,   18,    8,    8,    8,    8,    8,    8,    8,
    1,    1,    1,    1,    8,    1,    8,    8,    8,    8,
  
    8,    8,    8,    8,    8,    8,    8,    8,    8,    8,
    8,    8,    8,    8,    8,    8,    8,    8,    8,    8,
    8,    8,   19,    1,   20,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
  
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1
  ];

  var accept = [
      0,
      0,    0,   15,   13,   12,   10,    7,   13,   13,    8,
      2,    9,   13,    3,    4,    0,   11,    0,    0,    2,
      1,    0,    0,    0,    0,    0,    0,    0,    0,    5,
      6,    0
  ];

  var base = [
    0,
    0,    0,   39,   40,   40,   40,   40,   35,   10,   40,
    0,   40,    0,   40,   40,   34,   40,   18,   22,    0,
    0,   16,   18,   18,   15,   17,   12,   13,   15,   40,
   40,   40,   24,   21,   20
  ];
  
  var meta = [
    0,
    1,    1,    1,    1,    1,    1,    1,    2,    1,    1,
    2,    2,    2,    2,    2,    2,    2,    2,    1,    1
  ];
  
  var def = [
     0,
     32,    1,   32,   32,   32,   32,   32,   33,   32,   32,
     34,   32,   35,   32,   32,   33,   32,   32,   32,   34,
     35,   32,   32,   32,   32,   32,   32,   32,   32,   32,
     32,    0,   32,   32,   32
  ];
  
  var nxt = [
    0,
    4,    5,    6,    7,    8,    9,   10,   11,   12,   13,
   11,   11,   11,   11,   11,   11,   11,   11,   14,   15,
   18,   21,   20,   19,   16,   16,   31,   30,   29,   28,
   27,   26,   25,   24,   23,   22,   17,   17,   32,    3,
   32,   32,   32,   32,   32,   32,   32,   32,   32,   32,
   32,   32,   32,   32,   32,   32,   32,   32,   32,   32
  ];
  
  var check = [
    0,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
    9,   35,   34,    9,   33,   33,   29,   28,   27,   26,
   25,   24,   23,   22,   19,   18,   16,    8,    3,   32,
   32,   32,   32,   32,   32,   32,   32,   32,   32,   32,
   32,   32,   32,   32,   32,   32,   32,   32,   32,   32
  ];

  var i;
  var character_list = [0, 0];
  var last_accepted_state;
  var last_position;
  var state_out;
  var fallback_state;

  function getCharacterFromPointer(my_position) {
    var lookup = character_list[my_position];
    if (lookup || lookup === 0) {
      return lookup.toString(10).charCodeAt(0) & 0xff;
    }
  }

  function loopIt(my_position, my_state, my_i) {
    var char_code;
    var breaker = 0;
    
    last_accepted_state = undefined;

    function getCharCode(my_char_code) {
      return check[base[my_state] + my_char_code];
    }

    do {
      char_code = ec[my_i];
      console.log("START do-loop #" + my_position+ ", char_code:" + char_code + " state:" + my_state);

      if (my_position > 100) {
        return null;
      }
    
      if (accept[my_state]) {
        last_accepted_state = my_state;
        last_position = my_position;
      }

      while (getCharCode(char_code) !== my_state) {
        console.log("inner: " + getCharCode(char_code) + " !== " + my_state)
        my_state = def[my_state];
        if (my_state >= 33 ) {
          char_code = meta[char_code];
        }
        breaker = breaker + 1;
        if (breaker > 2) {
          return null;
        }
        console.log("new state: " + my_state + " new char_code: " + char_code)
      }
  
      my_state = nxt[base[my_state] + char_code];
      my_position = my_position + 1;
    } while (base[my_state] !== 40);

    console.log("OUT: " + my_state)
    return my_state
  }
  
  for (i = 0; i < ec.length; i += 1) {
    console.log("i: "+i)
    state_out = loopIt(0, 1, i);

    if (state_out === null) {
      continue;
    } else {
      console.log("finished: state => " + state_out + " action: " + accept[state_out]);
      if (accept[state_out] === 0) {
        if (last_accepted_state !== undefined) {
          console.log("fallback state => "+ last_accepted_state + " action: " +  accept[last_accepted_state])
          if (accept[last_accepted_state] === 15) {
            console.log("FOUND ONE: i=" + i);
            //break;
          }
        }
      }
    }

    
    
  }
  
  console.log("DONE")
  

}(window, Error));

