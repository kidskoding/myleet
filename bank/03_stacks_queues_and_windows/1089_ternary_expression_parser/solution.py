def parse_ternary(expression: str) -> str:
    stack: list[str] = []
    for ch in reversed(expression):
        if stack and stack[-1] == "?":
            stack.pop()
            if_true = stack.pop()
            stack.pop()
            if_false = stack.pop()
            stack.append(if_true if ch == "T" else if_false)
        else:
            stack.append(ch)
    return stack[0]
