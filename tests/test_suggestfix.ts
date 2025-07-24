import { suggestFix } from "../src/agentica/handlers";

export async function runSuggestFix(code: string) {
    const { suggestion } = await suggestFix({ code });
    console.log("🛠️ [suggestFix 결과]");
    console.log(suggestion);
}