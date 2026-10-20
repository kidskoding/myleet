from solution import alternate_digit_sum


def test_alternate_digit_sum_example():
    assert alternate_digit_sum(521) == 4


def test_alternate_digit_sum_odd_ones():
    assert alternate_digit_sum(111) == 1


def test_alternate_digit_sum_cancels_to_zero():
    assert alternate_digit_sum(886996) == 0


def test_alternate_digit_sum_single_digit():
    assert alternate_digit_sum(7) == 7


def test_alternate_digit_sum_trailing_zero():
    assert alternate_digit_sum(10) == 1


def test_alternate_digit_sum_negative_result():
    assert alternate_digit_sum(19) == -8
