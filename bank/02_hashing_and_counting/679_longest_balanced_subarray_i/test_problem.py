from solution import longest_balanced


def test_longest_balanced_example_one():
    assert longest_balanced([2, 5, 4, 3]) == 4


def test_longest_balanced_repeated_even():
    assert longest_balanced([3, 2, 2, 5, 4]) == 5


def test_longest_balanced_inner_window():
    assert longest_balanced([1, 2, 3, 2]) == 3


def test_longest_balanced_single():
    assert longest_balanced([1]) == 0


def test_longest_balanced_only_evens():
    assert longest_balanced([2, 2, 4]) == 0


def test_longest_balanced_duplicates_count_once():
    assert longest_balanced([1, 1, 1, 2]) == 4
