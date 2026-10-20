def sort_array_by_parity(nums: list[int]) -> list[int]:
    out = list(nums)
    write = 0
    for i in range(len(out)):
        if out[i] % 2 == 0:
            out[write], out[i] = out[i], out[write]
            write += 1
    return out
