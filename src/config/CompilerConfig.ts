export const CompilerConfig = {
  gcc: 'gcc',
  flags: [
    '-Wall','-Wextra','-Wpedantic','-O2','-Wdiv-by-zero',
    '-fanalyzer','-fsanitize=undefined','-fsanitize=address'
  ],
  runTimeoutMs: 3000,
  compileTimeoutMs: 10000,
};
