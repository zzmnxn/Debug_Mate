"use strict";
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
exports.diagnoseError = diagnoseError;
exports.debugHint = debugHint;
const SGlobal_1 = require("../SGlobal");
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({ apiKey: SGlobal_1.SGlobal.env.OPENAI_API_KEY });
function diagnoseError(_a) {
    return __awaiter(this, arguments, void 0, function* ({ errorMessage }) {
        const prompt = `���� �����Ϸ� ���� �޽����� ����� �����ϱ� ���� �����ϰ�, ���ΰ� �ذ�å�� �������.\n\n${errorMessage}`;
        const res = yield openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
        });
        return { explanation: res.choices[0].message.content };
    });
}
function debugHint(_a) {
    return __awaiter(this, arguments, void 0, function* ({ output }) {
        const prompt = `���� ���α׷� ����� ����, � ������ ������ �����ϰ� ����� ��Ʈ�� ��������.\n\n${output}`;
        const res = yield openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
        });
        return { hint: res.choices[0].message.content };
    });
}
//# sourceMappingURL=handlers.js.map