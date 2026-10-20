from solution import single_number_ii


def test_single_number_ii_normal():
    assert single_number_ii([2, 2, 3, 2]) == 3


def test_single_number_ii_single_element():
    assert single_number_ii([99]) == 99


def test_single_number_ii_larger_group():
    assert single_number_ii([0, 1, 0, 1, 0, 1, 99]) == 99
