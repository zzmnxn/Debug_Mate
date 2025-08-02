"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __typia_transform__validateReport = __importStar(require("typia/lib/internal/_validateReport.js"));
const core_1 = require("@agentica/core");
const rpc_1 = require("@agentica/rpc");
const openai_1 = __importDefault(require("openai"));
const tgrid_1 = require("tgrid");
const typia_1 = __importDefault(require("typia"));
const functions_1 = require("./functions");
const SGlobal_1 = require("../SGlobal");
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const port = Number(SGlobal_1.SGlobal.env.PORT);
    const server = new tgrid_1.WebSocketServer();
    console.log(`Agentica function server running on port ${port}`);
    yield server.open(port, (acceptor) => __awaiter(void 0, void 0, void 0, function* () {
        const agent = new core_1.Agentica({
            model: "chatgpt",
            vendor: {
                api: new openai_1.default({ apiKey: SGlobal_1.SGlobal.env.OPENAI_API_KEY }),
                model: "gpt-4o-mini",
            },
            controllers: [
                {
                    protocol: "class",
                    name: "errorDiagnosis",
                    application: {
                        model: "chatgpt",
                        options: {
                            reference: true,
                            strict: false,
                            separate: null
                        },
                        functions: [
                            {
                                name: "diagnoseError",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        errorMessage: {
                                            type: "string"
                                        }
                                    },
                                    required: [
                                        "errorMessage"
                                    ],
                                    additionalProperties: false,
                                    $defs: {}
                                },
                                output: {
                                    type: "object",
                                    properties: {
                                        explanation: {
                                            anyOf: [
                                                {
                                                    type: "null"
                                                },
                                                {
                                                    type: "string"
                                                }
                                            ]
                                        }
                                    },
                                    required: [
                                        "explanation"
                                    ]
                                },
                                validate: (() => { const _io0 = input => "string" === typeof input.errorMessage; const _vo0 = (input, _path, _exceptionable = true) => ["string" === typeof input.errorMessage || _report(_exceptionable, {
                                        path: _path + ".errorMessage",
                                        expected: "string",
                                        value: input.errorMessage
                                    })].every(flag => flag); const __is = input => "object" === typeof input && null !== input && _io0(input); let errors; let _report; return input => {
                                    if (false === __is(input)) {
                                        errors = [];
                                        _report = __typia_transform__validateReport._validateReport(errors);
                                        ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || _report(true, {
                                            path: _path + "",
                                            expected: "__type",
                                            value: input
                                        })) && _vo0(input, _path + "", true) || _report(true, {
                                            path: _path + "",
                                            expected: "__type",
                                            value: input
                                        }))(input, "$input", true);
                                        const success = 0 === errors.length;
                                        return success ? {
                                            success,
                                            data: input
                                        } : {
                                            success,
                                            errors,
                                            data: input
                                        };
                                    }
                                    return {
                                        success: true,
                                        data: input
                                    };
                                }; })()
                            },
                            {
                                name: "debugHint",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        output: {
                                            type: "string"
                                        }
                                    },
                                    required: [
                                        "output"
                                    ],
                                    additionalProperties: false,
                                    $defs: {}
                                },
                                output: {
                                    type: "object",
                                    properties: {
                                        hint: {
                                            anyOf: [
                                                {
                                                    type: "null"
                                                },
                                                {
                                                    type: "string"
                                                }
                                            ]
                                        }
                                    },
                                    required: [
                                        "hint"
                                    ]
                                },
                                validate: (() => { const _io0 = input => "string" === typeof input.output; const _vo0 = (input, _path, _exceptionable = true) => ["string" === typeof input.output || _report(_exceptionable, {
                                        path: _path + ".output",
                                        expected: "string",
                                        value: input.output
                                    })].every(flag => flag); const __is = input => "object" === typeof input && null !== input && _io0(input); let errors; let _report; return input => {
                                    if (false === __is(input)) {
                                        errors = [];
                                        _report = __typia_transform__validateReport._validateReport(errors);
                                        ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || _report(true, {
                                            path: _path + "",
                                            expected: "__type",
                                            value: input
                                        })) && _vo0(input, _path + "", true) || _report(true, {
                                            path: _path + "",
                                            expected: "__type",
                                            value: input
                                        }))(input, "$input", true);
                                        const success = 0 === errors.length;
                                        return success ? {
                                            success,
                                            data: input
                                        } : {
                                            success,
                                            errors,
                                            data: input
                                        };
                                    }
                                    return {
                                        success: true,
                                        data: input
                                    };
                                }; })()
                            }
                        ]
                    },
                    execute: new functions_1.ErrorDiagnosisService(),
                },
            ],
            histories: [],
        });
        const service = new rpc_1.AgenticaRpcService({
            agent,
            listener: acceptor.getDriver(),
        });
        console.log(`Agentica function registered and ready...`);
        yield acceptor.accept(service);
        console.log(`Connection accepted: ${acceptor.path}`);
        console.log(`Available controller: errorDiagnosis`);
    }));
    console.log(`WebSocket server running on port ${port}.`);
});
main().catch(console.error);
//# sourceMappingURL=server.js.map