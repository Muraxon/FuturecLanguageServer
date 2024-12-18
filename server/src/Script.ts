import {  Position } from 'vscode-languageserver/node';

export class Script {
	public m_ScriptName :string;
	public m_scripttext :string;
	public m_scriptnumber :number;
	public m_Position :Position;
	public m_Uri :string;
	public m_ScriptType :string;

	public m_MainScript? :Script;
	public m_HooksForDocument :Script[];

	public m_IncludeScriptNumbers :number[];
	public m_IncludeScript :Script[];

	constructor(text :string, number :number, linenumber :Position, uri :string, scripttype :string, scriptName :string) {
		//"--------------" + number.toString() + "\n" + 
		// + "\n" + "--------------"
		this.m_scripttext = text;
		this.m_scriptnumber = number;
		this.m_Position = linenumber;
		this.m_Uri = uri;
		this.m_ScriptType = scripttype;
		this.m_ScriptName = scriptName;
		this.m_IncludeScriptNumbers = [];
		this.m_IncludeScript = [];
		this.m_HooksForDocument = [];
	}

	addScripts(replaceIncludeScriptText :boolean, ...Script: Script[]) {
		let i = 0;
		Script.forEach(element => {
			i++;
			if(i > 200) {
				console.log("looping")
				return;
			}
			if(replaceIncludeScriptText) {
				while(this.m_scripttext.search(new RegExp("\\#includescript\\s+" + element.m_scriptnumber + "\\b")) >= 0) {
					this.m_scripttext = this.m_scripttext.replace(new RegExp("\\#includescript\\s+" + element.m_scriptnumber + "\\b"), element.m_scripttext);
				}
			}
			this.m_IncludeScriptNumbers.push(element.m_scriptnumber);
			this.m_IncludeScript.push(element);
		});
	}

	getHooks() :string[] {
		let hooks:string[] = [];

		let regexHook = /^.*(\/\/ADDHOOK.*)\s*$/gm;
		let m :RegExpExecArray|null = null;
		while(m = regexHook.exec(this.m_scripttext)) {
			hooks.push(m[1]);
		}
		return hooks;
	}

	filterBranches() {
		




	}

}