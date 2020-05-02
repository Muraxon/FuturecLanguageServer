export class CursorPositionInformation {

	m_word :string = "";
	m_char :string = "";
	m_type :CursorPositionType = CursorPositionType.UNDEFINED_VALUE;
	m_context :string = "";

	constructor(word :string, char :string, type :CursorPositionType, context :string) {
		this.m_word = word;
		this.m_char = char;
		this.m_type = type;
		this.m_context = context;
	}

	isValid() :boolean {
		if((this.m_type == CursorPositionType.VARIABLE) || 
		(this.m_type == CursorPositionType.USERDEFINED_FUNCTION) || 
		(this.m_type == CursorPositionType.PARSER_FUNCTION) || 
		(this.m_type == CursorPositionType.INCLUDESCRIPT)) {
			return true;
		}
		return false;
	}

	getFunctionname() :string|null {
		switch(this.m_type) {
			case CursorPositionType.USERDEFINED_FUNCTION:
				return this.m_word.substr(5).trim();
				break;
			case CursorPositionType.PARSER_FUNCTION:
			case CursorPositionType.INCLUDESCRIPT:
				return this.m_word;
				break;
		}
		return null;
	}

	isFunction() :boolean {
		if(this.m_type == CursorPositionType.PARSER_FUNCTION || this.m_type == CursorPositionType.USERDEFINED_FUNCTION || this.m_type == CursorPositionType.INCLUDESCRIPT) {
			return true;
		}
		return false;
	}
}

export enum CursorPositionType {
	VARIABLE = 1,
	USERDEFINED_FUNCTION,
	PARSER_FUNCTION,
	UNDEFINED_VALUE,
	INCLUDESCRIPT,
	ERROR = 3000
}