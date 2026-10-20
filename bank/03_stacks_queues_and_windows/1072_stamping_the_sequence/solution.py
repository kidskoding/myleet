def moves_to_stamp(stamp: str, target: str) -> list[int]:
    m, n = len(stamp), len(target)
    t = list(target)
    done = [False] * (n - m + 1)
    order: list[int] = []
    erased = 0

    def can_erase(i: int) -> bool:
        changed = False
        for j in range(m):
            if t[i + j] == "?":
                continue
            if t[i + j] != stamp[j]:
                return False
            changed = True
        return changed

    while erased < n:
        progress = False
        for i in range(n - m + 1):
            if not done[i] and can_erase(i):
                done[i] = True
                progress = True
                for j in range(m):
                    if t[i + j] != "?":
                        t[i + j] = "?"
                        erased += 1
                order.append(i)
        if not progress:
            return []
    return order[::-1]
