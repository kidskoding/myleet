def maximum_sum_of_heights(max_heights: list[int]) -> int:
    n = len(max_heights)
    stk: list[int] = []
    left = [-1] * n
    for i, x in enumerate(max_heights):
        while stk and max_heights[stk[-1]] > x:
            stk.pop()
        if stk:
            left[i] = stk[-1]
        stk.append(i)
    stk = []
    right = [n] * n
    for i in range(n - 1, -1, -1):
        x = max_heights[i]
        while stk and max_heights[stk[-1]] >= x:
            stk.pop()
        if stk:
            right[i] = stk[-1]
        stk.append(i)
    f = [0] * n
    for i, x in enumerate(max_heights):
        if i and x >= max_heights[i - 1]:
            f[i] = f[i - 1] + x
        else:
            j = left[i]
            f[i] = x * (i - j) + (f[j] if j != -1 else 0)
    g = [0] * n
    for i in range(n - 1, -1, -1):
        if i < n - 1 and max_heights[i] >= max_heights[i + 1]:
            g[i] = g[i + 1] + max_heights[i]
        else:
            j = right[i]
            g[i] = max_heights[i] * (j - i) + (g[j] if j != n else 0)
    return max(a + b - c for a, b, c in zip(f, g, max_heights))
