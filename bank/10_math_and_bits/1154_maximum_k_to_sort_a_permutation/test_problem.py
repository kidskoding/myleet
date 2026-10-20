from solution import sort_permutation


def test_sort_permutation_shared_low_bit():
    assert sort_permutation([0, 3, 2, 1]) == 1


def test_sort_permutation_shared_high_bit():
    assert sort_permutation([0, 1, 3, 2]) == 2


def test_sort_permutation_only_zero_works():
    assert sort_permutation([3, 2, 1, 0]) == 0


def test_sort_permutation_already_sorted():
    assert sort_permutation([0, 1, 2]) == 0


def test_sort_permutation_single_element():
    assert sort_permutation([0]) == 0


def test_sort_permutation_two_bits_shared():
    assert sort_permutation([0, 1, 2, 7, 4, 5, 6, 3]) == 3
