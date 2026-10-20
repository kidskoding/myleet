from solution import count_primes


def test_count_primes_below_ten():
    assert count_primes(10) == 4


def test_count_primes_zero():
    assert count_primes(0) == 0


def test_count_primes_two():
    assert count_primes(2) == 0
