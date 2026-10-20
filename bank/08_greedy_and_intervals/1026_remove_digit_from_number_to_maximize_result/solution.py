def remove_digit(number: str, digit: str) -> str:
    last = -1
    for i, ch in enumerate(number):
        if ch == digit:
            last = i
            if i + 1 < len(number) and number[i + 1] > ch:
                return number[:i] + number[i + 1 :]
    return number[:last] + number[last + 1 :]
