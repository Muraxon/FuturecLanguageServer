import { Diagnostic, Position, TextDocument, Location, ParameterInformation, SignatureInformation, MarkupContent, SignatureHelp, TextDocuments, DiagnosticSeverity} from 'vscode-languageserver';
import { Script } from './Script';
import { TextParser } from './TextParser';


export class Analyzer {

	constructor() {


		/*exec("dir", (error, stdout, stderr) => {
			if (error) {
				console.log(`error: ${error.message}`);
				return;
			}
			if (stderr) {
				console.log(`stderr: ${stderr}`);
				return;
			}
			console.log(`stdout: ${stdout}`);
		});*/
	}

	getincludeScriptsNumbers(script :string) :number[]|null {
		let scripts :number[] = [];

		let pattern = /\bincludescript\s+[0-9]+\b/g;
		let patternScript = /[0-9]+/g;
		let patternEOF = /\n/g;

		let m :RegExpExecArray|null;
		while(m = pattern.exec(script)) {
			patternScript.lastIndex = m.index;
			m = patternScript.exec(script);
			if(m) {
				patternEOF.lastIndex = m.index;
				let m2 = patternEOF.exec(script);
				if(m2) {
					scripts.push(parseInt(script.substr(m.index, m2.index - m.index)));
				}
				else {
					scripts.push(parseInt(script.substr(m.index)));
				}
			}
		}
		if(scripts.length > 0) {
			return scripts;
		}
		return null;
	}

	getScripts(scripts :number[], _NotManagedDocs :Map<string, TextDocument>) :Script[]|null {
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
		
						let m2 = patternEndOfScript.exec(text);
						if(m2) {
							if(!alreadFoundScript.includes(element)) {
								let posScript = elementTextDocu.positionAt(m.index);
								scriptsText.push(new Script(text.substr(m.index, m2.index - m.index), element, posScript, elementTextDocu.uri));
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

	getCompleteCurrentScript(CursorPos :Position, doc :TextDocument, _NotManagedDocs :Map<string, TextDocument>, includescript :boolean = true, toPos :boolean = false) :Script|null {
		let editedScript = this.getEditedScript(CursorPos, doc, toPos);
		if(editedScript && includescript) {
			this.getIncludeScriptForCurrentScript(editedScript, _NotManagedDocs);
		}

		return editedScript;
	}

	getIncludeScriptForCurrentScript(script :Script, _NotManagedDocs :Map<string, TextDocument>) {
		let scriptNumbers = this.getincludeScriptsNumbers(script.m_scripttext);
		let scriptNumbersOld :number[]= [];
		while(scriptNumbers) {
			let includeScripts = this.getScripts(scriptNumbers, _NotManagedDocs);
			if(includeScripts) {
				script.addScripts(...includeScripts);
			} else { break; }

			scriptNumbersOld = scriptNumbers;
			scriptNumbers = this.getincludeScriptsNumbers(script.m_scripttext);
		}	
	}

	public getEditedScript(CursorPos :Position, doc :TextDocument, toPos :boolean = false) :Script|null {
		let editedScript :Script|null = null;
		
		let completeDocText = doc.getText();

		let offset = doc.offsetAt(CursorPos);
		let subscript = completeDocText.substring(0, offset);
		
		let patternEndLine = /\n/g; 
		let m = subscript.lastIndexOf("\nSCRIPT:");
		let scriptNumberStart = 8;
		if(m < 0) {
			scriptNumberStart = 18;
			m = subscript.lastIndexOf("\nINSERTINTOSCRIPT:");
		}
		let posScript = doc.positionAt(m);
		posScript.line++;

		patternEndLine.lastIndex = m + 1;
		let ex1 = patternEndLine.exec(subscript);
		if(ex1) {
			let patternEnd = /^\s*ENDSCRIPT/gm;
			patternEnd.lastIndex = ex1.index;

			let patternNumberEnd = /,/g;
			patternNumberEnd.lastIndex = m + scriptNumberStart + 1;
			let scriptNumberEnd = patternNumberEnd.exec(completeDocText);
			if(scriptNumberEnd) {
				let scriptNumber = parseInt(completeDocText.substring(m + scriptNumberStart, scriptNumberEnd.index));
				let ex :RegExpExecArray|null = null;
				let index = doc.offsetAt(CursorPos);
				if(!toPos) {
					ex = patternEnd.exec(completeDocText);
					if(ex) {
						index = ex.index;
					}
				}

				if((index > ex1.index && (offset > ex1.index) && (offset < index)) || (toPos)) {
					let scriptText = completeDocText.substring(ex1.index, index);
					editedScript = new Script(scriptText, scriptNumber, posScript, doc.uri);
				}
			}
		}

		return editedScript;
	}

	getAllScripts(doc :TextDocument) :String[] {
		let m :RegExpExecArray | null;
		let mEnd :RegExpExecArray | null;
		let pattern = /^\s*(SCRIPT|INSERTINTOSCRIPT):[0-9]+.*$/gm;
		let patternEndScript = /^\s*ENDSCRIPT.*$/gm;

		let AllScripts : String[] = new Array();
		let text = doc.getText();

		while(m = pattern.exec(text)) {
			patternEndScript.lastIndex = m.index;
			mEnd = patternEndScript.exec(text);
			if(mEnd) {
				AllScripts.push(text.substr(m.index, mEnd.index - m.index));
			} else {
				AllScripts.push(text.substr(m.index));
			}
		}

		return AllScripts;
	}
	
	getDiagnosticForScript(doc :TextDocument) :Diagnostic[] {
		let diag :Diagnostic[] = [];

	
		return diag;
	}
}