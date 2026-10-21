from solution import sum_of_squares


def test_sum_of_squares_example_one():
    assert sum_of_squares([1, 2, 3, 4]) == 21


def test_sum_of_squares_example_two():
    assert sum_of_squares([2, 7, 1, 19, 18, 3]) == 63


def test_sum_of_squares_single():
    assert sum_of_squares([5]) == 25


def test_sum_of_squares_prime_length():
    assert sum_of_squares([1, 2, 3]) == 10
