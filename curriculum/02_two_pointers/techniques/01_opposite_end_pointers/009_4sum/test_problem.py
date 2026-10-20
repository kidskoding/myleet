from solution import four_sum


def test_four_sum_empty():
    assert four_sum([], 0) == []


def test_four_sum_normal():
    result = sorted(sorted(quad) for quad in four_sum([1, 0, -1, 0, -2, 2], 0))
    expected = sorted(sorted(quad) for quad in [[-2, -1, 1, 2], [-2, 0, 0, 2], [-1, 0, 0, 1]])
    assert result == expected
