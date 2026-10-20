from solution import number_of_steps


def test_number_of_steps_example():
    assert number_of_steps(14) == 6


def test_number_of_steps_power_of_two():
    assert number_of_steps(8) == 4


def test_number_of_steps_mixed():
    assert number_of_steps(123) == 12


def test_number_of_steps_zero():
    assert number_of_steps(0) == 0


def test_number_of_steps_one():
    assert number_of_steps(1) == 1
