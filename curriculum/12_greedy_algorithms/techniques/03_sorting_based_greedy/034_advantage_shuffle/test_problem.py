from solution import advantage_count


def test_advantage_count_normal():
    assert advantage_count([2, 7, 11, 15], [1, 10, 4, 11]) == [2, 11, 7, 15]


def test_advantage_count_partial():
    assert advantage_count([12, 24, 8, 32], [13, 25, 32, 11]) == [24, 32, 8, 12]
