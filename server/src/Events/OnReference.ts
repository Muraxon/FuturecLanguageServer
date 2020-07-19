import { TextDocument, Position, Location } from 'vscode-languageserver';
import { TextParser } from '../TextParser';
import { CursorPositionType } from '../CursorPositionInformation';


export function OnReference(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) : Location[] {
	
	let word = TextParser.getWordAtPosition(pos, curDoc);
	let loc :Location[] = [];
	if(word.isValid()) {
		if(word.m_type != CursorPositionType.INCLUDESCRIPT) {
			let functionname = word.getFunctionname();
			if(functionname) {
				loc = findReferencesScriptOrFunction(docs, functionname);
			}
		}
		else {
			loc = findReferencesOfIncludescript(docs, parseInt(word.m_word));
		}
	}
	return loc
}

function findReferencesScriptOrFunction(_docs :Map<string, TextDocument>, functionName :string) :Location[] {
	let loc :Location[] = new Array();

	_docs.forEach((value:TextDocument, key:string) => {
		let pattern:RegExp = new RegExp("(FUNCTION:\\s+(void|double|CString|int|BOOL|CTable|CMoney|CDateTime)\\s+" + functionName + "\\(.*\\)|INSERTINTOSCRIPT:[0-9]+,\\s*\\/\\/" + functionName + ")", "g");
		
		let m: RegExpExecArray | null;
		let DocumentText = value.getText();
		while (m = pattern.exec(DocumentText)) {
			let m2 = new RegExp(functionName, "g");
			m2.lastIndex = m.index;
			let posStartFunction = m2.exec(DocumentText);
			if(posStartFunction) {
				loc.push({
					uri: value.uri,
					range: {
						start: { character: value.positionAt(posStartFunction.index).character, line: value.positionAt(m.index).line },
						end: { character: value.positionAt(posStartFunction.index).character + functionName.length, line: value.positionAt(m.index).line }
					}
				});
			}
		}
	});
	return loc;
}

function findReferencesOfIncludescript(_docs :Map<string, TextDocument>, scriptnumber :number) :Location[] {
	let loc :Location[] = new Array();

	_docs.forEach((value:TextDocument, key:string) => {
		let pattern = new RegExp("^SCRIPT:" + scriptnumber.toString() + "\\b.*$", "gm");
		
		let m: RegExpExecArray | null;
		let DocumentText = value.getText();
		while (m = pattern.exec(DocumentText)) {
			loc.push({
				uri: value.uri,
				range: {
					start: { character: value.positionAt(m.index).character + 7, line: value.positionAt(m.index).line },
					end: { character: value.positionAt(m.index).character + 7 + scriptnumber.toString().length, line: value.positionAt(m.index).line }
				}
			});
			
		}
	});
	return loc;
}
