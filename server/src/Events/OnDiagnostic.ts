import { TextDocument, Position, Diagnostic } from 'vscode-languageserver';
import { GlobalAnalyzer } from '../server';



export function OnDiagnostic(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Diagnostic[] {
	let diagnosticCached :Diagnostic[] = [];


	let script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs);

	
	if(script) {
		let reg = [
			/\b(S\.RequestSaveAndUnlock)\(/gm,
			/\b(H\.LockThisScript)\(/gm,
			/\b(S\.LockActualRecord)\(/gm,
			/\b(S\.UnlockActualRecord)\(/gm,
			/\b(S\.UpdateActualRecord)\(/gm
		];

		reg.forEach((regex, index) => {
			if(script) {
				let res = regex.exec(script.m_scripttext);
				if(!res) {
					diagnosticCached.push({
						message: "" + regex.source + " wird nicht verwendet",
						range: {
							end: script.m_Position,
							start: script.m_Position
						}
					});
		
					res = regex.exec(script.m_scripttext);
				}
			}
		});
	}

	return diagnosticCached;
}
