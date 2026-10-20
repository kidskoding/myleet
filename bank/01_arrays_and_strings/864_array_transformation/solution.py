def transform_array(arr: list[int]) -> list[int]:
    current = list(arr)
    while True:
        nxt = current[:]
        for i in range(1, len(current) - 1):
            if current[i] < current[i - 1] and current[i] < current[i + 1]:
                nxt[i] += 1
            elif current[i] > current[i - 1] and current[i] > current[i + 1]:
                nxt[i] -= 1
        if nxt == current:
            return current
        current = nxt
