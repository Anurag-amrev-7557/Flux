/**
 * Safe Mathematical Expression Evaluator
 * Evaluates inline arithmetic expressions (e.g. "45 + 12.50 * 2") without using eval().
 */

export function evaluateMathExpression(rawInput: string): number | null {
    if (!rawInput) return null;

    // Normalize multiplication symbols and remove whitespace
    const sanitized = rawInput
        .replace(/[xX×]/g, '*')
        .replace(/÷/g, '/')
        .replace(/,/g, '')
        .trim();

    // Check if it contains any arithmetic operator
    const hasOperator = /[+\-*/]/.test(sanitized);
    if (!hasOperator) {
        const num = parseFloat(sanitized);
        return isNaN(num) || !isFinite(num) ? null : num;
    }

    // Tokenize
    const tokens: (number | string)[] = [];
    let currentNumber = '';

    for (let i = 0; i < sanitized.length; i++) {
        const char = sanitized[i];

        if ((char >= '0' && char <= '9') || char === '.') {
            currentNumber += char;
        } else if ('+-*/()'.includes(char)) {
            if (currentNumber !== '') {
                const parsed = parseFloat(currentNumber);
                if (isNaN(parsed)) return null;
                tokens.push(parsed);
                currentNumber = '';
            } else if (char === '-' && (tokens.length === 0 || '/*+(-'.includes(String(tokens[tokens.length - 1])))) {
                // Unary minus
                currentNumber = '-';
                continue;
            }
            tokens.push(char);
        } else if (char === ' ') {
            continue;
        } else {
            return null; // Invalid character
        }
    }

    if (currentNumber !== '') {
        const parsed = parseFloat(currentNumber);
        if (isNaN(parsed)) return null;
        tokens.push(parsed);
    }

    if (tokens.length === 0) return null;

    // Recursive Descent Parser
    let index = 0;

    function parseFactor(): number | null {
        if (index >= tokens.length) return null;
        const token = tokens[index];

        if (token === '(') {
            index++;
            const val = parseExpression();
            if (index >= tokens.length || tokens[index] !== ')') return null;
            index++;
            return val;
        }

        if (typeof token === 'number') {
            index++;
            return token;
        }

        return null;
    }

    function parseTerm(): number | null {
        let left = parseFactor();
        if (left === null) return null;

        while (index < tokens.length && (tokens[index] === '*' || tokens[index] === '/')) {
            const op = tokens[index];
            index++;
            const right = parseFactor();
            if (right === null) return null;

            if (op === '*') {
                left = left * right;
            } else if (op === '/') {
                if (right === 0) return null;
                left = left / right;
            }
        }

        return left;
    }

    function parseExpression(): number | null {
        let left = parseTerm();
        if (left === null) return null;

        while (index < tokens.length && (tokens[index] === '+' || tokens[index] === '-')) {
            const op = tokens[index];
            index++;
            const right = parseTerm();
            if (right === null) return null;

            if (op === '+') {
                left = left + right;
            } else if (op === '-') {
                left = left - right;
            }
        }

        return left;
    }

    const result = parseExpression();
    if (result === null || index < tokens.length || !isFinite(result)) {
        return null;
    }

    return Math.round(result * 100) / 100;
}
