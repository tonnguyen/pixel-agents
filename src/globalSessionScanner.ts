import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import type { AgentState } from './types.js';
import { PROJECT_SCAN_INTERVAL_MS, ACTIVE_SESSION_THRESHOLD_MS } from './constants.js';
import { startFileWatching as startFileWatchingInternal, readNewLines as readNewLinesInternal } from './fileWatcher.js';

/**
 * Scans for Claude Code sessions across ALL projects, not just the current workspace.
 * This extends the existing functionality to find sessions from any project directory.
 */

export function startGlobalSessionScanning(
	nextAgentIdRef: { current: number },
	agents: Map<number, AgentState>,
	activeAgentIdRef: { current: number | null },
	fileWatchers: Map<number, fs.FSWatcher>,
	pollingTimers: Map<number, ReturnType<typeof setInterval>>,
	waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
	permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
	webview: vscode.Webview | undefined,
	persistAgents: () => void,
): void {

	// Scan for all Claude Code session files across all projects
	const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');

	// Set up a timer to periodically scan for new session files
	setInterval(() => {
		scanAllProjectsForSessions(
			claudeProjectsDir,
			nextAgentIdRef,
			agents,
			activeAgentIdRef,
			fileWatchers,
			pollingTimers,
			waitingTimers,
			permissionTimers,
			webview,
			persistAgents
		);
	}, PROJECT_SCAN_INTERVAL_MS);
}

function scanAllProjectsForSessions(
	claudeProjectsDir: string,
	nextAgentIdRef: { current: number },
	agents: Map<number, AgentState>,
	activeAgentIdRef: { current: number | null },
	fileWatchers: Map<number, fs.FSWatcher>,
	pollingTimers: Map<number, ReturnType<typeof setInterval>>,
	waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
	permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
	webview: vscode.Webview | undefined,
	persistAgents: () => void,
): void {

	// Get all project directories in ~/.claude/projects/
	if (!fs.existsSync(claudeProjectsDir)) {
		return;
	}

	const projectDirs = fs.readdirSync(claudeProjectsDir);
	const now = Date.now();
	const knownFiles = new Set<string>();

	// Collect all currently watched files to avoid duplicates
	for (const agent of agents.values()) {
		knownFiles.add(agent.jsonlFile);
	}

	// Scan each project directory for JSONL files
	for (const projectDirName of projectDirs) {
		const projectPath = path.join(claudeProjectsDir, projectDirName);

		// Skip if not a directory
		if (!fs.lstatSync(projectPath).isDirectory()) {
			continue;
		}

		// Look for JSONL files in this project directory
		let files: string[];
		try {
			files = fs.readdirSync(projectPath)
				.filter(f => f.endsWith('.jsonl'))
				.map(f => path.join(projectPath, f));
		} catch {
			continue; // Directory may not be accessible
		}

		// Filter to recently active files not already being monitored
		const activeFiles: Array<{ path: string; mtime: number }> = [];
		for (const file of files) {
			if (knownFiles.has(file)) continue;

			try {
				const stat = fs.statSync(file);
				if (now - stat.mtimeMs < ACTIVE_SESSION_THRESHOLD_MS) {
					activeFiles.push({ path: file, mtime: stat.mtimeMs });
				}
			} catch {
				continue; // File may not be accessible
			}
		}

		if (activeFiles.length === 0) continue;

		// Sort by most recently modified first
		activeFiles.sort((a, b) => b.mtime - a.mtime);

		// Find unowned terminals to associate with these sessions
		const ownedTerminals = new Set<vscode.Terminal>();
		for (const agent of agents.values()) {
			ownedTerminals.add(agent.terminalRef);
		}

		const allUnowned = vscode.window.terminals.filter(t => !ownedTerminals.has(t));
		// Prefer Claude-named terminals
		const unownedTerminals = [
			...allUnowned.filter(t => t.name.toLowerCase().includes('claude')),
			...allUnowned.filter(t => !t.name.toLowerCase().includes('claude')),
		];

		// Pair available terminals with active session files
		const pairCount = Math.min(unownedTerminals.length, activeFiles.length);
		for (let i = 0; i < pairCount; i++) {
			const terminal = unownedTerminals[i];
			const file = activeFiles[i];

			createAgentForSessionFile(
				terminal,
				file.path,
				projectPath,
				nextAgentIdRef,
				agents,
				activeAgentIdRef,
				fileWatchers,
				pollingTimers,
				waitingTimers,
				permissionTimers,
				webview,
				persistAgents
			);

			console.log(`[Pixel Agents] Global scan: paired terminal "${terminal.name}" with session ${path.basename(file.path)} in project ${projectDirName}`);
		}
	}
}

function createAgentForSessionFile(
	terminal: vscode.Terminal,
	jsonlFile: string,
	projectDir: string,
	nextAgentIdRef: { current: number },
	agents: Map<number, AgentState>,
	activeAgentIdRef: { current: number | null },
	fileWatchers: Map<number, fs.FSWatcher>,
	pollingTimers: Map<number, ReturnType<typeof setInterval>>,
	waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
	permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
	webview: vscode.Webview | undefined,
	persistAgents: () => void,
): void {
	const id = nextAgentIdRef.current++;
	const agent: AgentState = {
		id,
		terminalRef: terminal,
		projectDir,
		jsonlFile,
		fileOffset: 0,
		lineBuffer: '',
		activeToolIds: new Set(),
		activeToolStatuses: new Map(),
		activeToolNames: new Map(),
		activeSubagentToolIds: new Map(),
		activeSubagentToolNames: new Map(),
		isWaiting: false,
		permissionSent: false,
		hadToolsInTurn: false,
		// Extract project name from directory path for display
		folderName: path.basename(projectDir),
	};

	agents.set(id, agent);
	activeAgentIdRef.current = id;
	persistAgents();

	console.log(`[Pixel Agents] Global scan: created agent ${id} for ${path.basename(jsonlFile)}`);
	webview?.postMessage({ type: 'agentCreated', id, folderName: path.basename(projectDir) });

	startFileWatchingInternal(id, jsonlFile, agents, fileWatchers, pollingTimers, waitingTimers, permissionTimers, webview);
	readNewLinesInternal(id, agents, waitingTimers, permissionTimers, webview);
}