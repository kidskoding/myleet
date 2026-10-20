from solution import min_pair_sum


def test_min_pair_sum_four_elements():
    assert min_pair_sum([3, 5, 2, 3]) == 7


def test_min_pair_sum_six_elements():
    assert min_pair_sum([3, 5, 4, 2, 4, 6]) == 8
