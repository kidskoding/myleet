from solution import closest_primes


def test_closest_primes_example_one():
    assert closest_primes(10, 19) == [11, 13]


def test_closest_primes_example_two():
    assert closest_primes(4, 6) == [-1, -1]


def test_closest_primes_twins():
    assert closest_primes(1, 10) == [2, 3]


def test_closest_primes_single_prime():
    assert closest_primes(8, 10) == [-1, -1]


def test_closest_primes_large_gap_choice():
    assert closest_primes(19, 31) == [29, 31]
