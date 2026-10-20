def find_max_val(n: int, restrictions: list[list[int]], diff: list[int]) -> int:
    cap = [float("inf")] * n
    cap[0] = 0
    for idx, max_val in restrictions:
        cap[idx] = min(cap[idx], max_val)
    for i in range(1, n):
        cap[i] = min(cap[i], cap[i - 1] + diff[i - 1])
    for i in range(n - 2, -1, -1):
        cap[i] = min(cap[i], cap[i + 1] + diff[i])
    return int(max(cap))
