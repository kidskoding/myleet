from solution import min_stone_sum


def test_min_stone_sum_two_operations():
    assert min_stone_sum([5, 4, 9], 2) == 12


def test_min_stone_sum_three_operations():
    assert min_stone_sum([4, 3, 6, 7], 3) == 12
