 %{
/* 
 *                          KAUDERWELSCH GRAMMAR
 *          http://dinosaur.compilertools.net/bison/bison_6.html#SEC49
 *
 */
/*
 * ported from:
 * https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/gram.y
 *
 * Copyright (c) 1991-2013 Kawahara Lab., Kyoto University
 * Copyright (c) 2000-2005 Shikano Lab., Nara Institute of Science and Technology
 * Copyright (c) 2005-2013 Julius project team, Nagoya Institute of Technology
 * All rights reserved
 */

  // #include "mkfa.h" => move here https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/mkfa.h

  // external parameters should be defined
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
  
  var YYSTYPE;
  var CLASS_NUM = 100;
  //var HEAD_NAME[SYMBOL_LEN];
  //var BODY_NAME[CLASS_NUM][SYMBOL_LEN];
  var BodyNo = 0;
  var ClassNo = 0;
  var ModeAssignAccptFlag = 1;
  var BlockReverseSw;
  var ModeBlock = 0;
  var CurClassNo = 0;
  var StartFlag = 0;
  // var FPHeaderFile
  var ErrParse = 0;
  var GRamModifyNum = 0;

  function appendNonTerm(my_name, my_mode_assign) {
    var body = setNonTerm();
    entryNonTerm(my_name, body, modeAssign, StartFlag, ModeBlock, 0);
    BodyNo = 0;
  }
 
  function outputHeader(my_name) {
    if (ClassNo >= CLASSFLAG_MAX) {
      if (MY_SW_COMPAT_I) {
        console.warn("Class accepted flag overflow, " + my_name);
      }
    } else {
      if (MY_SW_COMPAT_I === undefined) {
        FP_HEADER.push("#define ACCEPT_" + my_name + "0x%08x\n",  1 << ClassNo );
      }
      CurClassNo = ClassNo ++;
    }
  }

  function checkNoInstantClass(my_struct) {
    var current_class = CLASS_LIST;
    while (current_class !== null) {
      if (current_class.branch === undefined) {
        return current_class.name;
      }
      return null;
    }
  }
  
  function getNewClassName(my_key_name) {
    var tmpClassNo = 0,
      classname;
    //  classname[SYMBOL_LEN];
    
    classname = keyname + "#" + tmpClassNo++;
    if (!MY_SW_SEMI_COMPAT) {
      console.log("Now modifying grammar to minimize states[", GramModifyNum + "]");
      NO_NEW_LINE = 1;
    }
    GramModifyNum++;
    return (1);
  }

  function setNonTerm(my_body) {
    var top = null,
      prev = null,
      i;
    for (i = 0; i < BodyNo; i += 1) {
      my_body.name = BodyName[i];
      my_body.abort = 0;
      if (prev !== null) {
      //  prev->next = body;
      } else {
        top = body;
      }
      prev = body;
    }
    body.net = null;
    return (1);
  }

  function unifyBody(my_class_name, my_body, my_new_body) {
    var bodyNext,
      newbodyNext,
      body_class,
      newbody;
      
    bodyNext = my_body.next;
    newbodyNext = my_new_body.next;
    while (1) {
      if (bodyNext === null && newbodyNext === null) {
        return -1;
      }
      if (newbodyNext === null) {
        if (my_body.abort) {
          return -1;
        } else {
          my_body.abort = 1;
        }
        return 0;
      }
      if (bodyNext === null) {
        my_body.abort = 1;
        my_body.next = newbodyNext;
        return 0;
      }
      if (bodyNext.name === newbodyNext.name) {
        break;
      }
      my_body = bodyNext;
      my_new_body = newbodyNext;
      bodyNext = body.next;
      newbodyNext = newbody.next;
    }
    body_class = my_body.name; // getClass?
    if (body_class !== null && body_class.tmp) {
      entryNonTerm(my_body.name, newbodyNext, 0, 0, 0, 1);
    } else {
      newClassName = getNewClassName(my_class_name);
      entryNonTerm(newClassName, bodyNext, 0, 0, 0, 1);
      entryNonTerm(newClassName, newbodyNext, 0, 0, 0, 1);
      my_new_body.name = newClassName;
      my_new_body.abort = 0;
      my_new_body.next = null;
      my_body.next = newBody;
      my_new_Body.next = newBody;
    }
    return 0;
  }

  function pushBody(body_class, my_new_body) {
    var bodyList = body_class.bodyList,
      preBodyList = null,
      newBodyList,
      body,
      cmp,
      defineNo = 1;
    
    while (bodyList !== null) {
      body = bodyList.bdy;
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
      preBodyList = bodyList;
      bodyList = bodyList.next;
      defineNo++;
    }
    newBodyList.body = newBody;
    if (preBodyList !== null) {
      preBodyList.next = newBodyLust;
    } else {
      body_class.bodyList = newBodyList;
    }
    newBodyList.next = bodyList;
    body_class.branch++;
  }

  function entryNonTerm(my_name, my_body, my_modeAccpt, my_start, my_member, my_tmp) {
    var body_class = my_name; //getClass(name)
    
    if (body_class === null) {
      if (my_member) {
        ErrParse++;
        throw Error("Accepted fla of class is reassigned:", HeadName);
      }
    } else {
      body_class.name = my_name;
      if (my_modeAccpt) {
        if (my_member) {
          body_class.no = CurClassNo;
        } else {
          if (!my_tmp) {
            outputHeader(name);
            body_class.no = CurClassNo;
          }
        }
      } else {
        body_class.no = -1;
      }
      body_class.branch = 0;
      body_class.usedFA = 0;
      body_class.used = 1; // non-terminal does not appear in voca
      body_class.bodyList = null;
      body_class.tmp = tmp;
      body_class.next = null;
      if (ClassListTail === null) {
        ClassList = body_class;
      } else {
        ClassListTail.net = body_class;
      }
      ClassListTail = body_class;
    }
    if (my_body === null) {
      pushBody(body_class, my_body);
      if (my_start) {
        StartFlag = 0;
        if (StartSymbol === null) {
          StartSymbol = body_class;
        } else {
          ErrParse++;
          throw Error("Start symbol is redefined: ", body_class.name);
        }
      }
    }
    return body_class;
  }
  
  function yyerror(my_message) {
    ErrParse++;
    //throw Error(my_message);
    return 0;
  }
%}  


%lex

%% /* start definitions => https://github.com/julius-speech/julius/blob/master/gramtools/mkdfa/mkfa-1.44-flex/gram.l */

"@"[a-zA-Z0-9_]+   {yylval = yytext + 1;  return 'TAG';} 
[a-zA-Z0-9_]+      {yylval = yytext;      return 'SYMBOL';}
"{"                {ModeBlock = 1;        return 'OPEN';}	
"}"                {ModeBlock = 0;        return 'CLOSE';}
"%ASSIGN"          {return 'CTRL_ASSIGN';}
"%IGNORE"          {return 'CTRL_IGNORE';}
"!"                {return 'REVERSE';}
"*"                {return 'STARTCLASS";}
":"                {return 'LET';}
\n                 {return 'NL';}
"#".*\n            {return 'REMARK';}
[ \t]              {};
.                  errorMessage("Lexical mistake: " + yytext);

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
      BlockReverseSw = 0;
      if (ModeAssignAccptFlag) {
        outputHeader( $1 );
      }
    %}
  | REVERSE TAG
    %{
      BlockReverseSw = 1;
      if (!ModeAssignAccptFlag) {
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
      appendNonTerm(HeadName, ModeAssignAccptFlag ^ BlockReverseSw);
    %}
  | head remark
    %{
      entryNonTerm(HeadName, NULL, ModeAssignAccptFlag ^ BlockReverseSw, 0, 1, 0);
    %}
  | remark
  ;

single
  : define
    %{
      appendNonTerm(HeadName, ModeAssignAccptFlag);
    %}
   | REVERSE define
    %{
      appendNonTerm(HeadName, !ModeAssignAccptFlag);
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
    HeadName.push( $1 );
   %}
  | STARTCLASS SYMBOL
   %{
    StartFlag = 1;
    HeadName.push( $2 );
   %}
  ;

body
  : SYMBOL
   %{
    BodyName[BodyNo++].push( $1 );
   %}
  ;

control
  : CTRL_ASSIGN remark
   %{
    ModeAssignAccptFlag = 1;
   %}
  | CTRL_IGNORE
   %{
    ModeAssignAccptFlag = 0;
   %}
  ;

remark
  : REMARK
  | NL
  ;

/* #include "lex.yy.c" => see custom lexer */

%%



/*
void setGram( void )
{
    char *name;

    yyparse();
    if( !SW_Quiet ){
	fprintf( stderr, "\rNow modifying grammar to minimize states[%d]\n", GramModifyNum - 1 );
	NoNewLine = 0;
    }
    if( StartSymbol == NULL ) StartSymbol = ClassList;
    fprintf( FPheader, "// Start Symbol: %s \n", StartSymbol->name );
    fclose( FPheader );
    if( (name = chkNoInstantClass()) != NULL ){
	errMes( "Prototype-declared Class \"%s\" has no instant definitions", name );
    }
    if( ErrParse ) errMes( "%d fatal errors exist", ErrParse );
}
*/

