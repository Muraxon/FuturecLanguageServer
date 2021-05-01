import { Position, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { CParser } from '../Parser/CParser';
import { GlobalAnalyzer } from '../server';
import { TextDocument } from 'vscode-languageserver-textdocument';



export function OnDiagnosticForAllScripts(docs :Map<string, TextDocument>, curDoc :TextDocument) :Diagnostic[] {
	let diagnosticCached :Diagnostic[] = [];
	
	let allScripts = GlobalAnalyzer.getAllScripts(curDoc, docs);
	allScripts.forEach((script) => {
		let parser = new CParser();
		let tempdiagnosticCached = parser.ParseText(docs, script, false).m_diagnostics;
		diagnosticCached.push(...tempdiagnosticCached);
	});
	let finalDiag :Diagnostic[] = [];

	diagnosticCached.forEach((diag) => {
		if(diag.severity == DiagnosticSeverity.Error) {
			finalDiag.push(diag);
		}
	})

	return finalDiag;
}
