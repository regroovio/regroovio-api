import { config } from "dotenv";
config();

import { Configuration, OpenAIApi } from "openai";
import readline from "readline";

const openAi = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPEN_AI_API_KEY,
  })
);

const userInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const previousMessages = [];

function displayLoadingIndicator() {
  process.stdout.write("Loading...");
}

function clearLoadingIndicator() {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

async function getChatCompletion(userInput) {
  previousMessages.push({ role: "user", content: userInput });
  const response = await openAi.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: previousMessages,
  });
  return response.data.choices[0].message.content;
}

userInterface.prompt();
userInterface.on("line", async (input) => {
  try {
    displayLoadingIndicator();
    const response = await getChatCompletion(input);
    clearLoadingIndicator();
    console.log(response);
    previousMessages.push({ role: "assistant", content: response });
  } catch (error) {
    clearLoadingIndicator();
    console.error("Error:", error.message);
  } finally {
    userInterface.prompt();
  }
});
