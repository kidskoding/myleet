from solution import two_sum


def test_two_sum_normal():
    assert two_sum([2, 7, 11, 15], 9) == [1, 2]


def test_two_sum_single_pair_at_ends():
    assert two_sum([-1, 0, 3, 5], 4) == [1, 4]


def test_two_sum_negative_numbers():
    assert two_sum([-3, -1, 0, 2, 4], 1) == [2, 4]
