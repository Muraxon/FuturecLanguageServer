# Changelog
All notable changes to this project will be documented in this file.

## [1.0.0] - 24.04.2020
- Init Release
  - features *as is*

## [1.0.1] - 26.04.2020
- Added rudimentary support for parser-functions (auto-completion | ***signature-help is coming soon***)
  - snippet-functionality is possible
- improved includescriptparsing - prevent loop
- Added auto-completion for userdefined-functions inside the current script

## [1.0.2] - 27.04.2020
- fixed issue when autocompletion should trigger, but doesn't

## [1.1.0] - 02.05.2020
- added support for Signaturehelp in parserfunctions
  - new config for `snippet` or `signature` help. For detailed information see **README**
- new tag in xml `<signature>` - is necessary for signaturehelp on parserfunctions
- shown information for variables and functions improved
- when `{` is entered `};` is automaticly added aswell - [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues/1)
- now autocompletion does not trigger when `.` is entered - [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues/2)

## [1.1.1] - 19.07.2020
- new snippet for hooks - [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues/7)
- small fixes where completion or hovering does not fire
  - e.g. `F.` or `"+nVariable ..`
- small performance improvements
- support for `ADDTOSCRIPT`
- hover-support for parserfunctions
- added rudimentary support for variable in `foreachrow` and `foreachrowreverse` - [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues/5)
- other small changes see [Commit](https://github.com/Muraxon/FuturecLanguageServer/commit/405da8a3232a9745c1eceed404203f9d1662ef6a) for more information

## [1.1.2] - 25.07.2020
- changed the functionality for createing hooks / scripts
  - for more details see [README](README.md)
- removed pure snippets for hooks / scripts
- improved `onSignature`
  - now `,` inside literals like `"Hello, i am robot, haha"` dont get recognized anymore (better usability for specific functions)
  - only *pure* `,` which are not inside an *string* get recognized to correct parameter
- improved possible documentation for parserfunctions
  - now the `<notes>`-tag gets parsed properly for popups

## [1.1.3] - 26.07.2020
- added functionality for creating / deleting entries in design-files
  - for more details see [README](README.md)
  - Code Lenses were implemented
- fixed bug where onHover shows garbage
  - `FUNCTION: CTable tTestung(...)`
    - Hovering over a call of that function resulted in garbage info
- improved hovering over Parserfunctions
  - they now show the documentation
- improved signature-help
  - now does show proper documentation for that function
