def mem_leak(memory1: int, memory2: int) -> list[int]:
    t = 1
    while True:
        if memory1 >= memory2:
            if memory1 < t:
                return [t, memory1, memory2]
            memory1 -= t
        else:
            if memory2 < t:
                return [t, memory1, memory2]
            memory2 -= t
        t += 1
