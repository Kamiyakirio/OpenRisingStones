/** Interpret only declarative TypeScript expressions; never execute source code. */
import ts from "typescript";
import { createHash } from "node:crypto";

export const hash = (value) => createHash("sha256").update(value).digest("hex");

export function reader(text, filename, imports = {}) {
  const file = ts.createSourceFile(
    filename,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const declarations = new Map();
  for (const statement of file.statements) {
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name))
          declarations.set(declaration.name.text, declaration.initializer);
      }
  }
  const cache = new Map(Object.entries(imports));
  const resolving = new Set();
  function constant(name) {
    if (cache.has(name)) return cache.get(name);
    if (!declarations.has(name) || resolving.has(name))
      throw new Error(`${filename}: unsupported or recursive constant ${name}`);
    resolving.add(name);
    const value = evaluate(declarations.get(name));
    resolving.delete(name);
    cache.set(name, value);
    return value;
  }
  function evaluate(node, scope = {}) {
    if (!node) throw new Error(`${filename}: missing expression`);
    if (
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isSatisfiesExpression(node)
    )
      return evaluate(node.expression, scope);
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (ts.isStringLiteralLike(node)) return node.text;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword || ts.isOmittedExpression(node))
      return null;
    if (ts.isIdentifier(node)) {
      if (Object.hasOwn(scope, node.text)) return scope[node.text];
      if (node.text === "undefined") return null;
      if (node.text === "Infinity") return null;
      return constant(node.text);
    }
    if (ts.isArrayLiteralExpression(node))
      return node.elements.flatMap((element) =>
        ts.isSpreadElement(element)
          ? evaluate(element.expression, scope)
          : [evaluate(element, scope)],
      );
    if (ts.isObjectLiteralExpression(node)) {
      const result = Object.create(null);
      for (const property of node.properties) {
        if (ts.isSpreadAssignment(property))
          Object.assign(result, evaluate(property.expression, scope));
        else if (ts.isPropertyAssignment(property)) {
          const key = ts.isComputedPropertyName(property.name)
            ? evaluate(property.name.expression, scope)
            : property.name.text;
          if (["__proto__", "constructor", "prototype"].includes(key))
            throw new Error("Unsupported object key.");
          result[key] = evaluate(property.initializer, scope);
        } else if (ts.isShorthandPropertyAssignment(property))
          result[property.name.text] = evaluate(property.name, scope);
        else throw new Error(`${filename}: non-declarative object property`);
      }
      return result;
    }
    if (ts.isPrefixUnaryExpression(node)) {
      const value = evaluate(node.operand, scope);
      if (node.operator === ts.SyntaxKind.MinusToken) return -value;
      if (node.operator === ts.SyntaxKind.PlusToken) return +value;
      if (node.operator === ts.SyntaxKind.ExclamationToken) return !value;
    }
    if (ts.isBinaryExpression(node)) {
      const left = evaluate(node.left, scope),
        right = evaluate(node.right, scope);
      switch (node.operatorToken.kind) {
        case ts.SyntaxKind.PlusToken:
          return left + right;
        case ts.SyntaxKind.MinusToken:
          return left - right;
        case ts.SyntaxKind.AsteriskToken:
          return left * right;
        case ts.SyntaxKind.SlashToken:
          return left / right;
        default:
          break;
      }
    }
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const value = evaluate(node.expression, scope),
        key = ts.isPropertyAccessExpression(node)
          ? node.name.text
          : evaluate(node.argumentExpression, scope);
      if (key === "length" && Array.isArray(value)) return value.length;
      if (!Object.hasOwn(value, key))
        throw new Error(`${filename}: missing property ${key}`);
      return value[key];
    }
    if (ts.isCallExpression(node)) {
      const call = node.expression.getText(file);
      const args = () =>
        node.arguments.flatMap((a) =>
          ts.isSpreadElement(a)
            ? evaluate(a.expression, scope)
            : [evaluate(a, scope)],
        );
      if (["Number", "String", "Boolean"].includes(call))
        return { Number, String, Boolean }[call](...args());
      if (["Math.min", "Math.max", "Math.round", "Math.floor"].includes(call))
        return Math[call.split(".")[1]](...args());
      if (call === "Object.keys")
        return Object.keys(evaluate(node.arguments[0], scope));
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "slice"
      ) {
        const input = evaluate(node.expression.expression, scope);
        if (!Array.isArray(input) && typeof input !== "string")
          throw new Error("Unsupported slice receiver.");
        return input.slice(...args());
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "map"
      ) {
        const input = evaluate(node.expression.expression, scope),
          callback = node.arguments[0];
        if (
          !Array.isArray(input) ||
          !ts.isArrowFunction(callback) ||
          ts.isBlock(callback.body)
        )
          throw new Error("Unsupported map expression.");
        return input.map((value, index) =>
          evaluate(callback.body, {
            ...scope,
            [callback.parameters[0].name.text]: value,
            ...(callback.parameters[1]
              ? { [callback.parameters[1].name.text]: index }
              : {}),
          }),
        );
      }
    }
    throw new Error(
      `${filename}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: unsupported ${ts.SyntaxKind[node.kind]}`,
    );
  }
  function exportedData() {
    const statement = file.statements.find(ts.isExportAssignment);
    if (
      !statement ||
      file.statements.some(
        (s) => !ts.isExportAssignment(s) && !ts.isEmptyStatement(s),
      )
    )
      throw new Error(`${filename}: expected one declarative default export`);
    return evaluate(statement.expression);
  }
  function formula(name) {
    let node;
    const find = (current) => {
      if (
        (ts.isFunctionDeclaration(current) ||
          ts.isGetAccessorDeclaration(current)) &&
        current.name?.text === name
      )
        node = current;
      ts.forEachChild(current, find);
    };
    find(file);
    if (!node) throw new Error(`${filename}: missing function ${name}`);
    const numbers = [];
    const shape = (current) => {
      if (ts.isNumericLiteral(current)) {
        numbers.push(Number(current.text));
        return [current.kind, "#number"];
      }
      const children = [];
      ts.forEachChild(current, (child) => {
        children.push(shape(child));
      });
      return [
        current.kind,
        ts.isIdentifier(current) || ts.isStringLiteralLike(current)
          ? current.text
          : null,
        children,
      ];
    };
    const structure = hash(JSON.stringify(shape(node)));
    return { numbers, structure };
  }
  return { file, constant, evaluate, exportedData, formula };
}
