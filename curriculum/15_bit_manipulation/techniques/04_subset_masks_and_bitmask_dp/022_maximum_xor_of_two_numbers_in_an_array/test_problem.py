from solution import max_xor_of_two_numbers


def test_max_xor_of_two_numbers_normal():
    assert max_xor_of_two_numbers([3, 10, 5, 25, 2, 8]) == 28


def test_max_xor_of_two_numbers_two_elements():
    assert max_xor_of_two_numbers([0, 1]) == 1


def test_max_xor_of_two_numbers_zeros():
    assert max_xor_of_two_numbers([0, 0]) == 0
