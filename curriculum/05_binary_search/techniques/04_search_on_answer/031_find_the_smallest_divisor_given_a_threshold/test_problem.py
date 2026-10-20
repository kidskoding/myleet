from solution import smallest_divisor


def test_smallest_divisor_normal():
    assert smallest_divisor([1, 2, 5, 9], 6) == 5


def test_smallest_divisor_tight_threshold():
    assert smallest_divisor([44, 22, 33, 11, 1], 5) == 44
