def can_change(start: str, target: str) -> bool:
    n = len(start)
    i = j = 0
    while True:
        while i < n and start[i] == "_":
            i += 1
        while j < n and target[j] == "_":
            j += 1
        if i == n or j == n:
            return i == n and j == n
        if start[i] != target[j]:
            return False
        if start[i] == "L" and i < j:
            return False
        if start[i] == "R" and i > j:
            return False
        i += 1
        j += 1
