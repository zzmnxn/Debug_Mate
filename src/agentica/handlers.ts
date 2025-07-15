import { SGlobal } from "../SGlobal";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: SGlobal.env.OPENAI_API_KEY });

export async function diagnoseError({ errorMessage }: { errorMessage: string }) {
  const prompt = `다음 컴파일러 에러 메시지를 사람이 이해하기 쉽게 설명하고, 원인과 해결책을 요약해줘.\n\n${errorMessage}`;
  const res = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  return { explanation: res.choices[0].message.content };
}

export async function debugHint({ output }: { output: string }) {
  const prompt = `다음 프로그램 출력을 보고, 어떤 문제가 있을지 추정하고 디버깅 힌트를 제시해줘.\n\n${output}`;
  const res = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  return { hint: res.choices[0].message.content };
}
