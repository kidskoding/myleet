from solution import get_permutation


def test_get_permutation_third_of_three():
    assert get_permutation(3, 3) == "213"


def test_get_permutation_ninth_of_four():
    assert get_permutation(4, 9) == "2314"


def test_get_permutation_first():
    assert get_permutation(3, 1) == "123"
