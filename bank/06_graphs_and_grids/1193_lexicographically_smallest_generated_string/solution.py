def generate_string(str1: str, str2: str) -> str:
    n, m = len(str1), len(str2)
    ans = ["a"] * (n + m - 1)
    fixed = [False] * (n + m - 1)
    for i, bit in enumerate(str1):
        if bit != "T":
            continue
        for j, ch in enumerate(str2):
            k = i + j
            if fixed[k] and ans[k] != ch:
                return ""
            ans[k] = ch
            fixed[k] = True
    for i, bit in enumerate(str1):
        if bit != "F":
            continue
        if "".join(ans[i : i + m]) != str2:
            continue
        for j in range(i + m - 1, i - 1, -1):
            if not fixed[j]:
                ans[j] = "b"
                break
        else:
            return ""
    return "".join(ans)
