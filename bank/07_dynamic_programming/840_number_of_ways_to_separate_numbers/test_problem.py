from solution import number_of_combinations


def test_number_of_combinations_example_327():
    assert number_of_combinations("327") == 2


def test_number_of_combinations_example_leading_zero():
    assert number_of_combinations("094") == 0


def test_number_of_combinations_example_zero():
    assert number_of_combinations("0") == 0


def test_number_of_combinations_equal_parts():
    assert number_of_combinations("11") == 2


def test_number_of_combinations_increasing_digits():
    assert number_of_combinations("123") == 3


def test_number_of_combinations_inner_zeros():
    assert number_of_combinations("1010") == 2
