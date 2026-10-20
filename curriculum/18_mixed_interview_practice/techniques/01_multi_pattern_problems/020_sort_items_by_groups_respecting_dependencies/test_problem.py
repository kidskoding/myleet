from solution import sort_items


def is_valid_item_order(n: int, group: list[int], before_items: list[list[int]], order: list[int]) -> bool:
    """Any order satisfying the constraints is accepted, so check those directly."""
    if sorted(order) != list(range(n)):
        return False
    position = {item: i for i, item in enumerate(order)}
    for item, befores in enumerate(before_items):
        if any(position[b] > position[item] for b in befores):
            return False
    seen_groups: list[int] = []
    for item in order:
        g = group[item]
        if g == -1 or (seen_groups and seen_groups[-1] == g):
            continue
        if g in seen_groups:
            return False
        seen_groups.append(g)
    return True


def test_sort_items_respects_groups_and_dependencies():
    group = [-1, -1, 1, 0, 0, 1, 0, -1]
    before_items = [[], [6], [5], [6], [3, 6], [], [], []]
    order = sort_items(8, 2, group[:], before_items)

    assert is_valid_item_order(8, group, before_items, order)


def test_sort_items_cycle_returns_empty():
    group = [-1, -1, 1, 0, 0, 1, 0, -1]
    before_items = [[], [6], [5], [6], [3], [], [4], []]

    assert sort_items(8, 2, group[:], before_items) == []
