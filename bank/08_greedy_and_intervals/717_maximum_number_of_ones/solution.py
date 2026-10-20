def maximum_number_of_ones(width: int, height: int, side_length: int, max_ones: int) -> int:
    counts = []
    for r in range(side_length):
        for c in range(side_length):
            rows = (height - r + side_length - 1) // side_length
            cols = (width - c + side_length - 1) // side_length
            counts.append(rows * cols)
    counts.sort(reverse=True)
    return sum(counts[:max_ones])
