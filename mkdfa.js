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
//             -q[0|1] contol of processing report
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

(function (window) {
  "use strict";

  // ===========================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/main.c
  // ===========================================================================

  // globals
  VERSION_NUMBER = "ver.1.44-flex-p1";
  
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
  
  GRAMMAR_FILE_NAME_LIST = [];                                                  // Grammar file name
  VOCA_FILE_NAME_LIST = [];                                                     // Vocabulary file name
  FA_OUTPUT_FILE_NAME_LIST = [];                                                // FA file name (DFAorNFA)
  HEADER_FILE_NAME_LIST = [];                                                   // Header file name, used to be [1024] 
      
  NO_NEW_LINE = 0;                                                              // Solve line break problems in multiple display modes
  IS_OPTION_F_SET = 0;                                                          // When -f is specified (to resolve problems with -dfa)

  //CLASS *ClassList = NULL;                                                      // Linear list of classes
  //CLASS *ClassListTail = NULL;                                                  // The last node of the linear list of classes
  //CLASS *StartSymbol = NULL;                                                    // Class of start symbol

  //FA *FAlist = NULL;                                                            // Pointer of start FA in FA network 
  //char Clipboard[ 1024 ];                                                       // Temporary write buffer for sprintf

  function createOuput(my_message) {
    if (NO_NEW_LINE) {
      return "\n" + my_message;
    }
    return my_message;
  }

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
      case 5:
        GRAMMAR_FILE_NAME_LIST.push(my_name + ".grammar");
        VOCA_FILE_NAME_LIST.push(my_name + ".voca");
        if (SWITCH_NFA_OUTPUT) {
          FA_OUTPUT_FILE_NAME_LIST.push(my_name + ".nfa");
        } else {
          FA_OUTPUT_FILE_NAME_LIST.push(my_name + ".dfa");
        }
        IS_OPTION_F_SET = 1;
        file_grammar = file_voca = file_output = file_header = 1;
        errorMessage("Could set file name, but something is wrong...");
    }
    if (file_grammar && file_voca && file_output && file_header) {
      errorMessage("Could not set file name.");
    } else {
      verboseMessagesage("File name set.");
    }
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
        invalidMessage("Ran out of switch options.");
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
          // pass e => switch_accept..., f => 5, f, f, f
          file_mode = setSwitch(my_list[i][1]);
        } else {
          invalidMessage("1st character of parameter is not '-':" + my_list[i]);
        }
      } else {
        file_finish = setFileName(my_list[i], file_mode);
        file_mode = 0;
      }
    }
  }

  // ======================= START HERE, =======================
  // call:
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
    //setGram();
    //setVoca();
    //makeNFA();
    //if(!SWITCH_NFA_OUTPUT) {
    //  makeDFA();
    //}
    //makeTriplet();
    console.log("done");
  }
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/mkfa.h 
  // =============================================================================
  
  #include <stdio.h>
  #include <string.h>
  #include <stdarg.h>
  #ifdef HAVE_MALLOC_H
    #include <malloc.h>
  #endif
  #include <stdlib.h>

  #define SYMBOL_LEN 256
  typedef short FLAG;
  typedef unsigned int CLASSFLAGS;
  #define CLASSFLAG_MAX sizeof(CLASSFLAGS)*8
  
  typedef struct _BODY{
      char name[ SYMBOL_LEN ];                                                    // Name of the class to compose
      FLAG abort;                                                                 // Body end ending flag
      struct _BODY *next;
  } BODY;
  
  typedef struct _BODYLIST{
      BODY *body;
      struct _BODYLIST *next;
  } BODYLIST;
  
  typedef struct _CLASS{
      short no;                                                                   // Independent assignment at class number nonterminals and terminations
                                                                                  // Non-terminal is registered up to # 31, others are # -1
      char name[ SYMBOL_LEN ];                                                    // Name of the class 
      struct _CLASS *next;                                                        // Pointer to next class
      BODYLIST *bodyList;                                                         // Pointer to list of body of class 
      int branch;                                                                 // Definition number
      FLAG usedFA;                                                                // Whether the class was used
      FLAG used;
      FLAG tmp;                                                                   // Is it a temporary class for minimization?
  } CLASS;
  
                                                                                  
                                                                                  //   bodyList, branch - Meaning is totally different between the terminal and the nonterminal
                                                                                  //   non-terminal:
                                                                                  //    bodyList: Pointer to a list of lists of class names to compose
                                                                                  //    branch:   The number of arrays (as many as the definition exists)
                                                                                  //   terminal:
                                                                                  //    bodyList: The actual word corresponding to the terminal symbol
                                                                                  //    branch:   A word type multiplied by -1
                                                                                  //   Termination and non-terminal are judged by positive and negative
                                                                                  
  
  typedef struct _ARC{
      int inp;                                                                    // input
      struct _FA *fa;                                                             // The destination FA
      CLASSFLAGS start;                                                           // Class start flag
      CLASSFLAGS accpt;                                                           // Class acceptance flag
      struct _ARC *next;                                                          // Next item in the list
  } ARC;
  
  typedef struct _UNIFYARC{
      int inp;                                                                    / input
      struct _FA *us;                                                             // FA next state
      CLASSFLAGS start;                                                           // Class start flag
      CLASSFLAGS accpt;                                                           // Class acceptance flag
      struct _UNIFYARC *next;                                                     // Next item in the list
      FLAG reserved;                                                              // When fusing self loop branches, convert
                                                                                  // It is done after the processing is 
                                                                                  // completely completed. That Unprocessed flag
  } UNIFYARC;
  
  typedef struct _FALIST{
      struct _FA *fa;
      struct _FALIST *next;
  } FALIST;
  
  typedef struct _FA{
      /* common */
      int stat;                                                                   // Status number (assigned when creating triplets)
      ARC *nsList;                                                                // Input and next state list
      CLASSFLAGS start;                                                           // Class start flag (all ar or or)
      CLASSFLAGS accpt;                                                           // Class acceptance flag (all arc or)
      CLASSFLAGS aStart;                                                          // Class start flag of the arc of interest
      FLAG traversed;                                                             // Destination 1: NFA -> DFA 2: when creating triplets
  
      // for DFA
      int psNum;                                                                  // Number of arcs pointed to by ARC
                                                                                  // Note that it is not incremented with connectUnifyFA.
      UNIFYARC *usList;                                                           // Next state fused with NFA -> DFA
      FALIST *group;                                                              // The state constituting when fused
      FLAG volatiled;                                                             // Since we are changing the arc, we want to cancel isolation judgment
  } FA;

  void setGramFile( char *fname );
  void setVoca( void );
  CLASS *getClass( char *name );
  void setGram( void );
  
  #define newLineAdjust()\
  {\
      if( NO_NEW_LINE ){\
  	putc( '\n', stderr );\
  	NO_NEW_LINE = 0;\
      }\
  }
  
  
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/dfa.h
  // =============================================================================
  void makeDFA( void );
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/dfa.c
  // =============================================================================

  
  void r_makeDFA( FA *fa );
  ARC *unifyFA( FA *dstFA, ARC *prevarc, ARC *curarc, FA *prevFA );
  void usArc2nsArc( FA *fa );
  void connectUnifyFA( FA *fa, int inp, FA *nextFA, FLAG reserved,
  		    CLASSFLAGS accpt, CLASSFLAGS start );
  ARC *unconnectFA( FA *srcFA, ARC *arcPrev, ARC *arc );
  void killFA( FA *fa );
  void killIsolatedLoop( FA *vanishFA, FA *curFA );
  int chkIsolatedLoop( FA *vanishFA, FA *curFA );
  UNIFYARC *appendUnifyArc( UNIFYARC *top, int inp, FA *fa, int reserved );
  FALIST *appendGroup( FALIST *groupTop, FA *fa );
  FALIST *insertFAlist( FALIST *top, FALIST *preAtom, FALIST *nextAtom, FA *fa );
  FA *chkGroup( FALIST *group, CLASSFLAGS accptFlag,
  	     CLASSFLAGS startFlag, FLAG *newFlag );
  int cmpFAlist( FALIST *group1, FALIST *group2 );
  FALIST *volatileFA( FALIST *volatileList, FA *fa );
  void unvolatileFA( FALIST *volatileList );
  void verboseGroup( FALIST *group );
  
  static FALIST *GroupList = NULL;                                                // List of state fused new states
  
  static int DFAtravTotal = 0;                                                    // Number of nodes visited when creating DFA
  static int DFAtravSuccess = 0;                                                  // A number that did not stop by so far
  static int FAprocessed = 0;                                                     // Number of FAs processed in the current step
  extern int FAtotal;                                                             // Total number of FA


  
  void makeDFA( void )
  {
      if( !SWITCH_QUIET ){
  	fprintf( stderr, "Now making deterministic finite automaton" );
  	NO_NEW_LINE = 1;
      }
      r_makeDFA( FAlist );
      if( !SWITCH_QUIET ){
  	fprintf( stderr, "\rNow making deterministic finite automaton[%d/%d] \n", FAprocessed, FAtotal );
  	if( FAtotal != FAprocessed ){
  	    fprintf( stderr, "* %d released FA nodes are left on isolated loop\n", FAtotal - FAprocessed );
  	}
  	NO_NEW_LINE = 0;
      }
                                                                                  // When there is something bugs scary there is a check of an isolated loop
                                                                                  // It is impossible because it is impossible */
      FAtotal = FAprocessed;
      if( SWITCH_VERBOSE ){
  	verboseMessage( "** traversing efficiency ( success/total )" );
  	verboseMessage( "r_makeDFA:     %d/%d(%d%%)",
  		DFAtravSuccess, DFAtravTotal, 100*DFAtravSuccess/DFAtravTotal);
      }
      newLineAdjust();
      freeFAlist( GroupList );
  }
  
  void r_makeDFA( FA *fa )
  {
      ARC *prevarc = NULL;
      ARC *curarc;
      int inp;
      int bundleNum;
      FLAG reserved = 0;
      int i;
      FLAG newFlag;
      FALIST *volatileList = NULL;
      CLASSFLAGS unifyAccptFlag;
      CLASSFLAGS unifyStartFlag;
  
      verboseMessage( "[func]r_makeDFA(FA %08x)", (long)fa );
      DFAtravTotal++;
      if( fa->traversed == 1 ){
  	verboseMessage( "traversed..." );
  	return;
      }
      fa->traversed = 1;
      DFAtravSuccess++;
  
      FAprocessed++;
      if( !SWITCH_SEMI_QUIET ){
  	fprintf( stderr, "\rNow making deterministic finite automaton[%d/%d] ", FAprocessed, FAtotal );
  	NO_NEW_LINE = 1;
      }
      curarc = fa->nsList;
      while( curarc != NULL ){
  	FA *unifyingDstFA = NULL;
  	{
  	    ARC *arc = curarc;
  	    int inp = arc->inp;
  	    FALIST *group = NULL;
  	    CLASSFLAGS accptFlag = 0;
  	    CLASSFLAGS startFlag = 0;
  
  	    bundleNum = 0;
  	    while( 1 ){
  		if( arc == NULL || arc->inp != inp ) break;
  		group = appendGroup( group, arc->fa );
  		accptFlag |= arc->fa->accpt;
  		startFlag |= arc->fa->start;
  		arc = arc->next;
  		bundleNum++;
  	    }
  	    if( bundleNum > 1 ){
  		unifyingDstFA = chkGroup( group, accptFlag,
  					 startFlag,&newFlag );
  	    } else {
  		                                                                            // The bottom four lines are for blocks outside of block
  		freeFAlist( group );
  		prevarc = curarc;
  		curarc = curarc->next;
  		continue;
  	    }
  	}
  
  	inp = curarc->inp;
  	unifyAccptFlag = 0;
  	unifyStartFlag = 0;
  	for( i = 0; i < bundleNum; i++ ){
  	    unifyAccptFlag |= curarc->accpt;
  	    unifyStartFlag |= curarc->start;
  	    if( !newFlag ){
      //		volatileList = volatileFA( volatileList, curarc->ns );
  		curarc = unconnectFA( fa, prevarc, curarc );
  	    } else {
  		if( curarc->fa == fa /* self-loop */ ){
  		    reserved = 1;
          //volatileList = volatileFA( volatileList, fa );
  		    curarc = unconnectFA( fa, prevarc, curarc );
  		} else {
  		    curarc = unifyFA( unifyingDstFA, prevarc, curarc, fa );
  		}
  	    }
  	}
  	connectUnifyFA( fa, inp, unifyingDstFA, reserved,
  		       unifyAccptFlag, unifyStartFlag );
  	reserved = 0;
      }
      usArc2nsArc( fa );
      // unvolatileFA( volatileList );
  
      curarc = fa->nsList;
      while( curarc != NULL ){
  	r_makeDFA( curarc->fa );
  	curarc = curarc->next;
      }
  }
  
  void connectUnifyFA( FA *fa, int inp, FA *nextFA, FLAG reserved,
  		    CLASSFLAGS accpt, CLASSFLAGS start )
  {
      // Insert into the list of arcs to unifyFA in proper position in 
      // lexicographic order of input. Also, do not register if there is the 
      // same one
      // Do not increment psNum of nextFA
      UNIFYARC *newArc;
      UNIFYARC *curArc = NULL;
      UNIFYARC *nextArc;
      UNIFYARC *top = fa->usList;
  
      if( (newArc = calloc( 1, sizeof(UNIFYARC) )) == NULL ){
  	errorMessage( "Can't alloc forward arc buffer of finite automaton." );
      }
      newArc->inp = inp;
      newArc->us = nextFA;
      newArc->reserved = reserved;
      newArc->accpt = accpt;
      newArc->start = start;
  
      if( (nextArc = top) != NULL ){
  	while( 1 ){
  	    if( nextArc->inp > inp ) break;
  	    if( nextArc->inp == inp && nextArc->us == nextFA ) return;
  	    curArc = nextArc;
  	    if( (nextArc = nextArc->next) == NULL ) break;
  	}
      }
      if( curArc == NULL ){
  	newArc->next = top;
  	fa->usList = newArc;
      } else {
  	newArc->next = nextArc;
  	curArc->next = newArc;
      }
  }
  
  void usArc2nsArc( FA *fa )
  {
      UNIFYARC *uptr;
      UNIFYARC *disused_uptr;
      ARC *nptr;
      ARC *newarc;
  
      uptr = fa->usList;
      while( uptr != NULL ){
  	if( (newarc = calloc( 1, sizeof(ARC) )) == NULL ){
  	    errorMessage( "Can't alloc forward arc buffer of finite automaton." );
  	}
  	connectFA( fa, uptr->inp, uptr->us, uptr->accpt, uptr->start );
  	uptr = uptr->next;
      }
      
      uptr = fa->usList;
      while( uptr != NULL ){
  	if( uptr->reserved ){
  	    uptr->us->accpt |= fa->accpt;
  	    nptr = fa->nsList;
  	    while( nptr != NULL ){
  		connectFA( uptr->us, nptr->inp, nptr->fa, nptr->accpt, nptr->start );
  		nptr = nptr->next;
  	    }
  	}
  	disused_uptr = uptr;
  	uptr = uptr->next;
  	free( disused_uptr );
      }
  }
  
  FALIST *volatileFA( FALIST *volatileList, FA *fa )
  {
      FALIST *atom;
  
      if( (atom = malloc( sizeof(FALIST) )) == NULL ){
  	errorMessage( "Can't alloc FA list buffer." );
      }
      fa->volatiled = 1;
  
      atom->fa = fa;
      atom->next = volatileList;
      return( atom );
  }
  
  void unvolatileFA( FALIST *volatileList )
  {
      FALIST *atom;
      FA *fa;
  
      while( volatileList != NULL ){
  	atom = volatileList;
  	fa = atom->fa;
  	fa->volatiled = 0;
  //	if( chkIsolatedLoop( fa, fa ) ){
  //	    killIsolatedLoop( fa, fa );
  //	}
  	volatileList = volatileList->next;
  	free( atom );
      }
  }
  
  ARC *unifyFA( FA *dstFA, ARC *prevarc, ARC *curarc, FA *prevFA )
  {
      FA *srcFA = curarc->fa;
      ARC *arc = srcFA->nsList;
  
      dstFA->accpt |= srcFA->accpt;
      while( arc != NULL ){
  	connectFA( dstFA, arc->inp, arc->fa, arc->accpt, arc->start );
  	arc = arc->next;
      }
      return( unconnectFA( prevFA, prevarc, curarc ) );
  }
  
  ARC *unconnectFA( FA *srcFA, ARC *arcPrev, ARC *arc )
                                                                                  // Return the next arc of the cut arc
  {
                                                                                  // Disconnect the connection with the specified previous node, and if it 
                                                                                  // should be lost, connect to all the next nodes. To cut off and to annihilate
  
      ARC *arcNext = arc->next;
      FA *vanishFA;
  
      if( arcPrev == NULL ){
  	srcFA->nsList = arcNext;
      } else {
  	arcPrev->next = arcNext;
      }
      vanishFA = arc->fa;
      free( arc );
  
      if( --vanishFA->psNum == 0 ){
  	killFA( vanishFA );
      }// else if( chkIsolatedLoop( vanishFA, vanishFA ) ){
  	//killIsolatedLoop( vanishFA, vanishFA );
    //  }
      return( arcNext );
  }
  
  void killFA( FA *fa )
  {
      ARC *arc = fa->nsList;
      verboseMessage( "a FA node is vanished" );
      while( arc != NULL ){
  	arc = unconnectFA( fa, NULL, arc );
      }
      free( fa );
      FAtotal--;
  }
  
  int chkIsolatedLoop( FA *vanishFA, FA *curFA )
                                                                                  // If you assume that you are going to annihilate, check if your arc is gone
                                                                                  // That is to eliminate the survival by the loop
  {
      ARC *arc;
      int result;
  
      if( curFA->volatiled ) return( 0 );
      if( curFA->psNum > 1 ) return( 0 );
      arc = curFA->nsList;
  
      while( arc != NULL ){
  	FA *nextFA = arc->fa;
  	if( nextFA == vanishFA ) return( 1 );
  	result = chkIsolatedLoop( vanishFA, nextFA );
  	if( result ) return( 1 );
  	arc = arc->next;
      }
      return( 0 );
  }
  
  void killIsolatedLoop( FA *vanishFA, FA *curFA )
                                                                                  // If you assume that you are going to annihilate, check if your arc is gone
                                                                                  // In other words, to survive the survival by the loop
  {
      ARC *arc;
      ARC *prevarc = NULL;
  
      if( curFA->volatiled ) return;
      if( curFA->psNum > 1 ) return;
  
      arc = curFA->nsList;
      while( arc != NULL ){
  	FA *nextFA = arc->fa;
  	if( nextFA != vanishFA ){
  	    unconnectFA( curFA, prevarc, arc );
  	}
  	prevarc = arc;
  	arc = arc->next;
      }
      free( curFA );
      FAtotal--;
  }
  
  FALIST *appendGroup( FALIST *groupTop, FA *fa )
  {
                                                                                  // If fa is not in the blended state sort FA pointers and go to group list
                                                                                  // If it is fused, sort its configuration list and group list together
  
      FALIST *preAtom = NULL;
      FALIST *curAtom = groupTop;
      FALIST *srcCurAtom = NULL;
      long cmp;
  
      if( fa->group == NULL ){
  	while( curAtom != NULL ){
  	    cmp = (long)fa - (long)curAtom->fa;
  	    if( cmp == 0 ) return( groupTop );
  	    if( cmp < 0 ) break;
  	    preAtom = curAtom;
  	    curAtom = curAtom->next;
  	}
  	return( insertFAlist( groupTop, preAtom, curAtom, fa ) );
      } else {
  	// If you use srcCurAtom sorting, it will be faster
    // Then somehow the number of states increases somewhat, so it may not necessarily be guaranteed
    // Take an annotation of "for" and kill preAtom = NULL; curAtom = groupTop; (2 places)
  	for( srcCurAtom = fa->group; srcCurAtom != NULL;
  	    srcCurAtom = srcCurAtom->next ){
  	    if( curAtom == NULL ){
  		groupTop = insertFAlist( groupTop, preAtom, curAtom, srcCurAtom->fa );
  		preAtom = NULL;
  		curAtom = groupTop;
  	    }
  //		for( ; srcCurAtom != NULL; srcCurAtom = srcCurAtom->next ){
  //		    groupTop = insertFAlist( groupTop, preAtom, NULL, srcCurAtom->fa );
  //		    if( preAtom == NULL ){
  //			preAtom = groupTop->next;
  //		    } else {
  //			preAtom = preAtom->next;
  //		    }
  		}
  		break;
  	    }
  	    cmp = (long)srcCurAtom->fa - (long)curAtom->fa;
  	    if( cmp == 0 ) continue;
  	    if( cmp < 0 ){
  		groupTop = insertFAlist( groupTop, preAtom, curAtom, srcCurAtom->fa );
  		preAtom = NULL;
  		curAtom = groupTop;
  	    } else {
  		preAtom = curAtom;
  		curAtom = curAtom->next;
  	    }
  	}
  	return( groupTop );
      }
  }
  
  FALIST *insertFAlist( FALIST *top, FALIST *preAtom, FALIST *nextAtom, FA *fa )
  {
      FALIST *atom;
  
      if( (atom = malloc( sizeof(FALIST) )) == NULL ){
  	errorMessage( "Can't alloc group buffer for unifying FA" );
      }
      atom->fa = fa;
      if( preAtom == NULL ){
  	atom->next = nextAtom;
  	return( atom );
      } else {
  	preAtom->next = atom;
  	atom->next = nextAtom;
  	return( top );
      }
  }
  
  FA *chkGroup( FALIST *group, CLASSFLAGS accptFlag ,
  	     CLASSFLAGS startFlag, FLAG *newFlag )
  {
      FALIST *curGroupList = GroupList;
      FALIST *preGroupList = NULL;
      int cmp;
      FA *fa;
  
      while( curGroupList != NULL ){
  	cmp = cmpFAlist( curGroupList->fa->group, group );
  	if( cmp == 0 ){
  	    if( SWITCH_COMPAT_I || (accptFlag == curGroupList->fa->accpt
  	       || startFlag == curGroupList->fa->start) ){
  		freeFAlist( group );
  		*newFlag = 0;
  		return( curGroupList->fa );
  	    }
  	}
  	if( cmp < 0 ) break;
  	preGroupList = curGroupList;
  	curGroupList = curGroupList->next;
      }
      if( SWITCH_VERBOSE ){ 
  	verboseGroup( group );
      }
      fa = makeNewFA();
      GroupList = insertFAlist( GroupList, preGroupList, curGroupList, fa );
      fa->group = group;
      fa->accpt = accptFlag;
      fa->start = startFlag;
      *newFlag = 1;
      return( fa );
  }
  
  void verboseGroup( FALIST *group )
  {
      verboseMessage( "Created New Group" );
      while( group != NULL ){
  	verboseMessage( "  FAadr: %08x", (long)group->fa );
  	group = group->next;
      }
  }
  
  int cmpFAlist( FALIST *group1, FALIST *group2 )
  {
      long cmp;
  
      while( 1 ){
  	if( group1 == NULL && group2 == NULL ) return( 0 );
  	if( group1 == NULL ) return( -1 );
  	if( group2 == NULL ) return( 1 );
  	cmp = (long)group1->fa - (long)group2->fa;
  	if( cmp != 0 ) return( cmp );
  	group1 = group1->next;
  	group2 = group2->next;
      }
  }
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/nfa.h
  // =============================================================================
  
  void makeNFA( void );
  void connectFA( FA *fa, int inp, FA *nextFA, CLASSFLAGS accpt, CLASSFLAGS start );
  ARC *appendNextArc( ARC *top, int inp, FA *fa );
  FA *makeNewFA( void );
  FALIST *appendFAlist( FALIST *faList, FA *fa );
  FALIST *cpyFAlist( FALIST *dst, FALIST *src );
  FALIST *freeFAlist( FALIST *faList );
  
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/nfa.c
  // =============================================================================

  typedef struct _HIS{
      CLASS *class;                                                              // Pointer to class 
      FA *fa;                                                                    // FA (for recursion) during generation operation
      struct _HIS *prev;                                                         // Pointer to parent's biography
      ARC *nsList;                                                               // Transitable arc from class start node
      FA *cloneFA;                                                               // Returned FA upon recursion
  } HIS;
  
  typedef struct _TOKEN{                                                         // namingãã¡ã¨è¦ããã => It's painful after naming?
      CLASS *class;                                                              // To class pointer
      FLAG abort;                                                                // Enable escape flag
  } TOKEN;
  
  FA *r_makeNFA( CLASS *class, FA *fa, FA *exitFA, FALIST *orgExtraFAs, HIS *his );
  int getNextToken( TOKEN *token, BODYLIST **pBodyList, BODY **pBody );
  void connectFAforNFA( FA *fa, int input, FA *nextFA, HIS *his );
  FA *appendFA( FA *fa, int input, HIS *his );
  ARC *appendArc( ARC *top, FA *dst, int inp, CLASSFLAGS accpt, CLASSFLAGS start );
  void appendHisArc( HIS *his, FA *fa, int inp, FA *nextFA, CLASSFLAGS accpt, CLASSFLAGS start );
  void chkClassInfo( CLASS *class );
  CLASS *getClass( char *name );
  FA *getRecursion( CLASS *class, HIS *his );
  void chkLeftRecursion( CLASS *class, FA *fa, HIS *his );
  char *strAncestors( HIS *me, HIS *ancestor );

  static int FAprocessed = 0;                                                     // Number of FAs processed in the current step
  int FAtotal = 0;                                                                // Total number of FA
  
  void makeNFA( void )
  {
      if( StartSymbol == NULL ){
  	errorMessage( "No definition of grammar" );
      }
      FAprocessed = 0;
      FAlist = makeNewFA();
      FAlist->psNum++;                                                            // To prevent deletion of the start node
      if( !SWITCH_QUIET ){
  	fprintf( stderr, "\rNow making nondeterministic finite automaton" );
  	NO_NEW_LINE = 1;
      }
      r_makeNFA( StartSymbol, FAlist, NULL, NULL, NULL );
      if( !SWITCH_QUIET ){
  	fprintf( stderr, "\rNow making nondeterministic finite automaton[%d/%d]\n", FAtotal, FAtotal );
  	NO_NEW_LINE = 0;
      }
      chkClassInfo( ClassList );
  }
  
  FA *r_makeNFA( CLASS *class, FA *fa, FA *exitFA, FALIST *orgExtraFAs, HIS *his )
  {
      FA *baseFA = fa;                                                            // Entrance node of the class
      FA *loopFA = NULL;                                                          // Node of recursive loop
      HIS curhis;                                                                 // The current node in the history of the analysis tree
      TOKEN curToken;                                                             // Current tokens of interest
      TOKEN nextToken;                                                            // Prefetch token
      FLAG exitFlag = 0;                                                          // Can we get out of topology? => è±åºã§ããããã­ã¸ã¼ã 
      BODYLIST *bodyList = class->bodyList;
      BODY *body = NULL;
      FALIST *extraFAs = NULL;
      CLASSFLAGS initStartFlag;
  
      if( !SWITCH_SEMI_QUIET ){
  	fprintf( stderr, "\rNow making nondeterministic finite automaton[%d/%d]", FAtotal, FAtotal );
  	NO_NEW_LINE = 1;
      }
  
      class->usedFA= 1;
      if( class->no >= 0 ){
  	fa->start |= (1 << class->no);
  	fa->aStart |= (1 << class->no);
      }
      initStartFlag = fa->aStart;
  
      if( exitFA == NULL ) exitFA = makeNewFA();
      chkLeftRecursion( class, fa, his );
      curhis.class = class;
      curhis.fa = fa;
      curhis.prev = his;
      curhis.nsList = NULL;
      curhis.cloneFA = NULL;
  
      while( 1 ){                                                                 // Loops between definition columns
  	getNextToken( &nextToken, &bodyList, &body );
  	extraFAs = cpyFAlist( extraFAs, orgExtraFAs );                                // Assignment in C ++ all together ...
  	while( 1 ){                                                                   // Loops in definition columns
  	    curToken = nextToken;
  	    if( getNextToken( &nextToken, &bodyList, &body )){                        // Is there a follow-up?
  		if( curToken.class->branch > 0 ){                                           // Subsequent and non-terminal
  		    if( (loopFA = getRecursion( nextToken.class, &curhis )) != NULL ){
  			if( curToken.abort ){
  			                                                                          // Since this definition column ends, also pass the secondary exit taken over from the parent
  			                                                                          // !curToken.abort - If it is not the end it will remain NULL
  			    extraFAs = appendFAlist( extraFAs, exitFA );
  			    exitFlag = 1;
  			}
  			                                                    // NextToken is a loop and connects to it 
  			fa = r_makeNFA( curToken.class, fa, loopFA, extraFAs, &curhis );
  			                                                    // However, if there is a successor followed by an error
  			if( getNextToken( &curToken, &bodyList, &body ) ){
  			    errorMessage( "Symbols following recursion exist in class \"%s\"", class->name );
  			}
  			break;
  		    } else {
  			FALIST *anExtraFAs = NULL;
  			if( curToken.abort ){
  			                                                                          // This definition column escapes at this place
  			    anExtraFAs = cpyFAlist( anExtraFAs, extraFAs );
  			    anExtraFAs = appendFAlist( anExtraFAs, exitFA );
  			    exitFlag = 1;
  			}
  			fa = r_makeNFA( curToken.class, fa, NULL, anExtraFAs, &curhis );
  			freeFAlist( anExtraFAs );
  			continue;
  		    }
  		} else {                                                                    // There is a trailing end
  		    if( curToken.abort ){
  			FA *extraFA;
  			FALIST *pExtraFAs = extraFAs;
  			connectFAforNFA( fa, curToken.class->no, exitFA, &curhis );
  			while( pExtraFAs != NULL ){
  			    extraFA = pExtraFAs->fa;
  			    connectFAforNFA( fa, curToken.class->no, extraFA, &curhis );
  			    pExtraFAs = pExtraFAs->next;
  			}
  			exitFlag = 1;
  		    }
  		    if( (loopFA = getRecursion( nextToken.class,&curhis )) != NULL ){
  			connectFAforNFA( fa, curToken.class->no, loopFA, &curhis );
  			if( getNextToken( &curToken, &bodyList, &body ) ){
  			    errorMessage( "Symbols following recursion exist in class \"%s\"", class->name );
  			}
  			break;
  		    } else {
  			fa = appendFA( fa, curToken.class->no, &curhis );
  			continue;
  		    }
  		}
  	    } else {                                                                  // There is no follower
  		exitFlag = 1;
  		if( curToken.class->branch > 0 ){
  		    exitFA = r_makeNFA( curToken.class, fa, exitFA, extraFAs, &curhis );
  		} else {
  		    FA *extraFA;
  		    FALIST *pExtraFAs = extraFAs;
  		    while( pExtraFAs != NULL ){
  			extraFA = pExtraFAs->fa;
  			connectFAforNFA( fa, curToken.class->no, extraFA, &curhis );
  			pExtraFAs = pExtraFAs->next;
  		    }
  		    connectFAforNFA( fa, curToken.class->no, exitFA, &curhis );
  		}
  		break;
  	    }
  	}                                                                             // End loop in definition column
  
  	if( class->no >= 0 ){
  	    FALIST *extraFA = extraFAs;
  	    while( extraFA != NULL ){
  		extraFA->fa->accpt |= (1 << class->no);
  		extraFA = extraFA->next;
  	    }
  	}
  	if( bodyList == NULL ) break;
  	fa = baseFA;
  	fa->aStart = initStartFlag;
      }                                                                           // End of loop between definition columns
  
      if( !exitFlag ){
  	errorMessage( "Infinite definition is formed %s", strAncestors( curhis.prev, NULL ) );
      }
      if( class->no >= 0 ){
  	exitFA->accpt |= (1 << class->no);
  	if( curhis.cloneFA != NULL ){
  	    curhis.cloneFA->accpt |= (1 << class->no);
  	}
      }
      extraFAs = freeFAlist( extraFAs );                                          // If C ++ destructor does it ...
  
      if( curhis.cloneFA == NULL ){
  	ARC *curArc, *tmpArc;
  	for( curArc = curhis.nsList; curArc != NULL; ){
  	    curArc->fa->psNum--;
                                                  	                             // Since the FA (scheduled) pointed to by clone FA is a copy of the original transition
                                                  	                             // The judgment that psNum is 0 (and FA erase) can be omitted (it will not be 0)
  	    tmpArc = curArc->next;
  	    free( curArc );
  	    curArc = tmpArc;
  	}
      }
      return( exitFA );
  }
  
  FALIST *appendFAlist( FALIST *faList, FA *fa )
  {
      FALIST *atom;
  
      if( (atom = calloc( 1, sizeof(FALIST) )) == NULL ){
  	errorMessage( "Can't alloc FA list buffer." );
      }
  
      atom->fa = fa;
      atom->next = faList;
      return( atom );
  }
  
  FALIST *cpyFAlist( FALIST *dst, FALIST *src )
  {
      if( dst != NULL ) dst = freeFAlist( dst );
      while( src != NULL ){
  	dst = appendFAlist( dst, src->fa );
  	src = src->next;
      }
      return( dst );
  }
  
  FALIST *freeFAlist( FALIST *faList )
  {
      while( faList != NULL ){
  	FALIST *atom = faList;
  	faList = faList->next;
  	free( atom );
      }
      return( NULL );
  }
  
  int getNextToken( TOKEN *token, BODYLIST **pBodyList, BODY **pBody )
  {
      BODYLIST *bodyList = *pBodyList;
      BODY *body = *pBody;
  
      if( body == NULL ){
  	body = bodyList->body;
      } else {
  	body = body->next;
  	if( body == NULL ){
  	    bodyList = bodyList->next;
  	    *pBodyList = bodyList;
  	    *pBody = body;
  	    return( 0 );
  	}
      }
      if( (token->class = getClass( body->name )) == NULL ){
  	errorMessage( "undefined class \"%s\"", body->name );
      }
      token->abort = body->abort;
      *pBodyList = bodyList;
      *pBody = body;
      return( 1 );
  }
  
  FA *makeNewFA( void )
  {
      FA *newFA;
      if( (newFA = calloc( 1, sizeof(FA) )) == NULL ){
  	errorMessage( "Can't alloc Finite Automaton buffer" );
      }
      newFA->stat = -1;                                 // Meaning that it has not been numbered yet
      FAtotal++;
      return( newFA );
  }
  
  FA *appendFA( FA *fa, int input, HIS *his )
  {
      FA *newFA;
  
      newFA = makeNewFA();
      connectFAforNFA( fa, input, newFA, his );
      return( newFA );
  }
  
  void connectFAforNFA( FA *fa, int inp, FA *nextFA, HIS *his )
  {
      CLASSFLAGS startOnArc = fa->aStart;
  
      fa->aStart = 0;
      connectFA( fa, inp, nextFA, 0, startOnArc );
      appendHisArc( his, fa, inp, nextFA, 0, startOnArc );
  }
  
  void connectFA( FA *fa, int inp, FA *nextFA, CLASSFLAGS accpt, CLASSFLAGS start )
  {
                                                                                  // Note: increment psNum of nextFA
  
      fa->nsList = appendArc( fa->nsList, nextFA, inp, accpt, start );
      nextFA->psNum++;
  }
  
  ARC *appendArc( ARC *top, FA *dst, int inp, CLASSFLAGS accpt, CLASSFLAGS start )
  {
                                                                                  // Insert in the list in the lexicographical order of input.
                                                                                  // Also, if there is the same thing or flag on the arc
      ARC *newArc;
      ARC *curArc = NULL;
      ARC *nextArc;
  
      if( (newArc = calloc( 1, sizeof(ARC) )) == NULL ){
  	errorMessage( "Can't alloc forward arc buffer of finite automaton." );
      }
      newArc->inp = inp;
      newArc->fa = dst;
      newArc->start = start;
      newArc->accpt = accpt;
  
      if( (nextArc = top) != NULL ){
  	while( 1 ){
  	    if( nextArc->inp > inp ) break;
  	    if( nextArc->inp == inp && nextArc->fa == dst ){
  		nextArc->start |= newArc->start;
  		nextArc->accpt |= newArc->accpt;
  		return( top );
  	    }
  	    curArc = nextArc;
  	    if( (nextArc = nextArc->next) == NULL ) break;
  	}
      }
      if( curArc == NULL ){
  	newArc->next = top;
  	return( newArc );
      } else {
  	newArc->next = nextArc;
  	curArc->next = newArc;
  	return( top );
      }
  }
      
  void appendHisArc( HIS *his, FA *fa, int inp, FA *nextFA, CLASSFLAGS accpt, CLASSFLAGS start )
  {
                                                                                  // Register in the history buffer if it is possible to 
                                                                                  // transition with the starting FA of the focused class
                                                                                  // Further investigate whether parents can also transition
      while( his != NULL && his->fa == fa /* ã¯ã©ã¹ã®éå§FAã§ãªã */ ){
  	his->nsList = appendArc( his->nsList, nextFA, inp, accpt, start );
  	if( his->cloneFA != NULL ) his->cloneFA->nsList = his->nsList;
  	his = his->prev;
  	nextFA->psNum++;
      }
  }
  
  void chkClassInfo( CLASS *class )
  {
      CLASS *freeClass;
      int wrong = 0;
  
       while( 1 ){
  	if( class == NULL ) break;
  	if( class->branch > 0 && !class->usedFA && !class->tmp ){
  	    warningMessage( "Class \"%s\" isn't used", class->name );
  	}
  	if (! class->used) {
  	  warningMessage( "\"%s\" in voca not referred by grammar", class->name);
  	  wrong = 1;
  	}
  	freeClass = class;
  	class = class->next;
  	free( freeClass );
      }
       if (wrong) {
         errorMessage( "Some vocabulary not referred in grammar, compilation terminated");
       }
  }
  
  FA *getRecursion( CLASS *class, HIS *his )
  {
      while( his != NULL ){
  	if( his->class == class ){
  	    if( his->cloneFA == NULL ){
  		his->cloneFA = makeNewFA();
  		his->cloneFA->nsList = his->nsList;
  	    }
  	    return( his->cloneFA );
  	}
  	his = his->prev;
      }
      return( NULL );
  }
  
  void chkLeftRecursion( CLASS *class, FA *fa, HIS *his )
  {
      HIS *hisPtr = his;
  
      while( hisPtr != NULL && hisPtr->fa == fa ){
  	if( hisPtr->class == class ){
  	    errorMessage( "Left recusion is formed %s", strAncestors( his, hisPtr ) );
  	}
  	hisPtr = hisPtr->prev;
      }
  }
  
  char *strAncestors( HIS *me, HIS *ancestor )
  {
      static char ancestorsList[ 1024 ];
      if( me == NULL ){                                                           // There are cases where NULL may come due to the discovery of infinite err
  	sprintf( ancestorsList, "in class,\"%s\"", StartSymbol->name );
      } else if( me == ancestor ){
  	sprintf( ancestorsList, "in class,\"%s\"", me->class->name );
      } else {
  	static char className[ 1024 ];
  	strcpy( ancestorsList, "between classes" );
  	while( 1 ){
  	    sprintf( className, ",\"%s\"", me->class->name );
  	    strcat( ancestorsList, className );
  	    if( me == ancestor ) break;
  	    if( (me = me->prev) == NULL ) break;
  	}
      }
      return( ancestorsList );
  }
      
  CLASS *getClass( char *name )
  {
      CLASS *class = ClassList;
      if( class == NULL ) return( NULL );
      while( 1 ){
  	if( strcmp( class->name, name ) == 0 ){
  	  class->used = 1;
  	    return( class );
  	}
  	class = class->next;
  	if( class == NULL ) return( NULL );
      }
  }
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/triplet.h 
  // =============================================================================
  
  void makeTriplet( void );
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/triplet.c
  // =============================================================================

  typedef struct _TFA{                                                            // For triple list
      int stat;
      int inp;
      int ns;
      unsigned int accpt;
      struct _TFA *next;
  } TFA;
  
  void r_makeTriplet( FA *fa, FILE *fp );
  int getNewStatNo( FA *fa );
  FA *processTripletQueue( FA *fa );
  
  static int FAprocessed = 0;                                                     // Number of FAs processed in the current step
  extern int FAtotal;                                                             // Total number of FA
  static int TFAtravTotal = 0;                                                    // Number of nodes visited when creating triplets
  static int TFAtravSuccess = 0;                                                  // A number that did not stop by so far


  
  void makeTriplet( void )
  {
      FILE *fp_fa;
      FA *fa;
  
      FAprocessed = 0;
      if( (fp_fa = fopen( FA_OUTPUT_FILE_NAME_LIST, "w" )) == NULL ){
  	errorMessage( "Can't open dfa File for writting\"%s\"", FA_OUTPUT_FILE_NAME_LIST );
      }
      getNewStatNo( FAlist );
      if( !SWITCH_QUIET ){
  	fprintf( stderr, "Now making triplet list" );
  	NO_NEW_LINE = 1;
      }
      while( 1 ){
  	if( (fa = processTripletQueue( NULL )) == NULL ) break;
  	r_makeTriplet( fa, fp_fa );
      }
      fclose( fp_fa );
      if( !SWITCH_QUIET ){
  	fprintf( stderr, "\rNow making triplet list[%d/%d]\n", FAprocessed, FAtotal );
  	NO_NEW_LINE = 0;
      }
      if( SWITCH_VERBOSE ){
  	verboseMessage( "r_makeTriplet: %d/%d(%d%%)",
  		TFAtravSuccess, TFAtravTotal, 100*TFAtravSuccess/TFAtravTotal);
      }
      newLineAdjust();
  }
  
  void r_makeTriplet( FA *fa, FILE *fp_fa )
  {
      ARC *arc;
      CLASSFLAGS accpt;
      CLASSFLAGS start;
  
      TFAtravTotal++;
      if( fa->traversed == 2 ){
  	return;
      }
      fa->traversed = 2;
      TFAtravSuccess++;
  
      FAprocessed++;
      if( !SWITCH_SEMI_QUIET ){
  	fprintf( stderr, "\rNow making triplet list[%d/%d]", FAprocessed, FAtotal );
  	NO_NEW_LINE = 1;
      }
  
      if( (arc = fa->nsList) == NULL ){
  	if( SWITCH_EDGE_ACCEPT && SWITCH_EDGE_START ) return;
  	if( !SWITCH_EDGE_ACCEPT ){
  	    accpt = fa->accpt;
  	} else {
  	    accpt = 0;
  	}
  	if( !SWITCH_EDGE_START ){
  	    start = fa->start;
  	} else {
  	    start = 0;
  	}
  	if( SWITCH_COMPAT_I ){
  	    fprintf( fp_fa, "%d -1 -1 %x\n", fa->stat, accpt & 1 );
  	} else {
  	    fprintf( fp_fa, "%d -1 -1 %x %x\n", fa->stat, accpt, start );
  	}
  	return;
      }
      while( arc != NULL ){
  	if( !SWITCH_EDGE_ACCEPT ){
  	    accpt = fa->accpt;
  	} else {
  	    accpt = arc->accpt;
  	}
  	if( !SWITCH_EDGE_START ){
  	    start = fa->start;
  	} else {
  	    start = arc->start;
  	}
  	if( SWITCH_COMPAT_I ){
  	    accpt &= 1;
  	    fprintf( fp_fa, "%d %d %d %x\n",
  		    fa->stat, arc->inp, getNewStatNo(arc->fa), accpt );
  	} else {
  	    fprintf( fp_fa, "%d %d %d %x %x\n",
  		    fa->stat, arc->inp, getNewStatNo(arc->fa), accpt, start );
  	}
  	arc = arc->next;
      }
  }
  
  int getNewStatNo( FA *fa )
  {
      static int FAstat = 0;
  
      if( fa->stat >= 0 ) return( fa->stat );
      fa->stat = FAstat;
      processTripletQueue( fa );
      return( FAstat++ );
  }
  
  FA *processTripletQueue( FA *fa )
  {
      /* NULL:pop, !NULL:push */
  
      typedef struct _FAQ{
  	FA *fa;
  	struct _FAQ *next;
      } FAQ;
  
      static FAQ *queueTop = NULL;
      static FAQ *queuqTail = NULL;
      FAQ *newFAQ;
  
      if( fa != NULL ){
  	if( (newFAQ = malloc( sizeof(FAQ) )) == NULL ){
  	    errorMessage( "Can't malloc queue for breadth-first search of triplet list" );
  	}
  	newFAQ->fa = fa;
  	newFAQ->next = NULL;
  
  	if( queueTop == NULL ){
  	    queueTop = queuqTail = newFAQ;
  	    return( NULL );
  	} else {
  	    queuqTail->next = newFAQ;
  	    queuqTail = newFAQ;
  	    return( NULL );
  	}
      } else {
  	if( queueTop != NULL ){
  	    FAQ *popedFAQ = queueTop;
  	    FA *popedFA = queueTop->fa;
  	    queueTop = queueTop->next;
  	    free( popedFAQ );
  	    return( popedFA );
  	} else {
  	    return( NULL );
  	}
      }
  }
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/gram.l
  // =============================================================================
  %%
  "@"[a-zA-Z0-9_]+ {
  		yylval = yytext + 1;
  		return( TAG );
  }
  
  [a-zA-Z0-9_]+ {
  		yylval = yytext;
  		return( SYMBOL );
  }
  
  "{" {
  		ModeBlock = 1;
  		return( OPEN );
  }
  
  "}" {
  		ModeBlock = 0;
  		return( CLOSE );
  }
  
  "%ASSIGN"	return( CTRL_ASSIGN );
  "%IGNORE"	return( CTRL_IGNORE );
  "!"		return( REVERSE );
  "*"		return( STARTCLASS );
  ":"		return( LET );
  \n		return( NL );
  "#".*\n		return( REMARK );
  [ \t]		{};
  
  . {
  	errorMessage("Lexical mistake \"%s\"", yytext );
  	exit( 1 );
  }
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/gram.tab.c
  // =============================================================================
  /* A Bison parser, made from gram.y
     by GNU bison 1.35.  */
  
  #define YYBISON 1  /* Identify Bison output.  */
  
  # define	CTRL_ASSIGN	257
  # define	CTRL_IGNORE	258
  # define	OPEN	259
  # define	CLOSE	260
  # define	REVERSE	261
  # define	STARTCLASS	262
  # define	LET	263
  # define	TAG	264
  # define	SYMBOL	265
  # define	REMARK	266
  # define	NL	267
  
  #line 1 "gram.y"

  #define YYSTYPE char *
  #define CLASS_NUM 100
  
  void appendNonTerm( char *name, int modeAssign );
  BODY *setNonTerm( void );
  CLASS *entryNonTerm( char *name, BODY *body, int modeAccpt, int start, int member, int tmp );
  void pushBody( CLASS *class, BODY *newbody );
  int unifyBody( char *name, BODY *body, BODY *newbody );
  char *getNewClassName( char *keyname );
  void outputHeader( char *name );
  char *chkNoInstantClass( void );

  static char HeadName[ SYMBOL_LEN ];
  static char BodyName[ CLASS_NUM ][ SYMBOL_LEN ];
  static int BodyNo = 0;
  static int ClassNo = 0;
  static int ModeAssignAccptFlag = 1;
  static int BlockReverseSw;
  static int ModeBlock = 0;
  static int CurClassNo = 0;
  static int StartFlag = 0;
  static FILE *FPheader;
  static int ErrParse = 0;
  static int GramModifyNum = 0;
  #ifndef YYSTYPE
  # define YYSTYPE int
  # define YYSTYPE_IS_TRIVIAL 1
  #endif
  #ifndef YYDEBUG
  # define YYDEBUG 0
  #endif
  
  
  
  #define	YYFINAL		43
  #define	YYFLAG		-32768
  #define	YYNTBASE	14
  
  /* YYTRANSLATE(YYLEX) -- Bison token number corresponding to YYLEX. */
  #define YYTRANSLATE(x) ((unsigned)(x) <= 267 ? yytranslate[x] : 27)
  
  /* YYTRANSLATE[YYLEX] -- Bison token number corresponding to YYLEX. */
  static const char yytranslate[] =
  {
         0,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
         2,     2,     2,     2,     2,     2,     1,     3,     4,     5,
         6,     7,     8,     9,    10,    11,    12,    13
  };
  
  #if YYDEBUG
  static const short yyprhs[] =
  {
         0,     0,     2,     5,     7,     9,    11,    13,    16,    23,
        25,    28,    30,    33,    35,    38,    40,    42,    45,    50,
        52,    55,    57,    60,    62,    65,    67,    69
  };
  static const short yyrhs[] =
  {
        15,     0,    15,    14,     0,    16,     0,    20,     0,    25,
         0,    26,     0,     1,    13,     0,    17,     5,    26,    18,
         6,    26,     0,    10,     0,     7,    10,     0,    19,     0,
        19,    18,     0,    21,     0,    23,    26,     0,    26,     0,
        21,     0,     7,    21,     0,    23,     9,    22,    26,     0,
        24,     0,    24,    22,     0,    11,     0,     8,    11,     0,
        11,     0,     3,    26,     0,     4,     0,    12,     0,    13,
         0
  };
  
  #endif
  
  #if YYDEBUG
  /* YYRLINE[YYN] -- source line where rule number YYN was defined. */
  static const short yyrline[] =
  {
         0,    55,    55,    57,    57,    57,    57,    58,    63,    65,
        70,    76,    76,    78,    82,    86,    88,    92,    97,    99,
        99,   101,   105,   111,   116,   120,   125,   125
  };
  #endif
  
  
  #if (YYDEBUG) || defined YYERROR_VERBOSE
  
  /* YYTNAME[TOKEN_NUM] -- String name of the token TOKEN_NUM. */
  static const char *const yytname[] =
  {
    "$", "error", "$undefined.", "CTRL_ASSIGN", "CTRL_IGNORE", "OPEN", 
    "CLOSE", "REVERSE", "STARTCLASS", "LET", "TAG", "SYMBOL", "REMARK", 
    "NL", "src", "statement", "block", "tag", "members", "member", "single", 
    "define", "bodies", "head", "body", "contol", "remark", 0
  };
  #endif
  
  /* YYR1[YYN] -- Symbol number of symbol that rule YYN derives. */
  static const short yyr1[] =
  {
         0,    14,    14,    15,    15,    15,    15,    15,    16,    17,
        17,    18,    18,    19,    19,    19,    20,    20,    21,    22,
        22,    23,    23,    24,    25,    25,    26,    26
  };
  
  /* YYR2[YYN] -- Number of symbols composing right hand side of rule YYN. */
  static const short yyr2[] =
  {
         0,     1,     2,     1,     1,     1,     1,     2,     6,     1,
         2,     1,     2,     1,     2,     1,     1,     2,     4,     1,
         2,     1,     2,     1,     2,     1,     1,     1
  };
  
  /* YYDEFACT[S] -- default rule to reduce with in state S when YYTABLE
     doesn't specify something else to do.  Zero means the default is an
     error. */
  static const short yydefact[] =
  {
         0,     0,     0,    25,     0,     0,     9,    21,    26,    27,
         0,     3,     0,     4,    16,     0,     5,     6,     7,    24,
        10,    17,    22,     2,     0,     0,     0,    23,     0,    19,
         0,    11,    13,     0,    15,    18,    20,     0,    12,    14,
         8,     0,     0,     0
  };
  
  static const short yydefgoto[] =
  {
        23,    10,    11,    12,    30,    31,    13,    14,    28,    15,
        29,    16,    17
  };
  
  static const short yypact[] =
  {
        29,    14,     5,-32768,    36,     0,-32768,-32768,-32768,-32768,
         2,-32768,    20,-32768,-32768,    25,-32768,-32768,-32768,-32768,
    -32768,-32768,-32768,-32768,     5,    34,     8,-32768,     5,    34,
        42,     8,-32768,    -5,-32768,-32768,-32768,     5,-32768,-32768,
    -32768,    49,    50,-32768
  };
  
  static const short yypgoto[] =
  {
        51,-32768,-32768,-32768,    21,-32768,-32768,    -3,    24,    12,
    -32768,-32768,    -2
  };
  
  
  #define	YYLAST		53
  
  
  static const short yytable[] =
  {
        19,    21,    -1,     1,    25,     2,     3,     8,     9,     4,
         5,    22,     6,     7,     8,     9,     5,     8,     9,     7,
         8,     9,    26,    32,    34,    24,    35,    18,    32,    34,
         1,    39,     2,     3,    25,    40,     4,     5,    33,     6,
         7,     8,     9,    33,     5,    27,    20,     7,    37,    42,
        43,    41,    38,    36
  };
  
  static const short yycheck[] =
  {
         2,     4,     0,     1,     9,     3,     4,    12,    13,     7,
         8,    11,    10,    11,    12,    13,     8,    12,    13,    11,
        12,    13,    24,    26,    26,     5,    28,    13,    31,    31,
         1,    33,     3,     4,     9,    37,     7,     8,    26,    10,
        11,    12,    13,    31,     8,    11,    10,    11,     6,     0,
         0,     0,    31,    29
  };
  /* -*-C-*-  Note some compilers choke on comments on `#line' lines.  */
  #line 3 "/usr/share/bison/bison.simple"
  
  /* Skeleton output parser for bison,
  
     Copyright (C) 1984, 1989, 1990, 2000, 2001, 2002 Free Software
     Foundation, Inc.
  
     This program is free software; you can redistribute it and/or modify
     it under the terms of the GNU General Public License as published by
     the Free Software Foundation; either version 2, or (at your option)
     any later version.
  
     This program is distributed in the hope that it will be useful,
     but WITHOUT ANY WARRANTY; without even the implied warranty of
     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
     GNU General Public License for more details.
  
     You should have received a copy of the GNU General Public License
     along with this program; if not, write to the Free Software
     Foundation, Inc., 59 Temple Place - Suite 330,
     Boston, MA 02111-1307, USA.  */
  
  /* As a special exception, when this file is copied by Bison into a
     Bison output file, you may use that output file without restriction.
     This special exception was added by the Free Software Foundation
     in version 1.24 of Bison.  */
  
  /* This is the parser code that is written into each bison parser when
     the %semantic_parser declaration is not specified in the grammar.
     It was written by Richard Stallman by simplifying the hairy parser
     used when %semantic_parser is specified.  */
  
  /* All symbols defined below should begin with yy or YY, to avoid
     infringing on user name space.  This should be done even for local
     variables, as they might otherwise be expanded by user macros.
     There are some unavoidable exceptions within include files to
     define necessary library symbols; they are noted "INFRINGES ON
     USER NAME SPACE" below.  */
  
  #if ! defined (yyoverflow) || defined (YYERROR_VERBOSE)
  
  /* The parser invokes alloca or malloc; define the necessary symbols.  */
  
  # if YYSTACK_USE_ALLOCA
  #  define YYSTACK_ALLOC alloca
  # else
  #  ifndef YYSTACK_USE_ALLOCA
  #   if defined (alloca) || defined (_ALLOCA_H)
  #    define YYSTACK_ALLOC alloca
  #   else
  #    ifdef __GNUC__
  #     define YYSTACK_ALLOC __builtin_alloca
  #    endif
  #   endif
  #  endif
  # endif
  
  # ifdef YYSTACK_ALLOC
     /* Pacify GCC's `empty if-body' warning. */
  #  define YYSTACK_FREE(Ptr) do { /* empty */; } while (0)
  # else
  #  if defined (__STDC__) || defined (__cplusplus)
  #   include <stdlib.h> /* INFRINGES ON USER NAME SPACE */
  #   define YYSIZE_T size_t
  #  endif
  #  define YYSTACK_ALLOC malloc
  #  define YYSTACK_FREE free
  # endif
  #endif /* ! defined (yyoverflow) || defined (YYERROR_VERBOSE) */
  
  
  #if (! defined (yyoverflow) \
       && (! defined (__cplusplus) \
  	 || (YYLTYPE_IS_TRIVIAL && YYSTYPE_IS_TRIVIAL)))
  
  /* A type that is properly aligned for any stack member.  */
  union yyalloc
  {
    short yyss;
    YYSTYPE yyvs;
  # if YYLSP_NEEDED
    YYLTYPE yyls;
  # endif
  };
  
  /* The size of the maximum gap between one aligned stack and the next.  */
  # define YYSTACK_GAP_MAX (sizeof (union yyalloc) - 1)
  
  /* The size of an array large to enough to hold all stacks, each with
     N elements.  */
  # if YYLSP_NEEDED
  #  define YYSTACK_BYTES(N) \
       ((N) * (sizeof (short) + sizeof (YYSTYPE) + sizeof (YYLTYPE))	\
        + 2 * YYSTACK_GAP_MAX)
  # else
  #  define YYSTACK_BYTES(N) \
       ((N) * (sizeof (short) + sizeof (YYSTYPE))				\
        + YYSTACK_GAP_MAX)
  # endif
  
  /* Copy COUNT objects from FROM to TO.  The source and destination do
     not overlap.  */
  # ifndef YYCOPY
  #  if 1 < __GNUC__
  #   define YYCOPY(To, From, Count) \
        __builtin_memcpy (To, From, (Count) * sizeof (*(From)))
  #  else
  #   define YYCOPY(To, From, Count)		\
        do					\
  	{					\
  	  register YYSIZE_T yyi;		\
  	  for (yyi = 0; yyi < (Count); yyi++)	\
  	    (To)[yyi] = (From)[yyi];		\
  	}					\
        while (0)
  #  endif
  # endif
  
  /* Relocate STACK from its old location to the new one.  The
     local variables YYSIZE and YYSTACKSIZE give the old and new number of
     elements in the stack, and YYPTR gives the new location of the
     stack.  Advance YYPTR to a properly aligned location for the next
     stack.  */
  # define YYSTACK_RELOCATE(Stack)					\
      do									\
        {									\
  	YYSIZE_T yynewbytes;						\
  	YYCOPY (&yyptr->Stack, Stack, yysize);				\
  	Stack = &yyptr->Stack;						\
  	yynewbytes = yystacksize * sizeof (*Stack) + YYSTACK_GAP_MAX;	\
  	yyptr += yynewbytes / sizeof (*yyptr);				\
        }									\
      while (0)
  
  #endif
  
  
  #if ! defined (YYSIZE_T) && defined (__SIZE_TYPE__)
  # define YYSIZE_T __SIZE_TYPE__
  #endif
  #if ! defined (YYSIZE_T) && defined (size_t)
  # define YYSIZE_T size_t
  #endif
  #if ! defined (YYSIZE_T)
  # if defined (__STDC__) || defined (__cplusplus)
  #  include <stddef.h> /* INFRINGES ON USER NAME SPACE */
  #  define YYSIZE_T size_t
  # endif
  #endif
  #if ! defined (YYSIZE_T)
  # define YYSIZE_T unsigned int
  #endif
  
  #define yyerrok		(yyerrstatus = 0)
  #define yyclearin	(yychar = YYEMPTY)
  #define YYEMPTY		-2
  #define YYEOF		0
  #define YYACCEPT	goto yyacceptlab
  #define YYABORT 	goto yyabortlab
  #define YYERROR		goto yyerrlab1
  /* Like YYERROR except do call yyerror.  This remains here temporarily
     to ease the transition to the new meaning of YYERROR, for GCC.
     Once GCC version 2 has supplanted version 1, this can go.  */
  #define YYFAIL		goto yyerrlab
  #define YYRECOVERING()  (!!yyerrstatus)
  #define YYBACKUP(Token, Value)					\
  do								\
    if (yychar == YYEMPTY && yylen == 1)				\
      {								\
        yychar = (Token);						\
        yylval = (Value);						\
        yychar1 = YYTRANSLATE (yychar);				\
        YYPOPSTACK;						\
        goto yybackup;						\
      }								\
    else								\
      { 								\
        yyerror ("syntax error: cannot back up");			\
        YYERROR;							\
      }								\
  while (0)
  
  #define YYTERROR	1
  #define YYERRCODE	256
  
  
  /* YYLLOC_DEFAULT -- Compute the default location (before the actions
     are run).
  
     When YYLLOC_DEFAULT is run, CURRENT is set the location of the
     first token.  By default, to implement support for ranges, extend
     its range to the last symbol.  */
  
  #ifndef YYLLOC_DEFAULT
  # define YYLLOC_DEFAULT(Current, Rhs, N)       	\
     Current.last_line   = Rhs[N].last_line;	\
     Current.last_column = Rhs[N].last_column;
  #endif
  
  
  /* YYLEX -- calling `yylex' with the right arguments.  */
  
  #if YYPURE
  # if YYLSP_NEEDED
  #  ifdef YYLEX_PARAM
  #   define YYLEX		yylex (&yylval, &yylloc, YYLEX_PARAM)
  #  else
  #   define YYLEX		yylex (&yylval, &yylloc)
  #  endif
  # else /* !YYLSP_NEEDED */
  #  ifdef YYLEX_PARAM
  #   define YYLEX		yylex (&yylval, YYLEX_PARAM)
  #  else
  #   define YYLEX		yylex (&yylval)
  #  endif
  # endif /* !YYLSP_NEEDED */
  #else /* !YYPURE */
  # define YYLEX			yylex ()
  #endif /* !YYPURE */
  
  
  /* Enable debugging if requested.  */
  #if YYDEBUG
  
  # ifndef YYFPRINTF
  #  include <stdio.h> /* INFRINGES ON USER NAME SPACE */
  #  define YYFPRINTF fprintf
  # endif
  
  # define YYDPRINTF(Args)			\
  do {						\
    if (yydebug)					\
      YYFPRINTF Args;				\
  } while (0)
  /* Nonzero means print parse trace.  It is left uninitialized so that
     multiple parsers can coexist.  */
  int yydebug;
  #else /* !YYDEBUG */
  # define YYDPRINTF(Args)
  #endif /* !YYDEBUG */
  
  /* YYINITDEPTH -- initial size of the parser's stacks.  */
  #ifndef	YYINITDEPTH
  # define YYINITDEPTH 200
  #endif
  
  /* YYMAXDEPTH -- maximum size the stacks can grow to (effective only
     if the built-in stack extension method is used).
  
     Do not make this value too large; the results are undefined if
     SIZE_MAX < YYSTACK_BYTES (YYMAXDEPTH)
     evaluated with infinite-precision integer arithmetic.  */
  
  #if YYMAXDEPTH == 0
  # undef YYMAXDEPTH
  #endif
  
  #ifndef YYMAXDEPTH
  # define YYMAXDEPTH 10000
  #endif
  
  #ifdef YYERROR_VERBOSE
  
  # ifndef yystrlen
  #  if defined (__GLIBC__) && defined (_STRING_H)
  #   define yystrlen strlen
  #  else
  /* Return the length of YYSTR.  */
  static YYSIZE_T
  #   if defined (__STDC__) || defined (__cplusplus)
  yystrlen (const char *yystr)
  #   else
  yystrlen (yystr)
       const char *yystr;
  #   endif
  {
    register const char *yys = yystr;
  
    while (*yys++ != '\0')
      continue;
  
    return yys - yystr - 1;
  }
  #  endif
  # endif
  
  # ifndef yystpcpy
  #  if defined (__GLIBC__) && defined (_STRING_H) && defined (_GNU_SOURCE)
  #   define yystpcpy stpcpy
  #  else
  /* Copy YYSRC to YYDEST, returning the address of the terminating '\0' in
     YYDEST.  */
  static char *
  #   if defined (__STDC__) || defined (__cplusplus)
  yystpcpy (char *yydest, const char *yysrc)
  #   else
  yystpcpy (yydest, yysrc)
       char *yydest;
       const char *yysrc;
  #   endif
  {
    register char *yyd = yydest;
    register const char *yys = yysrc;
  
    while ((*yyd++ = *yys++) != '\0')
      continue;
  
    return yyd - 1;
  }
  #  endif
  # endif
  #endif
  
  #line 315 "/usr/share/bison/bison.simple"
  
  
  /* The user can define YYPARSE_PARAM as the name of an argument to be passed
     into yyparse.  The argument should have type void *.
     It should actually point to an object.
     Grammar actions can access the variable by casting it
     to the proper pointer type.  */
  
  #ifdef YYPARSE_PARAM
  # if defined (__STDC__) || defined (__cplusplus)
  #  define YYPARSE_PARAM_ARG void *YYPARSE_PARAM
  #  define YYPARSE_PARAM_DECL
  # else
  #  define YYPARSE_PARAM_ARG YYPARSE_PARAM
  #  define YYPARSE_PARAM_DECL void *YYPARSE_PARAM;
  # endif
  #else /* !YYPARSE_PARAM */
  # define YYPARSE_PARAM_ARG
  # define YYPARSE_PARAM_DECL
  #endif /* !YYPARSE_PARAM */
  
  /* Prevent warning if -Wstrict-prototypes.  */
  #ifdef __GNUC__
  # ifdef YYPARSE_PARAM
  int yyparse (void *);
  # else
  int yyparse (void);
  # endif
  #endif
  
  /* YY_DECL_VARIABLES -- depending whether we use a pure parser,
     variables are global, or local to YYPARSE.  */
  
  #define YY_DECL_NON_LSP_VARIABLES			\
  /* The lookahead symbol.  */				\
  int yychar;						\
  							\
  /* The semantic value of the lookahead symbol. */	\
  YYSTYPE yylval;						\
  							\
  /* Number of parse errors so far.  */			\
  int yynerrs;
  
  #if YYLSP_NEEDED
  # define YY_DECL_VARIABLES			\
  YY_DECL_NON_LSP_VARIABLES			\
  						\
  /* Location data for the lookahead symbol.  */	\
  YYLTYPE yylloc;
  #else
  # define YY_DECL_VARIABLES			\
  YY_DECL_NON_LSP_VARIABLES
  #endif
  
  
  /* If nonreentrant, generate the variables here. */
  
  #if !YYPURE
  YY_DECL_VARIABLES
  #endif  /* !YYPURE */
  
  int
  yyparse (YYPARSE_PARAM_ARG)
       YYPARSE_PARAM_DECL
  {
    /* If reentrant, generate the variables here. */
  #if YYPURE
    YY_DECL_VARIABLES
  #endif  /* !YYPURE */
  
    register int yystate;
    register int yyn;
    int yyresult;
    /* Number of tokens to shift before error messages enabled.  */
    int yyerrstatus;
    /* Lookahead token as an internal (translated) token number.  */
    int yychar1 = 0;
  
    /* Three stacks and their tools:
       `yyss': related to states,
       `yyvs': related to semantic values,
       `yyls': related to locations.
  
       Refer to the stacks thru separate pointers, to allow yyoverflow
       to reallocate them elsewhere.  */
  
    /* The state stack. */
    short	yyssa[YYINITDEPTH];
    short *yyss = yyssa;
    register short *yyssp;
  
    /* The semantic value stack.  */
    YYSTYPE yyvsa[YYINITDEPTH];
    YYSTYPE *yyvs = yyvsa;
    register YYSTYPE *yyvsp;
  
  #if YYLSP_NEEDED
    /* The location stack.  */
    YYLTYPE yylsa[YYINITDEPTH];
    YYLTYPE *yyls = yylsa;
    YYLTYPE *yylsp;
  #endif
  
  #if YYLSP_NEEDED
  # define YYPOPSTACK   (yyvsp--, yyssp--, yylsp--)
  #else
  # define YYPOPSTACK   (yyvsp--, yyssp--)
  #endif
  
    YYSIZE_T yystacksize = YYINITDEPTH;
  
  
    /* The variables used to return semantic value and location from the
       action routines.  */
    YYSTYPE yyval;
  #if YYLSP_NEEDED
    YYLTYPE yyloc;
  #endif
  
    /* When reducing, the number of symbols on the RHS of the reduced
       rule. */
    int yylen;
  
    YYDPRINTF ((stderr, "Starting parse\n"));
  
    yystate = 0;
    yyerrstatus = 0;
    yynerrs = 0;
    yychar = YYEMPTY;		/* Cause a token to be read.  */
  
    /* Initialize stack pointers.
       Waste one element of value and location stack
       so that they stay on the same level as the state stack.
       The wasted elements are never initialized.  */
  
    yyssp = yyss;
    yyvsp = yyvs;
  #if YYLSP_NEEDED
    yylsp = yyls;
  #endif
    goto yysetstate;
  
  /*------------------------------------------------------------.
  | yynewstate -- Push a new state, which is found in yystate.  |
  `------------------------------------------------------------*/
   yynewstate:
    /* In all cases, when you get here, the value and location stacks
       have just been pushed. so pushing a state here evens the stacks.
       */
    yyssp++;
  
   yysetstate:
    *yyssp = yystate;
  
    if (yyssp >= yyss + yystacksize - 1)
      {
        /* Get the current used size of the three stacks, in elements.  */
        YYSIZE_T yysize = yyssp - yyss + 1;
  
  #ifdef yyoverflow
        {
  	/* Give user a chance to reallocate the stack. Use copies of
  	   these so that the &'s don't force the real ones into
  	   memory.  */
  	YYSTYPE *yyvs1 = yyvs;
  	short *yyss1 = yyss;
  
  	/* Each stack pointer address is followed by the size of the
  	   data in use in that stack, in bytes.  */
  # if YYLSP_NEEDED
  	YYLTYPE *yyls1 = yyls;
  	/* This used to be a conditional around just the two extra args,
  	   but that might be undefined if yyoverflow is a macro.  */
  	yyoverflow ("parser stack overflow",
  		    &yyss1, yysize * sizeof (*yyssp),
  		    &yyvs1, yysize * sizeof (*yyvsp),
  		    &yyls1, yysize * sizeof (*yylsp),
  		    &yystacksize);
  	yyls = yyls1;
  # else
  	yyoverflow ("parser stack overflow",
  		    &yyss1, yysize * sizeof (*yyssp),
  		    &yyvs1, yysize * sizeof (*yyvsp),
  		    &yystacksize);
  # endif
  	yyss = yyss1;
  	yyvs = yyvs1;
        }
  #else /* no yyoverflow */
  # ifndef YYSTACK_RELOCATE
        goto yyoverflowlab;
  # else
        /* Extend the stack our own way.  */
        if (yystacksize >= YYMAXDEPTH)
  	goto yyoverflowlab;
        yystacksize *= 2;
        if (yystacksize > YYMAXDEPTH)
  	yystacksize = YYMAXDEPTH;
  
        {
  	short *yyss1 = yyss;
  	union yyalloc *yyptr =
  	  (union yyalloc *) YYSTACK_ALLOC (YYSTACK_BYTES (yystacksize));
  	if (! yyptr)
  	  goto yyoverflowlab;
  	YYSTACK_RELOCATE (yyss);
  	YYSTACK_RELOCATE (yyvs);
  # if YYLSP_NEEDED
  	YYSTACK_RELOCATE (yyls);
  # endif
  # undef YYSTACK_RELOCATE
  	if (yyss1 != yyssa)
  	  YYSTACK_FREE (yyss1);
        }
  # endif
  #endif /* no yyoverflow */
  
        yyssp = yyss + yysize - 1;
        yyvsp = yyvs + yysize - 1;
  #if YYLSP_NEEDED
        yylsp = yyls + yysize - 1;
  #endif
  
        YYDPRINTF ((stderr, "Stack size increased to %lu\n",
  		  (unsigned long int) yystacksize));
  
        if (yyssp >= yyss + yystacksize - 1)
  	YYABORT;
      }
  
    YYDPRINTF ((stderr, "Entering state %d\n", yystate));
  
    goto yybackup;
  
  
  /*-----------.
  | yybackup.  |
  `-----------*/
  yybackup:
  
  /* Do appropriate processing given the current state.  */
  /* Read a lookahead token if we need one and don't already have one.  */
  /* yyresume: */
  
    /* First try to decide what to do without reference to lookahead token.  */
  
    yyn = yypact[yystate];
    if (yyn == YYFLAG)
      goto yydefault;
  
    /* Not known => get a lookahead token if don't already have one.  */
  
    /* yychar is either YYEMPTY or YYEOF
       or a valid token in external form.  */
  
    if (yychar == YYEMPTY)
      {
        YYDPRINTF ((stderr, "Reading a token: "));
        yychar = YYLEX;
      }
  
    /* Convert token to internal form (in yychar1) for indexing tables with */
  
    if (yychar <= 0)		/* This means end of input. */
      {
        yychar1 = 0;
        yychar = YYEOF;		/* Don't call YYLEX any more */
  
        YYDPRINTF ((stderr, "Now at end of input.\n"));
      }
    else
      {
        yychar1 = YYTRANSLATE (yychar);
  
  #if YYDEBUG
       /* We have to keep this `#if YYDEBUG', since we use variables
  	which are defined only if `YYDEBUG' is set.  */
        if (yydebug)
  	{
  	  YYFPRINTF (stderr, "Next token is %d (%s",
  		     yychar, yytname[yychar1]);
  	  /* Give the individual parser a way to print the precise
  	     meaning of a token, for further debugging info.  */
  # ifdef YYPRINT
  	  YYPRINT (stderr, yychar, yylval);
  # endif
  	  YYFPRINTF (stderr, ")\n");
  	}
  #endif
      }
  
    yyn += yychar1;
    if (yyn < 0 || yyn > YYLAST || yycheck[yyn] != yychar1)
      goto yydefault;
  
    yyn = yytable[yyn];
  
    /* yyn is what to do for this token type in this state.
       Negative => reduce, -yyn is rule number.
       Positive => shift, yyn is new state.
         New state is final state => don't bother to shift,
         just return success.
       0, or most negative number => error.  */
  
    if (yyn < 0)
      {
        if (yyn == YYFLAG)
  	goto yyerrlab;
        yyn = -yyn;
        goto yyreduce;
      }
    else if (yyn == 0)
      goto yyerrlab;
  
    if (yyn == YYFINAL)
      YYACCEPT;
  
    /* Shift the lookahead token.  */
    YYDPRINTF ((stderr, "Shifting token %d (%s), ",
  	      yychar, yytname[yychar1]));
  
    /* Discard the token being shifted unless it is eof.  */
    if (yychar != YYEOF)
      yychar = YYEMPTY;
  
    *++yyvsp = yylval;
  #if YYLSP_NEEDED
    *++yylsp = yylloc;
  #endif
  
    /* Count tokens shifted since error; after three, turn off error
       status.  */
    if (yyerrstatus)
      yyerrstatus--;
  
    yystate = yyn;
    goto yynewstate;
  
  
  /*-----------------------------------------------------------.
  | yydefault -- do the default action for the current state.  |
  `-----------------------------------------------------------*/
  yydefault:
    yyn = yydefact[yystate];
    if (yyn == 0)
      goto yyerrlab;
    goto yyreduce;
  
  
  /*-----------------------------.
  | yyreduce -- Do a reduction.  |
  `-----------------------------*/
  yyreduce:
    /* yyn is the number of a rule to reduce with.  */
    yylen = yyr2[yyn];
  
    /* If YYLEN is nonzero, implement the default value of the action:
       `$$ = $1'.
  
       Otherwise, the following line sets YYVAL to the semantic value of
       the lookahead token.  This behavior is undocumented and Bison
       users should not rely upon it.  Assigning to YYVAL
       unconditionally makes the parser a bit smaller, and it avoids a
       GCC warning that YYVAL may be used uninitialized.  */
    yyval = yyvsp[1-yylen];
  
  #if YYLSP_NEEDED
    /* Similarly for the default location.  Let the user run additional
       commands if for instance locations are ranges.  */
    yyloc = yylsp[1-yylen];
    YYLLOC_DEFAULT (yyloc, (yylsp - yylen), yylen);
  #endif
  
  #if YYDEBUG
    /* We have to keep this `#if YYDEBUG', since we use variables which
       are defined only if `YYDEBUG' is set.  */
    if (yydebug)
      {
        int yyi;
  
        YYFPRINTF (stderr, "Reducing via rule %d (line %d), ",
  		 yyn, yyrline[yyn]);
  
        /* Print the symbols being reduced, and their result.  */
        for (yyi = yyprhs[yyn]; yyrhs[yyi] > 0; yyi++)
  	YYFPRINTF (stderr, "%s ", yytname[yyrhs[yyi]]);
        YYFPRINTF (stderr, " -> %s\n", yytname[yyr1[yyn]]);
      }
  #endif
  
    switch (yyn) {
  
  case 7:
  #line 59 "gram.y"
  {
      yyerrok;
  ;
      break;}
  case 9:
  #line 66 "gram.y"
  {
      BlockReverseSw = 0;
      if( ModeAssignAccptFlag ) outputHeader( yyvsp[0] );
  ;
      break;}
  case 10:
  #line 71 "gram.y"
  {
      BlockReverseSw = 1;
      if( !ModeAssignAccptFlag ) outputHeader( yyvsp[0] );
  ;
      break;}
  case 13:
  #line 79 "gram.y"
  {
      appendNonTerm( HeadName, ModeAssignAccptFlag ^ BlockReverseSw );
  ;
      break;}
  case 14:
  #line 83 "gram.y"
  {
      entryNonTerm( HeadName, NULL, ModeAssignAccptFlag ^ BlockReverseSw, 0, 1, 0 ); /*$B6uEPO?(B*/
  ;
      break;}
  case 16:
  #line 89 "gram.y"
  {
      appendNonTerm( HeadName, ModeAssignAccptFlag );
  ;
      break;}
  case 17:
  #line 93 "gram.y"
  {
      appendNonTerm( HeadName, !ModeAssignAccptFlag );
  ;
      break;}
  case 21:
  #line 102 "gram.y"
  {
      strcpy( HeadName, yyvsp[0] );
  ;
      break;}
  case 22:
  #line 106 "gram.y"
  {
      StartFlag = 1;
      strcpy( HeadName, yyvsp[0] );
  ;
      break;}
  case 23:
  #line 112 "gram.y"
  {
      strcpy( BodyName[ BodyNo++ ], yyvsp[0] );
  ;
      break;}
  case 24:
  #line 117 "gram.y"
  {
      ModeAssignAccptFlag = 1;
  ;
      break;}
  case 25:
  #line 121 "gram.y"
  {
      ModeAssignAccptFlag = 0;
  ;
      break;}
  }
  
  #line 705 "/usr/share/bison/bison.simple"
  
  
    yyvsp -= yylen;
    yyssp -= yylen;
  #if YYLSP_NEEDED
    yylsp -= yylen;
  #endif
  
  #if YYDEBUG
    if (yydebug)
      {
        short *yyssp1 = yyss - 1;
        YYFPRINTF (stderr, "state stack now");
        while (yyssp1 != yyssp)
  	YYFPRINTF (stderr, " %d", *++yyssp1);
        YYFPRINTF (stderr, "\n");
      }
  #endif
  
    *++yyvsp = yyval;
  #if YYLSP_NEEDED
    *++yylsp = yyloc;
  #endif
  
    /* Now `shift' the result of the reduction.  Determine what state
       that goes to, based on the state we popped back to and the rule
       number reduced by.  */
  
    yyn = yyr1[yyn];
  
    yystate = yypgoto[yyn - YYNTBASE] + *yyssp;
    if (yystate >= 0 && yystate <= YYLAST && yycheck[yystate] == *yyssp)
      yystate = yytable[yystate];
    else
      yystate = yydefgoto[yyn - YYNTBASE];
  
    goto yynewstate;
  
  
  /*------------------------------------.
  | yyerrlab -- here on detecting error |
  `------------------------------------*/
  yyerrlab:
    /* If not already recovering from an error, report this error.  */
    if (!yyerrstatus)
      {
        ++yynerrs;
  
  #ifdef YYERROR_VERBOSE
        yyn = yypact[yystate];
  
        if (yyn > YYFLAG && yyn < YYLAST)
  	{
  	  YYSIZE_T yysize = 0;
  	  char *yymsg;
  	  int yyx, yycount;
  
  	  yycount = 0;
  	  /* Start YYX at -YYN if negative to avoid negative indexes in
  	     YYCHECK.  */
  	  for (yyx = yyn < 0 ? -yyn : 0;
  	       yyx < (int) (sizeof (yytname) / sizeof (char *)); yyx++)
  	    if (yycheck[yyx + yyn] == yyx)
  	      yysize += yystrlen (yytname[yyx]) + 15, yycount++;
  	  yysize += yystrlen ("parse error, unexpected ") + 1;
  	  yysize += yystrlen (yytname[YYTRANSLATE (yychar)]);
  	  yymsg = (char *) YYSTACK_ALLOC (yysize);
  	  if (yymsg != 0)
  	    {
  	      char *yyp = yystpcpy (yymsg, "parse error, unexpected ");
  	      yyp = yystpcpy (yyp, yytname[YYTRANSLATE (yychar)]);
  
  	      if (yycount < 5)
  		{
  		  yycount = 0;
  		  for (yyx = yyn < 0 ? -yyn : 0;
  		       yyx < (int) (sizeof (yytname) / sizeof (char *));
  		       yyx++)
  		    if (yycheck[yyx + yyn] == yyx)
  		      {
  			const char *yyq = ! yycount ? ", expecting " : " or ";
  			yyp = yystpcpy (yyp, yyq);
  			yyp = yystpcpy (yyp, yytname[yyx]);
  			yycount++;
  		      }
  		}
  	      yyerror (yymsg);
  	      YYSTACK_FREE (yymsg);
  	    }
  	  else
  	    yyerror ("parse error; also virtual memory exhausted");
  	}
        else
  #endif /* defined (YYERROR_VERBOSE) */
  	yyerror ("parse error");
      }
    goto yyerrlab1;
  
  
  /*--------------------------------------------------.
  | yyerrlab1 -- error raised explicitly by an action |
  `--------------------------------------------------*/
  yyerrlab1:
    if (yyerrstatus == 3)
      {
        /* If just tried and failed to reuse lookahead token after an
  	 error, discard it.  */
  
        /* return failure if at end of input */
        if (yychar == YYEOF)
  	YYABORT;
        YYDPRINTF ((stderr, "Discarding token %d (%s).\n",
  		  yychar, yytname[yychar1]));
        yychar = YYEMPTY;
      }
  
    /* Else will try to reuse lookahead token after shifting the error
       token.  */
  
    yyerrstatus = 3;		/* Each real token shifted decrements this */
  
    goto yyerrhandle;
  
  
  /*-------------------------------------------------------------------.
  | yyerrdefault -- current state does not do anything special for the |
  | error token.                                                       |
  `-------------------------------------------------------------------*/
  yyerrdefault:
  #if 0
    /* This is wrong; only states that explicitly want error tokens
       should shift them.  */
  
    /* If its default is to accept any token, ok.  Otherwise pop it.  */
    yyn = yydefact[yystate];
    if (yyn)
      goto yydefault;
  #endif
  
  
  /*---------------------------------------------------------------.
  | yyerrpop -- pop the current state because it cannot handle the |
  | error token                                                    |
  `---------------------------------------------------------------*/
  yyerrpop:
    if (yyssp == yyss)
      YYABORT;
    yyvsp--;
    yystate = *--yyssp;
  #if YYLSP_NEEDED
    yylsp--;
  #endif
  
  #if YYDEBUG
    if (yydebug)
      {
        short *yyssp1 = yyss - 1;
        YYFPRINTF (stderr, "Error: state stack now");
        while (yyssp1 != yyssp)
  	YYFPRINTF (stderr, " %d", *++yyssp1);
        YYFPRINTF (stderr, "\n");
      }
  #endif
  
  /*--------------.
  | yyerrhandle.  |
  `--------------*/
  yyerrhandle:
    yyn = yypact[yystate];
    if (yyn == YYFLAG)
      goto yyerrdefault;
  
    yyn += YYTERROR;
    if (yyn < 0 || yyn > YYLAST || yycheck[yyn] != YYTERROR)
      goto yyerrdefault;
  
    yyn = yytable[yyn];
    if (yyn < 0)
      {
        if (yyn == YYFLAG)
  	goto yyerrpop;
        yyn = -yyn;
        goto yyreduce;
      }
    else if (yyn == 0)
      goto yyerrpop;
  
    if (yyn == YYFINAL)
      YYACCEPT;
  
    YYDPRINTF ((stderr, "Shifting error token, "));
  
    *++yyvsp = yylval;
  #if YYLSP_NEEDED
    *++yylsp = yylloc;
  #endif
  
    yystate = yyn;
    goto yynewstate;
  
  
  /*-------------------------------------.
  | yyacceptlab -- YYACCEPT comes here.  |
  `-------------------------------------*/
  yyacceptlab:
    yyresult = 0;
    goto yyreturn;
  
  /*-----------------------------------.
  | yyabortlab -- YYABORT comes here.  |
  `-----------------------------------*/
  yyabortlab:
    yyresult = 1;
    goto yyreturn;
  
  /*---------------------------------------------.
  | yyoverflowab -- parser overflow comes here.  |
  `---------------------------------------------*/
  yyoverflowlab:
    yyerror ("parser stack overflow");
    yyresult = 2;
    /* Fall through.  */
  
  yyreturn:
  #ifndef yyoverflow
    if (yyss != yyssa)
      YYSTACK_FREE (yyss);
  #endif
    return yyresult;
  }
  #line 127 "gram.y"
  
  #include "lex.yy.c"
  void appendNonTerm( char *name, int modeAssign )
  {
      BODY *body;
  
      body = setNonTerm();
      entryNonTerm( name, body, modeAssign, StartFlag, ModeBlock, 0 );
      BodyNo = 0;
  }
  
  BODY *setNonTerm( void )
  {
      int i;
      BODY *body;
      BODY *top = NULL, *prev = NULL;
  
      for( i = 0; i < BodyNo; i++ ){
  	if( (body = malloc( sizeof(BODY) )) == NULL ){
  	    errorMessage( "Can't alloc nonterminal list buffer" );
  	}
  	strcpy( body->name, BodyName[ i ] );
  	body->abort = 0;
  	if( prev != NULL ){
  	    prev->next = body;
  	} else {
  	    top = body;
  	}
  	prev = body;   
      }
      body->next = NULL;
      return( top );
  }
  
  CLASS *entryNonTerm( char *name, BODY *body, int modeAccpt, int start, int member, int tmp )
  {
      CLASS *class;
  
      class = getClass( name );
      if( class != NULL ){
  	if( member ){
  	    errorMessage("Accepted flag of class \"%s\" is re-assigned", HeadName );
  	    ErrParse++;
  	}
      } else {
  	if( (class = malloc( sizeof(CLASS) )) == NULL ){
  	    errorMessage( "Can't alloc memory for Class Finite Automaton." );
  	}
  	strcpy( class->name, name );
  	if( modeAccpt ){
  	    if( member ){
  		class->no = CurClassNo;
  	    } else {
  		if( !tmp ){
  		    outputHeader( name );
  		    class->no = CurClassNo;
  		}
  	    }
  	} else {
  	    class->no = -1;
  	}
  	class->branch = 0;
  	class->usedFA = 0;
  	class->used = 1;	/* non-terminal does not appear in voca */
  	class->bodyList = NULL;
  	class->tmp = tmp;
  	class->next = NULL;
  	if( ClassListTail == NULL ){
  	    ClassList = class;
  	} else {
  	    ClassListTail->next = class;
  	}
  	ClassListTail = class;
      }
      if( body != NULL ) pushBody( class, body );
      if( start ){
  	StartFlag = 0;
  	if( StartSymbol == NULL ){
  	    StartSymbol = class;
  	} else {
  	    errorMessage("Start symbol is redifined as \"%s\"", class->name );
  	    ErrParse++;
  	}
      }
      return( class );
  }
  
  void pushBody( CLASS *class, BODY *newbody )
  {
      BODYLIST *bodyList = class->bodyList;
      BODYLIST *preBodyList = NULL;
      BODYLIST *newBodyList;
      BODY *body;
      int cmp;
      int defineNo = 1;
  
      while( bodyList != NULL ){
  	body = bodyList->body;
  	cmp = strcmp( body->name, newbody->name );
  	if( cmp > 0 ) break;
  	if( cmp == 0 ){
  	    if( unifyBody( class->name, body, newbody ) ){
  		warningMessage( "Class \"%s\" is defined as \"%s..\" again.", class->name, body->name );
  	    }
  	    return;
  	}
  	preBodyList = bodyList;
  	bodyList = bodyList->next;
  	defineNo++;
      }
      if( (newBodyList = malloc( sizeof(BODYLIST) )) == NULL ){
  	errorMessage( "Can't alloc class body buffer." );
      }
      newBodyList->body = newbody;
  
      if( preBodyList != NULL ){
  	preBodyList->next = newBodyList;
      } else {
  	class->bodyList = newBodyList;
      }
      newBodyList->next = bodyList;
      class->branch++;
  }
  
  int unifyBody( char *className, BODY *body, BODY *newbody )
  {
      BODY *bodyNext, *newbodyNext;
      char *newClassName;
      BODY *newBody;
      CLASS *class;
  
      bodyNext = body->next;
      newbodyNext = newbody->next;
      while( 1 ){
  	if( bodyNext == NULL && newbodyNext == NULL ){
  	    return( -1 );
  	}
  	if( newbodyNext == NULL ){
  	    if( body->abort ){
  		return( -1 );
  	    } else {
  		body->abort = 1;
  		return( 0 );
  	    }
  	}
  	if( bodyNext == NULL ){
  	    body->abort = 1;
  	    body->next = newbodyNext;
  	    return( 0 );
  	}
  	if( strcmp( bodyNext->name, newbodyNext->name ) ) break;
  	body = bodyNext;
  	newbody = newbodyNext;
  	bodyNext = body->next;
  	newbodyNext = newbody->next;
      }
      class = getClass( body->name );
      if( class != NULL && class->tmp ){
  	entryNonTerm( body->name, newbodyNext, 0, 0, 0, 1 );
      } else {
  	newClassName = getNewClassName( className );
  	entryNonTerm( newClassName, bodyNext, 0, 0, 0, 1 );
  	entryNonTerm( newClassName, newbodyNext, 0, 0, 0, 1 );
  	if( (newBody = malloc( sizeof(BODY) )) == NULL ){
  	    errorMessage( "Can't alloc body buffer of tmp class, \"%s\".", newClassName );
  	}
  	strcpy( newBody->name, newClassName );
  	newBody->abort = 0;
  	newBody->next = NULL;
  	body->next = newBody;
  	newbody->next = newBody;
      }
      return( 0 );
  }
  
  char *getNewClassName( char *keyname )
  {
      static char classname[ SYMBOL_LEN ];
      static int tmpClassNo = 0;
  
      sprintf( classname, "%s#%d", keyname , tmpClassNo++ );
      if( !SWITCH_SEMI_QUIET ){
  	fprintf( stderr, "\rNow modifying grammar to minimize states[%d]", GramModifyNum );
  	NO_NEW_LINE = 1;
      }
      GramModifyNum++;
      return( classname );
  }
  
  void setGram( void )
  {
      char *name;
  
      if( (yyin = fopen( GRAMMAR_FILE_NAME_LIST, "r" )) == NULL ){
  	errorMessage( "Can't open grammar file \"%s\"", GRAMMAR_FILE_NAME_LIST );
      }
      if( SWITCH_COMPAT_I ){
  	strcpy( HEADER_FILE_NAME_LIST, "/dev/null" );
      }
      if( (FPheader = fopen( HEADER_FILE_NAME_LIST, "w" )) == NULL ){
  	errorMessage( "Can't open Header File for writting\"%s\"", HEADER_FILE_NAME_LIST );
      }
      fprintf( FPheader,
  	    "/* Header of class reduction flag for finite automaton parser\n"
  	    "                    made with mkfa %s\n\n"
  	    "        Do logicalAND between label and FA's field #4,#5.\n"
  	    "*/\n\n", VERSION_NUMBER
  	    );
      if( !SWITCH_QUIET ) fputs( "Now parsing grammar file\n", stderr );
      yyparse();
      if( !SWITCH_QUIET ){
  	fprintf( stderr, "\rNow modifying grammar to minimize states[%d]\n", GramModifyNum - 1 );
  	NO_NEW_LINE = 0;
      }
      if( StartSymbol == NULL ) StartSymbol = ClassList;
      fprintf( FPheader, "/* Start Symbol: %s */\n", StartSymbol->name );
      fclose( FPheader );
      if( (name = chkNoInstantClass()) != NULL ){
  	errorMessage( "Prototype-declared Class \"%s\" has no instant definitions", name );
      }
      if( ErrParse ) errorMessage( "%d fatal errors exist", ErrParse );
  }
  
  void outputHeader( char *name )
  {
      if( ClassNo >= CLASSFLAG_MAX ){
  	if( !SWITCH_COMPAT_I ){
  	    warningMessage( "Class accepted flag overflow.\"%s\"", name );
  	    CurClassNo = -1;
  	}
      } else {
  	if( !SWITCH_COMPAT_I ){
  	    fprintf( FPheader, "#define ACCEPT_%s 0x%08x\n",
  		    name, 1 << ClassNo );
  	}
  	CurClassNo = ClassNo++;
      }
  }
  
  char *chkNoInstantClass( void )
  {
      CLASS *class = ClassList;
  
      while( class != NULL ){
  	if( !class->branch ) return( class->name );
  	class = class->next;
      }
      return( NULL );
  }
  
  int yyerror( char *mes )
  {
      errorMessage(mes );
      ErrParse++;
      return( 0 );
  }
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/gram.y
  // =============================================================================
  %{

  #define YYSTYPE char *
  #define CLASS_NUM 100
  
  void appendNonTerm( char *name, int modeAssign );
  BODY *setNonTerm( void );
  CLASS *entryNonTerm( char *name, BODY *body, int modeAccpt, int start, int member, int tmp );
  void pushBody( CLASS *class, BODY *newbody );
  int unifyBody( char *name, BODY *body, BODY *newbody );
  char *getNewClassName( char *keyname );
  void outputHeader( char *name );
  char *chkNoInstantClass( void );

  static char HeadName[ SYMBOL_LEN ];
  static char BodyName[ CLASS_NUM ][ SYMBOL_LEN ];
  static int BodyNo = 0;
  static int ClassNo = 0;
  static int ModeAssignAccptFlag = 1;
  static int BlockReverseSw;
  static int ModeBlock = 0;
  static int CurClassNo = 0;
  static int StartFlag = 0;
  static FILE *FPheader;
  static int ErrParse = 0;
  static int GramModifyNum = 0;
  %}
  
  %token CTRL_ASSIGN
  %token CTRL_IGNORE
  %token OPEN
  %token CLOSE
  %token REVERSE
  %token STARTCLASS
  %token LET
  %token TAG
  %token SYMBOL
  %token REMARK
  %token NL
  
  %%
  src : statement | statement src;
  
  statement : block | single | contol | remark
  | error NL
  {
      yyerrok;
  };
  
  block : tag OPEN remark members CLOSE remark;
  
  tag : TAG
  {
      BlockReverseSw = 0;
      if( ModeAssignAccptFlag ) outputHeader( $1 );
  }
  | REVERSE TAG
  {
      BlockReverseSw = 1;
      if( !ModeAssignAccptFlag ) outputHeader( $2 );
  };
  
  members : member | member members;
  
  member : define
  {
      appendNonTerm( HeadName, ModeAssignAccptFlag ^ BlockReverseSw );
  }
  | head remark
  {
      entryNonTerm( HeadName, NULL, ModeAssignAccptFlag ^ BlockReverseSw, 0, 1, 0 ); /*$B6uEPO?(B*/
  }
  | remark;
  
  single : define
  {
      appendNonTerm( HeadName, ModeAssignAccptFlag );
  }
  | REVERSE define
  {
      appendNonTerm( HeadName, !ModeAssignAccptFlag );
  };
  
  define : head LET bodies remark;
  
  bodies : body | body bodies;
  
  head : SYMBOL
  {
      strcpy( HeadName, $1 );
  }
  | STARTCLASS SYMBOL
  {
      StartFlag = 1;
      strcpy( HeadName, $2 );
  };
  
  body : SYMBOL
  {
      strcpy( BodyName[ BodyNo++ ], $1 );
  };
  
  contol : CTRL_ASSIGN remark
  {
      ModeAssignAccptFlag = 1;
  }
  | CTRL_IGNORE
  {
      ModeAssignAccptFlag = 0;
  };
  
  remark : REMARK | NL;
  
  %%
  #include "lex.yy.c"
  void appendNonTerm( char *name, int modeAssign )
  {
      BODY *body;
  
      body = setNonTerm();
      entryNonTerm( name, body, modeAssign, StartFlag, ModeBlock, 0 );
      BodyNo = 0;
  }
  
  BODY *setNonTerm( void )
  {
      int i;
      BODY *body;
      BODY *top = NULL, *prev = NULL;
  
      for( i = 0; i < BodyNo; i++ ){
  	if( (body = malloc( sizeof(BODY) )) == NULL ){
  	    errorMessage( "Can't alloc nonterminal list buffer" );
  	}
  	strcpy( body->name, BodyName[ i ] );
  	body->abort = 0;
  	if( prev != NULL ){
  	    prev->next = body;
  	} else {
  	    top = body;
  	}
  	prev = body;   
      }
      body->next = NULL;
      return( top );
  }
  
  CLASS *entryNonTerm( char *name, BODY *body, int modeAccpt, int start, int member, int tmp )
  {
      CLASS *class;
  
      class = getClass( name );
      if( class != NULL ){
  	if( member ){
  	    errorMessage("Accepted flag of class \"%s\" is re-assigned", HeadName );
  	    ErrParse++;
  	}
      } else {
  	if( (class = malloc( sizeof(CLASS) )) == NULL ){
  	    errorMessage( "Can't alloc memory for Class Finite Automaton." );
  	}
  	strcpy( class->name, name );
  	if( modeAccpt ){
  	    if( member ){
  		class->no = CurClassNo;
  	    } else {
  		if( !tmp ){
  		    outputHeader( name );
  		    class->no = CurClassNo;
  		}
  	    }
  	} else {
  	    class->no = -1;
  	}
  	class->branch = 0;
  	class->usedFA = 0;
  	class->used = 1;	/* non-terminal does not appear in voca */
  	class->bodyList = NULL;
  	class->tmp = tmp;
  	class->next = NULL;
  	if( ClassListTail == NULL ){
  	    ClassList = class;
  	} else {
  	    ClassListTail->next = class;
  	}
  	ClassListTail = class;
      }
      if( body != NULL ) pushBody( class, body );
      if( start ){
  	StartFlag = 0;
  	if( StartSymbol == NULL ){
  	    StartSymbol = class;
  	} else {
  	    errorMessage("Start symbol is redifined as \"%s\"", class->name );
  	    ErrParse++;
  	}
      }
      return( class );
  }
  
  void pushBody( CLASS *class, BODY *newbody )
  {
      BODYLIST *bodyList = class->bodyList;
      BODYLIST *preBodyList = NULL;
      BODYLIST *newBodyList;
      BODY *body;
      int cmp;
      int defineNo = 1;
  
      while( bodyList != NULL ){
  	body = bodyList->body;
  	cmp = strcmp( body->name, newbody->name );
  	if( cmp > 0 ) break;
  	if( cmp == 0 ){
  	    if( unifyBody( class->name, body, newbody ) ){
  		warningMessage( "Class \"%s\" is defined as \"%s..\" again.", class->name, body->name );
  	    }
  	    return;
  	}
  	preBodyList = bodyList;
  	bodyList = bodyList->next;
  	defineNo++;
      }
      if( (newBodyList = malloc( sizeof(BODYLIST) )) == NULL ){
  	errorMessage( "Can't alloc class body buffer." );
      }
      newBodyList->body = newbody;
  
      if( preBodyList != NULL ){
  	preBodyList->next = newBodyList;
      } else {
  	class->bodyList = newBodyList;
      }
      newBodyList->next = bodyList;
      class->branch++;
  }
  
  int unifyBody( char *className, BODY *body, BODY *newbody )
  {
      BODY *bodyNext, *newbodyNext;
      char *newClassName;
      BODY *newBody;
      CLASS *class;
  
      bodyNext = body->next;
      newbodyNext = newbody->next;
      while( 1 ){
  	if( bodyNext == NULL && newbodyNext == NULL ){
  	    return( -1 );
  	}
  	if( newbodyNext == NULL ){
  	    if( body->abort ){
  		return( -1 );
  	    } else {
  		body->abort = 1;
  		return( 0 );
  	    }
  	}
  	if( bodyNext == NULL ){
  	    body->abort = 1;
  	    body->next = newbodyNext;
  	    return( 0 );
  	}
  	if( strcmp( bodyNext->name, newbodyNext->name ) ) break;
  	body = bodyNext;
  	newbody = newbodyNext;
  	bodyNext = body->next;
  	newbodyNext = newbody->next;
      }
      class = getClass( body->name );
      if( class != NULL && class->tmp ){
  	entryNonTerm( body->name, newbodyNext, 0, 0, 0, 1 );
      } else {
  	newClassName = getNewClassName( className );
  	entryNonTerm( newClassName, bodyNext, 0, 0, 0, 1 );
  	entryNonTerm( newClassName, newbodyNext, 0, 0, 0, 1 );
  	if( (newBody = malloc( sizeof(BODY) )) == NULL ){
  	    errorMessage( "Can't alloc body buffer of tmp class, \"%s\".", newClassName );
  	}
  	strcpy( newBody->name, newClassName );
  	newBody->abort = 0;
  	newBody->next = NULL;
  	body->next = newBody;
  	newbody->next = newBody;
      }
      return( 0 );
  }
  
  char *getNewClassName( char *keyname )
  {
      static char classname[ SYMBOL_LEN ];
      static int tmpClassNo = 0;
  
      sprintf( classname, "%s#%d", keyname , tmpClassNo++ );
      if( !SWITCH_SEMI_QUIET ){
  	fprintf( stderr, "\rNow modifying grammar to minimize states[%d]", GramModifyNum );
  	NO_NEW_LINE = 1;
      }
      GramModifyNum++;
      return( classname );
  }
  
  void setGram( void )
  {
      char *name;
  
      if( (yyin = fopen( GRAMMAR_FILE_NAME_LIST, "r" )) == NULL ){
  	errorMessage( "Can't open grammar file \"%s\"", GRAMMAR_FILE_NAME_LIST );
      }
      if( SWITCH_COMPAT_I ){
  	strcpy( HEADER_FILE_NAME_LIST, "/dev/null" );
      }
      if( (FPheader = fopen( HEADER_FILE_NAME_LIST, "w" )) == NULL ){
  	errorMessage( "Can't open Header File for writting\"%s\"", HEADER_FILE_NAME_LIST );
      }
      fprintf( FPheader,
  	    "/* Header of class reduction flag for finite automaton parser\n"
  	    "                    made with mkfa %s\n\n"
  	    "        Do logicalAND between label and FA's field #4,#5.\n"
  	    "*/\n\n", VERSION_NUMBER
  	    );
      if( !SWITCH_QUIET ) fputs( "Now parsing grammar file\n", stderr );
      yyparse();
      if( !SWITCH_QUIET ){
  	fprintf( stderr, "\rNow modifying grammar to minimize states[%d]\n", GramModifyNum - 1 );
  	NO_NEW_LINE = 0;
      }
      if( StartSymbol == NULL ) StartSymbol = ClassList;
      fprintf( FPheader, "/* Start Symbol: %s */\n", StartSymbol->name );
      fclose( FPheader );
      if( (name = chkNoInstantClass()) != NULL ){
  	errorMessage( "Prototype-declared Class \"%s\" has no instant definitions", name );
      }
      if( ErrParse ) errorMessage( "%d fatal errors exist", ErrParse );
  }
  
  void outputHeader( char *name )
  {
      if( ClassNo >= CLASSFLAG_MAX ){
  	if( !SWITCH_COMPAT_I ){
  	    warningMessage( "Class accepted flag overflow.\"%s\"", name );
  	    CurClassNo = -1;
  	}
      } else {
  	if( !SWITCH_COMPAT_I ){
  	    fprintf( FPheader, "#define ACCEPT_%s 0x%08x\n",
  		    name, 1 << ClassNo );
  	}
  	CurClassNo = ClassNo++;
      }
  }
  
  char *chkNoInstantClass( void )
  {
      CLASS *class = ClassList;
  
      while( class != NULL ){
  	if( !class->branch ) return( class->name );
  	class = class->next;
      }
      return( NULL );
  }
  
  int yyerror( char *mes )
  {
      errorMessage(mes );
      ErrParse++;
      return( 0 );
  }
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/lex.yy.c
  // =============================================================================
  
  
  /* A lexical scanner generated by flex */
  
  /* Scanner skeleton version:
   * $Header: /cvsroot/julius/julius4/gramtools/mkdfa/mkfa-1.44-flex/lex.yy.c,v 1.4 2011/04/29 05:09:13 sumomo Exp $
   */
  
  #define FLEX_SCANNER
  #define YY_FLEX_MAJOR_VERSION 2
  #define YY_FLEX_MINOR_VERSION 5
  
  #include <stdio.h>
  #include <errno.h>
  
  /* cfront 1.2 defines "c_plusplus" instead of "__cplusplus" */
  #ifdef c_plusplus
  #ifndef __cplusplus
  #define __cplusplus
  #endif
  #endif
  
  
  #ifdef __cplusplus
  
  #include <stdlib.h>
  #ifndef _WIN32
  #include <unistd.h>
  #else
  #ifndef YY_ALWAYS_INTERACTIVE
  #ifndef YY_NEVER_INTERACTIVE
  extern int isatty YY_PROTO(( int ));
  #endif
  #endif
  #endif
  
  /* Use prototypes in function declarations. */
  #define YY_USE_PROTOS
  
  /* The "const" storage-class-modifier is valid. */
  #define YY_USE_CONST
  
  #else	/* ! __cplusplus */
  
  #if __STDC__
  
  #define YY_USE_PROTOS
  #define YY_USE_CONST
  
  #endif	/* __STDC__ */
  #endif	/* ! __cplusplus */
  
  #ifdef __TURBOC__
   #pragma warn -rch
   #pragma warn -use
  #include <io.h>
  #include <stdlib.h>
  #define YY_USE_CONST
  #define YY_USE_PROTOS
  #endif
  
  #ifdef YY_USE_CONST
  #define yyconst const
  #else
  #define yyconst
  #endif
  
  
  #ifdef YY_USE_PROTOS
  #define YY_PROTO(proto) proto
  #else
  #define YY_PROTO(proto) ()
  #endif
  
  /* Returned upon end-of-file. */
  #define YY_NULL 0
  
  /* Promotes a possibly negative, possibly signed char to an unsigned
   * integer for use as an array index.  If the signed char is negative,
   * we want to instead treat it as an 8-bit unsigned char, hence the
   * double cast.
   */
  #define YY_SC_TO_UI(c) ((unsigned int) (unsigned char) c)
  
  /* Enter a start condition.  This macro really ought to take a parameter,
   * but we do it the disgusting crufty way forced on us by the ()-less
   * definition of BEGIN.
   */
  #define BEGIN yy_start = 1 + 2 *
  
  /* Translate the current start state into a value that can be later handed
   * to BEGIN to return to the state.  The YYSTATE alias is for lex
   * compatibility.
   */
  #define YY_START ((yy_start - 1) / 2)
  #define YYSTATE YY_START
  
  /* Action number for EOF rule of a given start state. */
  #define YY_STATE_EOF(state) (YY_END_OF_BUFFER + state + 1)
  
  /* Special action meaning "start processing a new file". */
  #define YY_NEW_FILE yyrestart( yyin )
  
  #define YY_END_OF_BUFFER_CHAR 0
  
  /* Size of default input buffer. */
  #define YY_BUF_SIZE 16384
  
  typedef struct yy_buffer_state *YY_BUFFER_STATE;
  
  extern int yyleng;
  extern FILE *yyin, *yyout;
  
  #define EOB_ACT_CONTINUE_SCAN 0
  #define EOB_ACT_END_OF_FILE 1
  #define EOB_ACT_LAST_MATCH 2
  
  /* The funky do-while in the following #define is used to turn the definition
   * int a single C statement (which needs a semi-colon terminator).  This
   * avoids problems with code like:
   *
   * 	if ( condition_holds )
   *		yyless( 5 );
   *	else
   *		do_something_else();
   *
   * Prior to using the do-while the compiler would get upset at the
   * "else" because it interpreted the "if" statement as being all
   * done when it reached the ';' after the yyless() call.
   */
  
  /* Return all but the first 'n' matched characters back to the input stream. */
  
  #define yyless(n) \
  	do \
  		{ \
  		/* Undo effects of setting up yytext. */ \
  		*yy_cp = yy_hold_char; \
  		YY_RESTORE_YY_MORE_OFFSET \
  		yy_c_buf_p = yy_cp = yy_bp + n - YY_MORE_ADJ; \
  		YY_DO_BEFORE_ACTION; /* set up yytext again */ \
  		} \
  	while ( 0 )
  
  #define unput(c) yyunput( c, yytext_ptr )
  
  /* The following is because we cannot portably get our hands on size_t
   * (without autoconf's help, which isn't available because we want
   * flex-generated scanners to compile on their own).
   */
  typedef unsigned int yy_size_t;
  
  
  struct yy_buffer_state
  	{
  	FILE *yy_input_file;
  
  	char *yy_ch_buf;		/* input buffer */
  	char *yy_buf_pos;		/* current position in input buffer */
  
  	/* Size of input buffer in bytes, not including room for EOB
  	 * characters.
  	 */
  	yy_size_t yy_buf_size;
  
  	/* Number of characters read into yy_ch_buf, not including EOB
  	 * characters.
  	 */
  	int yy_n_chars;
  
  	/* Whether we "own" the buffer - i.e., we know we created it,
  	 * and can realloc() it to grow it, and should free() it to
  	 * delete it.
  	 */
  	int yy_is_our_buffer;
  
  	/* Whether this is an "interactive" input source; if so, and
  	 * if we're using stdio for input, then we want to use getc()
  	 * instead of fread(), to make sure we stop fetching input after
  	 * each newline.
  	 */
  	int yy_is_interactive;
  
  	/* Whether we're considered to be at the beginning of a line.
  	 * If so, '^' rules will be active on the next match, otherwise
  	 * not.
  	 */
  	int yy_at_bol;
  
  	/* Whether to try to fill the input buffer when we reach the
  	 * end of it.
  	 */
  	int yy_fill_buffer;
  
  	int yy_buffer_status;
  #define YY_BUFFER_NEW 0
  #define YY_BUFFER_NORMAL 1
  	/* When an EOF's been seen but there's still some text to process
  	 * then we mark the buffer as YY_EOF_PENDING, to indicate that we
  	 * shouldn't try reading from the input source any more.  We might
  	 * still have a bunch of tokens to match, though, because of
  	 * possible backing-up.
  	 *
  	 * When we actually see the EOF, we change the status to "new"
  	 * (via yyrestart()), so that the user can continue scanning by
  	 * just pointing yyin at a new input file.
  	 */
  #define YY_BUFFER_EOF_PENDING 2
  	};
  
  static YY_BUFFER_STATE yy_current_buffer = 0;
  
  /* We provide macros for accessing buffer states in case in the
   * future we want to put the buffer states in a more general
   * "scanner state".
   */
  #define YY_CURRENT_BUFFER yy_current_buffer
  
  
  /* yy_hold_char holds the character lost when yytext is formed. */
  static char yy_hold_char;
  
  static int yy_n_chars;		/* number of characters read into yy_ch_buf */
  
  
  int yyleng;
  
  /* Points to current character in buffer. */
  static char *yy_c_buf_p = (char *) 0;
  static int yy_init = 1;		/* whether we need to initialize */
  static int yy_start = 0;	/* start state number */
  
  /* Flag which is used to allow yywrap()'s to do buffer switches
   * instead of setting up a fresh yyin.  A bit of a hack ...
   */
  static int yy_did_buffer_switch_on_eof;
  
  void yyrestart YY_PROTO(( FILE *input_file ));
  
  void yy_switch_to_buffer YY_PROTO(( YY_BUFFER_STATE new_buffer ));
  void yy_load_buffer_state YY_PROTO(( void ));
  YY_BUFFER_STATE yy_create_buffer YY_PROTO(( FILE *file, int size ));
  void yy_delete_buffer YY_PROTO(( YY_BUFFER_STATE b ));
  void yy_init_buffer YY_PROTO(( YY_BUFFER_STATE b, FILE *file ));
  void yy_flush_buffer YY_PROTO(( YY_BUFFER_STATE b ));
  #define YY_FLUSH_BUFFER yy_flush_buffer( yy_current_buffer )
  
  YY_BUFFER_STATE yy_scan_buffer YY_PROTO(( char *base, yy_size_t size ));
  YY_BUFFER_STATE yy_scan_string YY_PROTO(( yyconst char *yy_str ));
  YY_BUFFER_STATE yy_scan_bytes YY_PROTO(( yyconst char *bytes, int len ));
  
  static void *yy_flex_alloc YY_PROTO(( yy_size_t ));
  static void *yy_flex_realloc YY_PROTO(( void *, yy_size_t ));
  static void yy_flex_free YY_PROTO(( void * ));
  
  #define yy_new_buffer yy_create_buffer
  
  #define yy_set_interactive(is_interactive) \
  	{ \
  	if ( ! yy_current_buffer ) \
  		yy_current_buffer = yy_create_buffer( yyin, YY_BUF_SIZE ); \
  	yy_current_buffer->yy_is_interactive = is_interactive; \
  	}
  
  #define yy_set_bol(at_bol) \
  	{ \
  	if ( ! yy_current_buffer ) \
  		yy_current_buffer = yy_create_buffer( yyin, YY_BUF_SIZE ); \
  	yy_current_buffer->yy_at_bol = at_bol; \
  	}
  
  #define YY_AT_BOL() (yy_current_buffer->yy_at_bol)
  
  typedef unsigned char YY_CHAR;
  FILE *yyin = (FILE *) 0, *yyout = (FILE *) 0;
  typedef int yy_state_type;
  extern char *yytext;
  #define yytext_ptr yytext
  
  static yy_state_type yy_get_previous_state YY_PROTO(( void ));
  static yy_state_type yy_try_NUL_trans YY_PROTO(( yy_state_type current_state ));
  static int yy_get_next_buffer YY_PROTO(( void ));
  static void yy_fatal_error YY_PROTO(( yyconst char msg[] ));
  
  /* Done after the current pattern has been matched and before the
   * corresponding action - sets up yytext.
   */
  #define YY_DO_BEFORE_ACTION \
  	yytext_ptr = yy_bp; \
  	yyleng = (int) (yy_cp - yy_bp); \
  	yy_hold_char = *yy_cp; \
  	*yy_cp = '\0'; \
  	yy_c_buf_p = yy_cp;
  
  #define YY_NUM_RULES 14
  #define YY_END_OF_BUFFER 15
  static yyconst short int yy_accept[33] =
      {   0,
          0,    0,   15,   13,   12,   10,    7,   13,   13,    8,
          2,    9,   13,    3,    4,    0,   11,    0,    0,    2,
          1,    0,    0,    0,    0,    0,    0,    0,    0,    5,
          6,    0
      } ;
  
  static yyconst int yy_ec[256] =
      {   0,
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
      } ;
  
  static yyconst int yy_meta[21] =
      {   0,
          1,    1,    1,    1,    1,    1,    1,    2,    1,    1,
          2,    2,    2,    2,    2,    2,    2,    2,    1,    1
      } ;
  
  static yyconst short int yy_base[36] =
      {   0,
          0,    0,   39,   40,   40,   40,   40,   35,   10,   40,
          0,   40,    0,   40,   40,   34,   40,   18,   22,    0,
          0,   16,   18,   18,   15,   17,   12,   13,   15,   40,
         40,   40,   24,   21,   20
      } ;
  
  static yyconst short int yy_def[36] =
      {   0,
         32,    1,   32,   32,   32,   32,   32,   33,   32,   32,
         34,   32,   35,   32,   32,   33,   32,   32,   32,   34,
         35,   32,   32,   32,   32,   32,   32,   32,   32,   32,
         32,    0,   32,   32,   32
      } ;
  
  static yyconst short int yy_nxt[61] =
      {   0,
          4,    5,    6,    7,    8,    9,   10,   11,   12,   13,
         11,   11,   11,   11,   11,   11,   11,   11,   14,   15,
         18,   21,   20,   19,   16,   16,   31,   30,   29,   28,
         27,   26,   25,   24,   23,   22,   17,   17,   32,    3,
         32,   32,   32,   32,   32,   32,   32,   32,   32,   32,
         32,   32,   32,   32,   32,   32,   32,   32,   32,   32
      } ;
  
  static yyconst short int yy_chk[61] =
      {   0,
          1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
          1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
          9,   35,   34,    9,   33,   33,   29,   28,   27,   26,
         25,   24,   23,   22,   19,   18,   16,    8,    3,   32,
         32,   32,   32,   32,   32,   32,   32,   32,   32,   32,
         32,   32,   32,   32,   32,   32,   32,   32,   32,   32
      } ;
  
  static yy_state_type yy_last_accepting_state;
  static char *yy_last_accepting_cpos;
  
  /* The intent behind this definition is that it'll catch
   * any uses of REJECT which flex missed.
   */
  #define REJECT reject_used_but_not_detected
  #define yymore() yymore_used_but_not_detected
  #define YY_MORE_ADJ 0
  #define YY_RESTORE_YY_MORE_OFFSET
  char *yytext;
  #line 1 "gram.l"
  #define INITIAL 0
  #line 391 "lex.yy.c"
  
  /* Macros after this point can all be overridden by user definitions in
   * section 1.
   */
  
  #ifndef YY_SKIP_YYWRAP
  #ifdef __cplusplus
  extern "C" int yywrap YY_PROTO(( void ));
  #else
  extern int yywrap YY_PROTO(( void ));
  #endif
  #endif
  
  #ifndef YY_NO_UNPUT
  static void yyunput YY_PROTO(( int c, char *buf_ptr ));
  #endif
  
  #ifndef yytext_ptr
  static void yy_flex_strncpy YY_PROTO(( char *, yyconst char *, int ));
  #endif
  
  #ifdef YY_NEED_STRLEN
  static int yy_flex_strlen YY_PROTO(( yyconst char * ));
  #endif
  
  #ifndef YY_NO_INPUT
  #ifdef __cplusplus
  static int yyinput YY_PROTO(( void ));
  #else
  static int input YY_PROTO(( void ));
  #endif
  #endif
  
  #if YY_STACK_USED
  static int yy_start_stack_ptr = 0;
  static int yy_start_stack_depth = 0;
  static int *yy_start_stack = 0;
  #ifndef YY_NO_PUSH_STATE
  static void yy_push_state YY_PROTO(( int new_state ));
  #endif
  #ifndef YY_NO_POP_STATE
  static void yy_pop_state YY_PROTO(( void ));
  #endif
  #ifndef YY_NO_TOP_STATE
  static int yy_top_state YY_PROTO(( void ));
  #endif
  
  #else
  #define YY_NO_PUSH_STATE 1
  #define YY_NO_POP_STATE 1
  #define YY_NO_TOP_STATE 1
  #endif
  
  #ifdef YY_MALLOC_DECL
  YY_MALLOC_DECL
  #else
  #if __STDC__
  #ifndef __cplusplus
  #include <stdlib.h>
  #endif
  #else
  /* Just try to get by without declaring the routines.  This will fail
   * miserably on non-ANSI systems for which sizeof(size_t) != sizeof(int)
   * or sizeof(void*) != sizeof(int).
   */
  #endif
  #endif
  
  /* Amount of stuff to slurp up with each read. */
  #ifndef YY_READ_BUF_SIZE
  #define YY_READ_BUF_SIZE 8192
  #endif
  
  /* Copy whatever the last rule matched to the standard output. */
  
  #ifndef ECHO
  /* This used to be an fputs(), but since the string might contain NUL's,
   * we now use fwrite().
   */
  #define ECHO (void) fwrite( yytext, yyleng, 1, yyout )
  #endif
  
  /* Gets input and stuffs it into "buf".  number of characters read, or YY_NULL,
   * is returned in "result".
   */
  #ifndef YY_INPUT
  #define YY_INPUT(buf,result,max_size) \
  	if ( yy_current_buffer->yy_is_interactive ) \
  		{ \
  		int c = '*', n; \
  		for ( n = 0; n < max_size && \
  			     (c = getc( yyin )) != EOF && c != '\n'; ++n ) \
  			buf[n] = (char) c; \
  		if ( c == '\n' ) { \
  			if (n >= 1 && buf[n-1] == '\r') { \
  				buf[n-1] = (char) c; \
  			} else { \
  				buf[n++] = (char) c; \
  			} \
  		} \
  		if ( c == EOF && ferror( yyin ) ) \
  			YY_FATAL_ERROR( "input in flex scanner failed" ); \
  		result = n; \
  		} \
  	else \
  		{ \
  		errno=0; \
  		while ( (result = fread(buf, 1, max_size, yyin))==0 && ferror(yyin)) \
  			{ \
  			if( errno != EINTR) \
  				{ \
  				YY_FATAL_ERROR( "input in flex scanner failed" ); \
  				break; \
  				} \
  			errno=0; \
  			clearerr(yyin); \
  			} \
  		int n; \
  		for(n = 0; n < result; n++) { \
  		  if (buf[n] == '\n') { \
  		    if (n >= 1 && buf[n-1] == '\r') { \
  			buf[n-1] = '\n'; \
  		    } \
  		  } \
  		} \
                  }
  
  #endif
  
  /* No semi-colon after return; correct usage is to write "yyterminate();" -
   * we don't want an extra ';' after the "return" because that will cause
   * some compilers to complain about unreachable statements.
   */
  #ifndef yyterminate
  #define yyterminate() return YY_NULL
  #endif
  
  /* Number of entries by which start-condition stack grows. */
  #ifndef YY_START_STACK_INCR
  #define YY_START_STACK_INCR 25
  #endif
  
  /* Report a fatal error. */
  #ifndef YY_FATAL_ERROR
  #define YY_FATAL_ERROR(msg) yy_fatal_error( msg )
  #endif
  
  /* Default declaration of generated scanner - a define so the user can
   * easily add parameters.
   */
  #ifndef YY_DECL
  #define YY_DECL int yylex YY_PROTO(( void ))
  #endif
  
  /* Code executed at the beginning of each rule, after yytext and yyleng
   * have been set up.
   */
  #ifndef YY_USER_ACTION
  #define YY_USER_ACTION
  #endif
  
  /* Code executed at the end of each rule. */
  #ifndef YY_BREAK
  #define YY_BREAK break;
  #endif
  
  #define YY_RULE_SETUP \
  	YY_USER_ACTION
  
  YY_DECL
  	{
  	register yy_state_type yy_current_state;
  	register char *yy_cp, *yy_bp;
  	register int yy_act;
  
  #line 1 "gram.l"
  
  #line 555 "lex.yy.c"
  
  	if ( yy_init )
  		{
  		yy_init = 0;
  
  #ifdef YY_USER_INIT
  		YY_USER_INIT;
  #endif
  
  		if ( ! yy_start )
  			yy_start = 1;	/* first start state */
  
  		if ( ! yyin )
  			yyin = stdin;
  
  		if ( ! yyout )
  			yyout = stdout;
  
  		if ( ! yy_current_buffer )
  			yy_current_buffer =
  				yy_create_buffer( yyin, YY_BUF_SIZE );
  
  		yy_load_buffer_state();
  		}
  
  	while ( 1 )		/* loops until end-of-file is reached */
  		{
  		yy_cp = yy_c_buf_p;
  
  		/* Support of yytext. */
  		*yy_cp = yy_hold_char;
  
  		/* yy_bp points to the position in yy_ch_buf of the start of
  		 * the current run.
  		 */
  		yy_bp = yy_cp;
  
  		yy_current_state = yy_start;
  yy_match:
  		do
  			{
  			register YY_CHAR yy_c = yy_ec[YY_SC_TO_UI(*yy_cp)];
  			if ( yy_accept[yy_current_state] )
  				{
  				yy_last_accepting_state = yy_current_state;
  				yy_last_accepting_cpos = yy_cp;
  				}
  			while ( yy_chk[yy_base[yy_current_state] + yy_c] != yy_current_state )
  				{
  				yy_current_state = (int) yy_def[yy_current_state];
  				if ( yy_current_state >= 33 )
  					yy_c = yy_meta[(unsigned int) yy_c];
  				}
  			yy_current_state = yy_nxt[yy_base[yy_current_state] + (unsigned int) yy_c];
  			++yy_cp;
  			}
  		while ( yy_base[yy_current_state] != 40 );
  
  yy_find_action:
  		yy_act = yy_accept[yy_current_state];
  		if ( yy_act == 0 )
  			{ /* have to back up */
  			yy_cp = yy_last_accepting_cpos;
  			yy_current_state = yy_last_accepting_state;
  			yy_act = yy_accept[yy_current_state];
  			}
  
  		YY_DO_BEFORE_ACTION;
  
  
  do_action:	/* This label is used only to access EOF actions. */
  
  
  		switch ( yy_act )
  	{ /* beginning of action switch */
  			case 0: /* must back up */
  			/* undo the effects of YY_DO_BEFORE_ACTION */
  			*yy_cp = yy_hold_char;
  			yy_cp = yy_last_accepting_cpos;
  			yy_current_state = yy_last_accepting_state;
  			goto yy_find_action;
  
  case 1:
  YY_RULE_SETUP
  #line 2 "gram.l"
  {
  		yylval = yytext + 1;
  		return( TAG );
  }
  	YY_BREAK
  case 2:
  YY_RULE_SETUP
  #line 7 "gram.l"
  {
  		yylval = yytext;
  		return( SYMBOL );
  }
  	YY_BREAK
  case 3:
  YY_RULE_SETUP
  #line 12 "gram.l"
  {
  		ModeBlock = 1;
  		return( OPEN );
  }
  	YY_BREAK
  case 4:
  YY_RULE_SETUP
  #line 17 "gram.l"
  {
  		ModeBlock = 0;
  		return( CLOSE );
  }
  	YY_BREAK
  case 5:
  YY_RULE_SETUP
  #line 22 "gram.l"
  return( CTRL_ASSIGN );
  	YY_BREAK
  case 6:
  YY_RULE_SETUP
  #line 23 "gram.l"
  return( CTRL_IGNORE );
  	YY_BREAK
  case 7:
  YY_RULE_SETUP
  #line 24 "gram.l"
  return( REVERSE );
  	YY_BREAK
  case 8:
  YY_RULE_SETUP
  #line 25 "gram.l"
  return( STARTCLASS );
  	YY_BREAK
  case 9:
  YY_RULE_SETUP
  #line 26 "gram.l"
  return( LET );
  	YY_BREAK
  case 10:
  YY_RULE_SETUP
  #line 27 "gram.l"
  return( NL );
  	YY_BREAK
  case 11:
  YY_RULE_SETUP
  #line 28 "gram.l"
  return( REMARK );
  	YY_BREAK
  case 12:
  YY_RULE_SETUP
  #line 29 "gram.l"
  {};
  	YY_BREAK
  case 13:
  YY_RULE_SETUP
  #line 31 "gram.l"
  {
  	errorMessage("Lexical mistake \"%s\"", yytext );
  	exit( 1 );
  }
  	YY_BREAK
  case 14:
  YY_RULE_SETUP
  #line 35 "gram.l"
  ECHO;
  	YY_BREAK
  #line 723 "lex.yy.c"
  case YY_STATE_EOF(INITIAL):
  	yyterminate();
  
  	case YY_END_OF_BUFFER:
  		{
  		/* Amount of text matched not including the EOB char. */
  		int yy_amount_of_matched_text = (int) (yy_cp - yytext_ptr) - 1;
  
  		/* Undo the effects of YY_DO_BEFORE_ACTION. */
  		*yy_cp = yy_hold_char;
  		YY_RESTORE_YY_MORE_OFFSET
  
  		if ( yy_current_buffer->yy_buffer_status == YY_BUFFER_NEW )
  			{
  			/* We're scanning a new file or input source.  It's
  			 * possible that this happened because the user
  			 * just pointed yyin at a new source and called
  			 * yylex().  If so, then we have to assure
  			 * consistency between yy_current_buffer and our
  			 * globals.  Here is the right place to do so, because
  			 * this is the first action (other than possibly a
  			 * back-up) that will match for the new input source.
  			 */
  			yy_n_chars = yy_current_buffer->yy_n_chars;
  			yy_current_buffer->yy_input_file = yyin;
  			yy_current_buffer->yy_buffer_status = YY_BUFFER_NORMAL;
  			}
  
  		/* Note that here we test for yy_c_buf_p "<=" to the position
  		 * of the first EOB in the buffer, since yy_c_buf_p will
  		 * already have been incremented past the NUL character
  		 * (since all states make transitions on EOB to the
  		 * end-of-buffer state).  Contrast this with the test
  		 * in input().
  		 */
  		if ( yy_c_buf_p <= &yy_current_buffer->yy_ch_buf[yy_n_chars] )
  			{ /* This was really a NUL. */
  			yy_state_type yy_next_state;
  
  			yy_c_buf_p = yytext_ptr + yy_amount_of_matched_text;
  
  			yy_current_state = yy_get_previous_state();
  
  			/* Okay, we're now positioned to make the NUL
  			 * transition.  We couldn't have
  			 * yy_get_previous_state() go ahead and do it
  			 * for us because it doesn't know how to deal
  			 * with the possibility of jamming (and we don't
  			 * want to build jamming into it because then it
  			 * will run more slowly).
  			 */
  
  			yy_next_state = yy_try_NUL_trans( yy_current_state );
  
  			yy_bp = yytext_ptr + YY_MORE_ADJ;
  
  			if ( yy_next_state )
  				{
  				/* Consume the NUL. */
  				yy_cp = ++yy_c_buf_p;
  				yy_current_state = yy_next_state;
  				goto yy_match;
  				}
  
  			else
  				{
  				yy_cp = yy_c_buf_p;
  				goto yy_find_action;
  				}
  			}
  
  		else switch ( yy_get_next_buffer() )
  			{
  			case EOB_ACT_END_OF_FILE:
  				{
  				yy_did_buffer_switch_on_eof = 0;
  
  				if ( yywrap() )
  					{
  					/* Note: because we've taken care in
  					 * yy_get_next_buffer() to have set up
  					 * yytext, we can now set up
  					 * yy_c_buf_p so that if some total
  					 * hoser (like flex itself) wants to
  					 * call the scanner after we return the
  					 * YY_NULL, it'll still work - another
  					 * YY_NULL will get returned.
  					 */
  					yy_c_buf_p = yytext_ptr + YY_MORE_ADJ;
  
  					yy_act = YY_STATE_EOF(YY_START);
  					goto do_action;
  					}
  
  				else
  					{
  					if ( ! yy_did_buffer_switch_on_eof )
  						YY_NEW_FILE;
  					}
  				break;
  				}
  
  			case EOB_ACT_CONTINUE_SCAN:
  				yy_c_buf_p =
  					yytext_ptr + yy_amount_of_matched_text;
  
  				yy_current_state = yy_get_previous_state();
  
  				yy_cp = yy_c_buf_p;
  				yy_bp = yytext_ptr + YY_MORE_ADJ;
  				goto yy_match;
  
  			case EOB_ACT_LAST_MATCH:
  				yy_c_buf_p =
  				&yy_current_buffer->yy_ch_buf[yy_n_chars];
  
  				yy_current_state = yy_get_previous_state();
  
  				yy_cp = yy_c_buf_p;
  				yy_bp = yytext_ptr + YY_MORE_ADJ;
  				goto yy_find_action;
  			}
  		break;
  		}
  
  	default:
  		YY_FATAL_ERROR(
  			"fatal flex scanner internal error--no action found" );
  	} /* end of action switch */
  		} /* end of scanning one token */
  	} /* end of yylex */
  
  
  /* yy_get_next_buffer - try to read in a new buffer
   *
   * Returns a code representing an action:
   *	EOB_ACT_LAST_MATCH -
   *	EOB_ACT_CONTINUE_SCAN - continue scanning from current position
   *	EOB_ACT_END_OF_FILE - end of file
   */
  
  static int yy_get_next_buffer()
  	{
  	register char *dest = yy_current_buffer->yy_ch_buf;
  	register char *source = yytext_ptr;
  	register int number_to_move, i;
  	int ret_val;
  
  	if ( yy_c_buf_p > &yy_current_buffer->yy_ch_buf[yy_n_chars + 1] )
  		YY_FATAL_ERROR(
  		"fatal flex scanner internal error--end of buffer missed" );
  
  	if ( yy_current_buffer->yy_fill_buffer == 0 )
  		{ /* Don't try to fill the buffer, so this is an EOF. */
  		if ( yy_c_buf_p - yytext_ptr - YY_MORE_ADJ == 1 )
  			{
  			/* We matched a single character, the EOB, so
  			 * treat this as a final EOF.
  			 */
  			return EOB_ACT_END_OF_FILE;
  			}
  
  		else
  			{
  			/* We matched some text prior to the EOB, first
  			 * process it.
  			 */
  			return EOB_ACT_LAST_MATCH;
  			}
  		}
  
  	/* Try to read more data. */
  
  	/* First move last chars to start of buffer. */
  	number_to_move = (int) (yy_c_buf_p - yytext_ptr) - 1;
  
  	for ( i = 0; i < number_to_move; ++i )
  		*(dest++) = *(source++);
  
  	if ( yy_current_buffer->yy_buffer_status == YY_BUFFER_EOF_PENDING )
  		/* don't do the read, it's not guaranteed to return an EOF,
  		 * just force an EOF
  		 */
  		yy_current_buffer->yy_n_chars = yy_n_chars = 0;
  
  	else
  		{
  		int num_to_read =
  			yy_current_buffer->yy_buf_size - number_to_move - 1;
  
  		while ( num_to_read <= 0 )
  			{ /* Not enough room in the buffer - grow it. */
  #ifdef YY_USES_REJECT
  			YY_FATAL_ERROR(
  "input buffer overflow, can't enlarge buffer because scanner uses REJECT" );
  #else
  
  			/* just a shorter name for the current buffer */
  			YY_BUFFER_STATE b = yy_current_buffer;
  
  			int yy_c_buf_p_offset =
  				(int) (yy_c_buf_p - b->yy_ch_buf);
  
  			if ( b->yy_is_our_buffer )
  				{
  				int new_size = b->yy_buf_size * 2;
  
  				if ( new_size <= 0 )
  					b->yy_buf_size += b->yy_buf_size / 8;
  				else
  					b->yy_buf_size *= 2;
  
  				b->yy_ch_buf = (char *)
  					/* Include room in for 2 EOB chars. */
  					yy_flex_realloc( (void *) b->yy_ch_buf,
  							 b->yy_buf_size + 2 );
  				}
  			else
  				/* Can't grow it, we don't own it. */
  				b->yy_ch_buf = 0;
  
  			if ( ! b->yy_ch_buf )
  				YY_FATAL_ERROR(
  				"fatal error - scanner input buffer overflow" );
  
  			yy_c_buf_p = &b->yy_ch_buf[yy_c_buf_p_offset];
  
  			num_to_read = yy_current_buffer->yy_buf_size -
  						number_to_move - 1;
  #endif
  			}
  
  		if ( num_to_read > YY_READ_BUF_SIZE )
  			num_to_read = YY_READ_BUF_SIZE;
  
  		/* Read in more data. */
  		YY_INPUT( (&yy_current_buffer->yy_ch_buf[number_to_move]),
  			yy_n_chars, num_to_read );
  
  		yy_current_buffer->yy_n_chars = yy_n_chars;
  		}
  
  	if ( yy_n_chars == 0 )
  		{
  		if ( number_to_move == YY_MORE_ADJ )
  			{
  			ret_val = EOB_ACT_END_OF_FILE;
  			yyrestart( yyin );
  			}
  
  		else
  			{
  			ret_val = EOB_ACT_LAST_MATCH;
  			yy_current_buffer->yy_buffer_status =
  				YY_BUFFER_EOF_PENDING;
  			}
  		}
  
  	else
  		ret_val = EOB_ACT_CONTINUE_SCAN;
  
  	yy_n_chars += number_to_move;
  	yy_current_buffer->yy_ch_buf[yy_n_chars] = YY_END_OF_BUFFER_CHAR;
  	yy_current_buffer->yy_ch_buf[yy_n_chars + 1] = YY_END_OF_BUFFER_CHAR;
  
  	yytext_ptr = &yy_current_buffer->yy_ch_buf[0];
  
  	return ret_val;
  	}
  
  
  /* yy_get_previous_state - get the state just before the EOB char was reached */
  
  static yy_state_type yy_get_previous_state()
  	{
  	register yy_state_type yy_current_state;
  	register char *yy_cp;
  
  	yy_current_state = yy_start;
  
  	for ( yy_cp = yytext_ptr + YY_MORE_ADJ; yy_cp < yy_c_buf_p; ++yy_cp )
  		{
  		register YY_CHAR yy_c = (*yy_cp ? yy_ec[YY_SC_TO_UI(*yy_cp)] : 1);
  		if ( yy_accept[yy_current_state] )
  			{
  			yy_last_accepting_state = yy_current_state;
  			yy_last_accepting_cpos = yy_cp;
  			}
  		while ( yy_chk[yy_base[yy_current_state] + yy_c] != yy_current_state )
  			{
  			yy_current_state = (int) yy_def[yy_current_state];
  			if ( yy_current_state >= 33 )
  				yy_c = yy_meta[(unsigned int) yy_c];
  			}
  		yy_current_state = yy_nxt[yy_base[yy_current_state] + (unsigned int) yy_c];
  		}
  
  	return yy_current_state;
  	}
  
  
  /* yy_try_NUL_trans - try to make a transition on the NUL character
   *
   * synopsis
   *	next_state = yy_try_NUL_trans( current_state );
   */
  
  #ifdef YY_USE_PROTOS
  static yy_state_type yy_try_NUL_trans( yy_state_type yy_current_state )
  #else
  static yy_state_type yy_try_NUL_trans( yy_current_state )
  yy_state_type yy_current_state;
  #endif
  	{
  	register int yy_is_jam;
  	register char *yy_cp = yy_c_buf_p;
  
  	register YY_CHAR yy_c = 1;
  	if ( yy_accept[yy_current_state] )
  		{
  		yy_last_accepting_state = yy_current_state;
  		yy_last_accepting_cpos = yy_cp;
  		}
  	while ( yy_chk[yy_base[yy_current_state] + yy_c] != yy_current_state )
  		{
  		yy_current_state = (int) yy_def[yy_current_state];
  		if ( yy_current_state >= 33 )
  			yy_c = yy_meta[(unsigned int) yy_c];
  		}
  	yy_current_state = yy_nxt[yy_base[yy_current_state] + (unsigned int) yy_c];
  	yy_is_jam = (yy_current_state == 32);
  
  	return yy_is_jam ? 0 : yy_current_state;
  	}
  
  
  #ifndef YY_NO_UNPUT
  #ifdef YY_USE_PROTOS
  static void yyunput( int c, register char *yy_bp )
  #else
  static void yyunput( c, yy_bp )
  int c;
  register char *yy_bp;
  #endif
  	{
  	register char *yy_cp = yy_c_buf_p;
  
  	/* undo effects of setting up yytext */
  	*yy_cp = yy_hold_char;
  
  	if ( yy_cp < yy_current_buffer->yy_ch_buf + 2 )
  		{ /* need to shift things up to make room */
  		/* +2 for EOB chars. */
  		register int number_to_move = yy_n_chars + 2;
  		register char *dest = &yy_current_buffer->yy_ch_buf[
  					yy_current_buffer->yy_buf_size + 2];
  		register char *source =
  				&yy_current_buffer->yy_ch_buf[number_to_move];
  
  		while ( source > yy_current_buffer->yy_ch_buf )
  			*--dest = *--source;
  
  		yy_cp += (int) (dest - source);
  		yy_bp += (int) (dest - source);
  		yy_current_buffer->yy_n_chars =
  			yy_n_chars = yy_current_buffer->yy_buf_size;
  
  		if ( yy_cp < yy_current_buffer->yy_ch_buf + 2 )
  			YY_FATAL_ERROR( "flex scanner push-back overflow" );
  		}
  
  	*--yy_cp = (char) c;
  
  
  	yytext_ptr = yy_bp;
  	yy_hold_char = *yy_cp;
  	yy_c_buf_p = yy_cp;
  	}
  #endif	/* ifndef YY_NO_UNPUT */
  
  
  #ifdef __cplusplus
  static int yyinput()
  #else
  static int input()
  #endif
  	{
  	int c;
  
  	*yy_c_buf_p = yy_hold_char;
  
  	if ( *yy_c_buf_p == YY_END_OF_BUFFER_CHAR )
  		{
  		/* yy_c_buf_p now points to the character we want to return.
  		 * If this occurs *before* the EOB characters, then it's a
  		 * valid NUL; if not, then we've hit the end of the buffer.
  		 */
  		if ( yy_c_buf_p < &yy_current_buffer->yy_ch_buf[yy_n_chars] )
  			/* This was really a NUL. */
  			*yy_c_buf_p = '\0';
  
  		else
  			{ /* need more input */
  			int offset = yy_c_buf_p - yytext_ptr;
  			++yy_c_buf_p;
  
  			switch ( yy_get_next_buffer() )
  				{
  				case EOB_ACT_LAST_MATCH:
  					/* This happens because yy_g_n_b()
  					 * sees that we've accumulated a
  					 * token and flags that we need to
  					 * try matching the token before
  					 * proceeding.  But for input(),
  					 * there's no matching to consider.
  					 * So convert the EOB_ACT_LAST_MATCH
  					 * to EOB_ACT_END_OF_FILE.
  					 */
  
  					/* Reset buffer status. */
  					yyrestart( yyin );
  
  					/* fall through */
  
  				case EOB_ACT_END_OF_FILE:
  					{
  					if ( yywrap() )
  						return EOF;
  
  					if ( ! yy_did_buffer_switch_on_eof )
  						YY_NEW_FILE;
  #ifdef __cplusplus
  					return yyinput();
  #else
  					return input();
  #endif
  					}
  
  				case EOB_ACT_CONTINUE_SCAN:
  					yy_c_buf_p = yytext_ptr + offset;
  					break;
  				}
  			}
  		}
  
  	c = *(unsigned char *) yy_c_buf_p;	/* cast for 8-bit char's */
  	*yy_c_buf_p = '\0';	/* preserve yytext */
  	yy_hold_char = *++yy_c_buf_p;
  
  
  	return c;
  	}
  
  
  #ifdef YY_USE_PROTOS
  void yyrestart( FILE *input_file )
  #else
  void yyrestart( input_file )
  FILE *input_file;
  #endif
  	{
  	if ( ! yy_current_buffer )
  		yy_current_buffer = yy_create_buffer( yyin, YY_BUF_SIZE );
  
  	yy_init_buffer( yy_current_buffer, input_file );
  	yy_load_buffer_state();
  	}
  
  
  #ifdef YY_USE_PROTOS
  void yy_switch_to_buffer( YY_BUFFER_STATE new_buffer )
  #else
  void yy_switch_to_buffer( new_buffer )
  YY_BUFFER_STATE new_buffer;
  #endif
  	{
  	if ( yy_current_buffer == new_buffer )
  		return;
  
  	if ( yy_current_buffer )
  		{
  		/* Flush out information for old buffer. */
  		*yy_c_buf_p = yy_hold_char;
  		yy_current_buffer->yy_buf_pos = yy_c_buf_p;
  		yy_current_buffer->yy_n_chars = yy_n_chars;
  		}
  
  	yy_current_buffer = new_buffer;
  	yy_load_buffer_state();
  
  	/* We don't actually know whether we did this switch during
  	 * EOF (yywrap()) processing, but the only time this flag
  	 * is looked at is after yywrap() is called, so it's safe
  	 * to go ahead and always set it.
  	 */
  	yy_did_buffer_switch_on_eof = 1;
  	}
  
  
  #ifdef YY_USE_PROTOS
  void yy_load_buffer_state( void )
  #else
  void yy_load_buffer_state()
  #endif
  	{
  	yy_n_chars = yy_current_buffer->yy_n_chars;
  	yytext_ptr = yy_c_buf_p = yy_current_buffer->yy_buf_pos;
  	yyin = yy_current_buffer->yy_input_file;
  	yy_hold_char = *yy_c_buf_p;
  	}
  
  
  #ifdef YY_USE_PROTOS
  YY_BUFFER_STATE yy_create_buffer( FILE *file, int size )
  #else
  YY_BUFFER_STATE yy_create_buffer( file, size )
  FILE *file;
  int size;
  #endif
  	{
  	YY_BUFFER_STATE b;
  
  	b = (YY_BUFFER_STATE) yy_flex_alloc( sizeof( struct yy_buffer_state ) );
  	if ( ! b )
  		YY_FATAL_ERROR( "out of dynamic memory in yy_create_buffer()" );
  
  	b->yy_buf_size = size;
  
  	/* yy_ch_buf has to be 2 characters longer than the size given because
  	 * we need to put in 2 end-of-buffer characters.
  	 */
  	b->yy_ch_buf = (char *) yy_flex_alloc( b->yy_buf_size + 2 );
  	if ( ! b->yy_ch_buf )
  		YY_FATAL_ERROR( "out of dynamic memory in yy_create_buffer()" );
  
  	b->yy_is_our_buffer = 1;
  
  	yy_init_buffer( b, file );
  
  	return b;
  	}
  
  
  #ifdef YY_USE_PROTOS
  void yy_delete_buffer( YY_BUFFER_STATE b )
  #else
  void yy_delete_buffer( b )
  YY_BUFFER_STATE b;
  #endif
  	{
  	if ( ! b )
  		return;
  
  	if ( b == yy_current_buffer )
  		yy_current_buffer = (YY_BUFFER_STATE) 0;
  
  	if ( b->yy_is_our_buffer )
  		yy_flex_free( (void *) b->yy_ch_buf );
  
  	yy_flex_free( (void *) b );
  	}
  
  
  #ifndef _WIN32
  #include <unistd.h>
  #else
  #ifndef YY_ALWAYS_INTERACTIVE
  #ifndef YY_NEVER_INTERACTIVE
  extern int isatty YY_PROTO(( int ));
  #endif
  #endif
  #endif
  
  #ifdef YY_USE_PROTOS
  void yy_init_buffer( YY_BUFFER_STATE b, FILE *file )
  #else
  void yy_init_buffer( b, file )
  YY_BUFFER_STATE b;
  FILE *file;
  #endif
  
  
  	{
  	yy_flush_buffer( b );
  
  	b->yy_input_file = file;
  	b->yy_fill_buffer = 1;
  
  #if YY_ALWAYS_INTERACTIVE
  	b->yy_is_interactive = 1;
  #else
  #if YY_NEVER_INTERACTIVE
  	b->yy_is_interactive = 0;
  #else
  	b->yy_is_interactive = file ? (isatty( fileno(file) ) > 0) : 0;
  #endif
  #endif
  	}
  
  
  #ifdef YY_USE_PROTOS
  void yy_flush_buffer( YY_BUFFER_STATE b )
  #else
  void yy_flush_buffer( b )
  YY_BUFFER_STATE b;
  #endif
  
  	{
  	if ( ! b )
  		return;
  
  	b->yy_n_chars = 0;
  
  	/* We always need two end-of-buffer characters.  The first causes
  	 * a transition to the end-of-buffer state.  The second causes
  	 * a jam in that state.
  	 */
  	b->yy_ch_buf[0] = YY_END_OF_BUFFER_CHAR;
  	b->yy_ch_buf[1] = YY_END_OF_BUFFER_CHAR;
  
  	b->yy_buf_pos = &b->yy_ch_buf[0];
  
  	b->yy_at_bol = 1;
  	b->yy_buffer_status = YY_BUFFER_NEW;
  
  	if ( b == yy_current_buffer )
  		yy_load_buffer_state();
  	}
  
  
  #ifndef YY_NO_SCAN_BUFFER
  #ifdef YY_USE_PROTOS
  YY_BUFFER_STATE yy_scan_buffer( char *base, yy_size_t size )
  #else
  YY_BUFFER_STATE yy_scan_buffer( base, size )
  char *base;
  yy_size_t size;
  #endif
  	{
  	YY_BUFFER_STATE b;
  
  	if ( size < 2 ||
  	     base[size-2] != YY_END_OF_BUFFER_CHAR ||
  	     base[size-1] != YY_END_OF_BUFFER_CHAR )
  		/* They forgot to leave room for the EOB's. */
  		return 0;
  
  	b = (YY_BUFFER_STATE) yy_flex_alloc( sizeof( struct yy_buffer_state ) );
  	if ( ! b )
  		YY_FATAL_ERROR( "out of dynamic memory in yy_scan_buffer()" );
  
  	b->yy_buf_size = size - 2;	/* "- 2" to take care of EOB's */
  	b->yy_buf_pos = b->yy_ch_buf = base;
  	b->yy_is_our_buffer = 0;
  	b->yy_input_file = 0;
  	b->yy_n_chars = b->yy_buf_size;
  	b->yy_is_interactive = 0;
  	b->yy_at_bol = 1;
  	b->yy_fill_buffer = 0;
  	b->yy_buffer_status = YY_BUFFER_NEW;
  
  	yy_switch_to_buffer( b );
  
  	return b;
  	}
  #endif
  
  
  #ifndef YY_NO_SCAN_STRING
  #ifdef YY_USE_PROTOS
  YY_BUFFER_STATE yy_scan_string( yyconst char *yy_str )
  #else
  YY_BUFFER_STATE yy_scan_string( yy_str )
  yyconst char *yy_str;
  #endif
  	{
  	int len;
  	for ( len = 0; yy_str[len]; ++len )
  		;
  
  	return yy_scan_bytes( yy_str, len );
  	}
  #endif
  
  
  #ifndef YY_NO_SCAN_BYTES
  #ifdef YY_USE_PROTOS
  YY_BUFFER_STATE yy_scan_bytes( yyconst char *bytes, int len )
  #else
  YY_BUFFER_STATE yy_scan_bytes( bytes, len )
  yyconst char *bytes;
  int len;
  #endif
  	{
  	YY_BUFFER_STATE b;
  	char *buf;
  	yy_size_t n;
  	int i;
  
  	/* Get memory for full buffer, including space for trailing EOB's. */
  	n = len + 2;
  	buf = (char *) yy_flex_alloc( n );
  	if ( ! buf )
  		YY_FATAL_ERROR( "out of dynamic memory in yy_scan_bytes()" );
  
  	for ( i = 0; i < len; ++i )
  		buf[i] = bytes[i];
  
  	buf[len] = buf[len+1] = YY_END_OF_BUFFER_CHAR;
  
  	b = yy_scan_buffer( buf, n );
  	if ( ! b )
  		YY_FATAL_ERROR( "bad buffer in yy_scan_bytes()" );
  
  	/* It's okay to grow etc. this buffer, and we should throw it
  	 * away when we're done.
  	 */
  	b->yy_is_our_buffer = 1;
  
  	return b;
  	}
  #endif
  
  
  #ifndef YY_NO_PUSH_STATE
  #ifdef YY_USE_PROTOS
  static void yy_push_state( int new_state )
  #else
  static void yy_push_state( new_state )
  int new_state;
  #endif
  	{
  	if ( yy_start_stack_ptr >= yy_start_stack_depth )
  		{
  		yy_size_t new_size;
  
  		yy_start_stack_depth += YY_START_STACK_INCR;
  		new_size = yy_start_stack_depth * sizeof( int );
  
  		if ( ! yy_start_stack )
  			yy_start_stack = (int *) yy_flex_alloc( new_size );
  
  		else
  			yy_start_stack = (int *) yy_flex_realloc(
  					(void *) yy_start_stack, new_size );
  
  		if ( ! yy_start_stack )
  			YY_FATAL_ERROR(
  			"out of memory expanding start-condition stack" );
  		}
  
  	yy_start_stack[yy_start_stack_ptr++] = YY_START;
  
  	BEGIN(new_state);
  	}
  #endif
  
  
  #ifndef YY_NO_POP_STATE
  static void yy_pop_state()
  	{
  	if ( --yy_start_stack_ptr < 0 )
  		YY_FATAL_ERROR( "start-condition stack underflow" );
  
  	BEGIN(yy_start_stack[yy_start_stack_ptr]);
  	}
  #endif
  
  
  #ifndef YY_NO_TOP_STATE
  static int yy_top_state()
  	{
  	return yy_start_stack[yy_start_stack_ptr - 1];
  	}
  #endif
  
  #ifndef YY_EXIT_FAILURE
  #define YY_EXIT_FAILURE 2
  #endif
  
  #ifdef YY_USE_PROTOS
  static void yy_fatal_error( yyconst char msg[] )
  #else
  static void yy_fatal_error( msg )
  char msg[];
  #endif
  	{
  	(void) fprintf( stderr, "%s\n", msg );
  	exit( YY_EXIT_FAILURE );
  	}
  
  
  
  /* Redefine yyless() so it works in section 3 code. */
  
  #undef yyless
  #define yyless(n) \
  	do \
  		{ \
  		/* Undo effects of setting up yytext. */ \
  		yytext[yyleng] = yy_hold_char; \
  		yy_c_buf_p = yytext + n; \
  		yy_hold_char = *yy_c_buf_p; \
  		*yy_c_buf_p = '\0'; \
  		yyleng = n; \
  		} \
  	while ( 0 )
  
  
  /* Internal utility routines. */
  
  #ifndef yytext_ptr
  #ifdef YY_USE_PROTOS
  static void yy_flex_strncpy( char *s1, yyconst char *s2, int n )
  #else
  static void yy_flex_strncpy( s1, s2, n )
  char *s1;
  yyconst char *s2;
  int n;
  #endif
  	{
  	register int i;
  	for ( i = 0; i < n; ++i )
  		s1[i] = s2[i];
  	}
  #endif
  
  #ifdef YY_NEED_STRLEN
  #ifdef YY_USE_PROTOS
  static int yy_flex_strlen( yyconst char *s )
  #else
  static int yy_flex_strlen( s )
  yyconst char *s;
  #endif
  	{
  	register int n;
  	for ( n = 0; s[n]; ++n )
  		;
  
  	return n;
  	}
  #endif
  
  
  #ifdef YY_USE_PROTOS
  static void *yy_flex_alloc( yy_size_t size )
  #else
  static void *yy_flex_alloc( size )
  yy_size_t size;
  #endif
  	{
  	return (void *) malloc( size );
  	}
  
  #ifdef YY_USE_PROTOS
  static void *yy_flex_realloc( void *ptr, yy_size_t size )
  #else
  static void *yy_flex_realloc( ptr, size )
  void *ptr;
  yy_size_t size;
  #endif
  	{
  	/* The cast to (char *) in the following accommodates both
  	 * implementations that use char* generic pointers, and those
  	 * that use void* generic pointers.  It works with the latter
  	 * because both ANSI C and C++ allow castless assignment from
  	 * any pointer type to void*, and deal with argument conversions
  	 * as though doing an assignment.
  	 */
  	return (void *) realloc( (char *) ptr, size );
  	}
  
  #ifdef YY_USE_PROTOS
  static void yy_flex_free( void *ptr )
  #else
  static void yy_flex_free( ptr )
  void *ptr;
  #endif
  	{
  	free( ptr );
  	}
  
  #if YY_MAIN
  int main()
  	{
  	yylex();
  	return 0;
  	}
  #endif
  #line 35 "gram.l"
  
  // =============================================================================
  // https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/voca.c
  // =============================================================================

  char *gettoken( char *line, char *dst );
  BODY *appendTerm( BODY *list, char *name );
  BODY *entryTerm( char *name, BODY *body, int listLen );
  
  void setVoca( void )
  {
      char token1[ SYMBOL_LEN ];
      char token2[ SYMBOL_LEN ];
  
      int virgin = 1;
      int bodynum = 0;
      BODY *bodyList = NULL;
  
      FILE *fp;
      char identifier[ SYMBOL_LEN ] = "";
  
      if( (fp = fopen( VOCA_FILE_NAME_LIST, "r" )) == NULL ){
  	errorMessage( "Can't open vocabulary file\"%s\"", VOCA_FILE_NAME_LIST );
      }
      if( !SWITCH_QUIET ){
  	newLineAdjust();
  	fputs( "Now parsing vocabulary file\n", stderr );
      }
  
      while( 1 ){
  	static char line[ 1000 ];
  	char *ptr = line;
  	if( fgets( line, 1000, fp ) == NULL ){
  	    entryTerm( identifier, bodyList, bodynum );
  	    break;
  	}
  	if( line[ 0 ] == '\0' ) continue;
  	if( line[ 0 ] == '#' ){
  	    if( (ptr = gettoken( ptr, token1 )) == NULL ) continue;
  	    if( !virgin ){
  		entryTerm( identifier, bodyList, bodynum );
  		bodyList = NULL;
  		bodynum = 0;
  	    } else {
  		virgin = 0;
  	    }
  	    strcpy( identifier, token1 + 1 );
  	    continue;
  	} else {
  	    ptr = gettoken( ptr, token1 );
  	    if( ptr == NULL ) continue;
  	    ptr = gettoken( ptr, token2 );
  	    if( ptr == NULL ){
  		bodyList = appendTerm( bodyList, token1 );
  	    } else {
  		bodyList = appendTerm( bodyList, token2 );
  	    }
  	    bodynum++;
  	}
      }
  }
  
  char *gettoken( char *line, char *dst )
  {
      char *ptr = dst;
      char ch;
  
      do{
  	ch = *line++;
  	if( ch == '\0' ) return( NULL );
  	
      } while( ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n' );
      while( 1 ){
  	*ptr++ = ch;
  	ch = *line++;
  	if( ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n' ){
  	    *ptr = '\0';
  	    return( line );
  	}
  	if( ch == '\0' ){
  	    *ptr = '\0';
  	    return( line - 1 );
  	}
      }
  }
  
  BODY *appendTerm( BODY *list, char *name )
  {
      BODY *newTerm;
  
      if( (newTerm = malloc( sizeof(BODY) )) == NULL ){
  	errorMessage( "Can't alloc term list buffer" );
      }
      strcpy( newTerm->name, name );
      newTerm->abort = 0;
      newTerm->next = list;
      return( newTerm );
  }
  
  BODY *entryTerm( char *name, BODY *body, int listLen )
  {
      CLASS *class;
      static int InputNo = 0;
      BODYLIST *bodyList;
  
      if( getClass( name ) != NULL ){
  	errorMessage( "Class redefined \"%s\"", name );
      }
      if( (class = malloc( sizeof(CLASS) )) == NULL ){
  	errorMessage( "Can't alloc memory for Class Finite Automaton." );
      }
      class->no = InputNo++;
      strcpy( class->name, name );
      class->branch = -listLen;
      class->usedFA = 0;
      class->used=0;
      class->tmp = 0;
      if( ClassListTail == NULL ){
  	ClassList = class;
      } else {
  	ClassListTail->next = class;
      }
      ClassListTail = class;
  
      if( (bodyList = malloc( sizeof(BODYLIST) )) == NULL ){
  	errorMessage( "Can't alloc nonterminal list buffer" );
      }
      bodyList->body = body;
      bodyList->next = NULL;
  
      /* for test
      nt = class->nt[ 0 ];
      fprintf( stderr, "class: %s\n", class->name );
      while( 1 ){
  	if( *nt->name == '\0' ) break;
  	fprintf( stderr, "%s\n", nt->name );
  	nt++;
      }*/
  
      return( NULL );
  }
  
  window.mkdfa = start;

}(window))

