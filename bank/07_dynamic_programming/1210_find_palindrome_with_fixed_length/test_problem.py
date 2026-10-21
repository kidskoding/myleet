from solution import kth_palindrome


def test_kth_palindrome_example_one():
    assert kth_palindrome([1, 2, 3, 4, 5, 90], 3) == [101, 111, 121, 131, 141, 999]


def test_kth_palindrome_example_two():
    assert kth_palindrome([2, 4, 6], 4) == [1111, 1331, 1551]


def test_kth_palindrome_out_of_range():
    assert kth_palindrome([100], 2) == [-1]


def test_kth_palindrome_length_one():
    assert kth_palindrome([1, 5, 9], 1) == [1, 5, 9]
