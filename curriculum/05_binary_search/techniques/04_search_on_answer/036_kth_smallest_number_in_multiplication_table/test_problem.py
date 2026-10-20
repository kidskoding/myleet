from solution import find_kth_number


def test_find_kth_number_square_table():
    assert find_kth_number(3, 3, 5) == 3


def test_find_kth_number_last_entry():
    assert find_kth_number(2, 3, 6) == 6
