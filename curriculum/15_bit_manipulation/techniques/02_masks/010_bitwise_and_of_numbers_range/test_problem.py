from solution import range_bitwise_and


def test_range_bitwise_and_same_value():
    assert range_bitwise_and(5, 5) == 5


def test_range_bitwise_and_normal():
    assert range_bitwise_and(5, 7) == 4


def test_range_bitwise_and_includes_zero():
    assert range_bitwise_and(0, 1) == 0


def test_range_bitwise_and_wide_range():
    assert range_bitwise_and(1, 2147483647) == 0
