from solution import three_sum


def test_three_sum_empty():
    assert three_sum([]) == []


def test_three_sum_no_triplet():
    assert three_sum([0, 1, 1]) == []


def test_three_sum_normal():
    result = sorted(sorted(triplet) for triplet in three_sum([-1, 0, 1, 2, -1, -4]))
    expected = sorted(sorted(triplet) for triplet in [[-1, -1, 2], [-1, 0, 1]])
    assert result == expected
