// src/types/DebugTypes.ts

export type HandleArgs = {
  code: string;
  fileName: string;
  userQuery: string;
};

export type BeforeDebugArgs = {
  code: string;
  fileName: string;
};

export type BeforeDebugResult = string;
