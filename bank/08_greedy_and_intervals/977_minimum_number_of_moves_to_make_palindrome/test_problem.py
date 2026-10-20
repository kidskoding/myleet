from solution import min_moves_to_make_palindrome


def test_min_moves_to_make_palindrome_example_one():
    assert min_moves_to_make_palindrome("aabb") == 2


def test_min_moves_to_make_palindrome_example_two():
    assert min_moves_to_make_palindrome("letelt") == 2


def test_min_moves_to_make_palindrome_single():
    assert min_moves_to_make_palindrome("a") == 0


def test_min_moves_to_make_palindrome_already():
    assert min_moves_to_make_palindrome("abcba") == 0


def test_min_moves_to_make_palindrome_odd_char_first():
    assert min_moves_to_make_palindrome("mamad") == 3


def test_min_moves_to_make_palindrome_reversed_halves():
    assert min_moves_to_make_palindrome("abcabc") == 3
