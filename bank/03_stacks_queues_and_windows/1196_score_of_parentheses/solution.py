def score_of_parentheses(s: str) -> int:
    stack = [0]
    for ch in s:
        if ch == "(":
            stack.append(0)
        else:
            v = stack.pop()
            stack[-1] += 1 if v == 0 else 2 * v
    return stack[0]
