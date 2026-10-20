def minimize_result(expression: str) -> str:
    left, right = expression.split("+")
    best_value = None
    best = ""
    for i in range(len(left)):
        for j in range(1, len(right) + 1):
            outer_left = int(left[:i]) if i else 1
            outer_right = int(right[j:]) if j < len(right) else 1
            value = outer_left * (int(left[i:]) + int(right[:j])) * outer_right
            if best_value is None or value < best_value:
                best_value = value
                best = f"{left[:i]}({left[i:]}+{right[:j]}){right[j:]}"
    return best
