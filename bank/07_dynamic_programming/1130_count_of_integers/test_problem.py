from solution import count


def test_count_small_range():
    assert count("1", "12", 1, 8) == 11


def test_count_single_digits():
    assert count("1", "5", 1, 5) == 5


def test_count_single_number_in_range():
    assert count("123", "123", 6, 6) == 1


def test_count_single_number_out_of_range():
    assert count("123", "123", 1, 5) == 0


def test_count_two_digit_exact_sum():
    assert count("10", "99", 9, 9) == 9


def test_count_huge_bound_modulo():
    assert count("1", "1" + "0" * 22, 1, 400) == 490000
