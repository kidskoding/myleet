def contains_pattern(arr: list[int], m: int, k: int) -> bool:
    need = (k - 1) * m
    streak = 0
    for i in range(len(arr) - m):
        streak = streak + 1 if arr[i] == arr[i + m] else 0
        if streak == need:
            return True
    return False
