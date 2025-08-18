import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface CompileResult {
	log: string;
	compiled: boolean;
}

/**
 * Compile given C code and run the produced binary briefly.
 * Returns combined compile and runtime logs. Cleans up temp files.
 */
export function compileAndRunC(code: string, options?: { timeoutMs?: number; extraGccFlags?: string[] }): CompileResult {
	const timeoutMs = options?.timeoutMs ?? 1000;
	const extraFlags = options?.extraGccFlags ?? [];

	const tmpDir = process.platform === "win32" ? path.join(process.cwd(), "tmp") : "/tmp";
	if (process.platform === "win32" && !fs.existsSync(tmpDir)) {
		fs.mkdirSync(tmpDir, { recursive: true });
	}

	const tmpFile = path.join(tmpDir, `code_${Date.now()}.c`);
	const outputFile = path.join(tmpDir, `a.out_${Date.now()}`);

	let log = "";
	let compiled = false;

	try {
		fs.writeFileSync(tmpFile, code);

		const gccFlags = [
			"-Wall",
			"-Wextra",
			"-O2",
			"-fanalyzer",
			"-fsanitize=undefined",
			"-fsanitize=address",
			...extraFlags,
			tmpFile,
			"-o",
			outputFile,
		];

		const compileResult = spawnSync("gcc", gccFlags, {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "pipe"],
		});

		log += (compileResult.stdout || "") + (compileResult.stderr || "");
		compiled = compileResult.status === 0;

		if (compiled) {
			const runResult = spawnSync(outputFile, [], { encoding: "utf-8", timeout: timeoutMs });
			log += "\n\n=== Runtime Output ===\n";
			log += runResult.stdout || "";
			log += runResult.stderr || "";
		}
	} catch (err: any) {
		log += "\n\n=== Compile/Run Error ===\n" + String(err?.message || err);
	} finally {
		try {
			if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
			if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
		} catch {
			// ignore cleanup errors
		}
	}

	return { log, compiled };
}


