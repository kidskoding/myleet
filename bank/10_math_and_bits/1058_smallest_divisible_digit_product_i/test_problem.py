from solution import smallest_number


def test_smallest_number_has_zero_digit():
    assert smallest_number(10, 2) == 10


def test_smallest_number_steps_up():
    assert smallest_number(15, 3) == 16


def test_smallest_number_t_one():
    assert smallest_number(1, 1) == 1


def test_smallest_number_needs_digit_seven():
    assert smallest_number(11, 7) == 17


def test_smallest_number_rolls_over_to_hundred():
    assert smallest_number(99, 10) == 100
