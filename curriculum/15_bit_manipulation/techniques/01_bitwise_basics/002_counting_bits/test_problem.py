from solution import count_bits


def test_count_bits_zero():
    assert count_bits(0) == [0]


def test_count_bits_normal():
    assert count_bits(5) == [0, 1, 1, 2, 1, 2]


def test_count_bits_power_of_two():
    assert count_bits(8) == [0, 1, 1, 2, 1, 2, 2, 3, 1]
