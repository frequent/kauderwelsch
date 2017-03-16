// https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/triplet.h
// https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/triplet.c
//include "triplet.h" => makeTriplet => renamed to createTriple
(function () {

  // include "mkfa.h"

  // for triple list
  var some_tfa = {
    stat: null,
    inp: null,
    ns: null,
    accept: null,
    next: null
  };

  var finite_accepter_processed = 0;        // Number of FAs processed in the current step
  var finite_accepter_total = null;         // extern int FAtotal;            // Total number of FA
  var total_finite_accepter_traversed = 0;  // Number of nodes visited when creating triplets
  var total_finite_accepter_success = 0;    // A number that did not stop by so far

  var fa_file_name;                         // extern FA file name (DFAorNFA)
  var fa_list;                              // extern Pointer of start FA in FA network
  var no_new_line;                          // extern Solve line break problems in multiple display modes
  var memory_clipboard;                     // extern Temporary write buffer for sprintf
  
  var switch_verbose;                       // extern
  var switch_quiet;                         // extern
  var switch_semi_quiet;                    // extern
  var switch_compat_i;                      // extern
  var switch_edge_start;                    // extern
  var switch_edge_accept;                   // extern

  function createTriplet(my_finite_accepter_start_pointer, my_file) {
    finite_accepter_processed = 0;
    // opening fa_file_name
    if (my_file === null) {
      errorMessage("Can't open dfa File for writting: " + fa_file_name);
    }
    getNewState(my_finite_accepter_start_pointer);
    if (switch_quiet === undefined) {
      console.log("Now making triplet list");
      no_new_line = 1;
    }
    while (1) {
      my_finite_accepter_start_pointer = processTripletQueue(null);
      if (my_finite_accepter_start_pointer === null) {
        break;
      }
      recurseMakeTriplet(my_finite_accepter_start_pointer, my_file);
    }
    // closing my_file
    if (switch_quiet === undefined) {
      console.log("Now making triplet list, ", finite_accepter_processed, finite_accepter_total);
      no_new_line = 1;
    }
    if (switch_verbose) {
      verboseMessage(
        "r_makeTriplet",
        total_finite_accepter_success,
        total_finite_accepter_traversed,
        (100*total_finite_accepter_success/total_finite_accepter_traversed)
      );
    }
    newLineAdjust();
  }
}());


//#include "mkfa.h"
//
//typedef struct _TFA{                 // For triple list
//    int stat;
//    int inp;
//    int ns;
//    unsigned int accpt;
//    struct _TFA *next;
//} TFA;

void r_makeTriplet( FA *fa, FILE *fp );
int getNewStatNo( FA *fa );
FA *processTripletQueue( FA *fa );

//static int FAprocessed = 0;    // Number of FAs processed in the current step
//extern int FAtotal;            // Total number of FA
//static int TFAtravTotal = 0;   // Number of nodes visited when creating triplets
//static int TFAtravSuccess = 0; // A number that did not stop by so far
//
//extern char FAfile[ 1024 ];    // FA file name (DFAorNFA)
//extern FA *FAlist;             // Pointer of start FA in FA network
//extern int NoNewLine;          // Solve line break problems in multiple display modes
//extern char Clipboard[ 1024 ]; // Temporary write buffer for sprintf
//
//extern int SW_Verbose;
//extern int SW_Quiet;
//extern int SW_SemiQuiet;
//extern int SW_Compati;
//extern int SW_EdgeStart;
//extern int SW_EdgeAccpt;

void makeTriplet( void )
{
    FILE *fp_fa;
    FA *fa;

    finite_accepter_processed = 0;
    if( (fp_fa = fopen( FAfile, "w" )) == NULL ){
	errMes( "Can't open dfa File for writting\"%s\"", FAfile );
    }
    getNewStatNo( FAlist );
    if( !SW_Quiet ){
	fprintf( stderr, "Now making triplet list" );
	NoNewLine = 1;
    }
    while( 1 ){
	if( (fa = processTripletQueue( NULL )) == NULL ) break;
	r_makeTriplet( fa, fp_fa );
    }
    fclose( fp_fa );
    if( !SW_Quiet ){
	fprintf( stderr, "\rNow making triplet list[%d/%d]\n", finite_accepter_processed, FAtotal );
	NoNewLine = 0;
    }
    if( SW_Verbose ){
	verboseMes( "r_makeTriplet: %d/%d(%d%%)",
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

    finite_accepter_processed++;
    if( !SW_SemiQuiet ){
	fprintf( stderr, "\rNow making triplet list[%d/%d]", finite_accepter_processed, FAtotal );
	NoNewLine = 1;
    }

    if( (arc = fa->nsList) == NULL ){
	if( SW_EdgeAccpt && SW_EdgeStart ) return;
	if( !SW_EdgeAccpt ){
	    accpt = fa->accpt;
	} else {
	    accpt = 0;
	}
	if( !SW_EdgeStart ){
	    start = fa->start;
	} else {
	    start = 0;
	}
	if( SW_Compati ){
	    fprintf( fp_fa, "%d -1 -1 %x\n", fa->stat, accpt & 1 );
	} else {
	    fprintf( fp_fa, "%d -1 -1 %x %x\n", fa->stat, accpt, start );
	}
	return;
    }
    while( arc != NULL ){
	if( !SW_EdgeAccpt ){
	    accpt = fa->accpt;
	} else {
	    accpt = arc->accpt;
	}
	if( !SW_EdgeStart ){
	    start = fa->start;
	} else {
	    start = arc->start;
	}
	if( SW_Compati ){
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
    // NULL:pop, !NULL:push 

    typedef struct _FAQ{
	FA *fa;
	struct _FAQ *next;
    } FAQ;

    static FAQ *queueTop = NULL;
    static FAQ *queuqTail = NULL;
    FAQ *newFAQ;

    if( fa != NULL ){
	if( (newFAQ = malloc( sizeof(FAQ) )) == NULL ){
	    errMes( "Can't malloc queue for breadth-first search of triplet list" );
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


// https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/main.c
(function () {
  /*
    finite automaton generator, mkfa %s programmed by 1995-1996 S.Hamada
  	
  	function:  grammar & vocabulary -> FA & header for parsing
  	usage:     mkfa <option>.. <file-spec1>..; or mkfa <option>.. <file-spec2>
  	option:    -dfa    DFA output(default)
               -nfa    NFA output
               -c      compatible FA output with g2fa
               -e[0|1] putting class reduction flag on edge(default: on vertex)
                       (0:accept 1:start omitted:both)
               -nw     no warning messages
               -q[0|1] contol of processing report
                       (0:no report 1:semi-quiet omitted:semi-quiet)
               -v      verbose mode(to stderr)
    filespec1: -fg     grammar filename
               -fv     vocabulary filename
               -fo     output filename(DFA or NFA file)
               -fh     header filename of class reduction flag for parser
    filespec2: -f      basename of above I/O files
                       (respectively appended .grammar, .voca, .dfa(.nfa), .h)
    NOTES:     * Regular expression with left recursion can't be processed.
               * Option -dfa and -nfa must not follow option -f.
               * State#1 isn't always final state even if compiled with -c.\n", VerNo );
  */
  
  var version_number = 0;         // Version Number (wasn't set)
  var class_list = null;          // Linear list of classes
  var class_list_tail = null;     // The last node of the linear list of classes
  var start_symbol = null;        // Class of start symbol
  var grammar_file_name;          // Grammar file name
  var voca_file_name;             // Vocabulary file name
  var fa_file_name;               // FA file name (DFAorNFA)
  var header_file_name;           // Header file name
  var no_new_line = 0;            // Solve line break problems in multiple display modes
  var fa_list = null;             // Pointer of start FA in FA network => FA *FAlist ?? => global
  var memory_clipboard;           // Temporary write buffer for sprintf
  var option_f = 0;               // When -f is specified (to resolve problems with -dfa)
  
  var switch_sent_list = 0;
  var switch_no_warning = 0;
  var switch_compat_i = 0;
  var switch_quiet = 0;
  var switch_semi_quiet = 0;
  var switch_debug = 0;
  var switch_nfa_output = 0;
  var switch_verbose = 0;
  var switch_edge_start;
  var switch_edge_accept;
  
  //include "mkfa.h"
  //include "nfa.h"
  //include "dfa.h"
  //include "triplet.h"
  
  function usage() {}
  
  function setSwitch(my_switch) {
    var switch_number, switch_name;
  
    switch_name = ["l", "nw", "c", "db", "dfa", "nfa", "fg", "fv", "fo", "fh",
      "f", "v", "c", "e", "e0", "e1", "q0", "q", "q1", null];
  
    switch (switch_number) {
      case 0:
        switch_sent_list = 1;
        break;
      case 1:
        switch_no_warning = 1;
        break;
      case 2:
        switch_compat_i = 1;
        break;
      case 3:
        switch_debug = 1;
        break;
      case 4:
        if (option_f) {
          usage();
        }
        switch_nfa_output = 0;
        break;
      case 5:
        if (option_f) {
          usage();
        }
        switch_nfa_output = 1;
        break;
      case 6:
        return 1;
      case 7:
        return 2;
      case 8:
        return 3;
      case 9:
        return 4;
      case 10:
        return 5;
      case 11:
        switch_verbose = 1;
        break;
      case 12:
        switch_compat_i = 1;
        break;
      case 13:
        switch_edge_accept = 1;
        switch_edge_start = 1;
        break;
      case 14:
        switch_edge_accept = 1;
        break;
      case 15:
        switch_edge_start = 1;
        break;
      case 16:
        switch_quiet = 1;
        break;
      case 17:
      case 18:
        switch_semi_quiet = 1;
        break;
      default:
        usage();
        break;
    }
  
    for (switch_number = 0;; switch_number += 1) {
      if (switch_name[switch_number] === null) {
        return;
      }
      if (my_switch === switch_name[switch_number]) {
        return;
      }
    }
  
    return 0;
  }
  
  function getSwitch(my_category_counter, my_vocabulary_list) {
    var file_mode = 0,
      file_finish = 0,
      i;
    for (i = 1; i < my_category_counter; i += 1) {
      if (file_mode === 0) {
        if (my_vocabulary_list[i][0] === "-") {
          file_mode = setSwitch(my_vocabulary_list[i][1]);
        } else {
          usage();
        }
      } else {
        file_finish = setFileName(my_vocabulary_list[i], file_mode);
        file_mode = 0;
      }
    }
    if (file_finish === undefined) {
      usage();
    }
  }
  
  function setFileName(my_file_name, my_file_mode) {
    var file_grammar = 0,
      file_voca = 0,
      file_out = 0,
      file_header = 0;
  
    switch (my_file_mode) {
      case 1:
        //strcpy( GramFile, my_file_name );
        grammar_file_name = my_file_name;
        file_grammar = 1;
        break;
      case 2:
        voca_file_name = my_file_name;
        file_voca = 1;
        break;
      case 3:
        fa_file_name = my_file_name;
        file_out = 1;
        break;
      case 4:
        header_file_name = my_file_name;
        file_header = 1;
        break;
      case 5:
        grammar_file_name = my_file_name + ".grammar";
        voca_file_name = my_file_name + ".voca";
        if (switch_nfa_output) {
          fa_file_name = my_file_name + ".nfa";
        } else {
          fa_file_name = my_file_name + ".dfa";
        }
        option_f = 1;
        header_file_name = my_file_name + ".h";
        file_grammar = file_voca = file_out = file_header = 1;
        return 1;
    }
    if (file_grammar && file_voca  && file_out  && file_header) {
      return 1;
    } else {
      return 0;
    }
  }
  
  function errorMessage(my_message) {
    var output = "";
    if (no_new_line) {
      output += "\n";
    }
    output += my_message;
    throw Error("Error: " + output + "\n");
  }
  
  function warningMessage(my_message) {
    var output = "";
    if (switch_no_warning) {
      return;
    }
    if (no_new_line) {
      output += "\n";
    }
    output += my_message;
    console.warn("Warning: " + output + "\n");
    no_new_line = 0;
  }
  
  function verboseMessage(my_message) {
    var output = "";
    if (switch_verbose === undefined) {
      return;
    }
    if (no_new_line) {
      output += "\n";
    }
    output += my_message;
    console.log("Verbose: " + output + "\n");
    no_new_line = 0;
  }
  
  function main(my_category_counter, my_vocabulary_list) {
    getSwitch(my_category_counter, my_vocabulary_list);
    if (switch_edge_accept) {
      throw error("I'm sorry. AcceptFlag on edge is under construction.");
    }
    setGrammar();           // setGram() ?
    setVoca();              // setVoca() ?
    createNfa();            // makeNFA() ?
    if (switch_nfa_output === undefined) {
      createDfa();          // makeDfa() ?
    }
    createTriplet();        // makeTriplet() ?
    return 0;
  }
  
  // START
  main(category_counter, vocabulary_list);

}());

