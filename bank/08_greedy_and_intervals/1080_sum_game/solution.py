def sum_game(num: str) -> bool:
    half = len(num) // 2
    left_sum = right_sum = left_q = right_q = 0
    for i, ch in enumerate(num):
        if ch == "?":
            if i < half:
                left_q += 1
            else:
                right_q += 1
        elif i < half:
            left_sum += int(ch)
        else:
            right_sum += int(ch)
    if (left_q + right_q) % 2 == 1:
        return True
    return 2 * (left_sum - right_sum) != 9 * (right_q - left_q)
