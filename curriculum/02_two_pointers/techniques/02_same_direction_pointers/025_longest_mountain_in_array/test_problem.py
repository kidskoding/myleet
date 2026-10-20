from solution import longest_mountain


def test_longest_mountain_normal():
    assert longest_mountain([2, 1, 4, 7, 3, 2, 5]) == 5


def test_longest_mountain_flat():
    assert longest_mountain([2, 2, 2]) == 0


def test_longest_mountain_minimum():
    assert longest_mountain([0, 1, 0]) == 3
