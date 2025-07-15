"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SGlobal = void 0;
require("dotenv/config");
exports.SGlobal = {
    env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        PORT: process.env.PORT,
    },
};
//# sourceMappingURL=SGlobal.js.map