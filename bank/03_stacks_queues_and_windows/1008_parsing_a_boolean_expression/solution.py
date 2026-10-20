def parse_bool_expr(expression: str) -> bool:
    stack: list[str] = []
    for ch in expression:
        if ch == ",":
            continue
        if ch != ")":
            stack.append(ch)
            continue
        values: list[bool] = []
        while stack[-1] != "(":
            values.append(stack.pop() == "t")
        stack.pop()
        op = stack.pop()
        if op == "&":
            result = all(values)
        elif op == "|":
            result = any(values)
        else:
            result = not values[0]
        stack.append("t" if result else "f")
    return stack[-1] == "t"
