import { Position, Diagnostic } from 'vscode-languageserver/node';
import { CParser } from '../Parser/CParser';
import { GlobalAnalyzer, parserFunctions } from '../server';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';

let diagnosticCached :Diagnostic[] = [];
let posCached :Position|null = null;

export function OnCollectStatistics(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :StatisticsForParser {
	if(posCached) {
		if(posCached.line == pos.line) {
			//return diagnosticCached;
		}
	}

	let script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, false, false);
	if(script) {
		let parser = new CParser(true);
		parser.ParseText(docs, script, false);
		return parser.m_Statistics;
	}
	return new Map();
}
