def total_strength(strength: list[int]) -> int:
    mod = 10**9 + 7
    n = len(strength)
    left = [-1] * n
    right = [n] * n
    stack: list[int] = []
    for i, v in enumerate(strength):
        while stack and strength[stack[-1]] >= v:
            right[stack.pop()] = i
        left[i] = stack[-1] if stack else -1
        stack.append(i)
    prefix = [0] * (n + 1)
    for i, v in enumerate(strength):
        prefix[i + 1] = prefix[i] + v
    prefix_of_prefix = [0] * (n + 2)
    for i in range(n + 1):
        prefix_of_prefix[i + 1] = prefix_of_prefix[i] + prefix[i]
    total = 0
    for i, v in enumerate(strength):
        lo, hi = left[i] + 1, right[i] - 1
        right_sum = prefix_of_prefix[hi + 2] - prefix_of_prefix[i + 1]
        left_sum = prefix_of_prefix[i + 1] - prefix_of_prefix[lo]
        total = (total + v * ((i - lo + 1) * right_sum - (hi - i + 1) * left_sum)) % mod
    return total
