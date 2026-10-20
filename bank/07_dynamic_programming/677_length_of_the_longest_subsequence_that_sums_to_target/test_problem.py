from solution import length_of_longest_subsequence


def test_length_of_longest_subsequence_example_one():
    assert length_of_longest_subsequence([1, 2, 3, 4, 5], 9) == 3


def test_length_of_longest_subsequence_example_two():
    assert length_of_longest_subsequence([4, 1, 3, 2, 1, 5], 7) == 4


def test_length_of_longest_subsequence_impossible():
    assert length_of_longest_subsequence([1, 1, 5, 4, 5], 3) == -1


def test_length_of_longest_subsequence_single():
    assert length_of_longest_subsequence([5], 5) == 1


def test_length_of_longest_subsequence_each_used_once():
    assert length_of_longest_subsequence([2], 4) == -1


def test_length_of_longest_subsequence_prefers_more_items():
    assert length_of_longest_subsequence([6, 1, 2, 3], 6) == 3
