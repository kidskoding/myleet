from solution import consecutive_numbers_sum


def test_consecutive_numbers_sum_example_five():
    assert consecutive_numbers_sum(5) == 2


def test_consecutive_numbers_sum_example_nine():
    assert consecutive_numbers_sum(9) == 3


def test_consecutive_numbers_sum_example_fifteen():
    assert consecutive_numbers_sum(15) == 4


def test_consecutive_numbers_sum_one():
    assert consecutive_numbers_sum(1) == 1


def test_consecutive_numbers_sum_power_of_two():
    assert consecutive_numbers_sum(1024) == 1


def test_consecutive_numbers_sum_large():
    assert consecutive_numbers_sum(1_000_000_000) == 10
