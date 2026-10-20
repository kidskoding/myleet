from collections import defaultdict

Poly = dict[tuple[str, ...], int]


def basic_calculator_iv(expression: str, evalvars: list[str], evalints: list[int]) -> list[str]:
    values = dict(zip(evalvars, evalints))
    tokens = expression.replace("(", " ( ").replace(")", " ) ").split()
    pos = 0

    def add(a: Poly, b: Poly, sign: int) -> Poly:
        out: Poly = defaultdict(int, a)
        for mono, coef in b.items():
            out[mono] += sign * coef
        return out

    def mul(a: Poly, b: Poly) -> Poly:
        out: Poly = defaultdict(int)
        for m1, c1 in a.items():
            for m2, c2 in b.items():
                out[tuple(sorted(m1 + m2))] += c1 * c2
        return out

    def parse_expr() -> Poly:
        nonlocal pos
        result = parse_term()
        while pos < len(tokens) and tokens[pos] in "+-":
            sign = 1 if tokens[pos] == "+" else -1
            pos += 1
            result = add(result, parse_term(), sign)
        return result

    def parse_term() -> Poly:
        nonlocal pos
        result = parse_factor()
        while pos < len(tokens) and tokens[pos] == "*":
            pos += 1
            result = mul(result, parse_factor())
        return result

    def parse_factor() -> Poly:
        nonlocal pos
        token = tokens[pos]
        pos += 1
        if token == "(":
            inner = parse_expr()
            pos += 1
            return inner
        if token.isdigit():
            return {(): int(token)}
        if token in values:
            return {(): values[token]}
        return {(token,): 1}

    poly = parse_expr()
    terms = sorted(((m, c) for m, c in poly.items() if c != 0), key=lambda mc: (-len(mc[0]), mc[0]))
    return ["*".join([str(c), *m]) for m, c in terms]
