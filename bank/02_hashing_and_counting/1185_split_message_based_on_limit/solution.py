def split_message(message: str, limit: int) -> list[str]:
    n = len(message)
    sa = 0
    for k in range(1, n + 1):
        sa += len(str(k))
        sb = len(str(k)) * k
        sc = 3 * k
        if limit * k - (sa + sb + sc) >= n:
            ans: list[str] = []
            i = 0
            for j in range(1, k + 1):
                tail = f"<{j}/{k}>"
                take = limit - len(tail)
                ans.append(message[i : i + take] + tail)
                i += take
            return ans
    return []
