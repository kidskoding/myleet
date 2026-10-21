from solution import longest_subsequence


def test_longest_subsequence_example_one():
    assert longest_subsequence([1, 2, 3, 4], 1) == 4


def test_longest_subsequence_example_two():
    assert longest_subsequence([1, 3, 5, 7], 1) == 1


def test_longest_subsequence_example_three():
    assert longest_subsequence([1, 5, 7, 8, 5, 3, 4, 2, 1], -2) == 4


def test_longest_subsequence_single():
    assert longest_subsequence([42], 3) == 1


def test_longest_subsequence_negative_diff():
    assert longest_subsequence([7, 5, 3, 1], -2) == 4
