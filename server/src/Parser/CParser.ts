import { Diagnostic, Position, TextDocument } from 'vscode-languageserver';
import { Script } from '../Script';

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
	constructor(name :string, scope :number, type :string) {
		this.m_Name = name;
		this.m_Scope = scope;
		this.m_Type = type;
	}
}

export class CParser {
	m_Tokens :Token[];
	constructor() {
		this.m_Tokens = [];
	}

	ParseText(script :Script) {
		let text = script.m_scripttext;
		let pos = text.indexOf("\n");

		let startOfIdentifier = -1;
		while(pos < text.length) {
			let char = text.charAt(pos);
			if(char.match(/[ \t\n\r]/)) { 
				if(startOfIdentifier >= 0) {
					let token = new Token(text.substring(startOfIdentifier, pos), {start: startOfIdentifier, end: pos});

					this.m_Tokens.push(token);
					startOfIdentifier = -1;
				}
				pos++;
				continue;
			}

			if(char == "/") { 
				if((pos + 1 < text.length) && (text.charAt(pos + 1) == "/")) {
					let posTemp = text.indexOf("\n", pos);
					if(posTemp > pos) {
						pos = posTemp;
						startOfIdentifier = -1;
					} else {
						pos = text.length;
					}
					continue;
				}
				if((pos + 1 < text.length) && (text.charAt(pos + 1) == "*")) {
					pos++;
					let cont = false;
					while(pos < text.length) {
						if(cont) { break; }
						if(text.charAt(pos) == "*") {
							if(pos + 1 < text.length && text.charAt(pos + 1) == "/") {
								pos++;
								pos++;
								startOfIdentifier = -1;
								cont = true;
								continue;
							}
						}
						pos++;
					}
					continue;
				}
			}
			
			if(char.match(/[a-zA-Z_öäüÖÄÜ0-9]/)) {
				if(startOfIdentifier < 0) { startOfIdentifier = pos; }
			}
			else if(char.match(/[^a-zA-Z_öäüÖÄÜ0-9]/)) {
				if(startOfIdentifier >= 0) {
					let token = new Token(text.substring(startOfIdentifier, pos), {start: startOfIdentifier, end: pos});
					
					this.m_Tokens.push(token);
					startOfIdentifier = -1;
				}
				
				let token = new Token(text.substring(pos, pos + 1), {start: pos, end: pos + 1});
				this.m_Tokens.push(token);
			}

			pos++;
		}

		return this.processTokens(script);
	}

	addError(text :string, diag :Diagnostic[], doc :TextDocument, scriptPos :Position, token :Token) {
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
			}
			
		})
	}

	isVariableDeclaration(text :string) {
		if(text == "CTable" || text == "CMoney" || text == "CDateTime" || text == "CString" || text == "int" || text == "double") {
			return true;
		}
		return false;
	}

	isKeyword(text :string) {
		if(text == "if" || text == "foreachrow" || text == "foreachrowreverse" || text == "while") {
			return true;
		}
		return false;
	}

	isControlChar(text :string) {
		if(text == ";" || text == "{" || text == "}" || text == "(" || text == ")" || text == "=") {
			return true;
		}
		return false;
	}

	processTokens(script :Script) {
		let diag :Diagnostic[] = [];

		let doc = TextDocument.create("", "", 0, script.m_scripttext);
		let scriptPos = script.m_Position;

		let definedVariables :Map<string, Variable>[] = [];
		definedVariables.push(new Map());

		let bIsInsideString = false;
		let scopeLevel = 0;

		try {
			
			for(let i = 0; i < this.m_Tokens.length; i++) {
				let currentTokenText = this.m_Tokens[i].m_Text;
				if(currentTokenText == "\"") {
					bIsInsideString = !bIsInsideString;
					continue;
				}
				
				if(bIsInsideString) { continue; }
				
				if(currentTokenText == "FUNCTION") {
					if(this.m_Tokens[i + 1].m_Text != ":") {
						this.addError(": erwartet", diag, doc, scriptPos, this.m_Tokens[i]);
					} else {
						if(this.m_Tokens[i + 2].m_Text != "CMoney") {
							//this.addError("CMoney sollte hier stehen", diag, doc, scriptPos, this.m_Tokens[i + 1]);
						}
					}
					i += 2;
				} else if(currentTokenText == "S") {
					if(this.m_Tokens[i + 1].m_Text != "." || this.m_Tokens[i + 2].m_Text != "Select") {
						//this.addError("Select erwartet", diag, doc, scriptPos, this.m_Tokens[i + 2]);
					}
					i += 2;
				} else if(currentTokenText == "}" || currentTokenText == "ENDSCRIPT") {
					if(this.m_Tokens[i + 1].m_Text != ";") {
						this.addError("; erwartet", diag, doc, scriptPos, this.m_Tokens[i]);
					}
					definedVariables.pop();
					scopeLevel--;
				}else if(currentTokenText == "{" || currentTokenText == "FUNCTION") {
					definedVariables.push(new Map());
					scopeLevel++;
				} else if(this.isVariableDeclaration(currentTokenText)) {
					let nextIdent = this.m_Tokens[i + 1].m_Text;
					if(this.isKeyword(nextIdent) || this.isVariableDeclaration(nextIdent) || this.isControlChar(nextIdent)) {
						this.addError("no keyword, variable declaration or control character exptected `"+ nextIdent +"`", diag, doc, scriptPos, this.m_Tokens[i + 1]);
						i += 1;
					} else {
						if(this.m_Tokens[i + 2].m_Text == ";" || this.m_Tokens[i + 2].m_Text == "=") {
							console.log(nextIdent);
							if(definedVariables[scopeLevel - 1] && definedVariables[scopeLevel - 1].get(nextIdent)) {
								this.addError("shadowing of variable `" + nextIdent + "` detected" , diag, doc, scriptPos, this.m_Tokens[i + 1]);
							}
							else if(definedVariables[scopeLevel].get(nextIdent)) {
								this.addError("redifining variable `" + nextIdent + "`" , diag, doc, scriptPos, this.m_Tokens[i + 1]);
							}
							definedVariables[scopeLevel].set(nextIdent, new Variable(nextIdent, scopeLevel, currentTokenText));
						} else {
							//this.addError("; erwartet", diag, doc, scriptPos, this.m_Tokens[i + 1]);
						}
						i += 2;
					}
				}
				else if(this.isKeyword(currentTokenText)) {
					if(this.m_Tokens[i + 1].m_Text != "(") {
						this.addError("( exptected", diag, doc, scriptPos, this.m_Tokens[i + 1]);
					}
				} else {

					let variable = definedVariables[scopeLevel].get(currentTokenText)
					if(!variable && !this.isControlChar(currentTokenText)) {
						this.addError("Variable nicht definiert", diag, doc, scriptPos, this.m_Tokens[i]);
					} else {
						if(variable) {
							if(scopeLevel < variable.m_Scope) {
								this.addError("Variable nicht definiert - out of scope", diag, doc, scriptPos, this.m_Tokens[i]);
							}
							if(this.m_Tokens[i + 1].m_Text != ";") {
								//this.addError("; erwartet", diag, doc, scriptPos, this.m_Tokens[i]);
							}
						}
					}
				}
	
	
	
	
			}
		} catch (error) {
			console.log(error);			
		}
		return diag;
	}

}