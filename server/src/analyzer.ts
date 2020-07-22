import { Diagnostic, Position, TextDocument, Location, ParameterInformation, SignatureInformation, MarkupContent, SignatureHelp, TextDocuments, DiagnosticSeverity} from 'vscode-languageserver';
import { Script } from './Script';
import { TextParser } from './TextParser';


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
		let loop = false;
		while(scriptNumbers && !loop) {
			let includeScripts = this.getScripts(scriptNumbers, _NotManagedDocs);
			if(includeScripts) {
				script.addScripts(...includeScripts);
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

	public getEditedScript(CursorPos :Position, doc :TextDocument, toPos :boolean = false, withHeader :boolean = true) :Script|null {
		let editedScript :Script|null = null;

		let completeDocText = doc.getText();
		let offset = doc.offsetAt(CursorPos);

		let mStartScript = /^(SCRIPT|INSERTINTOSCRIPT|ADDTOSCRIPT):([0-9]+).*$/gm;
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
				editedScript = new Script(completeDocText.substring(finalStart.index, end), parseInt(finalStart[2]), doc.positionAt(finalStart.index), doc.uri);
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