def max_depth_after_split(seq: str) -> list[int]:
    ans = [0] * len(seq)
    depth = 0
    for i, ch in enumerate(seq):
        if ch == "(":
            ans[i] = depth % 2
            depth += 1
        else:
            depth -= 1
            ans[i] = depth % 2
    return ans
