export class CursorPositionInformation {

	m_word :string = "";
	m_char :string = "";
	m_type :CursorPositionType = CursorPositionType.UNDEFINED_VALUE;
	m_context :string = "";
	m_OffsetOnLine :number = -1;

	constructor(word :string, char :string, type :CursorPositionType, context :string, offset :number) {
		this.m_word = word;
		this.m_char = char;
		this.m_type = type;
		this.m_context = context;
		this.m_OffsetOnLine = offset;
	}

	isValid() :boolean {
		if((this.m_type == CursorPositionType.VARIABLE) || 
		(this.m_type == CursorPositionType.USERDEFINED_FUNCTION) || 
		(this.m_type == CursorPositionType.PARSER_FUNCTION) || 
		(this.m_type == CursorPositionType.INCLUDESCRIPT) ||
		(this.m_type == CursorPositionType.ADDHOOK)) {
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
			case CursorPositionType.ADDHOOK:
			case CursorPositionType.INCLUDESCRIPT:
				return this.m_word;
				break;
		}
		return null;
	}

	isScript() :boolean {
		if (this.m_type == CursorPositionType.INCLUDESCRIPT || 
			this.m_type == CursorPositionType.ADDHOOK || 
			this.m_type == CursorPositionType.USERDEFINED_FUNCTION) {
			return true;
		}
		return false;
	}

	isParserFunction() :boolean {
		if (this.m_type == CursorPositionType.PARSER_FUNCTION) {
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
	ADDHOOK,
	ERROR = 3000
}