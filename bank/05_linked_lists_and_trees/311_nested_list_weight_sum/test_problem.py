from solution import depth_sum


def test_depth_sum_example():
    assert depth_sum([[1, 1], 2, [1, 1]]) == 10


def test_depth_sum_deep():
    assert depth_sum([1, [4, [6]]]) == 27


def test_depth_sum_empty():
    assert depth_sum([]) == 0


def test_depth_sum_only_empty_lists():
    assert depth_sum([[[]], []]) == 0


def test_depth_sum_negative_values():
    assert depth_sum([-1, [-2]]) == -5
