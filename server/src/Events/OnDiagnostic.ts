import { TextDocument, CompletionItem, Position, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { GlobalAnalyzer, parserFunctions } from '../server';



export function OnDiagnostic(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Diagnostic[] {
	let diagnosticCached :Diagnostic[] = [];


	let script = GlobalAnalyzer.getEditedScript(pos, curDoc, false, false);
	if(script) {
		let completeLine = /^(.*)$/gm;
		let startPosOfScript = curDoc.offsetAt(script.m_Position);

		let m :RegExpExecArray | null = null;
		let text = script.m_scripttext;
		while(m = completeLine.exec(text)) {
	
			
			
			let alreadyNotDefined :string[] = [];
	
			let patternVar = /\b([a-zA-ZöäüÖÄÜ_0-9]+)\b/g;
			let line = <string>m[1];
			while(m = patternVar.exec(text)) {
				let variable = <string>m[1];
				variable.trim();
				if(parserFunctions.isVariable(variable)) {
					let patternDecl = new RegExp("\\b(BOOL|int|CString|CTable|double|CMoney|CDateTime)\\s*" + variable + "\\b", "g");
					let m_temp = patternDecl.exec(text);
					if(!m_temp) {
						let start = curDoc.positionAt(m.index + startPosOfScript);
						let end = Position.create(start.line, start.character + variable.length);
	
						if(!alreadyNotDefined.includes(variable)) {
							alreadyNotDefined.push(variable);
					
							diagnosticCached.push({
								message: "Variable `" + variable + "` nicht definiert",
								range: {
									start: start,
									end: end
								},
								severity: DiagnosticSeverity.Error
							});
						}
					}
				}
			}
		}
		}


	return diagnosticCached;
}
