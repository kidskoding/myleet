from solution import sum_four_divisors


def test_sum_four_divisors_example():
    assert sum_four_divisors([21, 4, 7]) == 32


def test_sum_four_divisors_duplicates():
    assert sum_four_divisors([21, 21]) == 64


def test_sum_four_divisors_none_qualify():
    assert sum_four_divisors([1, 2, 3, 4, 5]) == 0


def test_sum_four_divisors_prime_cube():
    assert sum_four_divisors([8, 27]) == 15 + 40


def test_sum_four_divisors_square_with_five_divisors():
    assert sum_four_divisors([16]) == 0
