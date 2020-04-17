import { TextDocument, CompletionItem, Position } from 'vscode-languageserver';
import { GlobalAnalyzer } from '../server';


export function OnCompletion(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :CompletionItem[] {
	let item :CompletionItem[] = [];

	let scripttext = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true);
	if(scripttext) {
		let varPattern = /\b(int|CString|CTable|double|CMoney|CDateTime|float)\s+[a-zA-Z0-9_]+\s*(\=|\;)/g;
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
						item.push({
							label: variable,
							documentation: "ich bin doku"
						})

					}

				}
			}

		}

	}

	return item;
}
