from solution import find_gcd


def test_find_gcd_normal():
    assert find_gcd([2, 5, 6, 9, 10]) == 2


def test_find_gcd_coprime():
    assert find_gcd([7, 5, 6, 8, 3]) == 1


def test_find_gcd_all_equal():
    assert find_gcd([3, 3]) == 3
