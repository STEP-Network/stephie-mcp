# Changelog

All notable changes to STEPhie MCP Server are documented here.

## [Unreleased]

## 2025-09-09

- `0c9ef3c` - Added 30 comprehensive create/update tools for all Monday.com boards
- `f2ab6eb` - Fixed missing .describe() calls on all status/dropdown parameters

## 2025-01-08

- `969f32e` - Added inline parameter descriptions to server.ts for better API clarity
- `c7c11c5` - Fixed registration of missing task tools in server.ts
- `c025f79` - Added complete index mappings for all status/dropdown columns

## 2025-01-07

- `7bf92a3` - Fixed type casting for mutation tool inputs in api/server.ts
- `3b3e337` - Added mutation tools to Vercel deployment with updated documentation
- `e7cfc4b` - Added create and update tools for Tech & Intelligence tasks

## 2025-01-06

- `be4e8f8` - Added critical instructions for manual tool addition to documentation
- `7512fb6` - Added missing tool definitions and implementations to MCP server
- `c13a83a` - Fixed console.log usage for info messages to avoid Vercel error logs

## 2025-01-05

- `206ae91` - Implemented local cache system for 100% performance improvement
- `520641c` - Implemented dynamic column system for Monday.com tools

## 2025-01-04

- `8cbc400` - Updated OKR tool and validator for consistency with other tools
- `2b8db2a` - Updated test data collection to use actual tool columns
- `2ab4971` - Implemented comprehensive testing system for all MCP tools

## 2025-01-03

- `e17ae25` - Implemented comprehensive board relations filtering
- `2941ee4` - Refactored to implement ID-based board relation filtering pattern
- `cb56cba` - Added Team filtering to OKR tool and updated meta board

## 2025-01-02

- `0d476ec` - Enhanced OKR tool with full hierarchy support
- `4747070` - Updated CLAUDE.md and README with board tools documentation
- `bc15d73` - Removed 'Items' suffix from all board tool names

## 2024-12-30

- `603dc3f` - Removed Key Results board (1631918525) from all integrations
- `16d315c` - Improved board tools filtering and added column names to metadata
- `42c4867` - Added column name tracking for Monday.com boards

## 2024-12-29

- `46f7420` - Fixed board tools integration to prevent server crash
- `3415c38` - Added 33 board-specific MCP tools for all Monday.com boards
- `087d6b0` - Emphasized using columnIds parameter in getItems tool

## 2024-12-28

- `7fc57c1` - Enhanced getItems to show linked item names for board relations
- `775bbd9` - Fixed getBoardColumns output by removing color property
