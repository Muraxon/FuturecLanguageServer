import { Diagnostic, DiagnosticSeverity, Position, SignatureInformation, TextDocument } from 'vscode-languageserver';
import { CursorPositionInformation, CursorPositionType } from '../CursorPositionInformation';
import { Script } from '../Script';
import { GlobalAnalyzer, parserFunctions } from '../server';


interface TokenRange {
	start :number;
	end :number;
}

class Token {
	m_Range :TokenRange;
	m_Text :string;
	constructor(text :string, range :TokenRange) {
		this.m_Range = range;
		this.m_Text = text;
	}
}

class Variable {
	m_Name :string;
	m_Scope :number;
	m_Type :string;
	m_IsUsed :boolean;
	m_Token :Token|null;
	m_IsInIncludescript :boolean;

	constructor(name :string, scope :number, type :string, isInIncludescript :boolean, token: Token|null = null) {
		this.m_Name = name;
		this.m_Scope = scope;
		this.m_Type = type;
		this.m_IsUsed = false;
		this.m_Token = token;
		this.m_IsInIncludescript = isInIncludescript;
	}

	used() {
		this.m_IsUsed = true;
	}
}

interface ScriptInformation {
	m_definedVariables :Map<string , Variable>[];
	m_definedFunctions :string[][];
	m_diagnostics :Diagnostic[];
	m_ScopeLevel :number;
}

export class CParser {
	getToken(token :Token[], pos :number) {
		if(token[pos]) {
			return token[pos];
		}
		while(pos >= 0 && !token[pos]) {
			pos--;
		}
		throw token[pos];
	}

	m_ErrorCount :number;

	constructor() {
		this.m_ErrorCount = 0;	
	}
	isVariableDefined(variable :string, definedVariables_ :Map<string, Variable>[], scope :number) :Variable|undefined {
		let j = 0;
		let variable_tmp :Variable|undefined = undefined;
		while(variable_tmp == undefined && j <= scope) {
			variable_tmp = definedVariables_[j].get(variable);
			if(variable_tmp) { break; }
			j++;
		}
		return variable_tmp;
	}
	
	isFunctionDefined(functionname :string, definedFunctions :string[][], scope :number) :number {
		let index :number = -1;
		let x = 0;
		while(index < 0 && x <= scope) {
			if(definedFunctions[x]) {
				index = definedFunctions[x].indexOf(functionname);
				x++;
			} else {
				break;
			}
		}
		return index;
	}

	ParseText(_NotManagedDocs :Map<string, TextDocument>, script :Script, isIncludescript :boolean, definedVariables_ :Map<string, Variable>[]|null = null, definedFunctions_ :string[][]|null = null, scopeLevel_ :number|null = null) :ScriptInformation {
		if(isIncludescript) {
			GlobalAnalyzer.getIncludeScriptForCurrentScript(script, _NotManagedDocs, false);
		}
		let text = script.m_scripttext;
		let pos = 0;

		let tokens :Token[] = [];

		let startOfIdentifier = -1;
		while(pos < text.length) {
			let char = text.charAt(pos);
			if(char.match(/[ \t\n\r]/)) { 
				if(startOfIdentifier >= 0) {
					let token = new Token(text.substring(startOfIdentifier, pos), {start: startOfIdentifier, end: pos});

					tokens.push(token);
					startOfIdentifier = -1;
				}
				pos++;
				continue;
			}

			if(char == "/") { 
				if((pos + 1 < text.length) && (text.charAt(pos + 1) == "/")) {
					let posTemp = text.indexOf("\n", pos);
					if(posTemp > pos) {

						if(script.m_ScriptType == "SCRIPT") {
							let reg = /\/\/\s*(ADDHOOK[^0-9]*[0-9]+.*)\s*/g;
							let tempText = text.substring(pos, posTemp);
							let m = reg.exec(tempText);
							if(m) {
								let token = new Token("__ADDHOOK__", {start: pos, end: pos + 9});
								let token2 = new Token(script.m_scriptnumber.toString(), {start: pos + 10, end: pos + 10 + (<string>m[1]).length});
								let token3 = new Token("//" + m[1], {start: pos, end: pos + (<string>m[1]).length + 2});
						
								tokens.push(token);
								tokens.push(token2);
								tokens.push(token3);
							}
						}
						pos = posTemp;
						startOfIdentifier = -1;
					} else {
						if(script.m_ScriptType == "SCRIPT") {
							let reg = /\/\/\s*(ADDHOOK[^0-9]*[0-9]+.*)\s*/g;
							let tempText = text.substring(pos);
							let m = reg.exec(tempText);
							if(m) {
								let token = new Token("__ADDHOOK__", {start: pos, end: pos + 9});
								let token2 = new Token(script.m_scriptnumber.toString(), {start: pos + 10, end: pos + 10 + (<string>m[1]).length});
								let token3 = new Token("//" + m[1], {start: pos, end: pos + (<string>m[1]).length + 2});
						
								tokens.push(token);
								tokens.push(token2);
								tokens.push(token3);
							}
						}
						pos = text.length;
					}
					continue;
				}
				if((pos + 1 < text.length) && (text.charAt(pos + 1) == "*")) {
					pos++;
					pos++;
					while(pos < text.length) {
						if(text.charAt(pos) == "*") {
							if(pos + 1 < text.length && text.charAt(pos + 1) == "/") {
								pos++;
								pos++;
								startOfIdentifier = -1;
								break;
							}
						}
						pos++;
					}
					continue;
				}
			}
			if(char == "\"") {
				if(startOfIdentifier < 0) { startOfIdentifier = pos; }
				pos++;
				char = text.charAt(pos);
				if(char == "\"") {
					let token = new Token(text.substring(startOfIdentifier, pos + 1), {start: startOfIdentifier, end: pos + 1});
					tokens.push(token);
				} else {
					while(pos < text.length && char != "\"") {
						char = text.charAt(pos);
						if(char == "\\") { pos++; }
						pos++;
					}
					let token = new Token(text.substring(startOfIdentifier, pos), {start: startOfIdentifier, end: pos});
					pos--;
					tokens.push(token);
				}
				startOfIdentifier = -1;
			}
			else if(char.match(/[a-zA-Z_öäüÖÄÜß0-9]/)) {
				if(startOfIdentifier < 0) { startOfIdentifier = pos; }
			}
			else if(char.match(/[^a-zA-Z_öäüÖÄÜß0-9]/)) {
				if(startOfIdentifier >= 0) {
					let token = new Token(text.substring(startOfIdentifier, pos), {start: startOfIdentifier, end: pos});
					
					tokens.push(token);
					startOfIdentifier = -1;
				}
				
				let token = new Token(text.substring(pos, pos + 1), {start: pos, end: pos + 1});
				tokens.push(token);
			}

			pos++;
		}

		return this.processTokens(_NotManagedDocs, tokens, script, definedVariables_, definedFunctions_, scopeLevel_, isIncludescript);
	}

	addError(text :string, diag :Diagnostic[], doc :TextDocument, scriptPos :Position, token :Token, isIncludescript :boolean, serverity :DiagnosticSeverity = DiagnosticSeverity.Error, code :number = 0) {
		// do NOT add Errors when we parse tokens in an includescript
		if(serverity == DiagnosticSeverity.Error) { this.m_ErrorCount++; }
		if(isIncludescript) { return; }

		let posEnd = doc.positionAt(token.m_Range.end);
		let posStart = doc.positionAt(token.m_Range.start);
		diag.push({
			message: text,
			range: {
				end: {
					character: posEnd.character,
					line: posEnd.line + scriptPos.line
				},
				start: {
					character: posStart.character,
					line: posStart.line + scriptPos.line
				}
			},
			severity: serverity,
			source: "futurec",
			code: code
		})
	}

	IsType(text :string) {
		if(text == "BYTE" || text == "BOOL" || text == "void" || text == "CTable" || text == "CMoney" || text == "CDateTime" || text == "CString" || text == "int" || text == "double") {
			return true;
		}
		return false;
	}

	isKeyword(text :string) {
		if(text == "return" || text == "funcreturn" || text == "if" || text == "foreachrow" || text == "foreachrowreverse" || text == "while" || text == "else" || text == "OR" || text == "AND") {
			return true;
		}
		return false;
	}

	isControlChar(text :string) {
		if(text.match(/[;{}()=<>,!+-/*%§$]/)) {
			return true;
		}
		return false;
	}

	isPredefinedContext(text :string) {
		if(text.match(/\b[DPFSH]\b/)) {
			return true;
		}
		return false;
	}

	IsVariable(text :string) {
		if(this.isControlChar(text) || this.isKeyword(text) || this.IsType(text) || this.isPredefinedContext(text)) {
			return false;
		}
		if(text.charAt(0).match(/[0-9]/) || text.charAt(0) == "\"") {
			return false;
		}
		return true;
	}

	AddStandardVariables(vars :Map<string, Variable>) {
		vars.set("FALSE", new Variable("FALSE", 0, "BOOL", false));
		vars.set("TRUE", new Variable("TRUE", 0, "BOOL", false));
		vars.set("DIR_DOWN", new Variable("DIR_DOWN", 0, "BOOL", false));
		vars.set("DIR_UP", new Variable("DIR_UP", 0, "BOOL", false));
		vars.set("m_Rec", new Variable("m_Rec", 0, "CTable", false));
		vars.set("m_Rec2", new Variable("m_Rec2", 0, "CTable", false));
		vars.set("m_RecNr", new Variable("m_RecNr", 0, "int", false));
		vars.set("m_TabNr", new Variable("m_TabNr", 0, "int", false));
		vars.set("m_strFullProtocol", new Variable("m_strFullProtocol", 0, "CString", false));
		vars.set("m_strTextBox", new Variable("m_strTextBox", 0, "CString", false));
		vars.set("m_nMandant", new Variable("m_nMandant", 0, "int", false));
		vars.set("m_bBiciMode", new Variable("m_bBiciMode", 0, "BOOL", false));
		vars.set("m_nJahr", new Variable("m_nJahr", 0, "int", false));
		vars.set("m_tSelectionTable", new Variable("m_tSelectionTable", 0, "CTable", false));
		vars.set("m_nUnitTestID", new Variable("m_nUnitTestID", 0, "int", false));
		vars.set("mstrUnitTestResult1", new Variable("mstrUnitTestResult1", 0, "CTable", false));
		vars.set("mstrUnitTestResult2", new Variable("mstrUnitTestResult2", 0, "CTable", false));
		vars.set("mstrUnitTestResult3", new Variable("mstrUnitTestResult3", 0, "CTable", false));

		vars.set("STRING_TAB", new Variable("STRING_TAB", 0, "CString", false));
		vars.set("STRING_LINEBREAK", new Variable("STRING_LINEBREAK", 0, "CString", false));
		vars.set("STRING_QUOTE", new Variable("STRING_QUOTE", 0, "CString", false));
		vars.set("STRING_SLASH1", new Variable("STRING_SLASH1", 0, "CString", false));
		vars.set("STRING_SLASH2", new Variable("STRING_SLASH2", 0, "CString", false));
		vars.set("STRING_BACKSLASH1", new Variable("STRING_BACKSLASH1", 0, "CString", false));
		vars.set("STRING_PARENTHESISOPEN", new Variable("STRING_PARENTHESISOPEN", 0, "CString", false));
		vars.set("STRING_PARENTHESISCLOSE", new Variable("STRING_PARENTHESISCLOSE", 0, "CString", false));
		vars.set("STRING_LINEFEED", new Variable("STRING_LINEFEED", 0, "CString", false));
		vars.set("STRING_BRACKETOPEN", new Variable("STRING_BRACKETOPEN", 0, "CString", false));
		vars.set("STRING_BRACKETCLOSE", new Variable("STRING_BRACKETCLOSE", 0, "CString", false));
		vars.set("STRING_BRACESOPEN", new Variable("STRING_BRACESOPEN", 0, "CString", false));
		vars.set("STRING_BRACESCLOSE", new Variable("STRING_BRACESCLOSE", 0, "CString", false));
		vars.set("STRING_RAUTE", new Variable("STRING_RAUTE", 0, "CString", false));
		vars.set("STRING_CARRIAGERETURN", new Variable("STRING_CARRIAGERETURN", 0, "CString", false));

		vars.set("TYPE_INT", new Variable("TYPE_INT", 0, "int", false));
		vars.set("TYPE_MONEY", new Variable("TYPE_MONEY", 0, "int", false));
		vars.set("TYPE_VARSTRING", new Variable("TYPE_VARSTRING", 0, "int", false));
		vars.set("TYPE_FIXSTRING", new Variable("TYPE_FIXSTRING", 0, "int", false));
		vars.set("TYPE_BOOL", new Variable("TYPE_BOOL", 0, "int", false));
		vars.set("TYPE_BYTE", new Variable("TYPE_BYTE", 0, "int", false));
		vars.set("TYPE_LINK", new Variable("TYPE_LINK", 0, "int", false));
		vars.set("TYPE_DOUBLE", new Variable("TYPE_DOUBLE", 0, "int", false));
		vars.set("TYPE_CTABLE", new Variable("TYPE_CTABLE", 0, "int", false));
		vars.set("TYPE_DATETIME", new Variable("TYPE_DATETIME", 0, "int", false));
		vars.set("TYPE_PERCENT", new Variable("TYPE_PERCENT", 0, "int", false));
		vars.set("TYPE_SUBTABLE", new Variable("TYPE_SUBTABLE", 0, "int", false));

		vars.set("DLG_EDIT", new Variable("DLG_EDIT", 0, "int", false));
		vars.set("DLG_COMBO", new Variable("DLG_COMBO", 0, "int", false));
		vars.set("DLG_LINK_COMBO", new Variable("DLG_LINK_COMBO", 0, "int", false));
		vars.set("DLG_EDIT_PASSWORD", new Variable("DLG_EDIT_PASSWORD", 0, "int", false));
		vars.set("DLG_EDIT_MONEY", new Variable("DLG_EDIT_MONEY", 0, "int", false));
		vars.set("DLG_EDIT_DATE", new Variable("DLG_EDIT_DATE", 0, "int", false));
		vars.set("DLG_EDIT_PERCENT", new Variable("DLG_EDIT_PERCENT", 0, "int", false));
		vars.set("DLG_EDIT_NUMERIC", new Variable("DLG_EDIT_NUMERIC", 0, "int", false));
		vars.set("DLG_LINK_SEARCH", new Variable("DLG_LINK_SEARCH", 0, "int", false));
		vars.set("DLG_EDIT_MULTILINE", new Variable("DLG_EDIT_MULTILINE", 0, "int", false));
		vars.set("DLG_PICTURE", new Variable("DLG_PICTURE", 0, "int", false));
		vars.set("DLG_CHECKBOX", new Variable("DLG_CHECKBOX", 0, "int", false));
		vars.set("DLG_LISTVIEW", new Variable("DLG_LISTVIEW", 0, "int", false));
	}

	processTokens(_NotManagedDocs :Map<string, TextDocument>,
					tokens :Token[],
					script :Script,
					definedVariables_ :Map<string, Variable>[]|null = null,
					definedFunctions_ :string[][]|null = null,
					scopeLevel_ :number|null = null,
					isIncludescript :boolean = false) :ScriptInformation {

		let diag :Diagnostic[] = [];

		let found = script.m_scripttext.search(/#includescript\s+[0-9]+\b/);
		let hasIncludescript = found >= 0;

		let doc = TextDocument.create("", "", 0, script.m_scripttext);
		let scriptPos = script.m_Position;

		let definedVariables :Map<string, Variable>[] = [];
		let globalScope = new Map();
		
		if(!definedVariables_) {
			this.AddStandardVariables(globalScope);
			definedVariables.push(globalScope);
		} else {
			definedVariables = definedVariables_;
		}

		let variablesToAddToStackAfterScopeIncrement :Map<number, string[]> = new Map();

		let definedFunctions :string[][] = [];
		if(definedFunctions_) {
			definedFunctions = definedFunctions_;
		} else {
			definedFunctions.push([]);
		}

		let scopeLevel = 0;
		if(scopeLevel_) {
			scopeLevel = scopeLevel_;
		}

		if(script.m_MainScript) {
			let num = this.m_ErrorCount;
			scopeLevel = this.ParseText(_NotManagedDocs, script.m_MainScript, true, definedVariables, definedFunctions, 0).m_ScopeLevel;
			num -= this.m_ErrorCount;
			if(num != 0) {
				this.addError("Mainscript " + script.m_MainScript.m_scriptnumber + " has some errors/warnings in it. Diagnostics after this point cannot be fully trusted", diag, doc, scriptPos, {m_Range: {end: 0, start: 0}, m_Text: ""}, isIncludescript, DiagnosticSeverity.Information);
			}
		} 

		let savedScopeLevel :number[] = [];
		let addNextTimeSameScope :boolean[] = [];

		let functionReturnType = "";
		let functionReturnTypeProcessed = false;
		try {

			for(let i = 0; i < tokens.length; i++) {
				let currentToken = this.getToken(tokens,i);
				let currentTokenText = currentToken.m_Text;
				if(currentTokenText.startsWith("\"")) {
					continue;
				}
				
				if(currentTokenText == "ENDFUNCTION") {
					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text != ";") {
						this.addError("After ENDFUNCTION must follow an ';'", diag, doc, scriptPos, secondToken, isIncludescript);
					}
					
					if(!functionReturnTypeProcessed && functionReturnType != "void") {
						this.addError("Returntype != 'void', returntype must be of type '"+functionReturnType+"'", diag, doc, scriptPos, currentToken, isIncludescript);
					}

					functionReturnTypeProcessed = false;
					functionReturnType = "";
					if(scopeLevel - 1 >= 0) {
						definedVariables.pop();
						definedFunctions.pop();
						scopeLevel--;
					}else {
						this.addError("One '}' is unexpected. You are already in the global scope", diag, doc, scriptPos, currentToken,isIncludescript);
					}
				}
				else if(currentTokenText == "FUNCTION") {
					definedVariables.push(new Map());
					definedFunctions.push([]);
					scopeLevel++;

					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text != ":") {
						this.addError("After FUNCTION must follow an ':'", diag, doc, scriptPos, secondToken, isIncludescript);
					} else {
						let thirdToken = this.getToken(tokens,i + 2);
						if(!this.IsType(thirdToken.m_Text)) {
							this.addError("Type (CString|int|double|CTable|CDateTime|CMoney|BOOL) was expected '"+thirdToken.m_Text+"'", diag, doc, scriptPos, thirdToken, isIncludescript);
						} else {
							let functionText = tokens[i + 3].m_Text;
							functionReturnType = thirdToken.m_Text;

							let index :number = this.isFunctionDefined(functionText, definedFunctions, scopeLevel);
							if(index >= 0) {
								this.addError("function '"+functionText+"' already defined", diag, doc, scriptPos, tokens[i + 3], isIncludescript);
							} else {
								definedFunctions[scopeLevel - 1].push(functionText);
							}

							if(tokens[i + 4].m_Text != "(") {
								this.addError("'(' expected", diag, doc, scriptPos, tokens[i + 4], isIncludescript);
							} else {
								let j = i + 5;
								let success = false;
								if(tokens[j].m_Text == ")") {
									j++;
									success = true;
								} else {

									while(true) {
										let typeText = tokens[j].m_Text;
										if(!this.IsType(typeText)) {
											this.addError("type expected '"+typeText+"'", diag, doc, scriptPos, tokens[j], isIncludescript);
											break;
										}
										j++;
										
										
										if(tokens[j].m_Text == "&") {
											j++;
											if(!this.IsVariable(tokens[j].m_Text)) {
												this.addError("variablename expected '"+tokens[j].m_Text+"'", diag, doc, scriptPos, tokens[j], isIncludescript);
												break;
											}
											if(definedVariables[scopeLevel].get(tokens[j].m_Text)) {
												this.addError("Another parameter is already named like this '"+tokens[j].m_Text+"'", diag, doc, scriptPos, tokens[j], isIncludescript);
												break;
											} else {
												definedVariables[scopeLevel].set(tokens[j].m_Text, new Variable(tokens[j].m_Text, scopeLevel, typeText, isIncludescript, tokens[j]));	
											}
										} else {
											if(!this.IsVariable(tokens[j].m_Text)) {
												this.addError("variablename expected '"+tokens[j].m_Text+"'", diag, doc, scriptPos, tokens[j], isIncludescript);
												break;
											}
											if(definedVariables[scopeLevel].get(tokens[j].m_Text)) {
												this.addError("Another parameter is already named like this '"+tokens[j].m_Text+"'", diag, doc, scriptPos, tokens[j], isIncludescript);
												break;
											} else {
												definedVariables[scopeLevel].set(tokens[j].m_Text, new Variable(tokens[j].m_Text, scopeLevel, typeText, isIncludescript, tokens[j]));	
											}
										}
										
										
										j++;
										
										if(tokens[j].m_Text == ")") {
											j++;
											success = true;
											break;
										} else if(tokens[j].m_Text != ",") {
											this.addError("',' or ')' expected '"+tokens[j].m_Text+"'", diag, doc, scriptPos, tokens[j], isIncludescript);
											break;
										}
										j++;
									}
								}
								if(success && tokens[j].m_Text != ";") {
									this.addError("; expected '"+tokens[j].m_Text+"'", diag, doc, scriptPos, tokens[j], isIncludescript);
								}
								i = j;
							}
						}
					}
				} 
				else if(currentTokenText == "Call") {
					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text == ":") {
						let thirdToken = this.getToken(tokens,i + 2);

						let index :number = this.isFunctionDefined(thirdToken.m_Text, definedFunctions, scopeLevel);
						if(index < 0) {
							this.addError("No Function with name '"+thirdToken.m_Text+"' found. Maybe this script gets included somewhere. But resolving this is not yet supported.", diag, doc, scriptPos, thirdToken, isIncludescript, DiagnosticSeverity.Information);
						}
					} else {
						this.addError(": expected '"+secondToken.m_Text+"'", diag, doc, scriptPos, secondToken, isIncludescript);
					}
					i += 2;
				}
				else if(this.isPredefinedContext(currentTokenText)) {
					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text != ".") {
						this.addError("'.' expected", diag, doc, scriptPos, secondToken,isIncludescript);
					} else {
						let thirdToken = this.getToken(tokens,i + 2);
						if(!this.IsVariable(thirdToken.m_Text)) {
							this.addError("Parserfunction expected '"+thirdToken.m_Text+"'", diag, doc, scriptPos, thirdToken,isIncludescript);
							i += 1;
						} else {
							let fourtThoken = this.getToken(tokens,i + 3);
							if(fourtThoken.m_Text != "(") {
								this.addError("'(' expected", diag, doc, scriptPos, fourtThoken,isIncludescript);
								i += 2;
								continue;
							}
	
							let isNegated = false;
							if(i >= 1) {
								isNegated = this.getToken(tokens,i - 1).m_Text == "!";
							}
							
							i += 3;
							if(thirdToken.m_Text == "IsVariableDefined") {
								let fifthToken = this.getToken(tokens,i + 1);
								if(this.IsVariable(fifthToken.m_Text)) {
									let map = variablesToAddToStackAfterScopeIncrement.get(scopeLevel);
									if(map) {
										map.push(fifthToken.m_Text);
									} else {
										variablesToAddToStackAfterScopeIncrement.set(scopeLevel, [fifthToken.m_Text]);
									}
								} else {
									this.addError("'"+fifthToken.m_Text+"' must be a variable", diag, doc, scriptPos, fourtThoken,isIncludescript);
								}
	
								// if(isNegated) {
								// 	if(savedScopeLevel[savedScopeLevel.length - 1] != scopeLevel) {
								// 		savedScopeLevel.push(scopeLevel);
								// 	}

								// 	if(!addNextTimeSameScope[addNextTimeSameScope.length - 1]) {
								// 		addNextTimeSameScope.push(true);
								// 	}
								// }
								i+=1;
							} else {
								if(parserFunctions) {
									let func = parserFunctions.getSignature(new CursorPositionInformation(thirdToken.m_Text, thirdToken.m_Text.charAt(0), CursorPositionType.PARSER_FUNCTION, currentTokenText, 0))
									if(!func) {
										this.addError("Function '"+thirdToken.m_Text+"' is not a parserfunction from the global namespace '"+currentTokenText+"'", diag, doc, scriptPos, thirdToken, isIncludescript);
									}
								}
							}
						}

					}
				} else if(currentTokenText == "}") {
					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text != ";") {
						if(secondToken.m_Text != "else") {
							this.addError("';' expected after '}'", diag, doc, scriptPos, currentToken,isIncludescript);
						}
					}
					if(scopeLevel - 1 >= 0) {
						definedFunctions.pop();
						definedVariables.pop();
						scopeLevel--;
					} else {
						this.addError("One '}' is unexpected. You are already in the global scope", diag, doc, scriptPos, currentToken,isIncludescript);
					}
				}else if(currentTokenText == "{") {
					scopeLevel++;

					let newScope = new Map();

					if(addNextTimeSameScope.length > 0 && savedScopeLevel.length > 0) {
						let addNextTimeTmp = addNextTimeSameScope[addNextTimeSameScope.length - 1];
						let savedScopeLevelTmp = savedScopeLevel[savedScopeLevel.length - 1];
						if(savedScopeLevelTmp >= 0 && savedScopeLevelTmp == scopeLevel - 1) {
							if(addNextTimeTmp) {
								addNextTimeSameScope[addNextTimeSameScope.length - 1] = false;
							}
						} 
						if (!addNextTimeTmp) {
							let map = variablesToAddToStackAfterScopeIncrement.get(scopeLevel - 1);
							if(map) {
								map.forEach((val :string) => {
									let type = "int";
									if(val.substring(0, 3) == "str") {
										type = "CString";
									} else if(val.substring(0, 2) == "dt") {
										type = "CDateTime";
									} else if(val.substring(0, 1) == "b") {
										type = "BOOL";
									} else if(val.substring(0, 1) == "t") {
										type = "CTable";
									} else if(val.substring(0, 1) == "m") {
										type = "CMoney";
									} else if(val.substring(0, 1) == "d") {
										type = "double";
									} 

									newScope.set(val, new Variable(val, scopeLevel, type, isIncludescript));
								});
								variablesToAddToStackAfterScopeIncrement.delete(scopeLevel - 1);
							}
							addNextTimeSameScope.pop();
							savedScopeLevel.pop();
						}
					} else {
						let map = variablesToAddToStackAfterScopeIncrement.get(scopeLevel - 1);
						if(map) {
							map.forEach((val :string) => {
								let type = "int";
								if(val.substring(0, 3) == "str") {
									type = "CString";
								} else if(val.substring(0, 2) == "dt") {
									type = "CDateTime";
								} else if(val.substring(0, 1) == "b") {
									type = "BOOL";
								} else if(val.substring(0, 1) == "t") {
									type = "CTable";
								} else if(val.substring(0, 1) == "m") {
									type = "CMoney";
								} else if(val.substring(0, 1) == "d") {
									type = "double";
								} 

								newScope.set(val, new Variable(val, scopeLevel, type, isIncludescript));
							});
							variablesToAddToStackAfterScopeIncrement.delete(scopeLevel - 1);
						}
						addNextTimeSameScope.pop();
						savedScopeLevel.pop();
					}
					
					definedVariables.push(newScope);
					definedFunctions.push([]);
				} 
				else if(currentTokenText == "§") {
					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text != "START_JSON") {
						this.addError("After '§' must follow an 'START_JSON'", diag, doc, scriptPos, secondToken,isIncludescript);
					} else {
						let thirdToken = this.getToken(tokens,i + 2);
						if(thirdToken.m_Text != "§") {
							this.addError("After 'START_JSON' must follow an '§'", diag, doc, scriptPos, secondToken,isIncludescript);
						} else {
							i += 3;
							let json :string = "";
							do {
								let nextJsonToken = this.getToken(tokens,i);
								if(nextJsonToken.m_Text == "§") {
									i++;
									let tokenAfterParagraph = this.getToken(tokens,i);
									if(tokenAfterParagraph.m_Text == "END_JSON") {
										i++;
										let tokenAfterEndToken = this.getToken(tokens,i);
										if(tokenAfterEndToken.m_Text != "§") {
											this.addError("After 'END_JSON' must follow an '§'", diag, doc, scriptPos, tokenAfterParagraph,isIncludescript);
										}
										break;
									} else {
										json += nextJsonToken.m_Text;

										if(tokenAfterParagraph.m_Text == "$") {
											let tempToken = this.getToken(tokens,i + 1);
											if(this.IsVariable(tempToken.m_Text)) {
												
												let variable = this.isVariableDefined(tempToken.m_Text, definedVariables, scopeLevel);
												if(!variable) {
													let errorText = "'"+tempToken.m_Text+"' possibly not defined, maybe";
													let severity :DiagnosticSeverity = DiagnosticSeverity.Information;
													if(hasIncludescript) {
														severity = DiagnosticSeverity.Information;
														errorText += " it is defined in an includescript, or";
													}
													this.addError(errorText + " this script gets included somewhere. But resolving this is not yet supported.", diag, doc, scriptPos, tempToken, isIncludescript, severity);
												}
											}
										} else {
											this.addError("After '§' must follow an '$'", diag, doc, scriptPos, tokenAfterParagraph,isIncludescript);
										}
										
										json += tokenAfterParagraph.m_Text;
									}
								} else {
									json += nextJsonToken.m_Text;
									if(nextJsonToken.m_Text == "$") {
										let tempToken = this.getToken(tokens,i + 1);
										json += tempToken.m_Text;
										if(tempToken.m_Text != "§") {
											this.addError("After '$' must follow an '§'", diag, doc, scriptPos, tempToken,isIncludescript);
										}
										i++;
									}
								}

								i++;
							} while (i < tokens.length);
							
							
							while(json.indexOf("\"§$") >= 0) {
								json = json.replace("\"§$", "cTESTUNGSOc");
							}
							while(json.indexOf("$§\"") >= 0) {
								json = json.replace("$§\"", "bSOUNGTESTUNGb");
							}
							while(json.indexOf("§$") >= 0) {
								json = json.replace("§$", "cTESTUNGSOc");
							}
							while(json.indexOf("$§") >= 0) {
								json = json.replace("$§", "bSOUNGTESTUNGb");
							}
							
							while(json.indexOf("cTESTUNGSOc") >= 0) {
								json = json.replace("cTESTUNGSOc", "\"§$");
							}
							while(json.indexOf("bSOUNGTESTUNGb") >= 0) {
								json = json.replace("bSOUNGTESTUNGb", "$§\"");
							}
							try {
								JSON.parse(json);
							} catch (error) {
								this.addError(error.message, diag, doc, scriptPos, secondToken,isIncludescript);
							}
						}
					}
				}
				else if(this.IsType(currentTokenText)) {
					let secondToken = this.getToken(tokens,i + 1);
					let nextIdent = secondToken.m_Text;
					if(this.isKeyword(nextIdent) || this.IsType(nextIdent) || this.isControlChar(nextIdent)) {
						this.addError("unexpected keyword, variable declaration or control character detected: '"+ nextIdent +"'", diag, doc, scriptPos, secondToken,isIncludescript);
						i += 1;
					} else {
						let thirdToken = this.getToken(tokens,i + 2);
						if(thirdToken.m_Text == ";" || thirdToken.m_Text == "=") {
							
							let j = 0;
							let variable :Variable|undefined = undefined;
							while(variable == undefined && j < scopeLevel) {
								variable = definedVariables[j].get(nextIdent);
								j++;
							}
							if(variable) {
								this.addError("shadowing of variable '" + nextIdent + "' detected" , diag, doc, scriptPos, secondToken, isIncludescript, DiagnosticSeverity.Hint);
							}
							else if(definedVariables[scopeLevel].get(nextIdent)) {
								this.addError("Redefining variable '" + nextIdent + "'" , diag, doc, scriptPos, secondToken, isIncludescript, DiagnosticSeverity.Information);
							}
							definedVariables[scopeLevel].set(nextIdent, new Variable(nextIdent, scopeLevel, currentTokenText, isIncludescript, secondToken));
							
							// completly new expression-tree must be analysed

						} else {
							this.addError("';' or '=' expected", diag, doc, scriptPos, secondToken, isIncludescript);
						}
						i += 2;
					}
				}
				else if(this.isKeyword(currentTokenText)) {
					if(currentTokenText == "funcreturn") {
						functionReturnTypeProcessed = true;
						if(functionReturnType.length > 0) {
							if(functionReturnType == "void") {
								this.addError("Functions returntype is void. 'funcreturn' is not allowed", diag, doc, scriptPos, currentToken, isIncludescript);
							}
						}

						let secondToken = this.getToken(tokens,i + 1);
						if(!this.IsVariable(secondToken.m_Text)) {
							if(functionReturnType == "int" || functionReturnType == "double") {
								if(isNaN(parseFloat(secondToken.m_Text))){
									this.addError("Returntype mismatch '"+functionReturnType+"' != typeof '"+secondToken.m_Text+"'", diag, doc, scriptPos, currentToken, isIncludescript);
								}
							} else if(functionReturnType == "CString") {
								if(secondToken.m_Text.charAt(0) != "\"") {
									this.addError("Returntype mismatch '"+functionReturnType+"' != typeof '"+secondToken.m_Text+"'", diag, doc, scriptPos, currentToken, isIncludescript);
								}
							}
						} else {
							let variable = this.isVariableDefined(secondToken.m_Text, definedVariables, scopeLevel);
							if(!variable) {
								let errorText = "'"+secondToken.m_Text+"' possibly not defined, maybe";
								let severity :DiagnosticSeverity = DiagnosticSeverity.Information;
								if(hasIncludescript) {
									severity = DiagnosticSeverity.Information;
									errorText += " it is defined in an includescript, or";
								}
								this.addError(errorText + " this script gets included somewhere. But resolving this is not yet supported.", diag, doc, scriptPos, secondToken, isIncludescript, severity);
							} else {
								if(functionReturnType.length > 0) {
									if(functionReturnType != variable.m_Type) {
										this.addError("Returntype mismatch '"+functionReturnType+"' != '"+variable.m_Type+"'", diag, doc, scriptPos, currentToken, isIncludescript);
									}
								}
							}
						}
						i += 1;
					} else if(currentTokenText == "foreachrow" || currentTokenText == "foreachrowreverse") {
						let secondToken = this.getToken(tokens,i + 1);
						if(secondToken.m_Text == "(") {
							let thirdToken = this.getToken(tokens,i + 2);
							if(this.IsVariable(thirdToken.m_Text)) {
								let variable = this.isVariableDefined(thirdToken.m_Text, definedVariables, scopeLevel);
								if(!variable) {
									let errorText = "'"+currentTokenText+"' possibly not defined, maybe";
									let severity :DiagnosticSeverity = DiagnosticSeverity.Information;
									if(hasIncludescript) {
										severity = DiagnosticSeverity.Information;
										errorText += " it is defined in an includescript, or";
									}
									this.addError(errorText + " this script gets included somewhere. But resolving this is not yet supported.", diag, doc, scriptPos, thirdToken, isIncludescript, severity);
								}
								let fourthToken = this.getToken(tokens,i + 3);
								if(fourthToken.m_Text == ";") {
									let fifthToken = this.getToken(tokens,i + 4);
									if(this.IsVariable(fifthToken.m_Text)) {
										let map = variablesToAddToStackAfterScopeIncrement.get(scopeLevel);
										if(map) {
											map.push(fifthToken.m_Text);
										} else {
											variablesToAddToStackAfterScopeIncrement.set(scopeLevel, [fifthToken.m_Text]);
										}
										let sixthToken = this.getToken(tokens,i + 5);
										if(sixthToken.m_Text != ")") {
											if(sixthToken.m_Text != ";") {
												this.addError("')' expected '"+sixthToken.m_Text+"'", diag, doc, scriptPos, sixthToken,isIncludescript);
											} else {
												let seventhToken = this.getToken(tokens,i + 6);
												if(seventhToken.m_Text == "FALSE" || seventhToken.m_Text == "TRUE") {
													let eighthtoken = this.getToken(tokens,i + 7);
													if(eighthtoken.m_Text != ")") {
														this.addError("')' expected '"+eighthtoken.m_Text+"'", diag, doc, scriptPos, eighthtoken,isIncludescript);
													}
												} else {
													this.addError("Either 'FALSE' or 'TRUE' expected '"+seventhToken.m_Text+"'", diag, doc, scriptPos, seventhToken,isIncludescript);
												}
											}
										}
									} else {
										this.addError("variable expected '"+fifthToken.m_Text+"'", diag, doc, scriptPos, fifthToken,isIncludescript);
									}
								} else {
									this.addError("';' expected '"+fourthToken.m_Text+"'", diag, doc, scriptPos, fourthToken,isIncludescript);
								}
							} else {
								this.addError("variable expected '"+thirdToken.m_Text+"'", diag, doc, scriptPos, thirdToken,isIncludescript);
							}
						} else {
							this.addError("'(' expected '"+secondToken.m_Text+"'", diag, doc, scriptPos, secondToken,isIncludescript);
						}
						i += 5;
					}
					
				} 
				else if(currentTokenText == "#") {
					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text == "includescript") {
						let thirdToken = this.getToken(tokens,i + 2);
						let number = thirdToken.m_Text.match(/([0-9]+)/);
						if(!number) {
							this.addError("Number expected '"+thirdToken.m_Text+"'", diag, doc, scriptPos, secondToken,isIncludescript);
						}  else {
							for (let x = 0; x < script.m_IncludeScript.length; x++) {
								if(parseInt(number[1]) == script.m_IncludeScript[x].m_scriptnumber) {
									let num = this.m_ErrorCount;
									this.ParseText(_NotManagedDocs, script.m_IncludeScript[x], true, definedVariables, definedFunctions, scopeLevel);
									num = num - this.m_ErrorCount;
									if(num != 0) {
										this.addError("includescript " + number[1] + " has some errors/warnings in it. Diagnostics after this point cannot be fully trusted", diag, doc, scriptPos, secondToken, isIncludescript, DiagnosticSeverity.Information);
									}
									break;
								}								
							}
						}
					} else {
						this.addError("'includescript' expected '"+secondToken.m_Text+"'", diag, doc, scriptPos, secondToken,isIncludescript);
					}
					i += 2;
				}
				else if(currentTokenText == "&") {
					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text == "&") {
						this.addError("'&&' detected. Maybe use 'AND' for clarity", diag, doc, scriptPos, secondToken, isIncludescript, DiagnosticSeverity.Information);
						i += 1
					}
				}
				else if(currentTokenText == "|") {
					let secondToken = this.getToken(tokens,i + 1);
					if(secondToken.m_Text == "|") {
						this.addError("'||' detected. Maybe use 'OR' for clarity", diag, doc, scriptPos, secondToken, isIncludescript, DiagnosticSeverity.Information);
						i += 1
					}
				}
				else if(currentTokenText == "__ADDHOOK__") {
					let secondToken = this.getToken(tokens, i + 1);
					let thirdToken = this.getToken(tokens, i + 2);
					this.addError("Hook detected, maybe a customer uses this hook", diag, doc, scriptPos, thirdToken, isIncludescript, DiagnosticSeverity.Warning, 500);
					for(let x = 0; x < script.m_HooksForDocument.length; x++) {
						if(script.m_HooksForDocument[x].m_ScriptName == thirdToken.m_Text) {
							this.ParseText(_NotManagedDocs, script.m_HooksForDocument[x], isIncludescript, definedVariables, definedFunctions, scopeLevel);
							break;
						}
					}
					

					i += 2;
				}
				else if(currentTokenText == "runprintscript") {
					
				}
				else {
					if(this.IsVariable(currentTokenText)) {
						
						let variable = this.isVariableDefined(currentTokenText, definedVariables, scopeLevel);
						if(!variable) {
							let errorText = "'"+currentTokenText+"' possibly not defined, maybe";
							let severity :DiagnosticSeverity = DiagnosticSeverity.Information;
							if(hasIncludescript) {
								severity = DiagnosticSeverity.Information;
								errorText += " it is defined in an includescript, or";
							}
							this.addError(errorText + " this script gets included somewhere. But resolving this is not yet supported.", diag, doc, scriptPos, currentToken, isIncludescript, severity);
							//i += 2;
						} else {
							variable.used();
						}

						if(variable && scopeLevel < variable.m_Scope) {
							this.addError("Variable nicht definiert - out of scope", diag, doc, scriptPos, currentToken, isIncludescript);
						}

						let secondToken = this.getToken(tokens,i + 1);
						if(secondToken.m_Text == ".") {
							let thirdToken = this.getToken(tokens,i + 2);
							if(!this.IsVariable(thirdToken.m_Text)) {
								this.addError("after . must follow an Parserfunction", diag, doc, scriptPos, thirdToken, isIncludescript);
							} else {
								let func :SignatureInformation|undefined = undefined;
								if(variable && parserFunctions) {
									func = parserFunctions.getSignature(new CursorPositionInformation(thirdToken.m_Text, "", CursorPositionType.VARIABLE, variable.m_Type, 0))
									if(!func) {
										this.addError("Function '"+thirdToken.m_Text+"' is not a parserfunction from instance '"+variable.m_Name+"' of type '"+variable.m_Type+"'", diag, doc, scriptPos, thirdToken, isIncludescript);
									}
								}

								let fourthToken = this.getToken(tokens,i + 3);
								if(fourthToken.m_Text != "(") {
									this.addError("after Parserfunction must follow an Paranthesis", diag, doc, scriptPos, fourthToken, isIncludescript);
								} else {
								
								}
							}
							i += 3;
						} else {
							if(!this.isControlChar(secondToken.m_Text)) {
								this.addError("Expression after variable expected '"+secondToken.m_Text+"'", diag, doc, scriptPos, secondToken, isIncludescript);
							} else {
								if(secondToken.m_Text == "=") {
									if(currentTokenText === currentTokenText.toUpperCase()) {
										this.addError("Cannot assign to '"+currentTokenText+"' because it is a constant. A variable in all uppercase is considered const.", diag, doc, scriptPos, currentToken, isIncludescript);
									}
								}

								i += 1;
							}
						}
					}
				}
			}
			if(tokens.length >= 2) {
				if(tokens[tokens.length - 1].m_Text != ";") {
					//this.addError("';' expected at the end of the script", diag, doc, scriptPos, tokens[tokens.length - 1], isIncludescript);	
				}
			}

		} catch (token) {
			if(token.m_Text != ";") {
				this.addError("';' expected at the end of the script", diag, doc, scriptPos, token, isIncludescript);	
			}
		}

		// if(!isIncludescript && !script.m_MainScript) {
		// 	for(let x = 0; x < definedVariables.length; x++) {
		// 		definedVariables[x].forEach((value, key) => {
		// 			if(!value.m_IsUsed && value.m_Token && !value.m_IsInIncludescript) {
		// 				this.addError("'"+value.m_Name+"' is declared but its value is never read", diag, doc, scriptPos, value.m_Token, isIncludescript, DiagnosticSeverity.Hint, 1000);
		// 			}
		// 		})
	
		// 	}
		// }

		return { m_diagnostics: diag,
			m_definedFunctions: definedFunctions,
			m_definedVariables: definedVariables,
			m_ScopeLevel: scopeLevel
		}
	}

}