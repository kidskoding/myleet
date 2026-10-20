def can_transform(start: str, result: str) -> bool:
    if start.replace("X", "") != result.replace("X", ""):
        return False
    before = [i for i, c in enumerate(start) if c != "X"]
    after = [j for j, c in enumerate(result) if c != "X"]
    for i, j in zip(before, after):
        if start[i] == "L" and i < j:
            return False
        if start[i] == "R" and i > j:
            return False
    return True
