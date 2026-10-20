def is_strobogrammatic(num: str) -> bool:
    # Time: O(n).
    # Space: O(1).
    rotate = {"0": "0", "1": "1", "6": "9", "8": "8", "9": "6"}
    i, j = 0, len(num) - 1
    while i <= j:
        if num[i] not in rotate or rotate[num[i]] != num[j]:
            return False
        i += 1
        j -= 1
    return True
