def min_number_operations(target: list[int]) -> int:
    total = target[0]
    for i in range(1, len(target)):
        if target[i] > target[i - 1]:
            total += target[i] - target[i - 1]
    return total
