def robot_with_string(s: str) -> str:
    n = len(s)
    suffix_min = ["{"] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix_min[i] = min(s[i], suffix_min[i + 1])
    stack: list[str] = []
    out: list[str] = []
    for i, ch in enumerate(s):
        stack.append(ch)
        while stack and stack[-1] <= suffix_min[i + 1]:
            out.append(stack.pop())
    return "".join(out)
