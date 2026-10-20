def verify_preorder(preorder: list[int]) -> bool:
    low = float("-inf")
    stack: list[int] = []
    for value in preorder:
        if value < low:
            return False
        while stack and stack[-1] < value:
            low = stack.pop()
        stack.append(value)
    return True
