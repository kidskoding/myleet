from solution import minimum_one_bit_operations


def test_minimum_one_bit_operations_three():
    assert minimum_one_bit_operations(3) == 2


def test_minimum_one_bit_operations_six():
    assert minimum_one_bit_operations(6) == 4


def test_minimum_one_bit_operations_zero():
    assert minimum_one_bit_operations(0) == 0


def test_minimum_one_bit_operations_power_of_two():
    assert minimum_one_bit_operations(8) == 15


def test_minimum_one_bit_operations_two():
    assert minimum_one_bit_operations(2) == 3


def test_minimum_one_bit_operations_large():
    assert minimum_one_bit_operations(1_000_000_000) == 756249599
