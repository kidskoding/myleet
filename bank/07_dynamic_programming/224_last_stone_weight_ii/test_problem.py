from solution import last_stone_weight_ii


def test_last_stone_weight_ii_example():
    assert last_stone_weight_ii([2, 7, 4, 1, 8, 1]) == 1


def test_last_stone_weight_ii_odd_total():
    assert last_stone_weight_ii([31, 26, 33, 21, 40]) == 5


def test_last_stone_weight_ii_single():
    assert last_stone_weight_ii([1]) == 1


def test_last_stone_weight_ii_pair_cancels():
    assert last_stone_weight_ii([1, 1]) == 0


def test_last_stone_weight_ii_equal_triple():
    assert last_stone_weight_ii([5, 5, 5]) == 5
