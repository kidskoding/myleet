def min_swaps_couples(row: list[int]) -> int:
    seats = list(row)
    where = {person: seat for seat, person in enumerate(seats)}
    swaps = 0
    for i in range(0, len(seats), 2):
        partner = seats[i] ^ 1
        if seats[i + 1] == partner:
            continue
        j = where[partner]
        seats[i + 1], seats[j] = seats[j], seats[i + 1]
        where[seats[j]] = j
        where[partner] = i + 1
        swaps += 1
    return swaps
