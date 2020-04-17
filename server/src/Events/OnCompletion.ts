import { TextDocument, CompletionItem, Position } from 'vscode-languageserver';
import { GlobalAnalyzer } from '../server';


let completionCached :CompletionItem[] = [];
let posCached :Position|null = null;

export function OnCompletion(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :CompletionItem[] {
	if(posCached) {
		if(posCached.line == pos.line) {
			console.log("caching");
			return completionCached;
		}
	}

	let alreadyAdded :string[] = [];
	completionCached = [];
	posCached = pos;

	let scripttext = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
	if(scripttext) {
		let varPattern = /\b(int|CString|CTable|double|CMoney|CDateTime|float|BOOL)\s+[a-zA-Z0-9_]+\s*(\=|\;)/g;
		let text = scripttext.m_scripttext;
		let m :RegExpExecArray|null = null;
		while(m = varPattern.exec(text)) {
	
			let patternBeginVar = /\b/g
			patternBeginVar.lastIndex = m.index + 1;
			m = patternBeginVar.exec(text);
			if(m) {
				patternBeginVar.lastIndex++;
				m = patternBeginVar.exec(text);
				if(m) {
					patternBeginVar.lastIndex++;
					let mEnd = patternBeginVar.exec(text);
					if(mEnd) {
						let variable = text.substring(m.index, mEnd.index);
						if(!alreadyAdded.find((vari) => {
							if(vari == variable) {
								return true;
							}
						})) {

							alreadyAdded.push(variable);
							completionCached.push({
								label: variable
							});
						}
					}
				}
			}

		}

	}

	return completionCached;
}
