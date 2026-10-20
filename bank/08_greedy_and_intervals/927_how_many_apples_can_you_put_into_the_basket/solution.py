CAPACITY = 5000


def max_number_of_apples(weight: list[int]) -> int:
    total = 0
    count = 0
    for w in sorted(weight):
        if total + w > CAPACITY:
            break
        total += w
        count += 1
    return count
