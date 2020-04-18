import { TextDocument, CompletionItem, Position, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { GlobalAnalyzer } from '../server';



export function OnDiagnostic(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Diagnostic[] {
	let diagnosticCached :Diagnostic[] = [];


	let patternInfo = /\b(return)\b/g;
	let text = curDoc.getText();
	let m :RegExpExecArray|null = null;
	while(m = patternInfo.exec(text)) {

		let start = curDoc.positionAt(m.index);
		let end = Position.create(start.line, start.character + 6);

		diagnosticCached.push({
			message: "Möglicherweise wird dieses Skript inkludiert - kein return in includes verwenden",
			range: {
				start: start,
				end: end
			},
			severity: DiagnosticSeverity.Information
		});
	}

	return diagnosticCached;
}
