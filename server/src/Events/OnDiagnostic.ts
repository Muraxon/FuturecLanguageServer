import { TextDocument, CompletionItem, Position, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { GlobalAnalyzer, parserFunctions } from '../server';



export function OnDiagnostic(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Diagnostic[] {
	let diagnosticCached :Diagnostic[] = [];


	let script = GlobalAnalyzer.getEditedScript(pos, curDoc, false);
	if(script) {
		let startPosOfScript = curDoc.offsetAt(script.m_Position);

		
		
		let alreadyNotDefined :string[] = [];

		let patternVar = /\b([a-zA-ZöäüÖÄÜ_0-9]+)\b/g;

		let text = script.m_scripttext;
		let m :RegExpExecArray|null = null;
		while(m = patternVar.exec(text)) {
			let variable = <string>m[1];
			variable.trim();
			if(parserFunctions.isVariable(variable)) {
				let patternDecl = new RegExp("\\b(BOOL|int|CString|CTable|double|CMoney|CDateTime)\\s*" + variable + "\\b", "g");
				let m_temp = patternDecl.exec(text);
				if(!m_temp) {
					if(!alreadyNotDefined.includes(variable)) {
						alreadyNotDefined.push(variable);

						let start = curDoc.positionAt(m.index + startPosOfScript);
						let end = Position.create(start.line, start.character + variable.length);
				
						diagnosticCached.push({
							message: "Variable " + variable + " nicht definiert",
							range: {
								start: start,
								end: end
							},
							severity: DiagnosticSeverity.Error,
							code: "hallo",
							source: "futurecc"
						});
					}
					
				}
			}
		}
	}

	return diagnosticCached;
}
