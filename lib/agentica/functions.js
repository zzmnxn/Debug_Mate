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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorDiagnosisService = void 0;
const handlers_1 = require("./handlers");
class ErrorDiagnosisService {
    diagnoseError(_a) {
        return __awaiter(this, arguments, void 0, function* ({ errorMessage }) {
            return (0, handlers_1.diagnoseError)({ errorMessage });
        });
    }
    debugHint(_a) {
        return __awaiter(this, arguments, void 0, function* ({ output }) {
            return (0, handlers_1.debugHint)({ output });
        });
    }
}
exports.ErrorDiagnosisService = ErrorDiagnosisService;
//# sourceMappingURL=functions.js.map