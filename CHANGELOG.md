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



