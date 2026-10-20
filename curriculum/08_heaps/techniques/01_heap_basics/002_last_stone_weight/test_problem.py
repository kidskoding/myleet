from solution import last_stone_weight


def test_last_stone_weight_normal():
    assert last_stone_weight([2, 7, 4, 1, 8, 1]) == 1


def test_last_stone_weight_all_destroyed():
    assert last_stone_weight([2, 2]) == 0


def test_last_stone_weight_single():
    assert last_stone_weight([5]) == 5


def test_last_stone_weight_empty():
    assert last_stone_weight([]) == 0
