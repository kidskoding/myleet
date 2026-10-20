from collections import defaultdict


def group_the_people(group_sizes: list[int]) -> list[list[int]]:
    pending: dict[int, list[int]] = defaultdict(list)
    groups = []
    for person, size in enumerate(group_sizes):
        pending[size].append(person)
        if len(pending[size]) == size:
            groups.append(pending.pop(size))
    return groups
