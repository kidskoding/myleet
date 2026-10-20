def get_max_function_value(receiver: list[int], k: int) -> int:
    n = len(receiver)
    jump = receiver[:]
    gain = receiver[:]
    position = list(range(n))
    score = list(range(n))
    while k:
        if k & 1:
            for i in range(n):
                score[i] += gain[position[i]]
                position[i] = jump[position[i]]
        k >>= 1
        if k:
            gain = [gain[i] + gain[jump[i]] for i in range(n)]
            jump = [jump[jump[i]] for i in range(n)]
    return max(score)
