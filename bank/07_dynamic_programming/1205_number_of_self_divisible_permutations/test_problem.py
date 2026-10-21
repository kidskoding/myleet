from solution import self_divisible_permutation_count


def test_self_divisible_permutation_count_one():
    assert self_divisible_permutation_count(1) == 1


def test_self_divisible_permutation_count_two():
    assert self_divisible_permutation_count(2) == 1


def test_self_divisible_permutation_count_three():
    assert self_divisible_permutation_count(3) == 3


def test_self_divisible_permutation_count_four():
    assert self_divisible_permutation_count(4) == 4


def test_self_divisible_permutation_count_five():
    assert self_divisible_permutation_count(5) == 28
