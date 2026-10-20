def merge_triplets(triplets: list[list[int]], target: list[int]) -> bool:
    found = [False, False, False]
    for triplet in triplets:
        if any(triplet[i] > target[i] for i in range(3)):
            continue
        for i in range(3):
            if triplet[i] == target[i]:
                found[i] = True
    return all(found)
