from solution import number_of_good_subsets


def test_number_of_good_subsets_with_one_and_four():
    assert number_of_good_subsets([1, 2, 3, 4]) == 6


def test_number_of_good_subsets_composite_value():
    assert number_of_good_subsets([4, 2, 3, 15]) == 5


def test_number_of_good_subsets_only_ones():
    assert number_of_good_subsets([1, 1]) == 0


def test_number_of_good_subsets_no_square_free():
    assert number_of_good_subsets([4, 8, 9]) == 0


def test_number_of_good_subsets_duplicates_count_separately():
    assert number_of_good_subsets([2, 2]) == 2


def test_number_of_good_subsets_overlapping_primes():
    assert number_of_good_subsets([6, 10, 15]) == 3


def test_number_of_good_subsets_large_count_is_modded():
    assert number_of_good_subsets([1] * 100 + [2]) == pow(2, 100, 10**9 + 7)
