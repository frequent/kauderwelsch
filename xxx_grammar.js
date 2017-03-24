 %{
/* 
 *                          KAUDERWELSCH GRAMMAR
 *          http://dinosaur.compilertools.net/bison/bison_6.html#SEC49
 *
 */
/*
 * ported from:
 * https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/gram.y
 * https://en.wikipedia.org/wiki/Terminal_and_nonterminal_symbols
 *
 * Copyright (c) 1991-2013 Kawahara Lab., Kyoto University
 * Copyright (c) 2000-2005 Shikano Lab., Nara Institute of Science and Technology
 * Copyright (c) 2005-2013 Julius project team, Nagoya Institute of Technology
 * All rights reserved
 */

  // #include "mkfa.h" => https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/mkfa.h

  var symbol_len = 256;
  var body_class_flag = 0;
  var body_class_flag_max = body_class_flag * 8;

  var body_list = {
    "body": {},
    "next": {}
  };
  var arc = {
    "inp": 0,
    "finite_automaton": {},
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "next": {}
  };
  var unify_arc = {
    "inp": 0,
    "finite_automaton": {},
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "next": {},
    "flag_reserved": 0
  };
  var finite_automaton_list = {
    "finite_automation": {},
    "next": {}
  };
  var finite_automaton = {
    // common
    "stat": 0,
    "arc": [],
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "flag_traversed": 0,
    // for DFA
    "psNum": 0,
    "unify_arc_list": [],
    "finite_automaton_list": [],
    "flag_volatiled": 0
  };

  // external parameters, should be defined
  // CLASS_LIST;
  // CLASS_LIST_TAIL;
  // START_SYMBOL;
  // NO_NEW_LINE;
  // GramFile [1024]
  // HeaderFile [1024]
  // SW_COMPAT_I;
  // SW_QUIET;
  // SW_SEMI_QUIET;
  // VERSION_NUMBER;
  // SYMBOL_LEN => 0;
  
  // let yy be 
  var YYSTYPE;

  var body_class_number = 100;
  var head_name = []; // HEAD_NAME[symbol_len];
  var body_name = []; // BODY_NAME[body_class_number][symbol_len];
  var body_count = 0;
  var class_count = 0;
  var current_class_count = 0;
  var is_assign_accept_flag = 1;
  var is_block_start_or_end = 0;
  var is_block_reversed;
  var body_class_flag_start = 0;
  var error_count = 0;
  var grammar_modification_number = 0;

  function checkNoInstantClass() {
    var current_class = CLASS_LIST;
    while (current_class !== null) {
      if (current_class.branch === undefined) {
        return current_class.name;
      }
      current_class = current_class.next;
    }
    return null;
  }

  function getNewClassName(my_key_name) {
    var tmp_class_count = 0,
      class_name = my_key_name + "#" + tmp_class_count;

    if (!SW_SEMI_COMPAT) {
      console.log("Now modifying grammar to minimize states[", grammar_modification_number + "]");
      NO_NEW_LINE = 1;
    }
    grammar_modification_number++;
    return (1);
  }

  function unifyBody(my_class_name, my_body, my_new_body) {
    var body_next,
      new_body_next,
      body_class,
      new_body,
      new_class_name;
      
    body_next = my_body.next;
    new_body_next = my_new_body.next;

    while (1) {
      if (body_next === null && new_body_next === null) {
        return -1;
      }
      if (new_body_next === null) {
        if (my_body.abort) {
          return -1;
        } else {
          my_body.abort = 1;
        }
        return 0;
      }
      if (body_next === null) {
        my_body.abort = 1;
        my_body.next = new_body_next;
        return 0;
      }
      if (body_next.name === new_body_next.name) {
        break;
      }
      my_body = body_next;
      my_new_body = new_body_next;
      body_next = body.next;
      new_body_next = new_body.next;
    }

    body_class = createBodyClass(); // ?
    if (body_class !== null && body_class.tmp) {
      enterNonTerminalSymbol(my_body.name, new_body_next, 0, 0, 0, 1);
    } else {
      new_class_name = getNewClassName(my_class_name);
      enterNonTerminalSymbol(new_class_name, body_next, 0, 0, 0, 1);
      enterNonTerminalSymbol(new_class_name, new_body_next, 0, 0, 0, 1);
      my_new_body.name = new_class_name;
      my_new_body.abort = 0;
      my_new_body.next = null;
      my_body.next = newBody;
      body_next.next = body_next;
    }
    return 0;
  }

  function pushBody(my_body_class, my_new_body) {
    var body_list = my_body_class.body_list,
      pre_body_list = null,
      new_body_list,
      body,
      cmp,
      define_number = 1;
    
    while (body_list !== null) {
      body = body_list.body;
      cmp = body.name === my_new_body.name;
      if (cmp > 0) {
        break;
      }
      if (cmp === 0) {
        if (unifyBody(body_class.name, body, my_new_body)) {
          console.warn("Redefining class: ", body_class.name, body.name);
        }
        return;
      }
      pre_body_list = body_list;
      body_list = body_list.next;
      define_number++;
    }
    new_body_list.body = new_body;
    if (pre_body_list !== null) {
      pre_body_list.next = new_body_list;
    } else {
      body_class.body_list = new_body_list;
    }
    new_body_list.next = body_list;
    body_class.branch++;
  }

  function createBodyClass(my_name) {
    return {  
      "number": null,
      "name": null,
      "next": {},
      "body_list": {},
      "branch": null,
      "flag_used_fa": 0,
      "flag_used": 0,
      "flag_tmp": 0,
      "tmp": null
    };
  }
  
  function outputHeader(my_name) {
    if (class_count >= body_class_flag_max) {
      if (SW_COMPAT_I) {
        console.warn("Class accepted flag overflow, " + my_name);
      }
    } else {
      if (SW_COMPAT_I === undefined) {
        FP_HEADER.push("#define ACCEPT_" + my_name + "0x%08x\n",  1 << class_count );
      }
      current_class_count = class_count++;
    }
  }

  function enterNonTerminalSymbol(my_name, my_body, my_mode_accept, my_start, my_member, my_tmp) {
    var body_class = createBodyClass();
    
    // when does this happen? initial?
    if (body_class === null) {
      if (my_member) {
        error_count++;
        throw Error("Accepted fla of class is reassigned:", head_name);
      }
    } else {
      body_class.name = my_name;
      if (my_mode_accept) {
        if (my_member) {
          body_class.number = current_class_count;
        } else {
          if (!my_tmp) {
            outputHeader(name);
            body_class.number = current_class_count;
          }
        }
      } else {
        body_class.number = -1;
      }
      body_class.branch = 0;
      body_class.used_finite_automaton = 0;
      body_class.used = 1; // non-terminal does not appear in voca
      body_class.body_list = null;
      body_class.tmp = tmp;
      body_class.next = null;
      if (CLASS_LIST_TAIL === null) {
        CLASS_LIST = body_class;
      } else {
        CLASS_LIST_TAIL.next = body_class;
      }
      CLASS_LIST_TAIL = body_class;
    }
    if (my_body === null) {
      pushBody(body_class, my_body);
      if (my_start) {
        body_class_flag_start = 0;
        if (START_SYMBOL === null) {
          START_SYMBOL = body_class;
        } else {
          error_count++;
          throw Error("Start symbol is redefined: ", body_class.name);
        }
      }
    }
    return body_class;
  }

  function configureNonTerminalSymbol(my_body) {
    var first_body = null,
      previous_body = null,
      i;
    for (i = 0; i < body_count; i += 1) {
      my_body.name = body_name[i];
      my_body.abort = 0;
      if (previous_body !== null) {
        previous_body.next = my_body;
      } else {
        first_body = my_body;
      }
      previous_body = my_body;
    }
    my_body.next = null;
    return first_body;
  }

  function createBody() {
    return {
      "name": null,
      "flag_abort": 0,
      "next": {}
    };
  }

  function appendNonTerminalSymbol(my_name, my_mode_assign) {
    var body = configureNonTerminalSymbol(createBody());
    enterNonTerminalSymbol(my_name, body, my_mode_assign, body_class_flag_start, is_block_start_or_end, 0);
    body_count = 0;
  }

  function yyerror(my_message) {
    error_count++;
    //throw Error(my_message);
    return 0;
  }
%}  


%lex

%% /* start definitions => https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/gram.l */

"@"[a-zA-Z0-9_]+   {/*yylval = yytext + 1;*/    return 'TAG';} 
[a-zA-Z0-9_]+      {/*yylval = yytext; */       return 'SYMBOL';}
"{"                {is_block_start_or_end = 1;  return 'OPEN';}	
"}"                {is_block_start_or_end = 0;  return 'CLOSE';}
"%ASSIGN"          {return 'CTRL_ASSIGN';}
"%IGNORE"          {return 'CTRL_IGNORE';}
"!"                {return 'REVERSE';}
"*"                {return 'STARTCLASS";}
":"                {return 'LET';}
\n                 {return 'NL';}
"#".*\n            {return 'REMARK';}
[ \t]              {};
.                  console.log("Lexical mistake: " + yytext);

/lex

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

%% /* language grammar */

src
  : statement 
  | statement src
  ;

statement 
  : block
  | single
  | control
  | remark
  | error NL 
    { yyerrok; }
  ;

block
  : tag OPEN remark members CLOSE remark
  ;

tag 
  : TAG
    %{
      is_block_reversed = 0;
      if (is_assign_accept_flag) {
        outputHeader( $1 );
      }
    %}
  | REVERSE TAG
    %{
      is_block_reversed = 1;
      if (!is_assign_accept_flag) {
        outputHeader( $2 );
      }
    %}
  ;

members 
  : member 
  | member members
  ;

member
  : define
    %{
      appendNonTerminalSymbol(head_name, is_assign_accept_flag ^ is_block_reversed);
    %}
  | head remark
    %{
      enterNonTerminalSymbol(head_name, NULL, is_assign_accept_flag ^ is_block_reversed, 0, 1, 0);
    %}
  | remark
  ;

single
  : define
    %{
      appendNonTerminalSymbol(head_name, is_assign_accept_flag);
    %}
   | REVERSE define
    %{
      appendNonTerminalSymbol(head_name, !is_assign_accept_flag);
    %};

define
  : head LET bodies remark
  ;

bodies
  : body 
  | body bodies
  ;

head
  : SYMBOL
   %{
    head_name.push( $1 );
   %}
  | STARTCLASS SYMBOL
   %{
    body_class_flag_start = 1;
    head_name.push( $2 );
   %}
  ;

body
  : SYMBOL
   %{
    body_name[body_count++].push( $1 );
   %}
  ;

control
  : CTRL_ASSIGN remark
   %{
    is_assign_accept_flag = 1;
   %}
  | CTRL_IGNORE
   %{
    is_assign_accept_flag = 0;
   %}
  ;

remark
  : REMARK
  | NL
  ;

%%
/* #include "lex.yy.c" => see custom lexer */
%{
  // myscanner.js
  function AlphabetScanner() {
    console.log("WHAT THE FUCK")
      var text = "";
      this.yytext = "";
      this.yyloc = {
          first_column: 0,
          first_line: 1,
          last_line: 1,
          last_column: 0
      };
      this.yylloc = this.yyloc;
      this.setInput = function(text_) {
        console.log("SETTING INPUT")
          text = text_;
      };
      this.lex = function() {
          // Return the EOF token when we run out of text.
          if (text === "") {
              return "EOF";
          }
  
          // Consume a single character and increment our column numbers.
          var c = text.charAt(0);
          text = text.substring(1);
          this.yytext = c;
          this.yyloc.first_column++;
          this.yyloc.last_column++;
  
          if (c === "\n") {
              // Increment our line number when we hit newlines.
              this.yyloc.first_line++;
              this.yyloc.last_line++;
              // Try to keep lexing because we aren't interested
              // in newlines.
              return this.lex();
          } else if (/[a-z]/.test(c)) {
              return "LOWER_CASE";
          } else if (/[A-Z]/.test(c)) {
              return "UPPER_CASE";
          } else if (/\s/.test(c)) {
              // Try to keep lexing because we aren't interested
              // in whitespace.
              return this.lex();
          } else {
              return "INVALID";
          }
      };
  }
  parser.lexer = new AlphabetScanner();
}%


