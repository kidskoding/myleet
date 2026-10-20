from solution import single_number


def test_single_number_normal():
    assert single_number([4, 1, 2, 1, 2]) == 4


def test_single_number_single_element():
    assert single_number([1]) == 1


def test_single_number_negative_values():
    assert single_number([-1, -1, -2]) == -2
