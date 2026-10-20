def reverse_parentheses(s: str) -> str:
    stack: list[list[str]] = [[]]
    for ch in s:
        if ch == "(":
            stack.append([])
        elif ch == ")":
            inner = stack.pop()
            stack[-1].extend(reversed(inner))
        else:
            stack[-1].append(ch)
    return "".join(stack[0])
