import { Diagnostic, Position, Location, ParameterInformation, SignatureInformation, MarkupContent, SignatureHelp, TextDocuments, DiagnosticSeverity} from 'vscode-languageserver/node';
import { Script } from './Script';
import { TextDocument } from 'vscode-languageserver-textdocument';

let cachedMainScript :Script|null = null;

export class Analyzer {

	constructor() {


	}

	getincludeScriptsNumbers(script :string) :number[]|null {
		let scripts :number[] = [];

		let pattern = /\bincludescript\s+([0-9]+)\b/g;

		let m :RegExpExecArray|null;
		while(m = pattern.exec(script)) {
			scripts.push(parseInt(m[1]));
		}
		if(scripts.length > 0) {
			return scripts;
		}
		return null;
	}

	getPositionForScript(doc :TextDocument, docText :string, name :string, number :number, script :Script|null) :Position {

		let indexPosition = -1;
		let m :RegExpExecArray|null = null;

		if(script) {
			// Check for hooks inside script - take last before cursor / and so on until one hook is found and then proceed
			let hooks = script.getHooks();
			let i = hooks.length - 1;
			while((i >= 0) && (indexPosition < 0)) {
				let regex = new RegExp("\\bINSERTINTOSCRIPT:"+number+","+hooks[i]+"\\b", "gm");
				if(m = regex.exec(docText)) {
					indexPosition = regex.lastIndex;
				}
				i--;
			}
		}

		let posScript :Position = {character:0,line:0};
		
		// check for the next availabe script / insertinto - part | and give back the index to start the insertion from
		let startNumber = number - 1;
		let regex = new RegExp("\\b(INSERTINTOSCRIPT|SCRIPT|ADDTOSCRIPT):"+startNumber+",", "gm");
		if(indexPosition < 0) {
			m = null;
			while((startNumber >= 0) && (indexPosition < 0)) {
				while(m = regex.exec(docText)) {
					indexPosition = regex.lastIndex;
				}
				startNumber--;
				regex = new RegExp("\\b(INSERTINTOSCRIPT|SCRIPT|ADDTOSCRIPT):"+startNumber+",", "gm");
			}

			if(indexPosition < 0) {
				m = null;
				startNumber = number + 1;
				while((startNumber < 10000) && (indexPosition < 0)) {
					regex = new RegExp("\\b(INSERTINTOSCRIPT|SCRIPT|ADDTOSCRIPT):"+startNumber+",", "gm");
					while(m = regex.exec(docText)) {
						indexPosition = regex.lastIndex;
					}
					startNumber++;
				}

				// search back for first occur. of "ENDSCRIPT"
				if(indexPosition >= 0) {
					posScript = doc.positionAt(indexPosition);
					let line = "";

					while((line.search("ENDSCRIPT") < 0) && (posScript.line >= 0)) {

						posScript.line--;
						line = doc.getText({ end: {character: 10000, line: posScript.line }, start: {character: 0, line: posScript.line }});
					}

					posScript.character = 0;
					if(posScript.line >= 0 && indexPosition >= 0) {
						posScript.line++;
					}
					if(posScript.line < 0) {
						posScript.line = 0;
					}
					return posScript;
				}
			} 
		}

		// If nothing has been found by now - fallback to the end of the file
		if(indexPosition < 0) {
			indexPosition = docText.length - 1;
			posScript = doc.positionAt(indexPosition);
		} else {
			let regexEndOfScript = /^\s*ENDSCRIPT/gm;
			regexEndOfScript.lastIndex = indexPosition;
			regexEndOfScript.exec(docText);

			let regexEOL = /\n/gm;
			regexEOL.lastIndex = regexEndOfScript.lastIndex + 2;
			regexEOL.exec(docText);
			if(regexEOL.lastIndex <= 0) {
				indexPosition = docText.length - 1;
			} else {
				indexPosition = regexEOL.lastIndex;
			}

			posScript = doc.positionAt(indexPosition);
		}
		return posScript;
	}

	getPositionForTOC(doc :TextDocument, docText :string, name :string, number :number, script :Script|null) :Position{
		let m :RegExpExecArray|null = null;
		let indexPosition = -1;

		let hooks :string[] = [];
		if(script) {
			hooks = script.getHooks();
			let i = hooks.length - 1;

			while((i >= 0) && (indexPosition < 0)) {
				let regex = new RegExp("^"+number+"\\s+"+hooks[i]+"\\b.*$", "gm");
				if(m = regex.exec(docText)) {
					indexPosition = regex.lastIndex;
				}
				i--;
			}
		}

		let startNumber = number - 1;
		let regex = new RegExp("^"+startNumber+"\\s+[/a-zA-ZöäüÖÄÜ _-]+.*$", "gm");
		while((startNumber >= 0) && (indexPosition < 0)) {
			while(m = regex.exec(docText)) {
				indexPosition = regex.lastIndex;
			}
			startNumber--;
			regex = new RegExp("^"+startNumber+"\\s+[/a-zA-ZöäüÖÄÜ _-]+.*$", "gm");
		}

		let forward = true;
		if(indexPosition < 0) {
			m = null;
			startNumber = number + 1;
			while((startNumber < 10000) && (indexPosition < 0)) {
				regex = new RegExp("^"+startNumber+"\\s+[/a-zA-ZöäüÖÄÜ _-]+.*$", "gm");
				while(m = regex.exec(docText)) {
					indexPosition = regex.lastIndex;
					forward = false;		// if we search forward we dont have to increment the line afterwards
				}
				startNumber++;
			}
		}

		let posToc :Position = {character:0, line:0};
		if(indexPosition >= 0) {
			posToc = doc.positionAt(indexPosition);
			if(forward) {
				posToc.line++;
			}
		}
		return posToc;
	}

	getScripts(scripts :number[], _NotManagedDocs :Map<string, TextDocument>, extractToText :string|null = null) :Script[]|null {
		let scriptsText :Script[] = [];

		let alreadFoundScript :number[] = [];

		_NotManagedDocs.forEach((elementTextDocu, key) => {
			let patternEndOfScript = /^\s*ENDSCRIPT/gm;
			let text = elementTextDocu.getText();

			scripts.forEach(element => {
				let patternStartOfScript = new RegExp("^SCRIPT:" + element.toString() + "\\b.*$", "gm");

				let m = patternStartOfScript.exec(text);
				if(m) {
					let EndOfLine = /$/gm;
					EndOfLine.lastIndex = m.index;
					m = EndOfLine.exec(text);
					if(m) {
						patternEndOfScript.lastIndex = m.index;
		
						let m2 = null;
						if(!extractToText) {
							m2 = patternEndOfScript.exec(text);
						} else {
							m2 = { index: text.indexOf(extractToText, m.index) };
						}
						if(m2) {
							if(!alreadFoundScript.includes(element)) {
								let posScript = elementTextDocu.positionAt(m.index);
								scriptsText.push(new Script(text.substr(m.index, m2.index - m.index), element, posScript, elementTextDocu.uri, "SCRIPT", "TEST"));
							} else {
								alreadFoundScript.push(element);
							}
						}
					}
				}
			});
		});

		if(scriptsText.length > 0) {
			return scriptsText;
		}
		return null;
	}

	getCompleteCurrentScript(CursorPos :Position, doc :TextDocument, _NotManagedDocs :Map<string, TextDocument>, includescript :boolean = true, toPos :boolean = false, replaceIncludeScriptText :boolean = true) :Script|null {
		let editedScript = this.getEditedScript(CursorPos, doc, toPos, false, _NotManagedDocs);
		if(editedScript && includescript) {
			this.getIncludeScriptForCurrentScript(editedScript, _NotManagedDocs, replaceIncludeScriptText);
		}

		return editedScript;
	}

	getIncludeScriptForCurrentScript(script :Script, _NotManagedDocs :Map<string, TextDocument>, replaceIncludeScriptText :boolean) {
		let scriptNumbers = this.getincludeScriptsNumbers(script.m_scripttext);
		let scriptNumbersOld :number[]= [];
		let loop = false;
		while(scriptNumbers && !loop) {
			let includeScripts = this.getScripts(scriptNumbers, _NotManagedDocs);
			if(includeScripts) {
				script.addScripts(replaceIncludeScriptText, ...includeScripts);
			} else { break; }

			scriptNumbersOld.push(...scriptNumbers);
			scriptNumbers = this.getincludeScriptsNumbers(script.m_scripttext);
			if(scriptNumbers) {
				scriptNumbers.forEach(element => {
					if(scriptNumbersOld.includes(element) || loop) {
						loop = true;
						return;
					}
				});
			}
		}	
	}

	public getEditedScript(CursorPos :Position, doc :TextDocument, toPos :boolean = false, withHeader :boolean = true, _NotManagedDocs: Map<string, TextDocument>|null = null) :Script|null {
		let editedScript :Script|null = null;

		let completeDocText = doc.getText();
		let offset = doc.offsetAt(CursorPos);

		let mStartScript = /^(SCRIPT|INSERTINTOSCRIPT|ADDTOSCRIPT):([0-9]+),(.*)$/gm;
		let mStartWithoutheader = /\r\n/g;

		let finalStart :RegExpExecArray|null = null;
		let mStart :RegExpExecArray|null = null;
		while(mStart = mStartScript.exec(completeDocText)) {
			if(mStart.index > offset) {
				break;
			}
			mStartWithoutheader.lastIndex = mStartScript.lastIndex;
			finalStart = mStart;
		}

		let scriptNumber = 0;
		let scriptType = "";
		let scriptName = "";
		if(finalStart) {
			scriptNumber = parseInt(finalStart[2]);
			scriptType = finalStart[1];
			scriptName = finalStart[3];
		}

		if(!withHeader) {
			finalStart = mStartWithoutheader.exec(completeDocText);
		}

		if(finalStart) {

			let end :number = 0;

			if(toPos) {
				end = offset;
			} else {
				let patternEnd = /^\s*ENDSCRIPT/gm;
				patternEnd.lastIndex = finalStart.index;
				let ex1 = patternEnd.exec(completeDocText);
				if(ex1) {
					end = ex1.index;
				}
			}

			if(end > 0) {
				editedScript = new Script(completeDocText.substring(finalStart.index, end), scriptNumber, doc.positionAt(finalStart.index), doc.uri, scriptType, scriptName);
				if(scriptType == "INSERTINTOSCRIPT" && _NotManagedDocs) {

					if((!cachedMainScript) || (cachedMainScript && cachedMainScript.m_scriptnumber != scriptNumber) || (cachedMainScript && cachedMainScript.m_ScriptName != scriptName)) {
						let mainScript = this.getScripts([scriptNumber], _NotManagedDocs, scriptName);
						if(mainScript && mainScript.length == 1) {
							let MainScript = mainScript[0];
							this.getIncludeScriptForCurrentScript(MainScript, _NotManagedDocs, false);
							this.getHooksForCurrentDocument(MainScript, doc);
							editedScript.m_MainScript = MainScript;
						}
						if(editedScript && editedScript.m_MainScript) {
							let newScript = new Script(editedScript.m_MainScript.m_scripttext, editedScript.m_MainScript.m_scriptnumber, editedScript.m_MainScript.m_Position, editedScript.m_MainScript.m_Uri, editedScript.m_MainScript.m_ScriptType, editedScript.m_MainScript.m_ScriptName);
							cachedMainScript = newScript;
						}
					} else {
						let newScript = new Script(cachedMainScript.m_scripttext, cachedMainScript.m_scriptnumber, cachedMainScript.m_Position, cachedMainScript.m_Uri, cachedMainScript.m_ScriptType, cachedMainScript.m_ScriptName);
						editedScript.m_MainScript = newScript;
						this.getHooksForCurrentDocument(editedScript.m_MainScript, doc);
					}

				} else {
					cachedMainScript = null;
				}
			}
		}



		return editedScript;
	}

	getHooksForCurrentDocument(script :Script, doc :TextDocument) {
		let found = -1;
		let documentText = doc.getText();
		found = documentText.indexOf("INSERTINTOSCRIPT:" + script.m_scriptnumber.toString() + ",", found + 1);
		while(found >= 0) {
			let iHookend = documentText.indexOf("\n", found + 1);
			let hookName = documentText.substring(found + ("INSERTINTOSCRIPT:" + script.m_scriptnumber.toString() + ",").length, iHookend);

			let scriptEnd = documentText.indexOf("ENDSCRIPT", found + 1);

			let scriptText = documentText.substring(iHookend, scriptEnd);

			script.m_HooksForDocument.push(new Script(scriptText, script.m_scriptnumber, doc.positionAt(found), doc.uri, "INSERTINTOSCRIPT", hookName.trim()));
			found = documentText.indexOf("INSERTINTOSCRIPT:" + script.m_scriptnumber.toString() + ",", found + 1);
		}
	}

	getAllScripts(doc :TextDocument, _NotManagedDocs :Map<string, TextDocument>) :Script[] {
		let m :RegExpExecArray | null;
		let mEnd :RegExpExecArray | null;
		let pattern = /^\s*(SCRIPT|INSERTINTOSCRIPT):([0-9]+),(.*)$/gm;
		let patternEndScript = /^\s*ENDSCRIPT.*$/gm;

		let AllScripts : Script[] = new Array();
		let text = doc.getText();

		while(m = pattern.exec(text)) {
			let ind = text.indexOf("\n", m.index + 4);
			m.index = ind;
			patternEndScript.lastIndex = m.index;
			mEnd = patternEndScript.exec(text);
			if(mEnd) {
				AllScripts.push(new Script(text.substr(m.index, mEnd.index - m.index), parseInt(m[2]), doc.positionAt(m.index), doc.uri, m[1], m[3]));
				
				this.getIncludeScriptForCurrentScript(AllScripts[AllScripts.length - 1], _NotManagedDocs, false);

				if(m[1] == "INSERTINTOSCRIPT" && _NotManagedDocs) {
					let scriptNumber = parseInt(m[2]);
					let scriptName = m[3];

					let mainScript = this.getScripts([scriptNumber], _NotManagedDocs, scriptName);
					if(mainScript && mainScript.length == 1) {
						let MainScript = mainScript[0];
						this.getIncludeScriptForCurrentScript(MainScript, _NotManagedDocs, false);
						this.getHooksForCurrentDocument(MainScript, doc);
						AllScripts[AllScripts.length - 1].m_MainScript = MainScript;
					}
				}
			}
		}

		return AllScripts;
	}
	
	getDiagnosticForScript(doc :TextDocument) :Diagnostic[] {
		let diag :Diagnostic[] = [];

	
		return diag;
	}
}