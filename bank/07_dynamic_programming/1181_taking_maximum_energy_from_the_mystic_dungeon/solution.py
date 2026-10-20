def maximum_energy(energy: list[int], k: int) -> int:
    total = energy[:]
    for i in range(len(energy) - k - 1, -1, -1):
        total[i] += total[i + k]
    return max(total)
