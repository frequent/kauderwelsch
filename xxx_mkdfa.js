/*
 * Copyright (c) 1991-2011 Kawahara Lab., Kyoto University
 * Copyright (c) 2000-2005 Shikano Lab., Nara Institute of Science and Technology
 * Copyright (c) 2005-2011 Julius project team, Nagoya Institute of Technology
 * All rights reserved
 */
//
// Finite automaton generator, mkfa %s programmed by 1995-1996 S.Hamada
//
// function:   grammar & vocabulary -> FA & header for parsing
// usage:      mkfa <option>.. <file-spec1>..; or mkfa <option>.. <file-spec2>
// option:     -dfa    DFA output(default)
//             -nfa    NFA output
//             -c      compatible FA output with g2fa
//             -e[0|1] putting class reduction flag on edge(default: on vertex)
//                    (0:accept 1:start omitted:both)
//             -nw     no warning messages
//             -q[0|1] control of processing report
//                    (0:no report 1:semi-quiet omitted:semi-quiet)
//             -v      verbose mode(to stderr)
// filespec1:  -fg     grammar filename
//             -fv     vocabulary filename
//             -fo     output filename(DFA or NFA file)
//             -fh     header filename of class reduction flag for parser
// filespec2:  -f      basename of above I/O files
//                     (respectively appended .grammar, .voca, .dfa(.nfa), .h)
// NOTES:       * Regular expression with left recursion can't be processed.
//              * Option -dfa and -nfa must not follow option -f.
//              * State#1 isn't always final state even if compiled with -c.,
//                ver.1.44-flex-p1);

// =============================================================================
// Notes
// =============================================================================
// - Julius Book https://julius.osdn.jp/juliusbook/en/
// - .h is for declaration, .c is implementation
// - stdlib.h declares exit, which expects integer, so verboseMessagesage1), 
//   0 = ok, rest = error
// - stderr is error, usage should be called when user enters wrong number of 
//   arguments (fewer, more) or wrong type (integer vs string)
//   passing char *argv[] => argv is a pointer pointing to a char*
//   strcpy copies string to another array
//   Argument Count, argc = 7 and Argument Vector, argv[] = { "mysort", "2", "8", "9", "1", "4", "5" };
//   yy{xxx] => lex parser https://www.quora.com/What-is-the-function-of-yylex-yyin-yyout-and-fclose-yyout-in-LEX
//   fputs => write to stream
//   https://github.com/zaach/jison => BISON => http://dinosaur.compilertools.net/bison/bison_4.html
//   JISON => https://github.com/zaach/jison
//   BISON: https://www2.cs.arizona.edu/~debray/Teaching/CSc453/DOCS/tutorial-large.pdf
//          http://www.cs.man.ac.uk/~pjj/cs212/ex5_hint.html
//   debug: http://zaa.ch/jison/try/usf/index.html
//   https://en.wikipedia.org/wiki/LALR_parser#LR_parsers

(function (window) {
  "use strict";

  // ===========================================================================
  // https://github.com/julius-speech/julius/tree/master/gramtools/mkdfa/mkfa-1.44-flex
  // (https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/main.c)
  // ===========================================================================

  // options
  SWITCH_SENT_LIST = 0;
  SWITCH_NO_WARNING = 0;
  SWITCH_COMPAT_I = 0;
  SWITCH_QUIET = 0;
  SWITCH_SEMI_QUIET = 0;
  SWITCH_DEBUG = 0;
  SWITCH_NFA_OUTPUT = 0;
  SWITCH_VERBOSE = 0;
  SWITCH_EDGE_START;
  SWITCH_EDGE_ACCEPT;
  
  // files [], we just push in for now
  GRAMMAR_FILE_NAME_LIST = [];                                                  // Grammar file name
  VOCA_FILE_NAME_LIST = [];                                                     // Vocabulary file name
  FA_OUTPUT_FILE_NAME_LIST = [];                                                // FA file name (DFAorNFA)
  HEADER_FILE_NAME_LIST = [];                                                   // Header file name, used to be [1024]
  FP_HEADER = [];                                                               // file, moved here from gram.tab.c

  // parameters
  VERSION_NUMBER = "ver.1.44-flex-p1";
  NO_NEW_LINE = 0;                                                              // Solve line break problems in multiple display modes
  IS_OPTION_F_SET = 0;                                                          // When -f is specified (to resolve problems with -dfa)

  // node tree?
  CLASS_LIST = NULL;                                                            // Linear list of classes
  CLASS_LIST_TAIL = NULL;                                                       // The last node of the linear list of classes
  START_SYMBOL = NULL;                                                          // Class of start symbol
  FA_LIST = NULL;                                                               // Pointer of start FA in FA network 

  // ------------------------------- helpers -----------------------------------
  function createOuput(my_message) {
    if (NO_NEW_LINE) {
      return "\n" + my_message;
    }
    return my_message;
  }

  // ------------------------------- console -----------------------------------
  function invalidMessage(my_invalid_list) {
    console.log("[Invalid]: " + createMessage(my_invalid_list.join(" ")) + "\n");
  }

  function errorMessage(my_message) {
    console.log("[Error]: " + createOuput(my_message) + "\n");
  }

  function warningMessage(my_message) {
    if (SWITCH_NO_WARNING) {
      return;
    }
    console.log("[Warning]: " + createOutput(my_message) + "\n");
    NO_NEW_LINE = 0;
  }

  function verboseMessagesage(my_message) {
    if (!SWITCH_VERBOSE) {
      return;
    }
    console.log("[Verbose]: " + createMessage(my_message) + "\n");
    NO_NEW_LINE = 0;
  }

  // ------------------------------- switch? -----------------------------------
  function setFileName(my_name, my_mode) {
    var file_grammar = 0,
      file_voca = 0,
      file_output = 0,
      file_header = 0;
    
    switch (my_mode) {
      case 1:
        GRAMMAR_FILE_NAME_LIST.push(my_name);
        file_grammar = 1;
        break;
      case 2:
        VOCA_FILE_NAME_LIST.push(my_name);
        file_voca = 1;
        break;
      case 3:
        FA_OUTPUT_FILE_NAME_LIST.push(my_name);
        file_output = 1;
        break;
      case 4:
        HEADER_FILE_NAME_LIST.push(my_name);
        file_header = 1;
        break;
      case 5: // XXX my_name => ? sample?
        GRAMMAR_FILE_NAME_LIST.push(my_name + ".grammar");
        VOCA_FILE_NAME_LIST.push(my_name + ".voca");
        if (SWITCH_NFA_OUTPUT) {
          FA_OUTPUT_FILE_NAME_LIST.push(my_name + ".nfa");
        } else {
          FA_OUTPUT_FILE_NAME_LIST.push(my_name + ".dfa");
        }
        IS_OPTION_F_SET = 1;
        file_grammar = file_voca = file_output = file_header = 1;
        return 1; // normally this means something went wrong, here ok
    }
    if (file_grammar && file_voca && file_output && file_header) {
      return 1; //as above
    }
    return 0;
  }
    
  function setSwitch (my_character) {
    switch (my_character) {
      case "l":
        SWITCH_SENT_LIST = 1;
        break;
      case "nw":
        SWITCH_NO_WARNING = 1;
        break;
      case "c":
        SWITCH_COMPAT_I = 1;
        break;
      case "db":
        SWITCH_DEBUG = 1;
        break;
      case "dfa":
        if (IS_OPTION_F_SET) {
          invalidMessage("IS_OPTION_F_SET is set");
        }
        SWITCH_NFA_OUTPUT = 0;
        break;
      case "nfa":
        if (IS_OPTION_F_SET) {
          invalidMessage("IS_OPTION_F_SET is set");
        }
        SWITCH_NFA_OUTPUT = 1;
        break;
      case "fg":
        return 1;
      case "fv":
        return 2;
      case "fo":
        return 3;
      case "fh":
        return 4;
      case "f":
        return 5;
      case "v":
        SWITCH_VERBOSE = 1;
        break;
      case "c":
        SWITCH_COMPAT_I = 1;
        break;
      case "e":
        SWITCH_EDGE_ACCEPT = 1;
        SWITCH_EDGE_START = 1;
        break;
      case "e0":
        SWITCH_EDGE_ACCEPT = 1;
        break;
      case "e1":
        SWITCH_EDGE_START = 1;
        break;
      case "q0":
        SWITCH_QUIET = 1;
        break;
      case "q":
      case "q1":
        SWITCH_SEMI_QUIET = 1;
        break;
      default:
        invalidMessage("Ran out of switch options.... funny");
        break;
    }
  }

  function getSwitch(my_len, my_list) {
    var file_mode = 0,
      file_finish = 0,
      i;

    for (i = 1; i < my_len; i += 1) {
      if (file_mode === 0) {
        if (my_list[i][0] === '-') {
          file_mode = setSwitch(my_list[i][1]); // pass e => switch_accept..., f => 5, f, f, f
        } else {
          invalidMessage("1st character of parameter is not '-':" + my_list[i]);
        }
      } else {
        file_finish = setFileName(my_list[i], file_mode);
        file_mode = 0;
      }
    }
    if (!file_finish) {
      invalidMessage("Something went wrong trying to set getSwitch filenames.");
    }
  }

  // -------------------------------- start ------------------------------------
  // run(`$mkfa -e1 -fg $rgramfile -fv $tmpvocafile -fo $(dfafile).tmp -fh $headerfile`)
  // - rgramfile = reversed grammar => S : NS_E SENT NS_B 
  // - tmpvocafile = #word
  // - dfafile and headerfile are empty

  function start() {
    var parameter_list = arguments,
      parameter_len = parameter_list.length;

    getSwitch(parameter_len, parameter_list);

    if(SWITCH_EDGE_ACCEPT) {
      errorMessage("I'm sorry. AcceptFlag on edge is under construction.");
    }

    //#ifdef YYDEBUG
    //    extern int yydebug;
    //    yydebug = 1;
    //#endif
    setGrammarFile();
    //setVoca();
    //makeNFA();
    //if(!SWITCH_NFA_OUTPUT) {
    //  makeDFA();
    //}
    //makeTriplet();
    console.log("done");
  }



  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/dfa.c
  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/gram.tab.c => Parser, uses gram.y
  // OK https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/gram.l
  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/gram.y
  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/lex.yy.c
  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/mkfa.h
  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/nfa.c
  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/nfa.h
  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/triplet.c
  // https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/voca.c

  // ---------------------------------------------------------------------------
  // from https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/gram.l
  // ---------------------------------------------------------------------------

  // setGram
  function setGrammarFile() {
    var struct_name;
    if (GRAMMAR_FILE_NAME_LIST === null) {
      errorMessage("Can't open grammar file: ", GRAMMAR_FILE_NAME_LIST);
    }
    yyin = GRAMMAR_FILE_NAME_LIST; // read
    if (SWITCH_COMPAT_I) {
      HEADER_FILE_NAME_LIST.push("/dev/null");  
    }
    if (HEADER_FILE_NAME_LIST === null) {
      errorMessage("Can't open header file: ", HEADER_FILE_NAME_LIST);  
    }
    FP_HEADER = HEADER_FILE_NAME_LIST; //write
    FP_HEADER.push(
      "// Header of class reduction flag for finite automaton parser\n\
       //                   made with mkfa " + VERSION_NUMBER + "\n\n\
       //        Do logical AND between label and FA's field #4, #5.\n\
       //\n\n"
     );
    if (!SWITCH_QUIET) {
      console.log("Now parsing grammar file\n");
    }
    yyparse();
    if (!SWITCH_QUIET) {
      console.log("Now modifying grammar to minimize states [" + START_SYMBOL - 1 + "]\n");
      NO_NEW_LINE = 0;
    }
    if (START_SYMBOL == NULL) {
      START_SYMBOL = CLASS_LIST; // struct?
    }
    struct_name = START_SYMOBL.name;
    FP_HEADER.push("// Start Symbol:  " + struct_name + "\n");
    if (testNoInstantClass(struct_name) !== null) {
      errorMessage("Prototype-declared Class " + struct_name + " has no instant definitions");
    }
    if (errorParse) {
      errorMessage("Fatal Errors exists");
    }
  }

  window.mkdfa = start;

}(window));

