from solution import smallest_factorization


def test_smallest_factorization_forty_eight():
    assert smallest_factorization(48) == 68


def test_smallest_factorization_fifteen():
    assert smallest_factorization(15) == 35


def test_smallest_factorization_one():
    assert smallest_factorization(1) == 1


def test_smallest_factorization_prime():
    assert smallest_factorization(11) == 0


def test_smallest_factorization_single_digit():
    assert smallest_factorization(7) == 7
