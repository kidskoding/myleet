from solution import running_sum


def test_running_sum_increasing():
    assert running_sum([1, 2, 3, 4]) == [1, 3, 6, 10]


def test_running_sum_all_ones():
    assert running_sum([1, 1, 1, 1, 1]) == [1, 2, 3, 4, 5]


def test_running_sum_mixed():
    assert running_sum([3, 1, 2, 10, 1]) == [3, 4, 6, 16, 17]


def test_running_sum_single():
    assert running_sum([7]) == [7]


def test_running_sum_negatives():
    assert running_sum([-1, 1, -1, -1000000]) == [-1, 0, -1, -1000001]
