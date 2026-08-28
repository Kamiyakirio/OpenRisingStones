/** Extracts login credentials from Chrome's "Copy as cURL (bash)" output. */
export type CurlCredentials = {
  recognized: boolean;
  cookie: string | null;
  userAgent: string | null;
};

export function extractCurlCredentials(source: string): CurlCredentials {
  const tokens = tokenizeBash(source.trim());
  if (!isCurlCommand(tokens[0])) {
    return { recognized: false, cookie: null, userAgent: null };
  }

  let cookie: string | null = null;
  let userAgent: string | null = null;

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const header = readOptionValue(tokens, index, token, "-H", "--header");
    if (header) {
      const separator = header.value.indexOf(":");
      if (separator > 0) {
        const name = header.value.slice(0, separator).trim().toLowerCase();
        const value = header.value.slice(separator + 1).trim();
        if (name === "cookie") cookie = value || null;
        if (name === "user-agent") userAgent = value || null;
      }
      index += header.consumedNext ? 1 : 0;
      continue;
    }

    const cookieOption = readOptionValue(
      tokens,
      index,
      token,
      "-b",
      "--cookie",
    );
    if (cookieOption) {
      cookie = cookieOption.value.trim() || null;
      index += cookieOption.consumedNext ? 1 : 0;
      continue;
    }

    const userAgentOption = readOptionValue(
      tokens,
      index,
      token,
      "-A",
      "--user-agent",
    );
    if (userAgentOption) {
      userAgent = userAgentOption.value.trim() || null;
      index += userAgentOption.consumedNext ? 1 : 0;
    }
  }

  return { recognized: true, cookie, userAgent };
}

function isCurlCommand(command: string | undefined) {
  if (!command) return false;
  const executable = command.replaceAll("\\", "/").split("/").at(-1);
  return executable === "curl" || executable === "curl.exe";
}

function readOptionValue(
  tokens: string[],
  index: number,
  token: string,
  shortOption: string,
  longOption: string,
) {
  if (token === shortOption || token === longOption) {
    return { value: tokens[index + 1] ?? "", consumedNext: true };
  }
  if (token.startsWith(`${longOption}=`)) {
    return { value: token.slice(longOption.length + 1), consumedNext: false };
  }
  if (token.startsWith(shortOption) && token.length > shortOption.length) {
    return { value: token.slice(shortOption.length), consumedNext: false };
  }
  return null;
}

/** Tokenizes the quoting and line-continuation forms emitted by Chrome. */
function tokenizeBash(source: string) {
  const tokens: string[] = [];
  let token = "";
  let quote: "single" | "double" | null = null;
  let tokenStarted = false;

  const commit = () => {
    if (tokenStarted) tokens.push(token);
    token = "";
    tokenStarted = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quote === "single") {
      if (character === "'") quote = null;
      else token += character;
      continue;
    }

    if (quote === "double") {
      if (character === '"') {
        quote = null;
      } else if (character === "\\") {
        const next = source[index + 1];
        if (next === "\n") index += 1;
        else if (next && ['"', "\\", "$", "`"].includes(next)) {
          token += next;
          index += 1;
        } else {
          token += character;
        }
      } else {
        token += character;
      }
      continue;
    }

    if (/\s/.test(character)) {
      commit();
    } else if (character === "'") {
      quote = "single";
      tokenStarted = true;
    } else if (character === '"') {
      quote = "double";
      tokenStarted = true;
    } else if (character === "\\") {
      const next = source[index + 1];
      if (next === "\r" && source[index + 2] === "\n") index += 2;
      else if (next === "\n") index += 1;
      else if (next) {
        token += next;
        tokenStarted = true;
        index += 1;
      }
    } else {
      token += character;
      tokenStarted = true;
    }
  }

  commit();
  return tokens;
}
