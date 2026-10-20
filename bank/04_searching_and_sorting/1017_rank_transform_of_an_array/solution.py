def array_rank_transform(arr: list[int]) -> list[int]:
    rank = {value: i + 1 for i, value in enumerate(sorted(set(arr)))}
    return [rank[value] for value in arr]
