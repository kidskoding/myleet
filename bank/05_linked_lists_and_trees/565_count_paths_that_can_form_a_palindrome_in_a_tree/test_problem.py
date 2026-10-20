from solution import count_palindrome_paths


def test_count_palindrome_paths_example_one():
    assert count_palindrome_paths([-1, 0, 0, 1, 1, 2], "acaabc") == 8


def test_count_palindrome_paths_all_same_letter():
    assert count_palindrome_paths([-1, 0, 0, 0, 0], "aaaaa") == 10


def test_count_palindrome_paths_single_node():
    assert count_palindrome_paths([-1], "a") == 0


def test_count_palindrome_paths_chain_of_distinct_letters():
    assert count_palindrome_paths([-1, 0, 1], "zab") == 2


def test_count_palindrome_paths_parent_with_larger_index():
    assert count_palindrome_paths([-1, 2, 0], "xaa") == 3
