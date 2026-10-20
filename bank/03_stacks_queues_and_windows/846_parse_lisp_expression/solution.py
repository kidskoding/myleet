def evaluate(expression: str) -> int:
    tokens = expression.replace("(", " ( ").replace(")", " ) ").split()
    pos = 0
    scopes: list[dict[str, int]] = [{}]

    def lookup(name: str) -> int:
        for scope in reversed(scopes):
            if name in scope:
                return scope[name]
        raise KeyError(name)

    def parse() -> int:
        nonlocal pos
        token = tokens[pos]
        pos += 1
        if token != "(":
            if token[0] == "-" or token[0].isdigit():
                return int(token)
            return lookup(token)
        op = tokens[pos]
        pos += 1
        if op == "add" or op == "mult":
            left = parse()
            right = parse()
            pos += 1
            return left + right if op == "add" else left * right
        scopes.append({})
        while True:
            if tokens[pos] == "(" or tokens[pos + 1] == ")":
                value = parse()
                break
            name = tokens[pos]
            pos += 1
            scopes[-1][name] = parse()
        pos += 1
        scopes.pop()
        return value

    return parse()
